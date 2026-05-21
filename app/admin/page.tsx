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
        text: "Une erreur inattendue s'est produite.",
        type: "error",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full text-center space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Administration</h1>
          <p className="text-sm text-slate-400 mt-2">
            Importez directement des mots et phrases générés par Gemini au format JSON.
          </p>
        </div>

        <div className="text-left space-y-2">
          <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider">
            Coller le JSON généré par Gemini
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            disabled={loading}
            rows={12}
            placeholder={`[\n  {\n    "language_code": "en",\n    "target_word": "imperative",\n    "part_of_speech": "nom",\n    "grammar_notes": "Present Simple, Singular Noun",\n    "lemma": "imperative",\n    "prefix": "",\n    "suffix": "ive",\n    "radical": "imperat",\n    "content_raw": "It is a moral {{imperative::impératif}} to help those in need.",\n    "display_text": "It is a moral [...] to help those in need.",\n    "answer_target": "imperative",\n    "hint": "impératif"\n  }\n]`}
            className="w-full p-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-xs text-slate-700 bg-slate-50/50 resize-y"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={loading}
          className={`w-full py-4 px-6 font-bold text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
            loading ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importation en cours...
            </>
          ) : (
            "📥 Importer les données"
          )}
        </button>

        {message && (
          <div
            className={`p-4 rounded-2xl text-sm border font-medium ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border-red-100"
                : "bg-green-50 text-green-700 border-green-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider transition-colors"
          >
            ← Retour au Dashboard
          </Link>
          <span className="text-slate-300">Format : Array JSON</span>
        </div>
      </div>
    </div>
  );
}
