import { redirect } from "next/navigation";

type TutoringLogRedirectPageProps = {
    params: Promise<{
        classId: string;
        logId: string;
    }>;
};

export default async function TutoringLogRedirectPage({
    params,
}: TutoringLogRedirectPageProps) {
    const { classId, logId } = await params;

    redirect(`/teacher/classes/${classId}/tutoring?editLogId=${logId}`);
}
