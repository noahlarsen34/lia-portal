export type TeacherEvent = {
    id: string;
    month: string;
    day: string;
    title: string;
    dateLabel: string;
    location: string;
    category: string;
    description: string;
};

export const upcomingTeacherEvents: TeacherEvent[] = [
    {
        id: "masterminds-2026",
        month: "Oct",
        day: "TBD",
        title: "Masterminds",
        dateLabel: "October 2026",
        location: "Location to be announced",
        category: "Professional Learning",
        description:
            "Connect with fellow LIA educators for collaboration and professional learning.",
    },
    {
        id: "florida-gala-2026",
        month: "Oct",
        day: "09",
        title: "Florida Gala",
        dateLabel: "October 9, 2026",
        location: "Wellington Community Center",
        category: "Gala",
        description:
            "A celebration for the Florida Latinos In Action community.",
    },
    {
        id: "utah-gala-2026",
        month: "Nov",
        day: "13",
        title: "Utah Gala",
        dateLabel: "November 13, 2026",
        location: "Hilton Salt Lake City Center",
        category: "Gala",
        description:
            "A celebration for the Utah Latinos In Action community.",
    },
];

export function getTeacherEventDirectionsHref(event: TeacherEvent) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`;
}

export function hasConfirmedTeacherEventLocation(event: TeacherEvent) {
    return event.location !== "Location to be announced";
}
