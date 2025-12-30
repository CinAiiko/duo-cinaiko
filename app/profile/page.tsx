"use client";

import { useState, useEffect } from "react";
import { signOut, resetProgress, getUserInfo } from "./actions";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getUserInfo().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleReset = async () => {
    // Double confirmation pour éviter les accidents
    if (
      !confirm(
        "⚠️ Es-tu sûr de vouloir tout effacer ? Ta progression (cartes apprises) sera perdue."
      )
    )
      return;

    setResetting(true);
    await resetProgress();
    setResetting(false);
    alert("Progression remise à zéro !");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        {/* En-tête */}
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            👨‍⚕️
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Mon Profil</h1>
          <p className="text-slate-500 mt-2">
            {loading ? "Chargement..." : user?.email || "Étudiant"}
          </p>
        </div>

        {/* Bloc Actions Principales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
            Compte
          </h2>

          <Link
            href="/"
            className="block w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl text-center transition-colors border border-slate-200"
          >
            ← Retour au choix des langues
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        {/* Zone de Danger */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">
            Zone Danger
          </h2>
          <p className="text-xs text-red-600/80 mb-4">
            Si tu veux recommencer ton apprentissage de zéro. Cette action est
            irréversible.
          </p>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            {resetting
              ? "Nettoyage en cours..."
              : "🗑️ Réinitialiser ma progression"}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-300">
          LingoDeck v1.0 • Médecine
        </div>
      </div>
    </div>
  );
}
