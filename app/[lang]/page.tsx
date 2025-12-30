import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client"; // Assure-toi que le chemin est bon

// Type pour les props de la page (Next.js 15+)
type Props = {
  params: Promise<{ lang: string }>;
};

export default async function LanguageDashboard({ params }: Props) {
  // 1. On attend que les paramètres soient chargés
  const { lang } = await params;

  // Sécurité simple : Si la langue n'est pas dans notre liste, retour accueil
  const VALID_LANGS = ["en", "es", "de"];
  if (!VALID_LANGS.includes(lang)) {
    redirect("/");
  }

  // 2. Récupérer des (fausses) stats pour l'instant
  // Plus tard, on fera une vraie requête Supabase ici pour compter les cartes
  const stats = {
    dueReviews: 0,
    newCards: 0,
    totalCards: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-xl mx-auto space-y-8">
        {/* En-tête avec navigation simple */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wider">
            {lang} Dashboard
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            Changer de langue
          </Link>
        </header>

        {/* Bloc principal : État du jour */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Ta session du jour
            </h2>
            <p className="text-slate-500">
              Prêt à progresser en {lang === "en" ? "Anglais" : lang} ?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="text-3xl font-bold text-orange-600">
                {stats.dueReviews}
              </div>
              <div className="text-xs text-orange-800 font-medium uppercase mt-1">
                À réviser
              </div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="text-3xl font-bold text-indigo-600">
                {stats.newCards}
              </div>
              <div className="text-xs text-indigo-800 font-medium uppercase mt-1">
                Nouveaux
              </div>
            </div>
          </div>

          {/* Le gros bouton d'action */}
          <Link
            href={`/${lang}/learn`}
            className="block w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Lancer la session
          </Link>
        </div>

        {/* Liens utiles */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/${lang}/deck`}
            className="block p-4 bg-white rounded-xl border border-slate-200 text-center hover:border-indigo-300 transition-colors"
          >
            📚 Dictionnaire
          </Link>
          <Link
            href="/admin"
            className="block p-4 bg-white rounded-xl border border-slate-200 text-center hover:border-indigo-300 transition-colors"
          >
            ⚙️ Sync / Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
