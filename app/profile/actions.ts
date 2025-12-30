"use server";

import { createServerClient } from "@supabase/ssr"; // Correction import standard
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  // On récupère l'user pour être sûr de n'effacer que SA progression
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // On supprime toutes les entrées dans 'reviews' pour cet utilisateur
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: error.message };
    }
  }

  // On revalide tout pour mettre à jour les compteurs du dashboard
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
