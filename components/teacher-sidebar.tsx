import { requireTeacher } from "@/utils/role-guards";
import { TeacherSideBarClient } from "./teacher-sidebar-client";

export async function TeacherSidebar() {
    const { profile, user } = await requireTeacher();

    const displayName = profile.full_name ?? user.email ?? "LIA Teacher";

    return <TeacherSideBarClient displayName={displayName} />;
}