export type StudentTier = "tier_1" | "tier_2" | "tier_3";

export const studentTierOptions = [
    {
        value: "tier_1",
        label: "Tier 1",
    },
    {
        value: "tier_2",
        label: "Tier 2",
    },
    {
        value: "tier_3",
        label: "Tier 3",
    },
] as const;

export function getValidStudentTier(value: FormDataEntryValue | null) {
    if (value === "tier_1" || value === "tier_2" || value === "tier_3") {
        return value;
    }

    return null;
}

export function formatStudentTier(tier: string | null | undefined) {
    if (tier === "tier_1") return "Tier 1";
    if (tier === "tier_2") return "Tier 2";
    if (tier === "tier_3") return "Tier 3";

    return "N/A";

}
