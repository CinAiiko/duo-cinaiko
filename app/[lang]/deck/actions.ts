"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function searchDictionary(lang: string, query: string = "") {
  const supabase = await getSupabaseClient();

  let dbQuery = supabase
    .from("words")
    .select("*, sentences(id, content_raw, hint, contextual_synonyms)")
    .eq("language_code", lang)
    .order("word", { ascending: true });

  if (query.trim().length > 0) {
    dbQuery = dbQuery.ilike("word", `%${query}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Erreur recherche:", error);
    return [];
  }

  return data;
}

export async function updateWord(wordId: string, payload: {
  word: string;
  part_of_speech?: string | null;
  grammar_notes?: string | null;
  lemma?: string | null;
  radical?: string | null;
  prefix?: string | null;
  suffix?: string | null;
}) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("words")
    .update({
      word: payload.word,
      part_of_speech: payload.part_of_speech || null,
      grammar_notes: payload.grammar_notes || null,
      lemma: payload.lemma || null,
      radical: payload.radical || null,
      prefix: payload.prefix || null,
      suffix: payload.suffix || null,
    })
    .eq("id", wordId);

  if (error) {
    console.error("Erreur updateWord:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteWord(wordId: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("words")
    .delete()
    .eq("id", wordId);

  if (error) {
    console.error("Erreur deleteWord:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function addSentence(payload: {
  wordId: string;
  targetWord: string;
  languageCode: string;
  contentRaw: string;
  hint: string;
  synonyms: string[];
}) {
  const supabase = await getSupabaseClient();

  // Parsing du contentRaw pour extraire display_text et answer_target
  const match = payload.contentRaw.match(/\{\{(.+?)::(.+?)\}\}/);
  let answer_target = payload.targetWord;
  let display_text = payload.contentRaw;
  let finalHint = payload.hint;

  if (match) {
    answer_target = match[1].trim();
    if (!finalHint) finalHint = match[2].trim();
    display_text = payload.contentRaw.replace(/\{\{(.+?)::(.+?)\}\}/g, "[...]");
  } else {
    // Si l'utilisateur n'a pas mis les accolades, on applique un remplacement simple du mot cible
    const wordRegex = new RegExp(`\\b${payload.targetWord}\\b`, "i");
    display_text = payload.contentRaw.replace(wordRegex, "[...]");
  }

  const { error } = await supabase
    .from("sentences")
    .insert({
      word_id: payload.wordId,
      language_code: payload.languageCode,
      content_raw: payload.contentRaw,
      display_text: display_text,
      answer_target: answer_target,
      hint: finalHint || null,
      target_word: payload.targetWord,
      contextual_synonyms: payload.synonyms || [],
    });

  if (error) {
    console.error("Erreur addSentence:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteSentence(sentenceId: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("sentences")
    .delete()
    .eq("id", sentenceId);

  if (error) {
    console.error("Erreur deleteSentence:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
