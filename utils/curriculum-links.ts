export const curriculumTabs = [
    {
        key: "elementary",
        label: "Elementary",
        description: "Elementary LIA curriculum lessons and activities.",
        source: {
            type: "page",
            id: 10099,
        },
    },
    {
        key: "high-school",
        label: "High School",
        description: "High school curriculum posts and lesson resources.",
        source: {
            type: "category",
            id: 22,
        },
    },
    {
        key: "middle-school",
        label: "Middle School",
        description: "Middle school curriculum resources.",
        source: {
            type: "page",
            id: 11606,
        },
    },
] as const;

export const teacherModuleSections = [
    {
        title: "New Teacher Modules",
        description: "Training modules and onboarding resources for new LIA teachers.",
        href: "/teacher/resources/page/11535",
    },
] as const;
