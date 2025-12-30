"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, saveResult } from "./actions";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { speak } from "@/app/utils/tts";

export default function LearnPage() {
  const { lang } = useParams();
  const router = useRouter();

  // --- ÉTATS ---
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // États du Quiz
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // --- CHARGEMENT ---
  useEffect(() => {
    const loadData = async () => {
      // @ts-ignore
      const data = await getSession(lang as string);
      setCards(data);
      setIsLoading(false);
    };
    loadData();
  }, [lang]);

  // --- FOCUS ---
  useEffect(() => {
    if (!isLoading) {
      if (status === "idle") {
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setTimeout(() => nextButtonRef.current?.focus(), 50);
      }
    }
  }, [status, isLoading, currentIndex]);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Chargement...
      </div>
    );

  if (!isLoading && cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Tout est à jour ! 🎉
          </h2>
          <Link
            href={`/${lang}`}
            className="block w-full bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Retour au Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // --- 1. VALIDATION CLASSIQUE ---
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status !== "idle") return;

    const isCorrect =
      input.trim().toLowerCase() ===
      currentCard.answer_target.trim().toLowerCase();
    processResult(isCorrect);
  };

  // --- 2. JE NE SAIS PAS (ABANDON) ---
  const handleGiveUp = () => {
    if (status !== "idle") return;
    setInput(""); // On vide le champ pour montrer qu'on ne savait pas
    processResult(false); // On force l'erreur
  };

  // --- LOGIQUE COMMUNE (TRAITEMENT DU RÉSULTAT) ---
  const processResult = async (isCorrect: boolean) => {
    if (isCorrect) {
      setStatus("success");
    } else {
      setStatus("error");
    }

    if (!currentCard.isRetry) {
      await saveResult(
        currentCard.review_id,
        currentCard.id,
        isCorrect,
        currentCard.interval
      );
    }
  };

  // --- SUIVANT ---
  const handleNext = () => {
    // Si erreur, on remet à la fin
    if (status === "error") {
      setCards((prev) => [...prev, { ...currentCard, isRetry: true }]);
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setInput("");
      setStatus("idle");
    } else {
      alert("Session terminée ! Bravo.");
      router.push(`/${lang}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Raccourci : Ctrl + Enter pour "Je ne sais pas" (optionnel mais pratique)
    if (status === "idle" && e.key === "Enter" && e.ctrlKey) {
      handleGiveUp();
      return;
    }

    if (status !== "idle" && e.key === " ") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* HEADER */}
      <div className="w-full max-w-xl mb-4 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span>
          Carte {currentIndex + 1} / {cards.length}
        </span>
        {currentCard.isRetry ? (
          <span className="px-2 py-1 rounded-md bg-red-100 text-red-600 animate-pulse">
            Répétition
          </span>
        ) : (
          <span
            className={`px-2 py-1 rounded-md ${
              currentCard.type === "new"
                ? "bg-blue-100 text-blue-600"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            {currentCard.type === "new" ? "Nouveau" : "Révision"}
          </span>
        )}
      </div>

      {/* --- CARTE --- */}
      <div
        className={`
        w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 border-2 relative
        ${status === "idle" ? "border-transparent" : ""}
        ${status === "error" ? "border-red-100 ring-4 ring-red-50" : ""}
        ${status === "success" ? "border-green-100 ring-4 ring-green-50" : ""}
      `}
      >
        {/* EN-TÊTE */}
        <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
            {currentCard.hint || "..."}
          </h1>
          <div className="flex flex-wrap gap-2 justify-center min-h-[24px]">
            {currentCard.part_of_speech && (
              <span className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                {currentCard.part_of_speech}
              </span>
            )}
            {currentCard.grammar_notes && (
              <span className="px-3 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
                {currentCard.grammar_notes}
              </span>
            )}
          </div>
        </div>

        {/* CORPS DE LA CARTE */}
        <div className="p-8 bg-white relative">
          {/* BOUTON AUDIO PHRASE COMPLÈTE (Anti-triche) */}
          <div className="absolute top-4 right-4">
            {status === "idle" ? (
              // Cadenas si pas répondu
              <span
                className="text-slate-200"
                title="Réponds d'abord pour écouter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            ) : (
              // Haut-parleur si répondu
              <button
                onClick={() => speak(currentCard.content_raw, lang as string)}
                className="p-2 text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors"
                title="Écouter la phrase complète"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                  />
                </svg>
              </button>
            )}
          </div>

          <p className="text-xl text-slate-600 text-center leading-relaxed font-medium mt-2">
            {currentCard.display_text
              .split("...")
              .map((part: string, i: number) => (
                <span key={i}>
                  {part}
                  {i === 0 && (
                    <span className="inline-block mx-1 align-bottom">
                      {status === "idle" ? (
                        <span className="inline-block w-20 h-7 border-b-2 border-slate-300 animate-pulse rounded-sm opacity-50 mb-1"></span>
                      ) : (
                        <span
                          className={`px-1 border-b-2 font-bold ${
                            status === "success"
                              ? "border-green-500 text-green-700"
                              : "border-red-500 text-red-600 line-through decoration-2"
                          }`}
                        >
                          {input || "(Vide)"}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              ))}
          </p>

          {/* ZONE DE FEEDBACK */}
          {status !== "idle" && (
            <div className="mt-8 flex flex-col items-center animate-bounce-short">
              {/* LA RÉPONSE CORRECTE */}
              <div
                className={`text-center ${
                  status === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  {status === "error" ? "La bonne réponse :" : "Bien joué !"}
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <span className="text-3xl font-extrabold">
                    {currentCard.answer_target}
                  </span>

                  {/* NOUVEAU : Bouton audio "Juste le mot" */}
                  <button
                    onClick={() =>
                      speak(currentCard.answer_target, lang as string)
                    }
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Écouter seulement ce mot"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    </svg>
                  </button>
                </div>
              </div>

              {status === "error" && (
                <p className="text-xs text-slate-400 mt-4 italic">
                  Cette carte sera reposée à la fin.
                </p>
              )}
            </div>
          )}
        </div>

        {/* PIED DE PAGE : ACTIONS */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          {status === "idle" ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-center text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800 placeholder:text-slate-300"
                placeholder="Tape la traduction..."
                autoComplete="off"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGiveUp}
                  className="w-1/3 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-200 hover:bg-slate-300 hover:text-slate-700 transition-colors"
                >
                  Je ne sais pas
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors"
                >
                  Valider
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={nextButtonRef}
              onClick={handleNext}
              onKeyDown={handleKeyDown}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-md transition-all active:scale-95
                ${
                  status === "success"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }
              `}
            >
              Continuer (Espace) →
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={`/${lang}`}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Quitter la session
        </Link>
      </div>
    </div>
  );
}
