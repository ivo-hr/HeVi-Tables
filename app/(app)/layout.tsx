import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function ProtectedLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    return children;
  }

  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackName =
    user.user_metadata.full_name ??
    user.user_metadata.username ??
    user.email?.split("@")[0] ??
    "Amigo";
  const profile: Profile =
    data ??
    ({
      id: user.id,
      username: String(fallbackName).slice(0, 30),
      avatar_url: null,
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at
    } satisfies Profile);

  return <AppShell profile={profile}>{children}</AppShell>;
}
