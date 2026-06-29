"use server";

import { google } from "googleapis";
import { createClient } from '@/utils/supabase/server';

type SchoolExportRow = {
    name: string;
    year_lia_started: number | null;
    address: string | null;
    state: string;
    region: string | null;
    district: string;
    rpm: string;
    status: string;
    mouStatus: string;
    updatedAt: string;
};

export async function exportSchoolsToGoogleSheet(schools: SchoolExportRow[]) {
    const supabase = await createClient();

    const {
    data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
    throw new Error("You must be logged in to export schools.");
    }

    if (schools.length === 0) {
        throw new Error("There are no schools to export.");
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
                            title: "Schools"
                        },
                        fields: "title",
                    },
                },
            ],
        },
    });

    const headers = [
        "#",
        "School Name",
        "Year LIA Started",
        "Address",
        "State",
        "Region",
        "District",
        "Assigned RPM",
        "Status",
        "MOU Status",
        "Last Updated",
    ];

    const rows = schools.map((school, index) => [
        index + 1,
        school.name,
        school.year_lia_started ?? "N/A",
        school.address ?? "N/A",
        school.state,
        school.region ?? "N/A",
        school.district,
        school.rpm,
        school.status,
        school.mouStatus,
        new Date(school.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
    ]);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Schools!A1",
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