// app/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

export async function selectLanguage(langCode: string) {
  const cookieStore = await cookies();

  cookieStore.set("last_language_preference", langCode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    sameSite: "lax",
  });

  redirect(`/${langCode}`);
}

export async function toggleLanguageActive(langCode: string, isActive: boolean) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() { },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Utilisateur non connecté" };
  }

  if (isActive) {
    const { error } = await supabase
      .from("user_active_languages")
      .insert({ user_id: user.id, language_code: langCode });
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("user_active_languages")
      .delete()
      .eq("user_id", user.id)
      .eq("language_code", langCode);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getUserActiveLanguages() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() { },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("user_active_languages")
    .select("language_code")
    .eq("user_id", user.id);

  return data?.map((item) => item.language_code) || [];
}
