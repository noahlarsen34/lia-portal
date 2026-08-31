import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
    try{
        const filePath = path.join(
            process.cwd(),
            "public",
            "resources",
            "tutoring",
            "tutoring-preparatino.pptx",
        );

        const file = await readFile(filePath);

        return new Response(new Uint8Array(file), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition":
                    'attachment; filename="Tutoring Preparation.pptx"',
                "Content-Length": String(file.byteLength),
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Tutoring presentation download failed:", error);

        return new Response("Presentation not found.", {
            status: 404,
        });
    }
}