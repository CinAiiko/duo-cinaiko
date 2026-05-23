"use client";

import { useState } from "react";
import { importJSONData } from "./actions";
import Link from "next/link";

export default function AdminPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setMessage({ text: "Veuillez coller du JSON avant d'importer.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await importJSONData(jsonInput);

      if (result.success) {
        setMessage({ text: result.message, type: "success" });
        setJsonInput(""); // On vide la zone de texte si succès
      } else {
        setMessage({ text: result.message, type: "error" });
      }
    } catch (err) {
      setMessage({
        text: "Une erreur inattendue s'est produite lors de l'importation.",
        type: "error",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 md:p-8 font-sans relative overflow-hidden flex flex-col justify-center items-center">
      {/* Decorative modern background glowing blur blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full filter blur-3xl" />
        <div className="absolute bottom-[-150px] right-[-150px] w-96 h-96 bg-violet-200/35 rounded-full filter blur-3xl" />
      </div>

      <div className="max-w-2xl w-full z-10 space-y-6">
        {/* Navigation back link */}
        <div className="flex items-center justify-start">
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
        </div>

        {/* Main Admin Box */}
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/50 space-y-6 relative overflow-hidden">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portail d'Administration</h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Importez du vocabulaire médical et des phrases d'exemples générés par Gemini au format JSON.
            </p>
          </div>

          {/* Form Zone */}
          <div className="text-left space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Coller le code JSON de Gemini
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              disabled={loading}
              rows={10}
              placeholder={`[\n  {\n    "language_code": "en",\n    "target_word": "imperative",\n    "part_of_speech": "nom",\n    "grammar_notes": "Present Simple, Singular Noun",\n    "lemma": "imperative",\n    "prefix": "",\n    "suffix": "ive",\n    "radical": "imperat",\n    "content_raw": "It is a moral {{imperative::impératif}} to help those in need.",\n    "display_text": "It is a moral [...] to help those in need.",\n    "answer_target": "imperative",\n    "hint": "impératif"\n  }\n]`}
              className="w-full p-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-mono text-xs text-slate-700 bg-slate-50/50 resize-y"
            />
          </div>

          {/* Action button */}
          <button
            onClick={handleImport}
            disabled={loading}
            className={`w-full py-4 px-6 font-extrabold text-white rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 ${
              loading
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/10 hover:shadow-indigo-600/20"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Importation et traitement en cours...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Importer les données</span>
              </>
            )}
          </button>

          {/* Feedback messages */}
          {message && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold border flex items-start gap-3 transition-all animate-fade-in ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border-red-200/50"
                  : "bg-green-50 text-green-700 border-green-200/50"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {message.type === "error" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.8-11.2a1 1 0 00-1.4-1.4L9 8.6 7.6 7.2a1 1 0 00-1.4 1.4l2.1 2.1a1 1 0 001.4 0l4.1-4.1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="leading-relaxed">{message.text}</p>
            </div>
          )}

          {/* Footer Information */}
          <footer className="pt-5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <Link
              href="/"
              className="hover:text-indigo-600 transition-colors uppercase tracking-wider"
            >
              ← Retour au choix des langues
            </Link>
            <span className="uppercase tracking-wider">Format : Tableau d'objets</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
