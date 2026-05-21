"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calculateFSRS } from "../../utils/fsrs";

// Fonction utilitaire pour mélanger un tableau (Fisher-Yates)
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Fonction pour choisir une phrase au hasard pour chaque mot
function pickRandomSentencePerWord(words: any[], sentences: any[], reviews: any[] = []) {
  const result: any[] = [];
  for (const word of words) {
    const wordSentences = sentences.filter(s => s.word_id === word.id);
    if (wordSentences.length > 0) {
      const randomSentence = wordSentences[Math.floor(Math.random() * wordSentences.length)];
      const review = reviews.find(r => r.word_id === word.id) || {};
      result.push({
        ...randomSentence,
        // on attache les infos du mot pour l'affichage si besoin
        target_word: word.word,
        part_of_speech: word.part_of_speech,
        grammar_notes: word.grammar_notes,
        lemma: word.lemma,
        prefix: word.prefix,
        suffix: word.suffix,
        radical: word.radical,
        word_id: word.id,
        // on propage les variables FSRS
        stability: review.stability || 0,
        difficulty: review.difficulty || 0,
        state: review.state || 0,
        last_reviewed_at: review.last_reviewed_at || null,
        interval: review.interval || 0,
      });
    }
  }
  return result;
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
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // A. IDs des mots de cette langue
  const { data: langWords } = await supabase
    .from("words")
    .select("*")
    .eq("language_code", lang);

  const langWordIds = langWords?.map((w) => w.id) || [];
  if (langWordIds.length === 0) return [];

  // On récupère toutes les phrases de cette langue en une fois pour la sélection aléatoire
  const { data: allSentences } = await supabase
    .from("sentences")
    .select("*")
    .eq("language_code", lang);

  const sentences = allSentences || [];

  // --- MODE RÉVISION LIBRE (REVIEW-ALL) ---
  if (mode === "review-all") {
    const { data: allReviews } = await supabase
      .from("word_reviews")
      .select("*")
      .eq("user_id", user.id)
      .in("word_id", langWordIds);

    if (!allReviews || allReviews.length === 0) return [];

    const selectedReviews = shuffleArray([...allReviews]).slice(0, 20);
    const reviewWordIds = selectedReviews.map((r) => r.word_id);

    const selectedWords = langWords!.filter(w => reviewWordIds.includes(w.id));
    
    let finalCards = pickRandomSentencePerWord(selectedWords, sentences, selectedReviews);
    finalCards = finalCards.map(c => ({ ...c, type: "review", mode: "free" }));

    return shuffleArray(finalCards);
  }

  // --- MODES CLASSIQUES (Standard / Bonus) ---
  let reviewsDue: any[] = [];

  if (mode === "standard") {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(4, 0, 0, 0);
    const cutoffDate = tomorrow.toISOString();

    const { data: reviews } = await supabase
      .from("word_reviews")
      .select("*")
      .eq("user_id", user.id)
      .in("word_id", langWordIds)
      .lte("next_review_date", cutoffDate);

    if (reviews && reviews.length > 0) {
      const reviewWordIds = reviews.map((r) => r.word_id);
      const selectedWords = langWords!.filter(w => reviewWordIds.includes(w.id));
      
      reviewsDue = pickRandomSentencePerWord(selectedWords, sentences, reviews);
      reviewsDue = reviewsDue.map(c => ({ ...c, type: "review" }));
      reviewsDue = shuffleArray(reviewsDue);
    }
  }

  // C. Quota Nouveaux Mots
  let newCardsLimit = 0;
  if (mode === "bonus") {
    newCardsLimit = 10;
  } else {
    const currentVirtualDayStart = new Date();
    if (currentVirtualDayStart.getHours() < 4) {
      currentVirtualDayStart.setDate(currentVirtualDayStart.getDate() - 1);
    }
    currentVirtualDayStart.setHours(4, 0, 0, 0);

    const { data: todaysReviews } = await supabase
      .from("word_reviews")
      .select("created_at, last_reviewed_at")
      .eq("user_id", user.id)
      .in("word_id", langWordIds);

    const learnedToday = todaysReviews?.filter((r) => {
      const d = r.created_at || r.last_reviewed_at;
      return d && new Date(d) >= currentVirtualDayStart;
    }).length || 0;

    const DAILY_GOAL = 10;
    newCardsLimit = Math.max(0, DAILY_GOAL - learnedToday);
  }

  // D. Récupération Nouvelles Cartes
  let newCards: any[] = [];
  if (newCardsLimit > 0) {
    const { data: learnedData } = await supabase
      .from("word_reviews")
      .select("word_id")
      .eq("user_id", user.id)
      .in("word_id", langWordIds);

    const learnedIds = learnedData?.map((r) => r.word_id) || [];

    const unlearnedWords = langWords!.filter(w => !learnedIds.includes(w.id));
    // Tri optionnel si on veut un ordre, sinon on prend les N premiers
    const selectedNewWords = unlearnedWords.slice(0, newCardsLimit);
    if (selectedNewWords.length > 0) {
      newCards = pickRandomSentencePerWord(selectedNewWords, sentences);
      newCards = shuffleArray(newCards).map(c => ({ ...c, type: "new", interval: 0 }));
    }
  }

  return shuffleArray([...reviewsDue, ...newCards]);
}

// --- 2. SAUVEGARDE DU RÉSULTAT ---
export async function saveResult(
  word_id: string,
  sentence_id: string,
  rating: number // 1: Again, 2: Hard, 3: Good, 4: Easy
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  // 1. Sauvegarde de l'historique de la phrase
  await supabase.from("review_logs").insert({
    user_id: user.id,
    word_id: word_id,
    sentence_id: sentence_id,
    is_correct: rating >= 2
  });

  // 2. Récupération pour SRS du mot (on récupère toutes les colonnes FSRS)
  const { data: existingReview, error: fetchError } = await supabase
    .from("word_reviews")
    .select("id, stability, difficulty, state, last_reviewed_at")
    .eq("user_id", user.id)
    .eq("word_id", word_id)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };

  // 3. Calcul FSRS
  const fsrs = calculateFSRS(rating, existingReview);

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + fsrs.interval);

  const payload = {
    next_review_date: nextDate.toISOString(),
    interval: fsrs.interval,
    stability: fsrs.stability,
    difficulty: fsrs.difficulty,
    state: fsrs.state,
    last_reviewed_at: new Date().toISOString(),
  };

  let saveError = null;

  if (existingReview) {
    const { error } = await supabase
      .from("word_reviews")
      .update(payload)
      .eq("id", existingReview.id);
    saveError = error;
  } else {
    const { error } = await supabase
      .from("word_reviews")
      .insert({ user_id: user.id, word_id: word_id, first_studied_at: new Date().toISOString(), ...payload });
    saveError = error;
  }

  if (saveError) return { success: false, error: saveError.message };
  return { success: true };
}
