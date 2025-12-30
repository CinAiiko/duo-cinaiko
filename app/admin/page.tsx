"use client";

import { useState } from "react";
import { syncFromSheets } from "./actions";
import Link from "next/link";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await syncFromSheets();

      if (result.success) {
        setMessage({ text: result.message, type: "success" });
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
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Administration</h1>

        <p className="text-sm text-slate-500">
          Met à jour la base de données via Google Sheet.
        </p>

        <button
          onClick={handleSync}
          disabled={loading}
          className={`w-full py-3 px-4 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            loading ? "bg-slate-300" : "bg-indigo-600 text-white"
          }`}
        >
          {loading ? "Traitement..." : "🔄 Lancer la Synchronisation"}
        </button>

        {message && (
          <div
            className={`p-4 rounded-lg text-sm border ${
              message.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
