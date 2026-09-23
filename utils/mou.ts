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
