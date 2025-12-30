"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function searchDictionary(lang: string, query: string = "") {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  let dbQuery = supabase
    .from("sentences")
    .select("*")
    .eq("language_code", lang)
    .order("target_word", { ascending: true })
    .limit(50); // On limite à 50 résultats pour commencer (pagination plus tard)

  // Si on cherche quelque chose
  if (query.trim().length > 0) {
    // On cherche soit dans le mot cible (target_word), soit dans la phrase (display_text)
    // ilike = insensible à la casse (Majuscule/minuscule)
    dbQuery = dbQuery.or(
      `target_word.ilike.%${query}%,display_text.ilike.%${query}%`
    );
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Erreur recherche:", error);
    return [];
  }

  return data;
}
