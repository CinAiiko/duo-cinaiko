"use server";

import { createClient } from "@/utils/supabase/client";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Algorithme simple de répétition (SM-2 simplifié)
function calculateNextReview(isCorrect: boolean, currentInterval: number) {
  if (!isCorrect) {
    // Si faux, on réinitialise à 0 (à revoir tout de suite ou demain)
    return { interval: 0, ease: 2.5 };
  }

  // Si juste :
  // Intervalle 0 (nouveau) -> 1 jour
  // Intervalle 1 -> 3 jours
  // Sinon -> x 2.5
  let newInterval =
    currentInterval === 0 ? 1 : Math.ceil(currentInterval * 2.5);
  return { interval: newInterval, ease: 2.5 };
}

export async function getSession(lang: string) {
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
  // NOTE: En mode dév local sans auth, on peut simuler un user,
  // mais ici Supabase va te bloquer si tu n'es pas "sign in".
  // Pour ce projet perso rapide, on va supposer que tu utilises la table reviews sans user_id strict
  // OU que tu as désactivé le RLS sur reviews temporairement.
  // -> Pour l'instant, on fait simple.

  // 1. Récupérer les RÉVISIONS DUES (Date < Maintenant)
  // On fait une requête qui joint la table 'sentences'
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, sentence:sentences(*)")
    .eq("sentence.language_code", lang) // Filtre par langue (nécessite config DB avancée)
    .lte("next_review_date", new Date().toISOString());

  // Petite astuce : filtrer la langue en JS car le filtrage profond Supabase est complexe
  const dueReviews = reviews
    ? reviews.filter(
        (r: any) => r.sentence && r.sentence.language_code === lang
      )
    : [];

  // 2. Récupérer des NOUVELLES cartes (Max 10)
  // On prend les phrases qui ne sont PAS dans la liste des reviews
  const reviewedSentenceIds = reviews?.map((r: any) => r.sentence_id) || [];

  let query = supabase
    .from("sentences")
    .select("*")
    .eq("language_code", lang)
    .limit(10);

  if (reviewedSentenceIds.length > 0) {
    // Exclure celles qu'on connait déjà
    query = query.not("id", "in", `(${reviewedSentenceIds.join(",")})`);
  }

  const { data: newCards } = await query;

  // 3. Formater tout ça proprement
  const sessionCards = [
    ...dueReviews.map((r: any) => ({
      ...r.sentence,
      review_id: r.id,
      interval: r.interval,
      type: "review",
    })),
    ...(newCards || []).map((s: any) => ({
      ...s,
      review_id: null,
      interval: 0,
      type: "new",
    })),
  ];

  // 4. Mélanger (Shuffle)
  return sessionCards.sort(() => Math.random() - 0.5);
}

export async function saveResult(
  cardId: string,
  sentenceId: string,
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

  // Calcul du prochain intervalle
  const { interval } = calculateNextReview(isCorrect, currentInterval);
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  // Si l'utilisateur n'est pas connecté (cas test), on ne sauvegarde pas ou on throw error
  if (!userId) return { error: "User not logged in" };

  if (currentInterval === 0 && !cardId) {
    // C'était une NOUVELLE carte -> INSERT
    await supabase.from("reviews").insert({
      user_id: userId,
      sentence_id: sentenceId,
      interval: interval,
      next_review_date: nextDate.toISOString(),
      repetition_count: isCorrect ? 1 : 0,
      first_studied_at: new Date().toISOString(),
    });
  } else {
    // C'était une RÉVISION -> UPDATE
    // Note: cardId ici correspond à l'ID de la review
    await supabase
      .from("reviews")
      .update({
        interval: interval,
        next_review_date: nextDate.toISOString(),
        repetition_count: isCorrect ? currentInterval + 1 : 0, // Simplifié
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", cardId); // On update la review existante
  }

  return { success: true };
}
