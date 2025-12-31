"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, saveResult } from "./actions";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { speak } from "@/app/utils/tts";

export default function LearnPage() {
  const { lang } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode");
  const mode =
    modeParam === "bonus" || modeParam === "review-all"
      ? modeParam
      : "standard";

  const isFreeMode = mode === "review-all";

  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadData = async () => {
      // @ts-ignore
      const data = await getSession(lang as string, mode);
      setCards(data);
      setIsLoading(false);
    };
    loadData();
  }, [lang, mode]);

  useEffect(() => {
    if (!isLoading && status === "idle") {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (status !== "idle") {
      setTimeout(() => nextButtonRef.current?.focus(), 50);
    }
  }, [status, isLoading, currentIndex]);

  if (isLoading)
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-slate-500">
        Chargement...
      </div>
    );

  if (!isLoading && cards.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {isFreeMode ? "Entraînement terminé ! 💪" : "Session terminée ! 🎉"}
          </h2>
          <p className="text-slate-500 mb-6">
            {isFreeMode
              ? "Bravo, belle révision."
              : "Tu es à jour. Reviens demain."}
          </p>
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

  // --- LOGIQUE UNIFIÉE ---
  const processResult = async (isCorrect: boolean) => {
    // 1. GESTION DES ERREURS (POUR TOUS LES MODES)
    // Si faux, on réinsère la carte un peu plus loin, même en mode libre.
    if (!isCorrect) {
      setStatus("error");
      setFeedbackMsg("On la revoit dans 1 minute !");

      const nextQueue = [...cards];
      const retryCard = { ...currentCard, isRetry: true };

      // Insertion à currentIndex + 3 (ou à la fin si le paquet est petit)
      const insertIndex = Math.min(currentIndex + 3, nextQueue.length);
      nextQueue.splice(insertIndex, 0, retryCard);

      setCards(nextQueue);
      return; // On s'arrête là (pas de save)
    }

    // 2. GESTION DES SUCCÈS
    setStatus("success");

    // CAS A : Mode Entraînement (Review All)
    if (isFreeMode) {
      setFeedbackMsg("Bien joué !");
      // En mode libre, si c'est juste, on ne fait rien de spécial (pas de save, pas de re-queue)
      // La carte est considérée comme "vue".
      return;
    }

    // CAS B : Mode Standard (Sauvegarde DB + Logique "Nouveau Mot")
    const nextQueue = [...cards];

    // Est-ce un NOUVEAU mot qu'on voit pour la première fois ?
    const isNewCardFirstStep =
      currentCard.type === "new" &&
      !currentCard.isRetry &&
      !currentCard.learningStep2;

    if (isNewCardFirstStep) {
      setFeedbackMsg("Bien ! On valide ça une 2ème fois tout à l'heure.");

      // On réinsère pour la validation étape 2
      const step2Card = { ...currentCard, learningStep2: true };
      const insertIndex = Math.min(currentIndex + 5, nextQueue.length);
      nextQueue.splice(insertIndex, 0, step2Card);

      setCards(nextQueue);
    } else {
      // Validation finale (Sauvegarde DB)
      setFeedbackMsg("Excellent !");

      let result = { success: true, error: "" };

      if (!currentCard.isRetry) {
        // @ts-ignore
        result = await saveResult(
          currentCard.review_id,
          currentCard.id,
          true,
          currentCard.interval
        );
      } else {
        // @ts-ignore
        result = await saveResult(
          currentCard.review_id,
          currentCard.id,
          true,
          0
        );
      }

      if (result && !result.success) {
        console.error("Erreur sauvegarde :", result.error);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status !== "idle") return;
    const isCorrect =
      input.trim().toLowerCase() ===
      currentCard.answer_target.trim().toLowerCase();
    processResult(isCorrect);
  };

  const handleGiveUp = () => {
    if (status !== "idle") return;
    setInput("");
    processResult(false);
  };

  const handleNext = () => {
    setFeedbackMsg(""); // Reset message

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setInput("");
      setStatus("idle");
    } else {
      router.push(`/${lang}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (status === "idle" && e.key === "Enter") {
      handleSubmit();
      return;
    }
    if (status !== "idle" && e.key === " ") {
      e.preventDefault();
      handleNext();
    }
  };

  const textParts = currentCard.display_text.split("...");

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col items-center justify-start md:justify-center pt-6 md:pt-0 pb-10 p-4 font-sans overflow-y-auto">
      <div className="w-full max-w-xl mb-4 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
        <span>
          Carte {currentIndex + 1} / {cards.length}
        </span>
        {isFreeMode ? (
          <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-600 border border-purple-200">
            Mode Entraînement
          </span>
        ) : currentCard.isRetry ? (
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

      <div
        className={`
        w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 border-2 relative shrink-0
        ${
          status === "idle"
            ? isFreeMode
              ? "border-purple-200"
              : "border-transparent"
            : ""
        }
        ${status === "error" ? "border-red-100 ring-4 ring-red-50" : ""}
        ${status === "success" ? "border-green-100 ring-4 ring-green-50" : ""}
      `}
      >
        <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">
            {currentCard.hint || "..."}
          </h1>
          <div className="flex flex-wrap gap-2 justify-center min-h-[24px]">
            {currentCard.part_of_speech && (
              <span className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold uppercase">
                {currentCard.part_of_speech}
              </span>
            )}
            {currentCard.grammar_notes && (
              <span className="px-3 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-bold uppercase">
                {currentCard.grammar_notes}
              </span>
            )}
          </div>
        </div>

        <div className="p-8 bg-white relative">
          <div className="absolute top-4 right-4">
            {status === "idle" ? (
              <span
                className="text-slate-200 cursor-not-allowed"
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
              <button
                onClick={() => speak(currentCard.content_raw, lang as string)}
                className="p-2 text-indigo-500 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
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

          <div className="text-xl md:text-2xl text-slate-600 text-center leading-loose font-medium mt-6">
            {textParts.map((part: string, i: number) => (
              <span key={i}>
                {part}
                {i < textParts.length - 1 && (
                  <span className="inline-grid align-baseline items-center justify-items-center relative mx-1">
                    {/* FANTÔME : Ratio 0.65 */}
                    <span
                      className="col-start-1 row-start-1 invisible whitespace-pre font-bold px-0 border-b-2 border-transparent pointer-events-none"
                      style={{
                        minWidth: `${Math.max(
                          2,
                          currentCard.answer_target.length * 0.65
                        )}ch`,
                      }}
                    >
                      {input}
                    </span>

                    <span className="col-start-1 row-start-1 w-full flex justify-center">
                      {status === "idle" ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          autoComplete="off"
                          size={1}
                          className="w-full min-w-0 bg-transparent border-b-2 border-indigo-400 text-indigo-700 text-center outline-none p-0 px-0 focus:border-indigo-600 focus:bg-indigo-50/30 transition-all font-bold placeholder:text-indigo-300"
                          placeholder="?"
                        />
                      ) : (
                        <span
                          className={`w-full px-0 border-b-2 font-bold text-center ${
                            status === "success"
                              ? "border-green-500 text-green-700 bg-green-50"
                              : "border-red-500 text-red-600 bg-red-50 line-through decoration-2"
                          }`}
                        >
                          {input || "(Vide)"}
                        </span>
                      )}
                    </span>
                  </span>
                )}
              </span>
            ))}
          </div>

          {status !== "idle" && (
            <div className="mt-8 flex flex-col items-center animate-bounce-short">
              <div
                className={`text-center ${
                  status === "error" ? "text-red-600" : "text-green-600"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  {status === "error" ? "La bonne réponse :" : "Excellent !"}
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <span className="text-2xl md:text-3xl font-extrabold">
                    {currentCard.answer_target}
                  </span>
                  <button
                    onClick={() =>
                      speak(currentCard.answer_target, lang as string)
                    }
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
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
                {/* Message Feedback */}
                {feedbackMsg && (
                  <p className="text-xs text-slate-400 mt-4 italic font-medium opacity-80 animate-fade-in">
                    {feedbackMsg}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          {status === "idle" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGiveUp}
                className="w-1/3 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors"
              >
                Je ne sais pas
              </button>
              <button
                onClick={handleSubmit}
                className="w-2/3 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors"
              >
                Valider
              </button>
            </div>
          ) : (
            <button
              ref={nextButtonRef}
              onClick={handleNext}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-md transition-all active:scale-95 ${
                status === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-slate-800 hover:bg-slate-900"
              }`}
            >
              Continuer (Espace) →
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 shrink-0">
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
