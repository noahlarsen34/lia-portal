"use server";

import { google } from "googleapis";
import { requireTeacher } from "@/utils/role-guards";

const validStatuses = [
    "all",
    "submitted",
    "maybe",
    "accepted",
    "declined",
];

function formatDate(value: string | null) {
    if (!value) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function yesOrNo(value: boolean | null) {
    return value ? "Yes" : "No";
}

export async function exportApplicantsToGoogleSheet(
    classId: string,
    requestedStatus: string,
) {
    const { supabase, profile, user } = await requireTeacher();
    const exporterEmail = profile.email ?? user.email;

    if (!exporterEmail) {
        throw new Error(
            "Your account needs an email address before exporting.",
        );
    }

    const statusFilter = validStatuses.includes(requestedStatus)
        ? requestedStatus
        : "all";
    
    const { data: liaClass, error: classError } = await supabase
        .from("lia_classes")
        .select("id, name")
        .eq("id", classId)
        .eq("teacher_profile_id", profile.id)
        .maybeSingle();

    
    if (classError || !liaClass) {
        throw new Error("This class could not be found.");
    }

    let applicationsQuery = supabase
        .from("lia_class_applications")
        .select(`
                id,
                first_name,
                last_name,
                email,
                grade_level,
                advisory_teacher,
                color_team,
                status,
                application_complete,
                recommendation_complete,
                completed_interview,
                interview_again,
                submitted_at 
            `)
        .eq("lia_class_id", liaClass.id)
        .is("archived_at", null)
        .order("submitted_at", { ascending: false })
    
    if (statusFilter !== "all") {
        applicationsQuery = applicationsQuery.eq("status", statusFilter,);
    }

    const { data: applications, error: applicationsError } = 
        await applicationsQuery;
    
    if (applicationsError) {
        throw new Error("The applicants could not be loaded.");
    }

    if (!applications?.length) {
        throw new Error("There are no applicants to export.");
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n",
    );
    const folderId = process.env.GOOGLE_DRIVE_EXPORT_FOLDER_ID;

    if (!clientEmail || !privateKey || !folderId) {
        throw new Error(
            "Google export environment vairables are missing.",
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

    const drive = google.drive({
        version: "v3",
        auth,
    });

    const sheets = google.sheets({
        version: "v4",
        auth,
    });

    const today = new Date().toISOString().slice(0,10);
    const filterLabel =
        statusFilter === "all" ? "All" : statusFilter;
    
    const fileName =
        `${liaClass.name} Applicants - ${filterLabel} - ${today}`;
    
    const file = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType:
                "application/vnd.google-apps.spreadsheet",
            parents: [folderId],
        },
        fields: "id, webViewLink",
        supportsAllDrives: true,
    });

    const spreadsheetId = file.data.id;

    if (!spreadsheetId) {
        throw new Error(
            "Google did not return a spreadsheet ID.",
        );
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            title: "Applicants",
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
        "Advisory Teacher",
        "Color Team",
        "Status",
        "Application Complete",
        "Recommendation Complete",
        "Interview Complete",
        "Interview Again",
        "Submitted",
    ];

    const rows = applications.map((application, index) => [
        index + 1,
        application.first_name,
        application.last_name,
        `${application.first_name} ${application.last_name}`.trim(),
        application.email || "N/A",
        application.grade_level || "N/A",
        application.advisory_teacher || "N/A",
        application.color_team || "N/A",
        application.status,
        yesOrNo(application.application_complete),
        yesOrNo(application.recommendation_complete),
        yesOrNo(application.completed_interview),
        yesOrNo(application.interview_again),
        formatDate(application.submitted_at),
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Applicants!A1",
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
