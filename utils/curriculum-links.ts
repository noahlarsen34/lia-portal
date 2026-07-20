export const curriculumTabs = [
    {
        key: "elementary",
        label: "Elementary",
        description: "Elementary curriculum units, lessons, lesson plans, and materials.",
        source: {
            type: "page",
            id: 10099,
        },
    },
    {
        key: "high-school",
        label: "High School",
        description: "High school curriculum units, lessons, lesson plans, and materials.",
        source: {
            type: "page",
            id: 5817,
        },
    },
    {
        key: "middle-school",
        label: "Middle School",
        description: "Middle school curriculum units, lessons, lesson plans, and materials.",
        source: {
            type: "page",
            id: 6263,
        },
    },
    {
        key: "lia-docs",
        label: "LIA Docs",
        description: "Forms, program documents, tutoring resources, logos, and teacher materials.",
        source: {
            type: "page",
            id: 6769,
        },
    },
    {
        key: "by-teachers",
        label: "By Teachers",
        description: "Best practices, templates, schedules, and classroom resources shared by teachers.",
        source: {
            type: "page",
            id: 6796,
        },
    },
    {
        key: "video-library",
        label: "Video Library",
        description: "Check out videos from LIA!",
        href: "https://latinosinaction.org/lia-video-gallery/",
    },
] as const;

export const teacherModuleSections = [
    {
        title: "New Teacher Modules",
        description: "Training modules and onboarding resources for new LIA teachers.",
        href: "/teacher/resources/page/11535",
    },
] as const;

export const teacherModulePageSlugs = [
    "11535",
    "new-teacher-modules",
    "1-01-joses-story-and-the-beginning-of-lia",
    "1-02-my-suitcase",
    "1-03-what-lia-does",
    "1-04-lia-students",
    "1-05-elevator-pitch",
    "1-06-the-lia-teacher",
    "being-a-culturally-responsive-teacher",
    "1-08-why-strong-relationships",
    "crt-teaching",
    "the-four-essentials",
    "understanding-the-30-40-30-model",
    "3-01-understanding-service-learning-and-tutoring",
    "literacy-tutoring-in-action",
    "planning-tutoring-at-your-school",
    "4-01-leadership-in-lia",
    "leadership-committees-class-presidency",
    "teacher-responsibilities-activity-proposals",
    "understanding-the-lia-curriculum",
    "project-based-assessments-digital-portfolios",
    "additional-curriculum-activities-reflective-journaling",
    "lia-events-and-ongoing-support",
    "module-5-completion-quiz",
] as const;
