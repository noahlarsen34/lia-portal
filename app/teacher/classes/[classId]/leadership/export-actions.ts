"use server";

import { google } from "googleapis";
import { requireTeacher } from "@/utils/role-guards";
import { formatStudentTier } from "@/utils/student-tier";

type LeadershipFilters = {
    role: string;
    committee: string;
    tier: string;
};

function formatRosterValue(value: string | null | undefined) {
    return value
        ? value
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "N/A";
}

function formatRosterRole(
    role: string | null | undefined,
    committee: string | null | undefined,
) {
    if (role === "president") return "Class President";
    if (role === "secretary") return "Class Secretary";
    if (role === "historian") return "Class Historian";

    if (role === "vice_president") {
        return committee
            ? `${formatRosterValue(committee)} VP`
            : "Committee VP";
    }

    return role ? formatRosterValue(role) : "Member";
}

export async function exportLeadershipToGoogleSheet(
    classId: string,
    filters: LeadershipFilters,
) {
    const { supabase, profile, user } = await requireTeacher();
    const exporterEmail = profile.email ?? user.email;

    if (!exporterEmail) {
        throw new Error(
            "Your account needs an email address before exporting.",
        );
    }

    const { data: liaClass, error: classError } = await supabase
        .from("lia_classes")
        .select("id, name")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    if (classError || !liaClass) {
        throw new Error("This class could not be found.");
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
        .from("lia_class_students")
        .select(`
            id,
            status,
            tier,
            committee,
            officer_role,
            students (
                first_name,
                last_name,
                email,
                grade_level
            )
        `)
        .eq("lia_class_id", liaClass.id)
        .or("status.is.null,status.neq.removed")
        .order("officer_role", { ascending: true });

    if (enrollmentsError) {
        throw new Error("The leadership directory could not be loaded.");
    }

    const filteredEnrollments = (enrollments ?? []).filter((enrollment) => {
        if (
            filters.role !== "all" &&
            enrollment.officer_role !== filters.role
        ) {
            return false;
        }

        if (filters.committee !== "all") {
            if (filters.committee === "none" && enrollment.committee) {
                return false;
            }

            if (
                filters.committee !== "none" &&
                enrollment.committee !== filters.committee
            ) {
                return false;
            }
        }

        if (
            filters.tier !== "all" &&
            enrollment.tier !== filters.tier
        ) {
            return false;
        }

        return true;
    });

    if (!filteredEnrollments.length) {
        throw new Error(
            "There are no leadership records matching these filters.",
        );
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n",
    );
    const folderId = process.env.GOOGLE_DRIVE_EXPORT_FOLDER_ID;

    if (!clientEmail || !privateKey || !folderId) {
        throw new Error(
            "Google export environment variables are missing.",
        );
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
        ],
    });
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });
    const today = new Date().toISOString().slice(0, 10);
    const hasFilters =
        filters.role !== "all" ||
        filters.committee !== "all" ||
        filters.tier !== "all";
    const filterLabel = hasFilters ? "Filtered" : "All";

    const file = await drive.files.create({
        requestBody: {
            name:
                `${liaClass.name} Leadership - ${filterLabel} - ${today}`,
            mimeType: "application/vnd.google-apps.spreadsheet",
            parents: [folderId],
        },
        fields: "id, webViewLink",
        supportsAllDrives: true,
    });

    const spreadsheetId = file.data.id;

    if (!spreadsheetId) {
        throw new Error("Google did not return a spreadsheet ID.");
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            title: "Leadership",
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = [
        "#",
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "Grade",
        "Tier",
        "Committee",
        "Role",
        "Status",
    ];

    const rows = filteredEnrollments.map((enrollment, index) => {
        const student = Array.isArray(enrollment.students)
            ? enrollment.students[0]
            : enrollment.students;
        const firstName = student?.first_name ?? "";
        const lastName = student?.last_name ?? "";

        return [
            index + 1,
            firstName || "N/A",
            lastName || "N/A",
            `${firstName} ${lastName}`.trim() || "Unknown student",
            student?.email || "N/A",
            student?.grade_level || "N/A",
            formatStudentTier(enrollment.tier),
            formatRosterValue(enrollment.committee),
            formatRosterRole(
                enrollment.officer_role,
                enrollment.committee,
            ),
            formatRosterValue(enrollment.status ?? "active"),
        ];
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Leadership!A1",
        valueInputOption: "RAW",
        requestBody: {
            values: [headers, ...rows],
        },
    });

    const shareWithExporter = (sendNotificationEmail: boolean) =>
        drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
                type: "user",
                role: "writer",
                emailAddress: exporterEmail,
            },
            sendNotificationEmail,
            supportsAllDrives: true,
        });

    try {
        await shareWithExporter(false);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : String(error);
        const requiresInvitation =
            message.includes("no Google account associated") ||
            message.includes('check the "Notify people" box');

        if (!requiresInvitation) {
            throw error;
        }

        await shareWithExporter(true);
    }

    return {
        spreadsheetId,
        url:
            file.data.webViewLink ??
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
}
