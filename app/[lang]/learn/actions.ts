"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Fonction utilitaire pour mélanger un tableau (Fisher-Yates)
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- 1. RÉCUPÉRATION DE LA SESSION ---
export async function getSession(
  lang: string,
  mode: "standard" | "bonus" | "review-all" = "standard"
) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // A. IDs des phrases de cette langue
  const { data: langSentences } = await supabase
    .from("sentences")
    .select("id")
    .eq("language_code", lang);

  const langSentenceIds = langSentences?.map((s) => s.id) || [];
  if (langSentenceIds.length === 0) return [];

  // --- MODE RÉVISION LIBRE (REVIEW-ALL) ---
  if (mode === "review-all") {
    // 1. On récupère TOUT l'historique
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("sentence_id, interval, ease_factor, created_at")
      .eq("user_id", user.id)
      .in("sentence_id", langSentenceIds);

    if (!allReviews || allReviews.length === 0) return [];

    // 2. On mélange TOUT l'historique et on en garde 20
    const selectedReviews = shuffleArray([...allReviews]).slice(0, 20);
    const reviewIds = selectedReviews.map((r) => r.sentence_id);

    // 3. On récupère le contenu des phrases
    const { data: sentences } = await supabase
      .from("sentences")
      .select("*")
      .in("id", reviewIds);

    // 4. On combine les données
    const finalCards =
      sentences?.map((s) => ({
        ...s,
        type: "review",
        mode: "free",
        ...selectedReviews.find((r) => r.sentence_id === s.id),
      })) || [];

    // 5. IMPORTANT : On remélange le résultat final pour l'affichage
    // (Car l'étape 3 peut avoir renvoyé les phrases triées par ID)
    return shuffleArray(finalCards);
  }

  // --- MODES CLASSIQUES (Standard / Bonus) ---

  // B. Révisions dues
  let reviewsDue: any[] = [];

  if (mode === "standard") {
    // Logique "Night Owl" (Jusqu'à demain 4h00)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(4, 0, 0, 0);
    const cutoffDate = tomorrow.toISOString();

    const { data: reviews } = await supabase
      .from("reviews")
      .select("sentence_id, interval, ease_factor, created_at")
      .eq("user_id", user.id)
      .in("sentence_id", langSentenceIds)
      .lte("next_review_date", cutoffDate);

    if (reviews && reviews.length > 0) {
      const reviewIds = reviews.map((r) => r.sentence_id);
      const { data: sentences } = await supabase
        .from("sentences")
        .select("*")
        .in("id", reviewIds);

      reviewsDue =
        sentences?.map((s) => ({
          ...s,
          type: "review",
          ...reviews.find((r) => r.sentence_id === s.id),
        })) || [];

      // On mélange les révisions pour ne pas avoir un ordre prévisible
      reviewsDue = shuffleArray(reviewsDue);
    }
  }

  // C. Quota Nouveaux Mots
  let newCardsLimit = 0;
  if (mode === "bonus") {
    newCardsLimit = 10;
  } else {
    // Calcul précis avec règle des 4h du matin pour la journée en cours
    const currentVirtualDayStart = new Date();
    if (currentVirtualDayStart.getHours() < 4) {
      currentVirtualDayStart.setDate(currentVirtualDayStart.getDate() - 1);
    }
    currentVirtualDayStart.setHours(4, 0, 0, 0);

    const { data: todaysReviews } = await supabase
      .from("reviews")
      .select("created_at, last_reviewed_at")
      .eq("user_id", user.id)
      .in("sentence_id", langSentenceIds);

    const learnedToday =
      todaysReviews?.filter((r) => {
        const d = r.created_at || r.last_reviewed_at;
        return d && new Date(d) >= currentVirtualDayStart;
      }).length || 0;

    const DAILY_GOAL = 10;
    newCardsLimit = Math.max(0, DAILY_GOAL - learnedToday);
  }

  // D. Récupération Nouvelles Cartes (Priorité Ordre Logique + Mélange)
  let newCards: any[] = [];
  if (newCardsLimit > 0) {
    const { data: learnedData } = await supabase
      .from("reviews")
      .select("sentence_id")
      .eq("user_id", user.id)
      .in("sentence_id", langSentenceIds);

    const learnedIds = learnedData?.map((r) => r.sentence_id) || [];

    let query = supabase
      .from("sentences")
      .select("*")
      .eq("language_code", lang)
      // MODIFICATION ICI : Tri par external_id pour suivre l'ordre logique (en-01, en-02...)
      .order("external_id", { ascending: true });

    if (learnedIds.length > 0) {
      // Exclut les phrases déjà apprises (ce qui permet de combler les "trous")
      query = query.not("id", "in", `(${learnedIds.join(",")})`);
    }

    const { data: sentences } = await query.limit(newCardsLimit);

    // Mélange pour l'affichage (optionnel, mais garde la session variée si on en apprend plusieurs)
    const shuffledSentences = sentences ? shuffleArray(sentences) : [];

    newCards = shuffledSentences.map((s) => ({
      ...s,
      type: "new",
      interval: 0,
    }));
  }

  // On retourne le tout (Révisions d'abord, puis Nouveaux)
  return [...reviewsDue, ...newCards];
}

