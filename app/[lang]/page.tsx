import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Type pour les props de la page (Next.js 15/16)
type Props = {
  params: Promise<{ lang: string }>;
};

export default async function LanguageDashboard({ params }: Props) {
  const { lang } = await params;

  // Sécurité Langue
  const VALID_LANGS = ["en", "es", "de"];
  if (!VALID_LANGS.includes(lang)) {
    redirect("/");
  }

  // 1. Connexion Supabase
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

  // 2. Récupérer l'utilisateur
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // Si pas connecté, oust !

  // 3. --- CALCULS STATISTIQUES ---

  // A. Compter le TOTAL de phrases disponibles dans cette langue
  const { count: totalSentences } = await supabase
    .from("sentences")
    .select("*", { count: "exact", head: true })
    .eq("language_code", lang);

  // B. Récupérer TOUTES les reviews de l'utilisateur pour cette langue
  // (On doit faire une jointure pour filtrer par langue, mais Supabase le gère mieux en 2 temps pour l'instant)
  // On récupère les IDs des phrases de cette langue d'abord
  const { data: sentences } = await supabase
    .from("sentences")
    .select("id")
    .eq("language_code", lang);

  const sentenceIds = sentences?.map((s) => s.id) || [];

  // Maintenant on cherche les reviews correspondant à ces phrases
  let dueCount = 0;
  let learnedCount = 0;

  if (sentenceIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("next_review_date")
      .eq("user_id", user.id)
      .in("sentence_id", sentenceIds);

    if (reviews) {
      learnedCount = reviews.length;
      // Une carte est "Due" si sa date est passée (< maintenant)
      const now = new Date().toISOString();
      dueCount = reviews.filter((r) => r.next_review_date <= now).length;
    }
  }

  // C. Calcul des Nouveaux (Total - Ceux déjà appris)
  // On plafonne à 0 pour éviter les bugs si synchro en cours
  const newCount = Math.max(0, (totalSentences || 0) - learnedCount);

  // D. Calcul Total Session (Ce qu'il y a à faire aujourd'hui)
  // On limite arbitrairement les "Nouveaux" à 10 par jour pour ne pas te noyer
  const NEW_CARDS_PER_DAY = 10;
  const todayNewCards = Math.min(newCount, NEW_CARDS_PER_DAY);
  const totalSession = dueCount + todayNewCards;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-8">
        {/* En-tête */}
        <header className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wider">
              {lang === "en"
                ? "Anglais"
                : lang === "es"
                ? "Espagnol"
                : "Allemand"}
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Dashboard Médecine
            </p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/" className="text-slate-400 hover:text-indigo-600">
              Langues
            </Link>
            <Link
              href="/admin"
              className="text-slate-400 hover:text-indigo-600"
            >
              Admin
            </Link>
          </div>
        </header>

        {/* Bloc État du jour */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Ta session du jour
            </h2>
            <p className="text-slate-500 text-sm">
              {totalSession > 0
                ? "Le cerveau est un muscle, entraîne-le."
                : "Tout est propre ! Repose tes neurones."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Carte À RÉVISER */}
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center">
              <span className="text-4xl font-bold text-orange-600 mb-1">
                {dueCount}
              </span>
              <span className="text-xs text-orange-800 font-bold uppercase tracking-widest">
                À Réviser
              </span>
            </div>

            {/* Carte NOUVEAUX */}
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center">
              <span className="text-4xl font-bold text-blue-600 mb-1">
                {todayNewCards}
              </span>
              <span className="text-xs text-blue-800 font-bold uppercase tracking-widest">
                Nouveaux
              </span>
            </div>
          </div>

          {/* Bouton d'action intelligent */}
          {totalSession > 0 ? (
            <Link
              href={`/${lang}/learn`}
              className="block w-full py-5 bg-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all"
            >
              Lancer la session ({totalSession})
            </Link>
          ) : (
            <button
              disabled
              className="block w-full py-5 bg-slate-100 text-slate-400 font-bold text-lg rounded-2xl cursor-not-allowed border border-slate-200"
            >
              Session terminée ✅
            </button>
          )}

          {/* Stats Globales Discrètes */}
          <div className="pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-400 font-medium uppercase tracking-widest">
            <span>Total Base : {totalSentences}</span>
            <span>Appris : {learnedCount}</span>
          </div>
        </div>

        {/* Menu Rapide */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/${lang}/deck`}
            className="group block p-4 bg-white rounded-2xl border border-slate-200 text-center hover:border-indigo-300 transition-colors"
          >
            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">
              📚
            </span>
            <span className="text-sm font-bold text-slate-600">
              Dictionnaire
            </span>
          </Link>
          <Link
            href="/profile"
            className="group block p-4 bg-white rounded-2xl border border-slate-200 text-center hover:border-indigo-300 transition-colors"
          >
            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">
              👤
            </span>
            <span className="text-sm font-bold text-slate-600">Mon Profil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
