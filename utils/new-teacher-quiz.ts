export type QuizOption = {
    id: string;
    label: string;
};

export type QuizQuestion = {
    id: string;
    prompt: string;
    options: QuizOption[];
    correctOptionId: string;
};

export const newTeacherQuizQuestions: QuizQuestion[] = [
    {
        id: "mission",
        prompt: "What is the mission of Latinos in Action?",
        options: [
            { id: "a", label: "Increase sports participation" },
            { id: "b", label: "Empower Latino youth through leadership, college, and career readiness" },
            { id: "c", label: "Provide tutoring only" },
            { id: "d", label: "Increase graduation requirements" },
        ],
        correctOptionId: "b",
          },
    {
        id: "pillars",
        prompt: "Which of the following is NOT one of the LIA pillars?",
        options: [
            { id: "a", label: "Leadership" },
            { id: "b", label: "Service" },
            { id: "c", label: "Personal Assets" },
            { id: "d", label: "Athletics" },
        ],
        correctOptionId: "d",
    },
    {
        id: "teacher_role",
        prompt: "What is one important role of an LIA teacher?",
        options: [
            { id: "a", label: "To act only as a curriculum presenter" },
            {
                id: "b",
                label: "To be a champion, mentor, and relationship-builder for students",
            },
            { id: "c", label: "To avoid adapting lessons for student needs" },
            { id: "d", label: "To focus only on grading assignments" },
        ],
        correctOptionId: "b",
    },
    {
        id: "culturally_responsive_teaching",
        prompt: "What does Culturally Responsive Teaching help LIA teachers do?",
        options: [
            { id: "a", label: "Make assumptions based on surface-level behavior" },
            {
                id: "b",
                label: "Connect instruction to students' lives, identities, and experiences",
            },
            {
                id: "c",
                label: "Use the same lesson approach for every student without adjustment",
            },
            { id: "d", label: "Remove culture and community from classroom learning" },
        ],
        correctOptionId: "b",
    },
    {
        id: "four_essentials",
        prompt: "Which set best describes the four essentials of the LIA classroom model?",
        options: [
            { id: "a", label: "Testing, discipline, attendance, and grading" },
            { id: "b", label: "Sports, fundraising, field trips, and assemblies" },
            {
                id: "c",
                label: "30/40/30 Model, service learning and tutoring, leadership committees, and culturally relevant college readiness curriculum",
            },
            { id: "d", label: "Homework, lectures, quizzes, and final exams" },
        ],
        correctOptionId: "c",
    },
    {
        id: "thirty_forty_thirty",
        prompt: "What is the purpose of the 30/40/30 model?",
        options: [
            {
                id: "a",
                label: "To group students intentionally so they can learn from and support one another",
            },
            { id: "b", label: "To divide the school year into three grading periods" },
            { id: "c", label: "To limit student leadership opportunities" },
            { id: "d", label: "To assign students by alphabetical order only" },
        ],
        correctOptionId: "a",
    },
    {
        id: "service_learning_tutoring",
        prompt: "Why are service learning and tutoring central to LIA?",
        options: [
            { id: "a", label: "They replace all classroom instruction" },
            {
                id: "b",
                label: "They help students practice leadership and serve younger students and the community",
            },
            {
                id: "c",
                label: "They are optional activities with no connection to student growth",
            },
            { id: "d", label: "They are only used at the end of the year" },
        ],
        correctOptionId: "b",
    },
    {
        id: "leadership_committees",
        prompt: "What is the purpose of classroom leadership committees?",
        options: [
            {
                id: "a",
                label: "To help students take ownership of the program through meaningful leadership roles",
            },
            { id: "b", label: "To let only one student make every class decision" },
            { id: "c", label: "To replace the teacher's responsibilities" },
            { id: "d", label: "To focus only on classroom decorations" },
        ],
        correctOptionId: "a",
    },
    {
        id: "teacher_responsibilities",
        prompt: "Which responsibility is important for successful LIA implementation?",
        options: [
            { id: "a", label: "Avoid communication with school leaders and LIA staff" },
            {
                id: "b",
                label: "Plan intentionally, support students, and communicate with LIA support staff when needed",
            },
            { id: "c", label: "Skip activities that build student leadership" },
            { id: "d", label: "Wait until the end of the year to organize the program" },
        ],
        correctOptionId: "b",
    },
    {
        id: "ongoing_support",
        prompt: "Who is a teacher's primary support person throughout the school year?",
        options: [
            { id: "a", label: "The Regional Program Manager" },
            { id: "b", label: "Only the student body president" },
            { id: "c", label: "A random teacher from another school" },
            { id: "d", label: "No one; teachers work completely alone" },
        ],
        correctOptionId: "a",
    },
];

export function scoreNewTeacherQuiz(answers: Record<string, string>) {
    const totalQuestions = newTeacherQuizQuestions.length;
    const score = newTeacherQuizQuestions.reduce((total,question) => {
        return answers[question.id] === question.correctOptionId ? total + 1 : total;
    }, 0);

    return {
        score,
        totalQuestions,
        passed: score >= Math.ceil(totalQuestions * 0.8),
    };
}
