"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DEFAULT_W } from "@/app/utils/fsrs";
import { optimizeFSRS } from "@/app/utils/fsrs_optimizer";

// 1. Déconnexion
export async function signOut() {
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

  await supabase.auth.signOut();
  redirect("/login");
}

// 2. Réinitialisation (Danger Zone)
export async function resetProgress() {
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

  if (user) {
    // Supprimer toutes les données associées à la progression de l'utilisateur
    await supabase.from("word_reviews").delete().eq("user_id", user.id);
    await supabase.from("review_logs").delete().eq("user_id", user.id);
    await supabase.from("user_fsrs_settings").delete().eq("user_id", user.id);
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Progression réinitialisée à 0." };
}

// 3. Récupérer l'info user
export async function getUserInfo() {
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
  return user;
}

// 4. Récupérer tous les réglages FSRS par langue pour l'utilisateur
export async function getAllFsrsSettings() {
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

  const { data } = await supabase
    .from("user_fsrs_settings")
    .select("language_code, weights")
    .eq("user_id", user.id);

  return data || [];
}

// 5. Recalculer les poids FSRS pour une langue spécifique
export async function recalculateFsrsSettings(lang: string) {
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
  if (!user) return { success: false, error: "Utilisateur non connecté." };

  // A. Récupérer les identifiants de tous les mots pour la langue donnée
  const { data: langWords } = await supabase
    .from("words")
    .select("id")
    .eq("language_code", lang);

  const wordIds = langWords?.map((w) => w.id) || [];
  if (wordIds.length === 0) {
    return { success: false, error: "Aucun mot enregistré pour cette langue." };
  }

  // B. Récupérer tous les logs de révision de l'utilisateur pour cette langue
  const { data: logs, error: logsError } = await supabase
    .from("review_logs")
    .select("word_id, rating, is_correct, reviewed_at")
    .eq("user_id", user.id)
    .in("word_id", wordIds);

  if (logsError) {
    return { success: false, error: logsError.message };
  }

  // C. Filtrer les logs pour s'assurer qu'on a le champ rating (sinon utiliser fallback)
  const formattedLogs = (logs || []).map((l) => ({
    word_id: l.word_id,
    rating: l.rating || (l.is_correct ? 3 : 1), // fallback si rating n'est pas encore enregistré
    reviewed_at: l.reviewed_at
  }));

  // D. Récupérer les poids FSRS actuels (ou DEFAULT_W)
  const { data: currentSettings } = await supabase
    .from("user_fsrs_settings")
    .select("weights")
    .eq("user_id", user.id)
    .eq("language_code", lang)
    .maybeSingle();

  const baseW = currentSettings?.weights || DEFAULT_W;

  // E. Lancer l'optimiseur
  const optimizedW = optimizeFSRS(formattedLogs, baseW);

  // Vérifier si l'optimisation a effectivement eu lieu (l'optimiseur renvoie les poids initiaux s'il n'y a pas assez de données)
  const isOptimized = JSON.stringify(optimizedW) !== JSON.stringify(baseW);
  if (!isOptimized && formattedLogs.length < 5) {
    return {
      success: false,
      error: `Pas assez de données de révisions pour la langue '${lang.toUpperCase()}' (minimum 5 révisions de cartes requises pour calibrer FSRS). Révisions enregistrées : ${formattedLogs.length}`
    };
  }

  // F. Enregistrer les poids optimisés
  const { error: upsertError } = await supabase
    .from("user_fsrs_settings")
    .upsert({
      user_id: user.id,
      language_code: lang,
      weights: optimizedW,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id,language_code"
    });

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  return { success: true, weights: optimizedW };
}

// 6. Réinitialiser les poids FSRS par défaut pour une langue spécifique
export async function resetFsrsSettings(lang: string) {
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
  if (!user) return { success: false, error: "Utilisateur non connecté." };

  const { error } = await supabase
    .from("user_fsrs_settings")
    .delete()
    .eq("user_id", user.id)
    .eq("language_code", lang);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
