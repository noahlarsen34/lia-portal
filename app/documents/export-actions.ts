"use server";

import { google } from "googleapis";
import { requireStaff } from "@/utils/role-guards";

type DocumentExportRow = {
    name: string;
    documentType: string;
    uploadedAt: string;
    schoolName: string;
    state: string;
    district: string;
    rpm: string;
};

export async function exportDocumentsToGoogleSheet(documents: DocumentExportRow[]) {
    await requireStaff();

    if (documents.length === 0) {
        throw new Error("There are no documents to export.");
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

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `LIA Documents Export - ${today}`;

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
                            title: "Documents",
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = [
        "Document",
        "Type",
        "School",
        "State",
        "District",
        "Assigned RPM",
        "Uploaded",
    ];

    const rows = documents.map((document) => [
        document.name,
        document.documentType,
        document.schoolName,
        document.state,
        document.district,
        document.rpm,
        document.uploadedAt,
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Documents!A1",
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
