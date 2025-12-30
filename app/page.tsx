import { selectLanguage } from "./actions";

// Pour l'instant, on met les langues en dur pour que ça marche tout de suite.
// Plus tard, on pourra les charger depuis la DB Supabase si tu veux.
const AVAILABLE_LANGUAGES = [
  { code: "en", name: "Anglais", flag: "🇬🇧" },
  { code: "es", name: "Espagnol", flag: "🇪🇸" },
  { code: "de", name: "Allemand", flag: "🇩🇪" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Titre */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            LingoDeck
          </h1>
          <p className="text-slate-500">
            Choisis une langue pour commencer ta session.
          </p>
        </div>

        {/* Grille des langues */}
        <div className="grid grid-cols-1 gap-4">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <LanguageButton key={lang.code} lang={lang} />
          ))}
        </div>
      </div>
    </main>
  );
}

// Petit composant bouton isolé pour la propreté
function LanguageButton({
  lang,
}: {
  lang: { code: string; name: string; flag: string };
}) {
  // On utilise bind pour passer l'argument 'code' à la server action
  const selectLanguageWithCode = selectLanguage.bind(null, lang.code);

  return (
    <form action={selectLanguageWithCode}>
      <button
        type="submit"
        className="w-full group relative flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">{lang.flag}</span>
          <span className="text-lg font-medium text-slate-700 group-hover:text-indigo-600">
            {lang.name}
          </span>
        </div>

        {/* Petite flèche qui bouge au survol */}
        <span className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform">
          →
        </span>
      </button>
    </form>
  );
}
