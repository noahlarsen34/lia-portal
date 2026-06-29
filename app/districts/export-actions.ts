"use server";

import{ google } from "googleapis";
import { createClient } from "@/utils/supabase/server";
import { create } from "node:domain";

type DistrictExportRow = {
    name: string;
    state: string | null;
};

export async function exportDistrictsToGoogleSheet(districts: DistrictExportRow[]) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to export districts");
    }

    if (districts.length === 0) {
        throw new Error("There are no districts to export");
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,"\n");
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
    const sheets = google.sheets({ version: "v4" , auth });

    const today = new Date().toISOString().slice(0,10);
    const fileName = `LIA Districts Export - ${today}`;

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
                            title: "Districts",
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = ["#", "District Name", "State"];

    const rows = districts.map((district, index) => [
        index + 1,
        district.name,
        district.state ?? "N/A",
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Districts!A1",
        valueInputOption: "RAW",
        requestBody: {
            values: [headers, ...rows],
        },
    });

    return {
        spreadsheetId,
        url:
            file.data.webViewLink ??
            `https://docs.google.com/spreadsheet/d/${spreadsheetId}`,
    };
}