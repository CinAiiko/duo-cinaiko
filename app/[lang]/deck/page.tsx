"use client";

import { useState, useEffect } from "react";
import { searchDictionary } from "./actions";
import { useParams } from "next/navigation";
import Link from "next/link";
import { speak } from "@/app/utils/tts";

export default function DeckPage() {
  const { lang } = useParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recherche automatique (Debounce)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      // @ts-ignore
      const data = await searchDictionary(lang as string, query);
      setResults(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, lang]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* En-tête + Retour */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📚 Dictionnaire{" "}
            <span className="text-slate-400 text-sm font-normal">
              ({results.length})
            </span>
          </h1>
          <Link
            href={`/${lang}`}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            ← Retour
          </Link>
        </div>

        {/* Barre de Recherche */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-slate-400 text-lg">🔍</span>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un mot, une phrase..."
            className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm group-hover:border-slate-300"
            autoFocus
          />
        </div>

        {/* Liste des Résultats */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              Chargement...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500">
                Aucun résultat trouvé pour "{query}".
              </p>
            </div>
          ) : (
            results.map((card) => (
              <div
                key={card.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {/* Bouton Audio */}
                    <button
                      onClick={() => speak(card.content_raw, lang as string)}
                      className="text-slate-300 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-indigo-50"
                      title="Écouter"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6"
                      >
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                      </svg>
                    </button>

                    {/* Le Mot Cible */}
                    <h3 className="text-xl font-bold text-slate-800">
                      {card.target_word || card.hint}
                    </h3>

                    {/* Badges */}
                    <div className="flex gap-2">
                      {card.part_of_speech && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          {card.part_of_speech}
                        </span>
                      )}
                      {card.grammar_notes && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                          {card.grammar_notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ID Discret */}
                  <span className="text-[10px] text-slate-300 font-mono hidden md:block">
                    {card.external_id}
                  </span>
                </div>

                {/* Phrase Contextuelle (Nettoyée pour la lecture) */}
                <p className="text-slate-600 leading-relaxed">
                  {card.content_raw.replace(
                    /\{\{(.+?)::(.+?)\}\}/g,
                    (match: any, p1: string, p2: string) => p1
                  )}
                </p>

                {/* Traduction / Indice */}
                <p className="text-xs text-slate-400 mt-1 italic">
                  Traduction : {card.hint}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
