"use server";

import { google } from "googleapis";
import { requireAdmin } from "@/utils/role-guards";

type UserExportRow = {
    name: string;
    email: string;
    role: string;
    assignedSchools: number;
};

export async function exportUsersToGoogleSheet(users: UserExportRow[]) {
    await requireAdmin();

    if (users.length === 0) {
        throw new Error("There are no users to export.");
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const folderId = process.env.GOOGLE_DRIVE_EXPORT_FOLDER_ID;

    if (!clientEmail || !privateKey || !folderId) {
        throw new Error("Google export environment variables are missing.");
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
        ],
    });

    const drive = google.drive({version: "v3", auth });
    const sheets = google.sheets({version: "v4", auth });

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `LIA Users Export - ${today}`;

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
        throw new Error('Google did not return a spreadsheet ID.');
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            title: "Users",
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = ["Name", "Email", "Role", "Assigned Schools"];

    const rows = users.map((user) => [
        user.name,
        user.email,
        user.role,
        user.assignedSchools,
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Users!A1",
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