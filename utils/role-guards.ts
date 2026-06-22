import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function requireAdmin(redirectTo = "/dashboard") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(redirectTo);
  }

  return { supabase, user, profile };
}
