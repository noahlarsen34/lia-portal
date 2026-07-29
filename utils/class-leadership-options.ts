export function toLeadershipOptionValue(name: string) {
    const defaultValues: Record<string, string> = {
        "Member": "member",
        "Class President": "president",
        "Vice President": "vice_president",
        "Class Secretary": "secretary",
        "Class Historian": "historian",
    };

    if (defaultValues[name]) {
        return defaultValues[name];
    }

    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
