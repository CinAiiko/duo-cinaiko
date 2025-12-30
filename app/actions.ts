// app/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectLanguage(langCode: string) {
  // CORRECTION : On doit attendre (await) le résultat de cookies()
  const cookieStore = await cookies();

  cookieStore.set("last_language_preference", langCode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
    sameSite: "lax",
  });

  redirect(`/${langCode}`);
}
