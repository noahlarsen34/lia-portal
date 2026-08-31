export const EVENT_TIMEZONES = [
    { value: "America/Los_Angeles", label: "Pacific Time" },
    { value: "America/Denver", label: "Mountain Time" },
    { value: "America/Phoenix", label: "Arizona Time" },
    { value: "America/Chicago", label: "Central Time" },
    { value: "America/New_York", label: "Eastern Time" },
    { value: "America/Anchorage", label: "Alaska Time" },
    { value: "Pacific/Honolulu", label: "Hawaii Time" },
] as const;

export function isSupportedEventTimezone(value: string) {
    return EVENT_TIMEZONES.some(
        (timezone) => timezone.value === value,
    );
}
