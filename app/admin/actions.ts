"use server";

import { createClient } from "@supabase/supabase-js";
import { parseCloze } from "@/app/utils/parser";

// TON LIEN GOOGLE SHEET
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRroAU_cx4ORWkXiBK-BaC9QFKfm7bjPcmJpRVAtDYaGhtkYtzxxGUojgAUTUdV2GEEaIojZsdQbE_v/pub?gid=0&single=true&output=csv";

export async function syncFromSheets() {
  console.log("🚀 [ADMIN] Démarrage de la Synchro Intelligente...");

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" }); // 'no-store' force à récupérer la version fraîche du Sheet
    if (!response.ok) throw new Error("Erreur lecture CSV");

    const csvText = await response.text();
    const rows = csvText.split("\n").slice(1);

    let stats = { added: 0, updated: 0, total: 0 };

    for (const row of rows) {
      if (!row.trim()) continue;

      const columns = row.split(",");
      if (columns.length < 6) continue; // On attend nos 6 colonnes

      const external_id = columns[0].trim();
      const language_code = columns[1].trim();
      const target_word = columns[2].trim();
      const part_of_speech = columns[3].trim();
      const grammar_notes = columns[4].trim();
      const content_raw = columns.slice(5).join(",").replace("\r", "").trim();

      if (!content_raw || !external_id) continue;

      const parsed = parseCloze(content_raw);
      stats.total++;

      // C'est ici que la magie opère
      const { error, data } = await supabaseAdmin.from("sentences").upsert(
        {
          external_id, // C'est la CLÉ de vérification
          language_code,
          target_word,
          part_of_speech, // Si tu as changé "Verbe" en "Nom" dans le sheet, ça se mettra à jour ici
          grammar_notes,
          content_raw,
          display_text: parsed.display_text,
          answer_target: parsed.answer_target,
          hint: parsed.hint,
        },
        {
          onConflict: "external_id", // Si cet ID existe...
          ignoreDuplicates: false, // ... on NE l'ignore PAS, on l'écrase (Update)
        }
      );

      if (error) console.error(`❌ Erreur ${external_id}:`, error.message);
    }

    return {
      success: true,
      message: `Synchro terminée ! ${stats.total} lignes traitées (Ajouts & Mises à jour confondus).`,
    };
  } catch (error: any) {
    return { success: false, message: "Erreur : " + error.message };
  }
}
