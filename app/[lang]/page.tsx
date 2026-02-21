import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AutoTTSToggle from "@/app/components/AutoTTSToggle";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function LanguageDashboard({ params }: Props) {
  const { lang } = await params;

  const VALID_LANGS = ["en", "es", "de"];
  if (!VALID_LANGS.includes(lang)) redirect("/");

  const cookieStore = await cookies();

  // --- Lecture de la préférence Auto TTS ---
  const autoTTSCookie = cookieStore.get("autoTTS")?.value;
  const isAutoTTS = autoTTSCookie === "true";

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
  if (!user) redirect("/login");

  // --- 1. DÉFINITION DES DATES ---

  const nowObj = new Date();
  const tomorrow = new Date(nowObj);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(4, 0, 0, 0);
  const reviewCutoff = tomorrow.toISOString();

  const currentVirtualDayStart = new Date(nowObj);
  if (currentVirtualDayStart.getHours() < 4) {
    currentVirtualDayStart.setDate(currentVirtualDayStart.getDate() - 1);
  }
  currentVirtualDayStart.setHours(4, 0, 0, 0);

  // --- 2. RÉCUPÉRATION DES DONNÉES ---

  const { data: sentences } = await supabase
    .from("sentences")
    .select("id")
    .eq("language_code", lang);

  const sentenceIds = sentences?.map((s) => s.id) || [];
  const totalSentencesCount = sentenceIds.length;

  let learnedCount = 0;
  let dueCount = 0;
  let learnedTodayCount = 0;

  if (sentenceIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("next_review_date, created_at, last_reviewed_at")
      .eq("user_id", user.id)
      .in("sentence_id", sentenceIds);

    if (reviews) {
      learnedCount = reviews.length;

      dueCount = reviews.filter(
        (r) => r.next_review_date <= reviewCutoff
      ).length;

      learnedTodayCount = reviews.filter((r) => {
        const dateString = r.created_at || r.last_reviewed_at;
        if (!dateString) return false;
        return new Date(dateString) >= currentVirtualDayStart;
      }).length;
    }
  }

  // --- 3. CALCULS DE SESSION ---

  const DAILY_GOAL = 10;

  const trueUnlearnedRemaining = Math.max(
    0,
    totalSentencesCount - learnedCount
  );

  const dailyQuotaRemaining = Math.max(0, DAILY_GOAL - learnedTodayCount);
  const newCardsToLearn = Math.min(dailyQuotaRemaining, trueUnlearnedRemaining);
  const standardSessionCount = dueCount + newCardsToLearn;

  const canStartStandard = standardSessionCount > 0;
  const canStartBonus =
    dailyQuotaRemaining === 0 && dueCount === 0 && trueUnlearnedRemaining > 0;
  const isAllFinished = trueUnlearnedRemaining === 0 && dueCount === 0;
  const canStartFreeReview = learnedCount > 0;

  // Calcul du pourcentage de progression globale
  const globalProgressPercent =
    totalSentencesCount > 0
      ? Math.round((learnedCount / totalSentencesCount) * 100)
      : 0;

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
          <div className="flex flex-col items-end gap-3">
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
            {/* Toggle de Lecture Automatique */}
            <AutoTTSToggle initialValue={isAutoTTS} />
          </div>
        </header>

        {/* Bloc Principal */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center space-y-6">
          {/* Section Objectifs et Progression */}
          <div className="space-y-5">
            {/* Objectif du jour */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Objectif du jour
              </h2>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                    {learnedTodayCount} / {DAILY_GOAL}
                  </span>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-100">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        (learnedTodayCount / DAILY_GOAL) * 100
                      )}%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                  ></div>
                </div>
              </div>
            </div>

            {/* Progression Globale */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Progression globale
                </span>
                <span className="text-xs font-bold text-green-600">
                  {learnedCount} / {totalSentencesCount} mots (
                  {globalProgressPercent}%)
                </span>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100">
                <div
                  style={{ width: `${globalProgressPercent}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* À REVOIR */}
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center">
              <span className="text-3xl font-bold text-orange-600 mb-1">
                {dueCount}
              </span>
              <span className="text-[10px] text-orange-800 font-bold uppercase tracking-widest">
                À Revoir
              </span>
            </div>

            {/* NOUVEAUX */}
            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center">
              <span className="text-3xl font-bold text-blue-600 mb-1">
                {newCardsToLearn}
              </span>
              <span className="text-[10px] text-blue-800 font-bold uppercase tracking-widest">
                Nouveaux
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="space-y-3">
            {/* BOUTON STANDARD */}
            {canStartStandard ? (
              <Link
                href={`/${lang}/learn`}
                className="block w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all"
              >
                Lancer la session ({standardSessionCount})
              </Link>
            ) : (
              <div className="py-4 bg-slate-100 text-slate-400 font-bold text-lg rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
                <span>
                  {isAllFinished ? "Tout est fini ! 🏆" : "Objectif atteint ✅"}
                </span>
              </div>
            )}

            {/* BOUTON BONUS */}
            {canStartBonus && (
              <div className="animate-fade-in">
                <p className="text-xs text-slate-400 mb-2">
                  Envie d'avancer plus vite ?
                </p>
                <Link
                  href={`/${lang}/learn?mode=bonus`}
                  className="block w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-colors"
                >
                  + 10 Mots Bonus 🚀
                </Link>
              </div>
            )}

            {/* BOUTON RÉVISION LIBRE */}
            {canStartFreeReview && (
              <div className="pt-2 border-t border-slate-100 mt-4">
                <p className="text-xs text-slate-400 mb-2 mt-2">
                  Réviser sans pression
                </p>
                <Link
                  href={`/${lang}/learn?mode=review-all`}
                  className="block w-full py-3 bg-purple-50 text-purple-700 border border-purple-100 font-bold rounded-2xl hover:bg-purple-100 transition-colors"
                >
                  ⚡️ Révision Aléatoire (20 mots)
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
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
