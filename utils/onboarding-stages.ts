export const ONBOARDING_STAGES = [
  ["interest_received", "Interest Received"],
  ["launch_meeting", "Launch Meeting"],
  ["mou_preparation", "MOU Preparation"],
  ["awaiting_school_signature", "Awaiting School Signature"],
  ["mou_signed", "MOU Signed"],
  ["onboarding", "Onboarding"],
  ["program_active", "Program Active"],
  ["declined", "Declined"],
  ["unqualified", "Unqualified"],
  ["unresponsive", "Unresponsive"],
] as const;

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number][0];

export const ONBOARDING_STAGE_LABELS: Record<OnboardingStage, string> =
  Object.fromEntries(ONBOARDING_STAGES) as Record<OnboardingStage, string>;

export const ONBOARDING_STAGE_VALUES = new Set<string>(
  ONBOARDING_STAGES.map(([value]) => value),
);
