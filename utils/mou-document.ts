import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import { formatMouCurrency } from "@/utils/mou";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "mou",
  "lia-mou-automation-template.docx",
);

export const MOU_DOCUMENT_BUCKET = "mou-documents";
export const MOU_DOCUMENT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type FinalizedMouValues = {
  contractingPartyName: string;
  schoolName: string;
  authorizedSignerName: string | null;
  effectiveSchoolYear: string;
  launchSchoolYear: string;
  renewalSchoolYear: string;
  liaSignatureDate: string | null;
  startupDiscountName: string | null;
  startupDiscountPercent: number;
  startupDiscountAmount: number;
  startupFinalPrice: number;
  firstYearDiscountName: string | null;
  firstYearDiscountPercent: number;
  firstYearDiscountAmount: number;
  firstYearFinalPrice: number;
  firstYearGrandTotal: number;
  renewalDiscountName: string | null;
  renewalDiscountPercent: number;
  renewalDiscountAmount: number;
  renewalProgramFinalPrice: number;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function displayPercentage(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function discountName(name: string | null, percentage: number) {
  return percentage > 0 && name?.trim() ? name.trim() : "No discount";
}

function replacementsFor(values: FinalizedMouValues) {
  return new Map<string, string>([
    ["{{contracting_party_name}}", values.contractingPartyName],
    ["{{school_name}}", values.schoolName],
    ["{{authorized_signer_name}}", values.authorizedSignerName || "To be confirmed"],
    ["{{effective_school_year}}", values.effectiveSchoolYear],
    ["{{launch_school_year}}", values.launchSchoolYear],
    ["{{renewal_school_year}}", values.renewalSchoolYear],
    ["{{lia_signature_date}}", values.liaSignatureDate || ""],
    [
      "{{startup_discount_name}}",
      discountName(values.startupDiscountName, values.startupDiscountPercent),
    ],
    ["{{startup_discount_percent}}", displayPercentage(values.startupDiscountPercent)],
    ["{{startup_discount_amount}}", formatMouCurrency(values.startupDiscountAmount)],
    ["{{startup_final_price}}", formatMouCurrency(values.startupFinalPrice)],
    [
      "{{first_year_discount_name}}",
      discountName(values.firstYearDiscountName, values.firstYearDiscountPercent),
    ],
    ["{{first_year_discount_percent}}", displayPercentage(values.firstYearDiscountPercent)],
    ["{{first_year_discount_amount}}", formatMouCurrency(values.firstYearDiscountAmount)],
    ["{{first_year_final_price}}", formatMouCurrency(values.firstYearFinalPrice)],
    ["{{first_year_grand_total}}", formatMouCurrency(values.firstYearGrandTotal)],
    [
      "{{renewal_discount_name}}",
      discountName(values.renewalDiscountName, values.renewalDiscountPercent),
    ],
    ["{{renewal_discount_percent}}", displayPercentage(values.renewalDiscountPercent)],
    ["{{renewal_discount_amount}}", formatMouCurrency(values.renewalDiscountAmount)],
    [
      "{{renewal_program_final_price}}",
      formatMouCurrency(values.renewalProgramFinalPrice),
    ],
  ]);
}

export async function generateFinalizedMouDocx(values: FinalizedMouValues) {
  const template = await readFile(TEMPLATE_PATH);
  const zip = new PizZip(template);
  const replacements = replacementsFor(values);
  const remainingPlaceholders = new Set<string>();

  for (const fileName of Object.keys(zip.files)) {
    if (!fileName.startsWith("word/") || !fileName.endsWith(".xml")) continue;

    const file = zip.file(fileName);
    if (!file) continue;

    let xml = file.asText();
    for (const [placeholder, replacement] of replacements) {
      xml = xml.replaceAll(placeholder, escapeXml(replacement));
    }
    for (const placeholder of xml.match(/\{\{[^{}]+\}\}/g) ?? []) {
      remainingPlaceholders.add(placeholder);
    }
    zip.file(fileName, xml);
  }

  if (remainingPlaceholders.size > 0) {
    throw new Error(
      `The finalized MOU still contains placeholders: ${[...remainingPlaceholders].join(", ")}`,
    );
  }

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function getMouDocumentPath(
  submissionId: string,
  revision: number,
) {
  return `${submissionId}/mou-revision-${revision}.docx`;
}
