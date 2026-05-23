import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "./profile/actions";
import LanguageActivator from "@/app/components/LanguageActivator";

export const revalidate = 0; // Disable caching to always get fresh stats

export default async function HomePage() {
  // Auth Check
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

  if (!user) {
    redirect("/login");
  }

  // --- FETCH DATA IN PARALLEL ---
  const [wordsResponse, reviewsResponse, dbLangsResponse, activeLangsResponse] = await Promise.all([
    supabase.from("words").select("id, language_code"),
    supabase.from("word_reviews").select("word_id, next_review_date").eq("user_id", user.id),
    supabase.from("languages").select("code, name").order("name"),
    supabase.from("user_active_languages").select("language_code").eq("user_id", user.id),
  ]);

  const allWords = wordsResponse.data || [];
  const allReviews = reviewsResponse.data || [];
  const dbLangs = dbLangsResponse.data || [];
  const activeLangCodes = activeLangsResponse.data?.map((item) => item.language_code) || [];

  // Cutoff date for reviews (reviews due today/tomorrow before 4 AM virtual day)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(4, 0, 0, 0);
  const reviewCutoff = tomorrow.toISOString();

  // Flag map helper
  const flagMap: Record<string, string> = {
    en: "🇬🇧",
    de: "🇩🇪",
    es: "🇪🇸",
    pt: "🇵🇹",
    it: "🇮🇹",
    zh: "🇨🇳",
    ja: "🇯🇵",
  };

  // Languages metadata list covering the 7 languages
  const languagesMetadata = [
    {
      code: "en",
      name: "Anglais",
      englishName: "English",
      flag: "🇬🇧",
      glowColor: "group-hover:shadow-blue-500/20",
      flagGlow: "shadow-blue-500/30 bg-blue-50 border-blue-100",
      accentBg: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
      accentText: "text-blue-600",
      progressBg: "from-blue-500 to-indigo-500",
    },
    {
      code: "es",
      name: "Espagnol",
      englishName: "Español",
      flag: "🇪🇸",
      glowColor: "group-hover:shadow-rose-500/20",
      flagGlow: "shadow-rose-500/30 bg-rose-50 border-rose-100",
      accentBg: "from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600",
      accentText: "text-rose-600",
      progressBg: "from-rose-500 to-orange-500",
    },
    {
      code: "de",
      name: "Allemand",
      englishName: "Deutsch",
      flag: "🇩🇪",
      glowColor: "group-hover:shadow-amber-500/20",
      flagGlow: "shadow-amber-500/30 bg-amber-50 border-amber-100",
      accentBg: "from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700",
      accentText: "text-amber-600",
      progressBg: "from-amber-500 to-yellow-500",
    },
    {
      code: "pt",
      name: "Portugais",
      englishName: "Português",
      flag: "🇵🇹",
      glowColor: "group-hover:shadow-emerald-500/20",
      flagGlow: "shadow-emerald-500/30 bg-emerald-50 border-emerald-100",
      accentBg: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
      accentText: "text-emerald-600",
      progressBg: "from-emerald-500 to-teal-500",
    },
    {
      code: "it",
      name: "Italien",
      englishName: "Italiano",
      flag: "🇮🇹",
      glowColor: "group-hover:shadow-teal-500/20",
      flagGlow: "shadow-teal-500/30 bg-teal-50 border-teal-100",
      accentBg: "from-teal-600 to-rose-600 hover:from-teal-700 hover:to-rose-700",
      accentText: "text-teal-600",
      progressBg: "from-teal-500 to-rose-500",
    },
    {
      code: "zh",
      name: "Chinois",
      englishName: "中文",
      flag: "🇨🇳",
      glowColor: "group-hover:shadow-red-500/20",
      flagGlow: "shadow-red-500/30 bg-red-50 border-red-100",
      accentBg: "from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-650",
      accentText: "text-red-600",
      progressBg: "from-red-500 to-amber-500",
    },
    {
      code: "ja",
      name: "Japonais",
      englishName: "日本語",
      flag: "🇯🇵",
      glowColor: "group-hover:shadow-rose-500/20",
      flagGlow: "shadow-rose-500/30 bg-rose-50 border-rose-100",
      accentBg: "from-rose-600 to-slate-700 hover:from-rose-700 hover:to-slate-800",
      accentText: "text-rose-600",
      progressBg: "from-rose-500 to-slate-500",
    },
  ];

  // Helper for available activator languages list
  const allLanguagesList = dbLangs.map((lang) => ({
    code: lang.code,
    name: lang.name,
    flag: flagMap[lang.code] || "🌐",
  }));

  // Match active metadata list
  const activeLanguagesMetadata = languagesMetadata.filter((lang) =>
    activeLangCodes.includes(lang.code)
  );

  // Calculate statistics in memory for active languages
  const activeLanguageStats = activeLanguagesMetadata.map((lang) => {
    const wordsForLang = allWords.filter((w) => w.language_code === lang.code);
    const totalWords = wordsForLang.length;
    const wordIds = new Set(wordsForLang.map((w) => w.id));

    const reviewsForLang = allReviews.filter((r) => wordIds.has(r.word_id));
    const learnedCount = reviewsForLang.length;

    const dueCount = reviewsForLang.filter((r) => r.next_review_date <= reviewCutoff).length;

    const progressPercent = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

    return {
      ...lang,
      totalWords,
      learnedCount,
      dueCount,
      progressPercent,
    };
  });

  // Calculate cumulative stats for active languages only
  const activeWordIds = new Set(
    allWords
      .filter((w) => activeLangCodes.includes(w.language_code))
      .map((w) => w.id)
  );
  const activeReviews = allReviews.filter((r) => activeWordIds.has(r.word_id));
  const totalLearnedActive = activeReviews.length;
  const totalDueActive = activeLanguageStats.reduce((sum, item) => sum + item.dueCount, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 md:p-8 font-sans relative overflow-hidden flex flex-col justify-start items-center">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full filter blur-3xl" />
        <div className="absolute top-1/3 right-[-200px] w-[500px] h-[500px] bg-violet-200/35 rounded-full filter blur-3xl" />
        <div className="absolute bottom-[-100px] left-1/4 w-[400px] h-[400px] bg-sky-200/30 rounded-full filter blur-3xl" />
      </div>

      <div className="max-w-4xl w-full space-y-8 z-10 pt-2 md:pt-6 flex-grow flex flex-col justify-between">
        <div className="space-y-8">
          {/* Modern Header Navigation */}
          <header className="flex items-center justify-between bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5 text-white"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  LingoDeck <span className="text-indigo-600">Med</span>
                </span>
                <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded-md">
                  FSRS v6
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                  {user.email}
                </div>
                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Espace Apprenant
                </div>
              </div>
              <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />
              <div className="flex items-center gap-2">
                <Link
                  href="/admin"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all duration-150"
                  title="Administration - Importation de mots"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.3"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.767.253.55.553 1.076.896 1.57a.64.64 0 001.07-.1v-2.143c0-.18.045-.355.13-.513a11.54 11.54 0 001.378-2.753 1.5 1.5 0 00-.73-1.808 11.536 11.536 0 01-1.378-2.753c-.085-.158-.13-.333-.13-.513V3.751a.64.64 0 00-1.07-.1 11.56 11.56 0 01-1.881 4.337 1.5 1.5 0 00-.73 1.808z" />
                  </svg>
                </Link>
                <Link
                  href="/profile"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl transition-all duration-150"
                  title="Profil & Configuration FSRS"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.983 6.983 0 0010 16a6.983 6.983 0 004.793-1.61A5.99 5.99 0 0010 12z" clipRule="evenodd" />
                  </svg>
                </Link>
                <form action={signOut} className="inline">
                  <button
                    type="submit"
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all duration-150"
                    title="Se déconnecter"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path fillRule="evenodd" d="M3 4.25A.75.75 0 013.75 3.5H9a.75.75 0 010 1.5H4.5v11A1.5 1.5 0 006 17.5h3a.75.75 0 010 1.5H6A3 3 0 013 16V4.25zm11.72 4.22a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h6.44l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </header>

          {/* Hero Segment */}
          <div className="text-center md:text-left space-y-2 max-w-xl">
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Tableau de Bord <span className="text-indigo-600">Général</span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
              Suivez votre mémorisation du vocabulaire médical et optimisez votre rétention avec l'algorithme intelligent FSRS.
            </p>
          </div>

          {/* General Stats Summary Strip */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 md:p-6 shadow-md border border-indigo-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-6 h-6 text-indigo-300"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-300 tracking-wide uppercase">Progression active cumulée</h3>
                  <p className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                    {totalLearnedActive} mots appris <span className="text-xs text-indigo-300 font-semibold">au total</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-sm self-start sm:self-center">
                <div className={`w-2.5 h-2.5 rounded-full ${totalDueActive > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                <span className="text-xs font-bold text-slate-200">
                  {totalDueActive > 0 ? `${totalDueActive} révisions actives à faire aujourd'hui` : "Toutes les révisions actives sont à jour !"}
                </span>
              </div>
            </div>
          </div>

          {/* Active Decks Grid */}
          {activeLanguageStats.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {activeLanguageStats.map((lang) => {
                const hasReviews = lang.dueCount > 0;
                const hasStarted = lang.learnedCount > 0;
                const isFinished = lang.learnedCount === lang.totalWords && lang.totalWords > 0;

                return (
                  <div
                    key={lang.code}
                    className={`group bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/50 hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden ${lang.glowColor}`}
                  >
                    {/* Glowing hover card effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

                    <div className="space-y-5">
                      {/* Header: Flag & Badges */}
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-2xl shadow-sm border flex items-center justify-center text-3xl select-none transition-transform duration-300 group-hover:scale-105 ${lang.flagGlow}`}>
                          {lang.flag}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {hasReviews ? (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse-short">
                              {lang.dueCount} à réviser
                            </span>
                          ) : hasStarted ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              À Jour ✓
                            </span>
                          ) : null}

                          {isFinished ? (
                            <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Complété 🏆
                            </span>
                          ) : !hasStarted ? (
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Nouveau
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              En cours
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Language info */}
                      <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                          {lang.name} <span className="text-xs text-slate-400 font-bold block mt-0.5">{lang.englishName} Médical</span>
                        </h2>
                      </div>

                      {/* Progress Bar container */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Progression</span>
                          <span>{lang.progressPercent}%</span>
                        </div>
                        <div className="overflow-hidden h-2 flex rounded-full bg-slate-100 border border-slate-200/30">
                          <div
                            style={{ width: `${lang.progressPercent}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r rounded-full transition-all duration-500 ${lang.progressBg}`}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex justify-between">
                          <span>{lang.learnedCount} appris</span>
                          <span>{lang.totalWords} mots</span>
                        </div>
                      </div>
                    </div>

                    {/* Button action */}
                    <div className="pt-6">
                      <Link
                        href={`/${lang.code}`}
                        className={`block w-full py-3 px-4 bg-gradient-to-r text-white font-extrabold text-sm rounded-2xl text-center active:scale-[0.98] transition-all duration-150 shadow-md ${lang.accentBg}`}
                      >
                        Ouvrir le Deck →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 p-8 space-y-3">
              <span className="text-4xl block">🌍</span>
              <h3 className="text-base font-bold text-slate-800">Aucune langue de travail active</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Veuillez utiliser le module "Mes Langues de Travail" ci-dessous pour activer les langues que vous souhaitez étudier !
              </p>
            </div>
          )}

          {/* Dynamic Language Activation Checklist */}
          <LanguageActivator allLanguages={allLanguagesList} activeCodes={activeLangCodes} />
        </div>

        {/* Footer info */}
        <footer className="text-center pt-10 text-xs text-slate-400 font-bold border-t border-slate-200/50 mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              LingoDeck v1.0 • Espace de travail de vocabulaire médical
            </div>
            <div className="flex items-center justify-center gap-4">
              <Link href="/admin" className="hover:text-indigo-600 transition-colors">
                Administration
              </Link>
              <span>•</span>
              <Link href="/profile" className="hover:text-indigo-600 transition-colors">
                Paramètres FSRS
              </Link>
              <span>•</span>
              <a href="https://github.com/open-spaced-repetition/fsrs4anki" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                En savoir plus sur FSRS
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
