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

  // --- FOCUS AUTOMATIQUE ---
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

  // --- LOGIQUE VALIDATION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;

    const isCorrect =
      input.trim().toLowerCase() ===
      currentCard.answer_target.trim().toLowerCase();

    if (isCorrect) {
      setStatus("success");
      // Optionnel : Prononcer automatiquement quand c'est juste
      // speak(currentCard.content_raw, lang as string)
    } else {
      setStatus("error");
    }

    await saveResult(
      currentCard.review_id,
      currentCard.id,
      isCorrect,
      currentCard.interval
    );
  };

  const handleNext = () => {
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
    if (status !== "idle" && e.key === " ") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* HEADER : PROGRESSION */}
      <div className="w-full max-w-xl mb-4 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span>
          Carte {currentIndex + 1} / {cards.length}
        </span>
        <span
          className={`px-2 py-1 rounded-md ${
            currentCard.type === "new"
              ? "bg-blue-100 text-blue-600"
              : "bg-orange-100 text-orange-600"
          }`}
        >
          {currentCard.type === "new" ? "Nouveau" : "Révision"}
        </span>
      </div>

      {/* --- CARTE PRINCIPALE --- */}
      <div
        className={`
        w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 border-2
        ${status === "idle" ? "border-transparent" : ""}
        ${status === "error" ? "border-red-100 ring-4 ring-red-50" : ""}
        ${status === "success" ? "border-green-100 ring-4 ring-green-50" : ""}
      `}
      >
        {/* 1. ZONE SUPÉRIEURE : INFO GRAMMATICALE & INDICE */}
        <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
          {/* LE MOT (Indice) */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
            {currentCard.hint || "..."}
          </h1>

          {/* BADGES GRAMMATICAUX */}
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

        {/* 2. ZONE CENTRALE : CONTEXTE + AUDIO */}
        <div className="p-8 bg-white relative">
          {/* Bouton Audio Flottant */}
          <button
            onClick={() => speak(currentCard.content_raw, lang as string)}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50"
            title="Écouter la prononciation"
            tabIndex={-1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
              />
            </svg>
          </button>

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
                          {input}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              ))}
          </p>

          {/* Feedback Erreur */}
          {status === "error" && (
            <div className="mt-6 p-4 bg-red-50 rounded-xl text-center border border-red-100 animate-bounce-short">
              <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">
                Réponse attendue
              </p>
              <p className="text-2xl text-red-600 font-extrabold">
                {currentCard.answer_target}
              </p>
            </div>
          )}
        </div>

        {/* 3. ZONE INFÉRIEURE : INPUT */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          {status === "idle" ? (
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-center text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800 placeholder:text-slate-300"
                placeholder="Tape la traduction..."
                autoComplete="off"
              />
            </form>
          ) : (
            <button
              ref={nextButtonRef}
              onClick={handleNext}
              onKeyDown={handleKeyDown}
              className={`w-full py-3 rounded-xl font-bold text-lg text-white shadow-md transition-all active:scale-95
                ${
                  status === "success"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }
              `}
            >
              Continuer{" "}
              <span className="opacity-70 text-sm font-normal ml-2">
                (Espace)
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={`/${lang}`}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Quitter
        </Link>
      </div>
    </div>
  );
}
