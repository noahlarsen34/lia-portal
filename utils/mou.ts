export function deriveMouSchoolYears(
  desiredStartTerm: string | null | undefined,
  fallbackSchoolYear: string,
) {
  const match = desiredStartTerm?.match(/\b(20\d{2})\b/);
  const startYear = match ? Number(match[1]) : Number(fallbackSchoolYear.slice(0, 4));
  const launchSchoolYear = `${startYear}-${startYear + 1}`;
  const renewalSchoolYear = `${startYear + 1}-${startYear + 2}`;

  return {
    effectiveSchoolYear: launchSchoolYear,
    launchSchoolYear,
    renewalSchoolYear,
  };
}

export function formatMouCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export const MOU_STANDARD_PRICING = {
  startupTraining: 2500,
  startupTravel: 2000,
  startupTotal: 4500,
  firstYearTotal: 6000,
  renewalTotal: 6000,
} as const;

export const MOU_PROGRAM_SERVICES = [
  { label: "LIA Portal Access", amount: 2000 },
  { label: "Access to Online Curriculum", amount: 1000 },
  {
    label:
      "Personalized Teacher Support throughout the school year — unlimited emails, calls, and meetings",
    amount: 1400,
  },
  { label: "LIA Youth Leadership Conference", amount: 800 },
  { label: "LIA Leadership Boot Camp", amount: 500 },
  { label: "Educator Institute", amount: 200 },
  { label: "Masterminds", amount: 100 },
] as const;

export function calculatePercentageDiscount(
  basePrice: number,
  percentage: number,
) {
  const safePercentage = Number.isFinite(percentage)
    ? Math.min(100, Math.max(0, percentage))
    : 0;

  return Math.round(basePrice * safePercentage) / 100;
}
