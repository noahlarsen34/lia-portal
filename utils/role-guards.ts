import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UserRole =
  | "admin"
  | "rpm"
  | "teacher"
  | "district_liaison"
  | "student";

export function getHomePathForRole(role: string | null | undefined) {
  switch (role) {
    case "teacher":
      return "/teacher";
    case "district_liaison":
      return "/liaison";
    case "student":
      return "/student";
    case "admin":
    case "rpm":
    default:
      return "/dashboard";
  }
}

export async function requireAuth() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  
  if (!profile) {
    redirect("/login")
  }

  return { supabase, user, profile };
}

export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo?: string,
) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.profile.role as UserRole)) {
    redirect(redirectTo ?? getHomePathForRole(session.profile.role));
  }

  return session;
}

export async function requireAdmin(redirectTo?: string) {
  return requireRole(["admin"], redirectTo);
}

export async function requireStaff(redirectTo?: string) {
  return requireRole(["admin", "rpm"], redirectTo);
}

export async function requireTeacher(redirectTo?: string) {
  return requireRole(["admin", "teacher"], redirectTo);
}

export async function requireDistrictLiaison(redirectTo?: string) {
  const session = await requireRole(["district_liaison"], redirectTo);
  const { data: liaison } = await session.supabase
    .from("district_liaisons")
    .select("id, status, portal_access_status")
    .eq("profile_id", session.profile.id)
    .maybeSingle();

  if (
    !liaison ||
    liaison.status !== "active" ||
    liaison.portal_access_status !== "active"
  ) {
    await session.supabase.auth.signOut();
    redirect("/teacher-login?error=access-unavailable");
  }

  return { ...session, liaison };
}

export async function requireStudent(redirectTo?: string) {
  return requireRole(["admin", "student"], redirectTo);
}