// --- 2. SAUVEGARDE DU RÉSULTAT ---
export async function saveResult(
  review_id: string | null,
  sentence_id: string,
  isCorrect: boolean,
  currentInterval: number
) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  // 1. ON RÉCUPÈRE D'ABORD LA CARTE POUR LIRE SON EASE FACTOR ACTUEL
  const { data: existingReview, error: fetchError } = await supabase
    .from("reviews")
    .select("id, ease_factor")
    .eq("user_id", user.id)
    .eq("sentence_id", sentence_id)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };

  // 2. INITIALISATION DES VARIABLES
  // S'il n'y a pas d'historique, on part sur la valeur par défaut de 2.5
  let currentEase = existingReview?.ease_factor
    ? existingReview.ease_factor
    : 2.5;
  let nextInterval = 1;

  // 3. CALCULS DYNAMIQUES DE L'INTERVALLE ET DE L'EASE FACTOR
  if (isCorrect) {
    // Calcul de l'intervalle
    if (currentInterval === 0) nextInterval = 1;
    else if (currentInterval === 1) nextInterval = 3;
    else nextInterval = Math.max(1, Math.round(currentInterval * currentEase));

    // Bonus de facilité : La carte est plus facile qu'avant (+0.1)
    // On met un plafond (max) à 3.0 pour éviter des intervalles absurdes au bout de 10 réussites.
    currentEase = Math.min(3.0, currentEase + 0.1);
  } else {
    // L'intervalle retombe à 1 jour (tu peux aussi tester currentInterval * 0.5 si tu trouves ça trop punitif)
    nextInterval = 1;

    // Malus de facilité : La carte est difficile (-0.2)
    // On met un plancher (min) à 1.3 (Règle d'or de SuperMemo pour éviter l'"Ease Hell")
    currentEase = Math.max(1.3, currentEase - 0.2);
  }

  // 4. PRÉPARATION DE LA SAUVEGARDE
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + nextInterval);

  const payload = {
    next_review_date: nextDate.toISOString(),
    interval: nextInterval,
    ease_factor: Number(currentEase.toFixed(2)), // On arrondit à 2 décimales (ex: 2.60)
    last_reviewed_at: new Date().toISOString(),
  };

  let saveError = null;

  if (existingReview) {
    const { error } = await supabase
      .from("reviews")
      .update(payload)
      .eq("id", existingReview.id);
    saveError = error;
  } else {
    const { error } = await supabase
      .from("reviews")
      .insert({ user_id: user.id, sentence_id: sentence_id, ...payload });
    saveError = error;
  }

  if (saveError) return { success: false, error: saveError.message };
  return { success: true };
}
