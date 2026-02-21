"use client";

import { useState } from "react";

export default function AutoTTSToggle({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);

  const toggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    // Sauvegarde dans un cookie valable 1 an pour tout le site (spécifique à l'appareil)
    document.cookie = `autoTTS=${newValue}; path=/; max-age=31536000`;
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
        enabled
          ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
          : "bg-slate-100 text-slate-400 border border-slate-200"
      }`}
      title="Activer/Désactiver la lecture audio automatique à la validation"
    >
      <span>Lecture Auto</span>
      <div
        className={`w-6 h-3.5 rounded-full relative transition-colors ${
          enabled ? "bg-indigo-500" : "bg-slate-300"
        }`}
      >
        <div
          className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-transform ${
            enabled ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
