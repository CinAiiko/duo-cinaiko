"use client";

import { useState, useEffect } from "react";
import {
  signOut,
  resetProgress,
  getUserInfo,
  getAllFsrsSettings,
  recalculateFsrsSettings,
  resetFsrsSettings,
} from "./actions";
import { DEFAULT_W } from "@/app/utils/fsrs";
import Link from "next/link";
import { getUserActiveLanguages } from "../actions";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // --- ÉTATS CONFIGURATION FSRS ---
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [activeLang, setActiveLang] = useState<string>("en");
  const [activeLanguages, setActiveLanguages] = useState<any[]>([]);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    getUserInfo().then((u) => {
      setUser(u);
      setLoading(false);
    });
    getAllFsrsSettings().then((settings) => {
      setAllSettings(settings);
    });
    getUserActiveLanguages().then((codes) => {
      const allMetadata = [
        { code: "en", name: "Anglais", flag: "🇬🇧" },
        { code: "de", name: "Allemand", flag: "🇩🇪" },
        { code: "es", name: "Espagnol", flag: "🇪🇸" },
        { code: "pt", name: "Portugais", flag: "🇵🇹" },
        { code: "it", name: "Italien", flag: "🇮🇹" },
        { code: "zh", name: "Chinois", flag: "🇨🇳" },
        { code: "ja", name: "Japonais", flag: "🇯🇵" },
      ];
      const activeList = allMetadata.filter((lang) => codes.includes(lang.code));
      setActiveLanguages(activeList);
      if (activeList.length > 0) {
        setActiveLang(activeList[0].code);
      }
    });
  }, []);

  const getWeightsForLang = (langCode: string): number[] => {
    const setting = allSettings.find((s) => s.language_code === langCode);
    return setting?.weights || DEFAULT_W;
  };

  const isCustomWeights = (langCode: string): boolean => {
    return allSettings.some((s) => s.language_code === langCode);
  };

  const handleCalibrate = async () => {
    setCalibrating(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await recalculateFsrsSettings(activeLang);
      if (res.success && res.weights) {
        setAllSettings((prev) => {
          const filtered = prev.filter((s) => s.language_code !== activeLang);
          return [...filtered, { language_code: activeLang, weights: res.weights }];
        });
        const langName = (activeLanguages.find((l) => l.code === activeLang) || { name: activeLang }).name;
        setSuccessMsg(
          `Félicitations ! Les paramètres FSRS pour la langue ${langName} ont été calibrés avec succès en fonction de votre historique de révisions.`
        );
      } else {
        setErrorMsg(res.error || "Une erreur est survenue lors de la calibration.");
      }
    } catch (err: any) {
      setErrorMsg("Erreur réseau : " + (err.message || err));
    } finally {
      setCalibrating(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm("Voulez-vous vraiment restaurer les paramètres FSRS par défaut pour cette langue ?")) return;
    setCalibrating(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await resetFsrsSettings(activeLang);
      if (res.success) {
        setAllSettings((prev) => prev.filter((s) => s.language_code !== activeLang));
        setSuccessMsg("Paramètres FSRS réinitialisés aux valeurs par défaut !");
      } else {
        setErrorMsg(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      setErrorMsg("Erreur réseau : " + (err.message || err));
    } finally {
      setCalibrating(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "⚠️ Es-tu sûr de vouloir tout effacer ? Ta progression (mots appris, historique de révisions et paramètres FSRS personnalisés) sera perdue."
      )
    )
      return;

    setResetting(true);
    await resetProgress();
    setAllSettings([]);
    setResetting(false);
    alert("Progression remise à zéro !");
  };

  const activeWeights = getWeightsForLang(activeLang);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 md:p-8 font-sans relative overflow-hidden flex flex-col items-center justify-start py-8 md:py-12">
      {/* Decorative modern background glowing blur blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full filter blur-3xl" />
        <div className="absolute bottom-[-150px] right-[-150px] w-96 h-96 bg-sky-200/30 rounded-full filter blur-3xl" />
      </div>

      <div className="max-w-xl w-full space-y-6 z-10">
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

        {/* Profile Card Header */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/50 text-center space-y-3 relative overflow-hidden">
          <div className="w-16 h-16 bg-indigo-100/80 border border-indigo-200/35 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
            👨‍⚕️
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Mon Profil Étudiant</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">
              {loading ? "Chargement du compte..." : user?.email || "Étudiant en médecine"}
            </p>
          </div>
        </div>

        {/* FSRS Settings panel */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/50 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              🧠 Paramètres FSRS par Langue
            </h2>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-extrabold uppercase">
              FSRS v6
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            L'algorithme de répétition espacée (FSRS) ajuste l'apprentissage en fonction de vos performances réelles de mémorisation.
          </p>

          {/* Languages tabs */}
          {activeLanguages.length > 0 ? (
            <div className="flex flex-wrap gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200/30 justify-center">
              {activeLanguages.map((lang) => {
                const active = activeLang === lang.code;
                const customized = isCustomWeights(lang.code);
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setActiveLang(lang.code);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none
                      ${
                        active
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200/25"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {customized && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Paramètres personnalisés" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs text-slate-400 font-bold">Aucune langue active configurée. Activez des langues sur la page d'accueil.</p>
            </div>
          )}

          {/* FSRS Weights Display */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Coefficients Actuels</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded-md ${isCustomWeights(activeLang) ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-slate-500 bg-slate-100 border border-slate-200"}`}>
                {isCustomWeights(activeLang) ? "Personnalisés (Optimisés)" : "Valeurs Standards"}
              </span>
            </div>

            {/* Weights grid */}
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/40 grid grid-cols-4 md:grid-cols-6 gap-2 text-center text-[10px] font-mono">
              {activeWeights.map((w, idx) => (
                <div key={idx} className="bg-white/80 p-2 rounded-xl border border-slate-200/50 shadow-sm hover:scale-[1.03] transition-transform">
                  <div className="text-[8px] text-slate-400 font-extrabold mb-0.5">w[{idx}]</div>
                  <div className="font-extrabold text-slate-800">{w}</div>
                </div>
              ))}
            </div>

            {/* Weights legend */}
            <div className="text-[9px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 justify-center leading-relaxed font-semibold">
              <div><span className="font-bold text-slate-500">w[0..3]</span> : Stabilités initiales</div>
              <div><span className="font-bold text-slate-500">w[4]</span> : Difficulté initiale</div>
              <div><span className="font-bold text-slate-500">w[15]</span> : Pénalité Hard</div>
              <div><span className="font-bold text-slate-500">w[16]</span> : Bonus Easy</div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 text-red-700 border border-red-200/50 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-green-50 text-green-700 border border-green-200/50 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.8-11.2a1 1 0 00-1.4-1.4L9 8.6 7.6 7.2a1 1 0 00-1.4 1.4l2.1 2.1a1 1 0 001.4 0l4.1-4.1z" clipRule="evenodd" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCalibrate}
              disabled={calibrating || resetting}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs text-white transition-all shadow-md active:scale-95 duration-100 flex items-center justify-center gap-2
                ${
                  calibrating
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/10 hover:shadow-indigo-600/20"
                }`}
            >
              {calibrating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Optimisation en cours...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795m-8.982 11.795l5.228-5.228m-5.228 5.228l-5.228-5.228M17.982 9.205L18 3l-8.982 11.795m8.982-11.795L13.77 8.43m4.212-5.225l-5.228 5.228" />
                  </svg>
                  <span>Calibrer mes coefficients</span>
                </>
              )}
            </button>

            {isCustomWeights(activeLang) && (
              <button
                onClick={handleResetToDefault}
                disabled={calibrating || resetting}
                className="py-3 px-4 rounded-xl font-extrabold text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all active:scale-95 duration-100 flex items-center justify-center gap-1.5"
                title="Restaurer les valeurs standard"
              >
                <span>Valeurs standard</span>
              </button>
            )}
          </div>
        </div>

        {/* Account options */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/50 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">
            Mon Compte
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-center text-xs transition-colors border border-slate-200/50"
            >
              ← Retour au tableau de bord
            </Link>

            <form action={signOut} className="flex-1">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>

        {/* Danger zone panel */}
        <div className="bg-rose-50/40 backdrop-blur-md p-6 rounded-3xl border border-rose-100/70 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full filter blur-xl pointer-events-none" />
          <h2 className="text-xs font-bold text-rose-600/80 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Zone de Danger
          </h2>
          <p className="text-[11px] text-rose-700/85 leading-relaxed font-semibold">
            Si vous souhaitez recommencer votre apprentissage de zéro. Cette action effacera définitivement votre historique, vos mots appris ainsi que vos calibrations FSRS.
          </p>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full py-3 px-4 bg-white hover:bg-rose-50 text-rose-600 font-extrabold rounded-xl border border-rose-200/60 text-xs transition-colors shadow-sm active:scale-[0.99]"
          >
            {resetting ? (
              "Remise à zéro en cours..."
            ) : (
              "Réinitialiser toute ma progression"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          LingoDeck v1.0 • Médecine
        </div>
      </div>
    </div>
  );
}
