"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, saveResult, getFsrsSettings } from "./actions";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { speak } from "@/app/utils/tts";
import { calculateFSRS } from "../../utils/fsrs";

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

  // --- MOTEUR DE FILE D'ATTENTE FSRS ---
  const [queue, setQueue] = useState<any[]>([]);
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [stats, setStats] = useState({ initial: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [customWeights, setCustomWeights] = useState<number[] | null>(null);
  const [recentCardIds, setRecentCardIds] = useState<string[]>([]);

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "synonym">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadData = async () => {
      // @ts-ignore
      const data = await getSession(lang as string, mode);
      const weights = await getFsrsSettings(lang as string);
      setCustomWeights(weights);

      if (data && data.length > 0) {
        // Initialiser toutes les cartes comme "non vues" (unseen)
        const activeQueue = data.map((c: any) => ({
          ...c,
          status: "unseen",
          learningStep: 0,
          dueTime: 0,
        }));
        setStats({ initial: data.length, completed: 0 });

        // Sortir la toute première carte de la file d'attente
        const q = [...activeQueue];
        const { nextCard, newQueue } = getNextState(q, []);
        setCurrentCard(nextCard);
        setQueue(newQueue);
      }
      setIsLoading(false);
    };
    loadData();
  }, [lang, mode]);

  // Gérer le focus automatique
  useEffect(() => {
    if (!isLoading && status === "idle") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [status, isLoading, currentCard]);

  // --- LOGIQUE D'ATTRIBUTION DES CARTES (QUEUE) ---
  const getNextState = (currentQueue: any[], historyIds: string[] = []) => {
    if (currentQueue.length === 0) return { nextCard: null, newQueue: [] };

    const now = Date.now();
    const q = [...currentQueue];

    // 1. Priorité absolue : Les cartes à revoir sous 1 min (learningStep === 0) dues ou presque dues (limite d'avance de 40s)
    // On exclut les cartes répondues dans les 2 derniers coups pour assurer un décalage minimum (mélange des erreurs et des nouveaux mots).
    const activeUrgentHistory = historyIds.slice(0, 2);
    const dueUrgent = q
      .filter(
        (c) =>
          c.status === "learning" &&
          c.learningStep === 0 &&
          c.dueTime <= now + 40 * 1000 &&
          !activeUrgentHistory.includes(c.id)
      )
      .sort((a, b) => a.dueTime - b.dueTime);

    if (dueUrgent.length > 0) {
      const next = dueUrgent[0];
      return { nextCard: next, newQueue: q.filter((c) => c !== next) };
    }

    // 2. Ensuite : Les cartes à revoir sous 6-10 min (learningStep === 1) qui sont dues
    const dueNormal = q
      .filter(
        (c) =>
          c.status === "learning" &&
          c.learningStep === 1 &&
          c.dueTime <= now &&
          !activeUrgentHistory.includes(c.id)
      )
      .sort((a, b) => a.dueTime - b.dueTime);

    if (dueNormal.length > 0) {
      const next = dueNormal[0];
      return { nextCard: next, newQueue: q.filter((c) => c !== next) };
    }

    // 3. Sinon : Les cartes non vues (unseen)
    const unseenIdx = q.findIndex((c) => c.status === "unseen");
    if (unseenIdx !== -1) {
      const next = q[unseenIdx];
      q.splice(unseenIdx, 1);
      return { nextCard: next, newQueue: q };
    }

    // 4. Si plus de cartes unseen ni dues, mais qu'il reste des cartes en apprentissage (learning)
    // non encore dues, on les présente immédiatement pour finir la session
    const remainingLearning = q
      .filter((c) => c.status === "learning")
      .sort((a, b) => {
        if (a.learningStep !== b.learningStep) {
          return a.learningStep - b.learningStep; // step 0 (1m) en premier
        }
        return a.dueTime - b.dueTime;
      });

    if (remainingLearning.length > 0) {
      // Éviter de répéter immédiatement les cartes très récentes (décalage intelligent)
      const maxHistoryToRespect = Math.max(0, remainingLearning.length - 1);
      const activeHistory = historyIds.slice(0, Math.min(3, maxHistoryToRespect));
      const next = remainingLearning.find((c) => !activeHistory.includes(c.id)) || remainingLearning[0];

      return { nextCard: next, newQueue: q.filter((c) => c !== next) };
    }

    return { nextCard: null, newQueue: [] };
  };

  // --- ACTION DE GRADING (FSRS & RETRY LOOP) ---
  const handleGrade = async (rating: number) => {
    if (status !== "success" && status !== "error") return;

    const isNew = currentCard.type === "new";
    const isLearning = currentCard.status === "learning" || (isNew && currentCard.status === "unseen");
    let updatedQueue = [...queue];
    let isGraduated = false;

    if (isFreeMode) {
      if (status === "error") {
        updatedQueue.push({
          ...currentCard,
          status: "learning",
          learningStep: 0,
          dueTime: Date.now() + 60 * 1000, // revoir dans 1 minute
        });
      } else {
        isGraduated = true;
      }
    } else {
      // Mode standard / FSRS
      if (rating === 1) {
        // À revoir (Again) -> step 0 (1m)
        updatedQueue.push({
          ...currentCard,
          status: "learning",
          learningStep: 0,
          dueTime: Date.now() + 60 * 1000,
        });
      } else if (rating === 2) {
        // Difficile (Hard)
        if (isLearning) {
          updatedQueue.push({
            ...currentCard,
            status: "learning",
            learningStep: 1,
            dueTime: Date.now() + 6 * 60 * 1000,
          });
        } else {
          isGraduated = true;
        }
      } else if (rating === 3) {
        // Bien (Good)
        if (isLearning && (currentCard.learningStep || 0) === 0) {
          // Si premier passage ou étape 1m, on l'envoie à l'étape 10m
          updatedQueue.push({
            ...currentCard,
            status: "learning",
            learningStep: 1,
            dueTime: Date.now() + 10 * 60 * 1000,
          });
        } else {
          // Déjà validé l'étape 10m ou carte de révision -> Acquis !
          isGraduated = true;
        }
      } else if (rating === 4) {
        // Facile (Easy) -> Acquis immédiatement !
        isGraduated = true;
      }

      // Enregistrer le résultat SRS en base de données de manière asynchrone (non bloquante)
      saveResult(currentCard.word_id, currentCard.id, rating, lang as string)
        .then((result) => {
          if (result && !result.success) {
            console.error("Erreur sauvegarde FSRS :", result.error);
          }
        })
        .catch((err) => {
          console.error("Erreur de connexion Supabase :", err);
        });
    }

    if (isGraduated) {
      setStats((s) => ({ ...s, completed: s.completed + 1 }));
    }

    // Mettre à jour l'historique des cartes récentes locales
    const nextHistory = [currentCard.id, ...recentCardIds].slice(0, 5);
    setRecentCardIds(nextHistory);

    setQueue(updatedQueue);

    // Passer à la carte suivante
    setFeedbackMsg("");
    const { nextCard, newQueue } = getNextState(updatedQueue, nextHistory);
    setCurrentCard(nextCard);
    setQueue(newQueue);
    setInput("");
    setStatus("idle");
  };

  // --- SUBMIT DU CHAMP SAISIE ---
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status !== "idle" && status !== "synonym") return;

    const cleanedInput = input.trim().toLowerCase();
    const target = currentCard.answer_target.trim().toLowerCase();
    const synonyms = currentCard.contextual_synonyms || [];
    const cleanedSynonyms = synonyms.map((s: string) => s.trim().toLowerCase());

    const isAutoTTS =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("autoTTS="))
        ?.split("=")[1] === "true";

    if (cleanedInput === target) {
      setStatus("success");
      setFeedbackMsg("Bien joué !");
      if (isAutoTTS) speak(currentCard.content_raw, lang as string);
    } else if (cleanedSynonyms.includes(cleanedInput)) {
      setStatus("synonym");
      setFeedbackMsg("C'est un synonyme correct dans ce contexte, trouve le mot exact !");
    } else {
      setStatus("error");
      setFeedbackMsg("Aïe. On la revoit dans ~1 minute.");
      if (isAutoTTS) speak(currentCard.content_raw, lang as string);
    }
  };

  // --- ABANDON (JE NE SAIS PAS) ---
  const handleGiveUp = () => {
    if (status !== "idle" && status !== "synonym") return;
    setInput("");
    setStatus("error");
    setFeedbackMsg("Aïe. On la revoit dans ~1 minute.");
    const isAutoTTS =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("autoTTS="))
        ?.split("=")[1] === "true";
    if (isAutoTTS) speak(currentCard.content_raw, lang as string);
  };

  // --- RACCOURCIS CLAVIER ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isTyping = document.activeElement === inputRef.current;
      if (isTyping && (status === "idle" || status === "synonym")) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      if (status === "success" || status === "error") {
        const key = e.key.toLowerCase();
        if (key === "m") {
          e.preventDefault();
          speak(currentCard.answer_target, lang as string);
          return;
        }
        if (key === "p") {
          e.preventDefault();
          speak(currentCard.content_raw, lang as string);
          return;
        }

        if (!isFreeMode) {
          if (e.key === "1") {
            e.preventDefault();
            handleGrade(1);
          } else if (e.key === "2") {
            e.preventDefault();
            handleGrade(2);
          } else if (e.key === "3") {
            e.preventDefault();
            handleGrade(3);
          } else if (e.key === "4") {
            e.preventDefault();
            handleGrade(4);
          } else if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            handleGrade(status === "success" ? 3 : 1); // Raccourci par défaut : Bien si correct, Revoir si faux
          }
        } else {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            handleGrade(status === "success" ? 3 : 1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [status, input, currentCard, queue]);

  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // --- TEXTES DES BOUTONS DE GRADING (FSRS) ---
  const getButtonIntervalText = (rating: number) => {
    if (!currentCard) return "";
    const isNew = currentCard.type === "new";
    const isLearning = currentCard.status === "learning" || (isNew && currentCard.status === "unseen");
    
    if (isLearning) {
      if (rating === 1) return "< 1 min";
      if (rating === 2) return "< 6 min";
      if (rating === 3) {
        // Si c'est l'étape de confirmation (step 1), Good le valide définitivement (FSRS)
        if ((currentCard.learningStep || 0) === 1) {
          const fsrs = calculateFSRS(3, currentCard, customWeights);
          return `${fsrs.interval} j`;
        }
        return "< 10 min";
      }
      // Easy graduates directly to FSRS
      const fsrs = calculateFSRS(4, currentCard, customWeights);
      return `${fsrs.interval} j`;
    } else {
      // Révisions
      if (rating === 1) return "< 1 min";
      const fsrs = calculateFSRS(rating, currentCard, customWeights);
      return `${fsrs.interval} j`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-slate-500 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium text-sm text-slate-600">Chargement de la session...</span>
        </div>
      </div>
    );
  }

  // Fin de session
  if (!currentCard) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {isFreeMode ? "Entraînement terminé ! 💪" : "Session terminée ! 🎉"}
          </h2>
          <p className="text-slate-500 mb-6 font-medium">
            {isFreeMode
              ? "Bravo, belle révision."
              : "Tu es à jour. Reviens demain."}
          </p>
          <Link
            href={`/${lang}`}
            className="block w-full bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 duration-100"
          >
            Retour au Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const blueCount = [currentCard, ...queue].filter(
    (c) => c && c.type === "new" && c.status === "unseen"
  ).length;
  const redCount = [currentCard, ...queue].filter(
    (c) => c && c.status === "learning"
  ).length;
  const greenCount = [currentCard, ...queue].filter(
    (c) => c && c.type === "review" && c.status === "unseen"
  ).length;
  const completedCount = stats.completed;

  const textParts = currentCard.display_text.split("...");
  const isVerb =
    currentCard.part_of_speech?.toLowerCase().includes("verb") ||
    currentCard.part_of_speech?.toLowerCase().includes("v");

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col items-center justify-start md:justify-center pt-6 md:pt-0 pb-10 p-4 font-sans overflow-y-auto">
      {/* HEADER DE PROGRESSION STYLE ANKI */}
      <div className="w-full max-w-xl mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Bleus : Nouveaux */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{blueCount}</span>
            <span className="text-[10px] text-blue-400 font-semibold lowercase">nouveaux</span>
          </div>

          {/* Rouges : À revoir */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>{redCount}</span>
            <span className="text-[10px] text-red-400 font-semibold lowercase">à revoir</span>
          </div>

          {/* Verts : Déjà vus (Révisions) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{greenCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold lowercase">déjà vus</span>
          </div>

          {/* Validés dans la session */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.8-11.2a1 1 0 00-1.4-1.4L9 8.6 7.6 7.2a1 1 0 00-1.4 1.4l2.1 2.1a1 1 0 001.4 0l4.1-4.1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{completedCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold lowercase">session</span>
          </div>
        </div>

        <div className="flex justify-end shrink-0">
          {isFreeMode ? (
            <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-600 border border-purple-200 text-xs font-bold uppercase tracking-wide">
              Mode Entraînement
            </span>
          ) : currentCard.status === "learning" ? (
            currentCard.learningStep === 1 ? (
              <span className="px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-700 animate-pulse border border-yellow-200 text-xs font-bold uppercase tracking-wide">
                Confirmation
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-600 animate-pulse border border-red-200 text-xs font-bold uppercase tracking-wide">
                À revoir (1m)
              </span>
            )
          ) : currentCard.type === "new" ? (
            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold uppercase tracking-wide">
              Nouveau
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-bold uppercase tracking-wide">
              Révision
            </span>
          )}
        </div>
      </div>

      {/* CARTE PRINCIPALE */}
      <div
        className={`
          w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 border-2 relative shrink-0
          ${status === "idle" ? (isFreeMode ? "border-purple-200" : "border-transparent") : ""}
          ${status === "error" ? "border-red-200 ring-4 ring-red-50" : ""}
          ${status === "success" ? "border-green-200 ring-4 ring-green-50" : ""}
          ${status === "synonym" ? "border-amber-400 ring-4 ring-amber-100" : ""}
        `}
      >
        {/* HEADER DE LA CARTE : INDICATION DE LA LANGUE / INFOS */}
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
            {isVerb && currentCard.grammar_notes && (
              <span className="px-3 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-bold uppercase">
                {currentCard.grammar_notes}
              </span>
            )}
          </div>
        </div>

        {/* CONTENU DE LA CARTE */}
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
                onMouseDown={preventBlur}
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
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          if (status === "synonym") {
                            setStatus("idle");
                            setFeedbackMsg("");
                          }
                        }}
                        autoFocus={true}
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoComplete="off"
                        size={1}
                        className={`w-full min-w-0 bg-transparent border-b-2 text-center outline-none p-0 px-0 transition-all font-bold 
                          ${
                            status === "idle"
                              ? "border-indigo-400 text-indigo-700 focus:border-indigo-600 focus:bg-indigo-50/30 placeholder:text-indigo-300"
                              : status === "synonym"
                              ? "border-amber-400 text-amber-600 focus:border-amber-600 focus:bg-amber-50/30 placeholder:text-amber-300"
                              : "opacity-0 pointer-events-none"
                          }`}
                        placeholder="?"
                      />

                      {status !== "idle" && status !== "synonym" && (
                        <span
                          className={`col-start-1 row-start-1 w-full px-0 border-b-2 font-bold text-center pointer-events-none absolute top-0 left-0
                            ${
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
                  status === "error"
                    ? "text-red-600"
                    : status === "synonym"
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1">
                  {status === "error"
                    ? "La bonne réponse :"
                    : status === "synonym"
                    ? "Presque !"
                    : "Excellent !"}
                </p>
                {status !== "synonym" ? (
                  <div className="flex items-center gap-3 justify-center">
                    <span className="text-2xl md:text-3xl font-extrabold">
                      {currentCard.answer_target}
                    </span>
                    <button
                      onMouseDown={preventBlur}
                      onClick={() =>
                        speak(currentCard.answer_target, lang as string)
                      }
                      className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75 0 010-1.06z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 shadow-sm">
                    C'est un synonyme correct, mais trouve le mot cible exact !
                  </div>
                )}
                {feedbackMsg && status !== "synonym" && (
                  <p className="text-xs text-slate-400 mt-4 italic font-medium opacity-80 animate-fade-in">
                    {feedbackMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* DÉCOMPOSITION MORPHOLOGIQUE (En bas de la carte, après validation) */}
          {(status === "success" || status === "error") && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2 justify-center mt-8 rounded-2xl">
              {currentCard.lemma && (
                <div>
                  <span className="font-semibold text-slate-400">Lemme :</span> {currentCard.lemma}
                </div>
              )}
              {currentCard.radical && (
                <div>
                  <span className="font-semibold text-slate-400">Radical :</span> {currentCard.radical}
                </div>
              )}
              {currentCard.prefix && (
                <div>
                  <span className="font-semibold text-slate-400">Préfixe :</span> {currentCard.prefix}
                </div>
              )}
              {currentCard.suffix && (
                <div>
                  <span className="font-semibold text-slate-400">Suffixe :</span> {currentCard.suffix}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION DES BOUTONS DE CONTRÔLE / GRADING */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          {status === "idle" || status === "synonym" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onMouseDown={preventBlur}
                onClick={handleGiveUp}
                className="w-1/3 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors shadow-sm active:scale-95 duration-100"
              >
                Je ne sais pas
              </button>
              <button
                onMouseDown={preventBlur}
                onClick={() => handleSubmit()}
                className="w-2/3 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-colors active:scale-95 duration-100"
              >
                Valider
              </button>
            </div>
          ) : (
            /* SI RÉPONDU : ON AFFICHE LE CONTINUER OU LES 4 BOUTONS FSRS */
            <div className="w-full">
              {(status === "success" || status === "error") && !isFreeMode ? (
                <div className="flex flex-col gap-3">
                  <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Évalue ta facilité de rappel :
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleGrade(1)}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all font-semibold active:scale-95 duration-100 shadow-sm"
                    >
                      <span className="text-[10px] uppercase opacity-75">À revoir</span>
                      <span className="text-sm font-extrabold mt-0.5">{getButtonIntervalText(1)}</span>
                      <span className="text-[9px] opacity-50 mt-1 font-bold">Touche 1</span>
                    </button>
                    <button
                      onClick={() => handleGrade(2)}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all font-semibold active:scale-95 duration-100 shadow-sm"
                    >
                      <span className="text-[10px] uppercase opacity-75">Difficile</span>
                      <span className="text-sm font-extrabold mt-0.5">{getButtonIntervalText(2)}</span>
                      <span className="text-[9px] opacity-50 mt-1 font-bold">Touche 2</span>
                    </button>
                    <button
                      onClick={() => handleGrade(3)}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all font-semibold active:scale-95 duration-100 shadow-sm"
                    >
                      <span className="text-[10px] uppercase opacity-75">Bien</span>
                      <span className="text-sm font-extrabold mt-0.5">{getButtonIntervalText(3)}</span>
                      <span className="text-[9px] opacity-50 mt-1 font-bold">Touche 3</span>
                    </button>
                    <button
                      onClick={() => handleGrade(4)}
                      className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all font-semibold active:scale-95 duration-100 shadow-sm"
                    >
                      <span className="text-[10px] uppercase opacity-75">Facile</span>
                      <span className="text-sm font-extrabold mt-0.5">{getButtonIntervalText(4)}</span>
                      <span className="text-[9px] opacity-50 mt-1 font-bold">Touche 4</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  ref={nextButtonRef}
                  onClick={() => handleGrade(status === "success" ? 3 : 1)}
                  className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-md transition-all active:scale-95 duration-100 ${
                    status === "success"
                      ? "bg-green-600 hover:bg-green-700 shadow-green-600/10"
                      : "bg-slate-800 hover:bg-slate-900 shadow-slate-800/10"
                  }`}
                >
                  Continuer (Espace) →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 shrink-0">
        <Link
          href={`/${lang}`}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors duration-100"
        >
          Quitter
        </Link>
      </div>
    </div>
  );
}
