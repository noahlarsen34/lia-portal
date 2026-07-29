"use server";

import { google } from "googleapis";
import { requireTeacher } from "@/utils/role-guards";

function formatHours(minutes: number | null | undefined) {
    return (Number(minutes ?? 0) / 60).toFixed(2);
}

function formatValue(value: string | null | undefined) {
    return value || "N/A";
}

function formatStatus(status: string | null | undefined) {
    return status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : "Pending";
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "N/A";

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export async function exportTutoringToGoogleSheet(classId: string) {
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

    const { data: logs, error: logsError } = await supabase
        .from("tutoring_logs")
        .select(`
            id,
            student_name_snapshot,
            school_site,
            class_period,
            activity_type,
            session_date,
            arrival_time,
            departure_time,
            duration_minutes,
            mentor_initials,
            major_activities,
            comments,
            elementary_mentee_name,
            mentee_grade,
            english_language_proficiency,
            cooperating_elementary_teacher,
            status,
            submitted_at,
            approved_at
        `)
        .eq("lia_class_id", liaClass.id)
        .order("session_date", { ascending: false })
        .order("submitted_at", { ascending: false });

    if (logsError) {
        throw new Error("The tutoring logs could not be loaded.");
    }

    if (!logs?.length) {
        throw new Error("There are no tutoring or service logs to export.");
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

    const file = await drive.files.create({
        requestBody: {
            name: `${liaClass.name} Tutoring Timesheet - ${today}`,
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
                            title: "Tutoring Timesheet",
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = [
        "#",
        "Student",
        "Date",
        "Arrival",
        "Departure",
        "Hours",
        "Type",
        "School Site",
        "Class Period",
        "Mentor Initials",
        "Major Activities",
        "Comments",
        "Mentee",
        "Mentee Grade",
        "EL Proficiency",
        "Cooperating Teacher",
        "Status",
        "Submitted",
        "Approved",
    ];

    const rows = logs.map((log, index) => [
        index + 1,
        log.student_name_snapshot,
        log.session_date,
        log.arrival_time,
        log.departure_time,
        formatHours(log.duration_minutes),
        formatValue(log.activity_type),
        formatValue(log.school_site),
        formatValue(log.class_period),
        formatValue(log.mentor_initials),
        formatValue(log.major_activities),
        formatValue(log.comments),
        formatValue(log.elementary_mentee_name),
        formatValue(log.mentee_grade),
        formatValue(log.english_language_proficiency),
        formatValue(log.cooperating_elementary_teacher),
        formatStatus(log.status),
        formatDateTime(log.submitted_at),
        formatDateTime(log.approved_at),
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Tutoring Timesheet'!A1",
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
