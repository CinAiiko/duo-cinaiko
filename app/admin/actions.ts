"use server";

import { createClient } from "@supabase/supabase-js";

export async function importJSONData(jsonText: string) {
  console.log("🚀 [ADMIN] Démarrage de l'importation JSON...");

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let items: any[];
    try {
      items = JSON.parse(jsonText);
    } catch (e: any) {
      return { success: false, message: "Le format JSON est invalide : " + e.message };
    }

    if (!Array.isArray(items)) {
      return { success: false, message: "Le JSON doit être un tableau d'objets." };
    }

    let stats = { wordsUpserted: 0, sentencesUpserted: 0, total: items.length };

    for (const item of items) {
      const {
        language_code,
        target_word,
        part_of_speech,
        grammar_notes,
        lemma,
        prefix,
        suffix,
        radical,
        content_raw,
        display_text,
        answer_target,
        hint,
        contextual_synonyms
      } = item;

      if (!language_code || !target_word || !content_raw) {
        console.warn("⚠️ Élément ignoré (champs obligatoires manquants) :", item);
        continue;
      }

      // 1. Upsert du mot
      const { error: wordError, data: wordData } = await supabaseAdmin
        .from("words")
        .upsert(
          {
            language_code,
            word: target_word,
            part_of_speech: part_of_speech || null,
            grammar_notes: grammar_notes || null,
            lemma: lemma || null,
            prefix: prefix || null,
            suffix: suffix || null,
            radical: radical || null,
          },
          {
            onConflict: "language_code, word",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (wordError) {
        console.error(`❌ Erreur Mot ${target_word}:`, wordError.message);
        continue;
      }

      stats.wordsUpserted++;

      // 2. Recherche d'une phrase existante avec le même content_raw pour éviter les doublons
      const { data: existingSentence } = await supabaseAdmin
        .from("sentences")
        .select("id")
        .eq("content_raw", content_raw)
        .maybeSingle();

      const sentencePayload: any = {
        word_id: wordData.id,
        language_code,
        content_raw,
        display_text,
        answer_target,
        hint: hint || null,
        target_word, // Compatibilité
        part_of_speech: part_of_speech || null,
        grammar_notes: grammar_notes || null,
        contextual_synonyms: contextual_synonyms || [],
      };

      if (existingSentence) {
        sentencePayload.id = existingSentence.id;
      }

      // 3. Upsert de la phrase
      const { error: sentenceError } = await supabaseAdmin
        .from("sentences")
        .upsert(sentencePayload, {
          onConflict: "id",
        });

      if (sentenceError) {
        console.error(`❌ Erreur Phrase pour ${target_word}:`, sentenceError.message);
      } else {
        stats.sentencesUpserted++;
      }
    }

    // Comme les mots peuvent être répétés plusieurs fois dans les 5 phrases, on compte les mots uniques upsertés.
    return {
      success: true,
      message: `Importation terminée ! Les phrases et mots ont été importés avec succès.`,
    };
  } catch (error: any) {
    return { success: false, message: "Erreur : " + error.message };
  }
}
