"use server";

import { google } from "googleapis";
import { requireStaff } from "@/utils/role-guards";

type TeacherExporRow = {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    username: string;
    passwordStatus: string;
    isNewTeacher: boolean;
    schoolName: string;
    state: string;
    district: string;
    rpm: string;
};

export async function exportTeachersToGoogleSheet(teachers: TeacherExporRow[]) {
    const { supabase } = await requireStaff();

    if (teachers.length === 0) {
        throw new Error("There are no teachers to export.");
    }

    const { data: reportingRows, error: reportingError } = await supabase
        .from("teachers")
        .select("id, reporting_role");

    if (reportingError) {
        console.error("Could not verify teacher reporting roles for export", {
            code: reportingError.code,
            message: reportingError.message,
            details: reportingError.details,
        });
        throw new Error("Could not verify teacher reporting roles.");
    }

    const countedTeacherIds = new Set(
        (reportingRows ?? [])
            .filter((teacher) => teacher.reporting_role !== "co_teacher_only")
            .map((teacher) => teacher.id),
    );
    const countedTeachers = teachers.filter((teacher) =>
        countedTeacherIds.has(teacher.id),
    );

    if (countedTeachers.length === 0) {
        throw new Error("There are no counted teachers to export.");
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const folderId = process.env.GOOGLE_DRIVE_EXPORT_FOLDER_ID;

    if (!clientEmail || !private_key || !folderId) {
        throw new Error("Google export environment variables are missing.");
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: private_key,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
        ],
    });

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const today = new Date().toISOString().slice(0,10);
    const fileName = `LIA Teachers Export - ${today}`;

    const file = await drive.files.create({
        requestBody: {
            name: fileName,
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
                title: "Teachers",
                },
                fields: "title",
            },
            },
        ],
        },
    });

    const headers = [
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "Phone",
        "Status",
        "Username",
        "Password Status",
        "New Teacher",
        "School",
        "State",
        "District",
        "Assigned RPM",
    ];

    const rows = countedTeachers.map((teacher) => [
        teacher.firstName,
        teacher.lastName,
        teacher.name,
        teacher.email,
        teacher.phone,
        teacher.status,
        teacher.username,
        teacher.passwordStatus,
        teacher.isNewTeacher ? "Yes" : "No",
        teacher.schoolName,
        teacher.state,
        teacher.district,
        teacher.rpm,
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Teachers!A1",
        valueInputOption: "RAW",
        requestBody: {
            values: [headers, ...rows],
        },
    });

    return {
        spreadsheetId,
        url:
            file.data.webViewLink ??
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
}
