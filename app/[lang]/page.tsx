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

  const VALID_LANGS = ["en", "es", "de", "pt", "it", "zh", "ja"];
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

  const { data: langWords } = await supabase
    .from("words")
    .select("id")
    .eq("language_code", lang);

  const langWordIds = langWords?.map((w) => w.id) || [];
  const totalWordsCount = langWordIds.length;

  let learnedCount = 0;
  let dueCount = 0;
  let learnedTodayCount = 0;

  if (langWordIds.length > 0) {
    const { data: reviews } = await supabase
      .from("word_reviews")
      .select("next_review_date, created_at, last_reviewed_at")
      .eq("user_id", user.id)
      .in("word_id", langWordIds);

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
    totalWordsCount - learnedCount
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
    totalWordsCount > 0
      ? Math.round((learnedCount / totalWordsCount) * 100)
      : 0;

  const flagMap: Record<string, string> = {
    en: "🇬🇧",
    es: "🇪🇸",
    de: "🇩🇪",
    pt: "🇵🇹",
    it: "🇮🇹",
    zh: "🇨🇳",
    ja: "🇯🇵"
  };
  const nameMap: Record<string, string> = {
    en: "Anglais",
    es: "Espagnol",
    de: "Allemand",
    pt: "Portugais",
    it: "Italien",
    zh: "Chinois",
    ja: "Japonais"
  };
  const flag = flagMap[lang] || "🌐";
  const langName = nameMap[lang] || "Langue";

  // Define custom styles depending on the language for a tailored premium feel
  const theme = ({
    en: {
      flagGlow: "shadow-blue-500/20 bg-blue-50 border-blue-100",
      accentBg: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/10",
      accentText: "text-blue-600",
      barBg: "from-blue-500 to-indigo-500",
      btnBorder: "border-blue-600 text-blue-600 hover:bg-blue-50",
      glowBlob1: "bg-blue-200/30",
      glowBlob2: "bg-indigo-200/20",
    },
    es: {
      flagGlow: "shadow-rose-500/20 bg-rose-50 border-rose-100",
      accentBg: "from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/10",
      accentText: "text-rose-600",
      barBg: "from-rose-500 to-orange-500",
      btnBorder: "border-rose-500 text-rose-500 hover:bg-rose-50",
      glowBlob1: "bg-rose-200/30",
      glowBlob2: "bg-orange-200/20",
    },
    de: {
      flagGlow: "shadow-amber-500/20 bg-amber-50 border-amber-100",
      accentBg: "from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-amber-500/10",
      accentText: "text-amber-600",
      barBg: "from-amber-500 to-yellow-500",
      btnBorder: "border-amber-500 text-amber-500 hover:bg-amber-50",
      glowBlob1: "bg-amber-200/30",
      glowBlob2: "bg-yellow-200/20",
    },
    pt: {
      flagGlow: "shadow-emerald-500/20 bg-emerald-50 border-emerald-100",
      accentBg: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/10",
      accentText: "text-emerald-600",
      barBg: "from-emerald-500 to-teal-500",
      btnBorder: "border-emerald-600 text-emerald-600 hover:bg-emerald-50",
      glowBlob1: "bg-emerald-200/30",
      glowBlob2: "bg-teal-200/20",
    },
    it: {
      flagGlow: "shadow-teal-500/20 bg-teal-50 border-teal-100",
      accentBg: "from-teal-600 to-rose-600 hover:from-teal-700 hover:to-rose-700 shadow-teal-500/10",
      accentText: "text-teal-600",
      barBg: "from-teal-500 to-rose-500",
      btnBorder: "border-teal-600 text-teal-600 hover:bg-teal-50",
      glowBlob1: "bg-teal-200/30",
      glowBlob2: "bg-rose-200/20",
    },
    zh: {
      flagGlow: "shadow-red-500/20 bg-red-50 border-red-100",
      accentBg: "from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 shadow-red-500/10",
      accentText: "text-red-600",
      barBg: "from-red-500 to-amber-500",
      btnBorder: "border-red-600 text-red-600 hover:bg-red-50",
      glowBlob1: "bg-red-200/30",
      glowBlob2: "bg-amber-200/20",
    },
    ja: {
      flagGlow: "shadow-rose-500/20 bg-rose-50 border-rose-100",
      accentBg: "from-rose-600 to-slate-700 hover:from-rose-700 hover:to-slate-800 shadow-rose-500/10",
      accentText: "text-rose-600",
      barBg: "from-rose-500 to-slate-500",
      btnBorder: "border-rose-600 text-rose-600 hover:bg-rose-50",
      glowBlob1: "bg-rose-200/30",
      glowBlob2: "bg-slate-200/20",
    },
  } as Record<string, any>)[lang] || {
    flagGlow: "shadow-indigo-500/20 bg-indigo-50 border-indigo-100",
    accentBg: "from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/10",
    accentText: "text-indigo-600",
    barBg: "from-indigo-500 to-violet-500",
    btnBorder: "border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    glowBlob1: "bg-indigo-200/30",
    glowBlob2: "bg-violet-200/20",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 md:p-8 font-sans relative overflow-hidden flex flex-col justify-start items-center">
      {/* Decorative modern background glowing blur blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full filter blur-3xl ${theme.glowBlob1}`} />
        <div className={`absolute top-1/2 right-[-200px] -translate-y-1/2 w-[500px] h-[500px] rounded-full filter blur-3xl ${theme.glowBlob2}`} />
      </div>

      <div className="max-w-xl w-full space-y-6 z-10 pt-2 md:pt-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm transition-all"
            title="Retour au tableau de bord général"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <AutoTTSToggle initialValue={isAutoTTS} />
          </div>
        </div>

        {/* Header content with Flag */}
        <header className="bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-slate-200/50 shadow-sm flex items-center gap-4">
          <span className={`text-4xl shadow-sm rounded-2xl p-2 border flex items-center justify-center select-none ${theme.flagGlow}`}>
            {flag}
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {langName} <span className="text-xs font-bold text-slate-400">Médical</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
              Espace d'apprentissage & FSRS
            </p>
          </div>
        </header>

        {/* Main Stats Block: Progress & Objectives */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50 space-y-6">
          {/* Global Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Progression Globale</span>
              <span className={`font-extrabold px-2.5 py-1 rounded-lg border ${theme.accentText} bg-slate-50 border-slate-200/30`}>
                {learnedCount} / {totalWordsCount} mots ({globalProgressPercent}%)
              </span>
            </div>
            <div className="overflow-hidden h-2.5 flex rounded-full bg-slate-100 border border-slate-200/30">
              <div
                style={{ width: `${globalProgressPercent}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r rounded-full transition-all duration-500 ${theme.barBg}`}
              />
            </div>
          </div>

          {/* Daily Goal */}
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Objectif quotidien</span>
              <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                {learnedTodayCount} / {DAILY_GOAL} appris
              </span>
            </div>
            <div className="overflow-hidden h-2.5 flex rounded-full bg-slate-100 border border-slate-200/30">
              <div
                style={{
                  width: `${Math.min(100, (learnedTodayCount / DAILY_GOAL) * 100)}%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Status grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Reviews Count card */}
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100/70 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-amber-50/70 transition-all duration-200">
              <div className="absolute top-2.5 right-2.5 text-amber-500 opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-black text-amber-600 mb-0.5 tracking-tight">
                {dueCount}
              </span>
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                À Réviser
              </span>
            </div>

            {/* New words Count card */}
            <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/70 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-blue-50/70 transition-all duration-200">
              <div className="absolute top-2.5 right-2.5 text-blue-500 opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-3xl font-black text-blue-600 mb-0.5 tracking-tight">
                {newCardsToLearn}
              </span>
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                Nouveaux mots
              </span>
            </div>
          </div>
        </div>

        {/* Action section */}
        <div className="space-y-3">
          {canStartStandard ? (
            <Link
              href={`/${lang}/learn`}
              className={`block w-full py-4 bg-gradient-to-r text-white font-extrabold text-lg rounded-2xl shadow-lg text-center active:scale-[0.99] transition-all duration-150 relative overflow-hidden ${theme.accentBg}`}
            >
              Lancer la session ({standardSessionCount} mots)
            </Link>
          ) : (
            <div className="py-4 bg-slate-100 text-slate-500 font-bold text-base rounded-2xl border border-slate-200/80 flex items-center justify-center gap-2 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.8-11.2a1 1 0 00-1.4-1.4L9 8.6 7.6 7.2a1 1 0 00-1.4 1.4l2.1 2.1a1 1 0 001.4 0l4.1-4.1z" clipRule="evenodd" />
              </svg>
              <span>{isAllFinished ? "Tout est complété ! Félicitations ! 🏆" : "Objectif quotidien atteint ! À demain ! ✅"}</span>
            </div>
          )}

          {/* Bonus actions */}
          {canStartBonus && (
            <div className="pt-2 text-center animate-fade-in space-y-2">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Envie d'avancer plus vite ?
              </p>
              <Link
                href={`/${lang}/learn?mode=bonus`}
                className={`block w-full py-3 bg-white border-2 font-bold rounded-2xl text-center active:scale-[0.99] transition-all duration-100 shadow-sm flex items-center justify-center gap-1.5 ${theme.btnBorder}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795m-8.982 11.795l5.228-5.228m-5.228 5.228l-5.228-5.228M17.982 9.205L18 3l-8.982 11.795m8.982-11.795L13.77 8.43m4.212-5.225l-5.228 5.228" />
                </svg>
                Apprendre + 10 mots bonus
              </Link>
            </div>
          )}

          {/* Free Random review */}
          {canStartFreeReview && (
            <div className="pt-3 border-t border-slate-200/50 mt-4">
              <Link
                href={`/${lang}/learn?mode=review-all`}
                className="block w-full py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100/80 font-bold rounded-2xl text-center active:scale-[0.99] transition-all duration-100 text-sm flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
                Révision libre aléatoire (20 mots)
              </Link>
            </div>
          )}
        </div>

        {/* Lower Navigation links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/${lang}/deck`}
            className="group block p-5 bg-white rounded-3xl border border-slate-200/50 text-center hover:border-indigo-400 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-sm font-extrabold text-slate-700 group-hover:text-indigo-600 transition-colors">
              Dictionnaire
            </span>
          </Link>
          <Link
            href="/profile"
            className="group block p-5 bg-white rounded-3xl border border-slate-200/50 text-center hover:border-indigo-400 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <span className="text-sm font-extrabold text-slate-700 group-hover:text-indigo-600 transition-colors">
              Mon Profil
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
