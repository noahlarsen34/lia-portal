import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UserRole = "admin" | "rpm" | "teacher" | "student";

export function getHomePathForRole(role: string | null | undefined) {
  switch (role) {
    case "teacher":
      return "/teacher";
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

export async function requireStudent(redirectTo?: string) {
  return requireRole(["admin", "student"], redirectTo);
}
