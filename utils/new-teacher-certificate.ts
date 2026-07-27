import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, StandardFonts, rgb} from "pdf-lib";

const TEMPLATE_PATH = path.join(
    process.cwd(),
    "assets",
    "certificates",
    "new-teacher-training-template.pdf",
);

type GenerateCertificateOptions = {
    teacherName: string;
    completedAt: Date;
    certificateNumber: string;
};

function fitTextSize({
    font,
    text,
    maxWidth,
    startingSize,
    minimumSize,
}: {
    font: PDFFont;
    text: string;
    maxWidth: number;
    startingSize: number;
    minimumSize: number;
}) {
    let size = startingSize;

    while (size > minimumSize && font.widthOfTextAtSize(text, size) > maxWidth) {
        size -= 1;
    }

    return size;
}

function formatCertifcateDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Denver",
    }).format(date);
}

export function createCertificateNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomUUID().slice(0,8).toUpperCase();

    return `LIA-NT-${year}-${suffix}`;
}

export async function generateNewTeacherCertificate({
    teacherName,
    completedAt,
    certificateNumber,
} : GenerateCertificateOptions) {
    const template = await readFile(TEMPLATE_PATH);
    const pdf = await PDFDocument.load(template);

    const page = pdf.getPages()[0];

    if (!page) {
        throw new Error("The certificate template does not contain a page.");
    }

    const { width, height } = page.getSize();
    const nameFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const detailFont = await pdf.embedFont(StandardFonts.Helvetica);

    const normalizedName = teacherName.trim() || "LIA Educator";

    const nameSize = fitTextSize({
        font: nameFont,
        text: normalizedName,
        maxWidth: width * 0.72,
        startingSize: 36,
        minimumSize: 20,
    });

    const nameWidth = nameFont.widthOfTextAtSize(normalizedName, nameSize);

    page.drawText(normalizedName, {
        x: (width - nameWidth) / 2,
        y: height * 0.49,
        size: nameSize,
        font: nameFont,
        color: rgb(0.08, 0.08, 0.08),
    });

    const dateText = formatCertifcateDate(completedAt);
    const dateSize = 11;
    const dateWidth = detailFont.widthOfTextAtSize(dateText,dateSize);
    const dateLabelCenterX = width * 0.238;

    page.drawText(dateText, {
        x: dateLabelCenterX - dateWidth / 2,
        y: height * 0.074,
        size: dateSize, 
        font: detailFont,
        color: rgb(0.12, 0.12, 0.12),
    });

    pdf.setTitle(`LIA New Teacher Training Certificate - ${normalizedName}`);
    pdf.setAuthor("Latinos In Action");
    pdf.setSubject("New Teacher Training completion certficiate");
    pdf.setKeywords([
        "Latinos In Action",
        "teacher training",
        certificateNumber,
    ]);

    const bytes = await pdf.save();

    return Buffer.from(bytes);
}
