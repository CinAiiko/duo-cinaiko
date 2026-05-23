"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleLanguageActive } from "@/app/actions";

type LanguageItem = {
  code: string;
  name: string;
  flag: string;
};

type Props = {
  allLanguages: LanguageItem[];
  activeCodes: string[];
};

export default function LanguageActivator({ allLanguages, activeCodes }: Props) {
  const router = useRouter();
  const [loadingCodes, setLoadingCodes] = useState<string[]>([]);

  const handleToggle = async (code: string, isCurrentlyActive: boolean) => {
    // Add to loading state
    setLoadingCodes((prev) => [...prev, code]);

    try {
      const res = await toggleLanguageActive(code, !isCurrentlyActive);
      if (res.success) {
        // Refresh the server component to load new stats
        router.refresh();
      } else {
        alert("Erreur lors de la modification : " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur de réseau est survenue.");
    } finally {
      // Remove from loading state
      setLoadingCodes((prev) => prev.filter((c) => c !== code));
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/50 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Mes Langues de Travail
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Activez ou désactivez les langues à étudier
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {allLanguages.map((lang) => {
          const isActive = activeCodes.includes(lang.code);
          const isLoading = loadingCodes.includes(lang.code);

          return (
            <div
              key={lang.code}
              className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between items-center text-center gap-2.5 relative overflow-hidden group
                ${
                  isActive
                    ? "bg-indigo-50/20 border-indigo-150 shadow-sm"
                    : "bg-slate-50/50 border-slate-200/50 hover:bg-slate-50"
                }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-3xl select-none group-hover:scale-105 transition-transform duration-200">
                  {lang.flag}
                </span>
                <span className="text-xs font-bold text-slate-700">{lang.name}</span>
              </div>

              <button
                onClick={() => handleToggle(lang.code, isActive)}
                disabled={isLoading}
                className={`w-full py-1.5 px-3 rounded-xl font-extrabold text-[10px] transition-all uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95
                  ${
                    isLoading
                      ? "bg-slate-100 text-slate-450 border border-slate-200"
                      : isActive
                      ? "bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 border border-indigo-150"
                      : "bg-white hover:bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : isActive ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5 text-indigo-650"
                    >
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>Active ✓</span>
                  </>
                ) : (
                  <span>Désactivée</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
