import { requireDistrictLiaison } from "@/utils/role-guards";
import { LiaisonSidebarClient } from "./liaison-sidebar-client";

export async function LiaisonSidebar() {
    const { profile, user } = await requireDistrictLiaison();
    const displayName = profile.full_name ?? user.email ?? "District Liaison";

    return <LiaisonSidebarClient displayName={displayName} />;
}
