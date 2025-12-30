"use server";

import { createClient } from "@supabase/supabase-js";
import { parseCloze } from "@/app/utils/parser";

// Mets ton lien Google Sheet ici
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRroAU_cx4ORWkXiBK-BaC9QFKfm7bjPcmJpRVAtDYaGhtkYtzxxGUojgAUTUdV2GEEaIojZsdQbE_v/pub?gid=0&single=true&output=csv";

export async function syncFromSheets() {
  console.log("🚀 [ADMIN] Démarrage de la synchro...");

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Impossible de lire le CSV Google Sheet");

    const csvText = await response.text();
    const rows = csvText.split("\n").slice(1);

    let count = 0;

    for (const row of rows) {
      if (!row.trim()) continue;

      const columns = row.split(",");
      if (columns.length < 4) continue;

      const external_id = columns[0].trim();
      const language_code = columns[1].trim();
      const content_raw = columns.slice(3).join(",").replace("\r", "").trim();

      if (!content_raw || !external_id) continue;

      const parsed = parseCloze(content_raw);

      const { error } = await supabaseAdmin.from("sentences").upsert(
        {
          external_id: external_id,
          language_code: language_code,
          content_raw: content_raw,
          display_text: parsed.display_text,
          answer_target: parsed.answer_target,
          hint: parsed.hint,
        },
        { onConflict: "external_id" }
      );

      if (error) {
        console.error(`❌ Erreur sur ${external_id}:`, error.message);
      } else {
        count++;
      }
    }

    return {
      success: true,
      message: `Succès ! ${count} phrases synchronisées.`,
    };
  } catch (error: any) {
    console.error("Erreur critique:", error);
    return { success: false, message: "Erreur : " + error.message };
  }
}
