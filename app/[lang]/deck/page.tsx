"use client";

import { useState, useEffect } from "react";
import {
  searchDictionary,
  updateWord,
  deleteWord,
  addSentence,
  deleteSentence
} from "./actions";
import { useParams } from "next/navigation";
import Link from "next/link";
import { speak } from "@/app/utils/tts";

export default function DeckPage() {
  const { lang } = useParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États du modal de détail / modification
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [isEditingWord, setIsEditingWord] = useState(false);

  // Champs d'édition du mot
  const [editWordText, setEditWordText] = useState("");
  const [editPartOfSpeech, setEditPartOfSpeech] = useState("");
  const [editGrammarNotes, setEditGrammarNotes] = useState("");
  const [editLemma, setEditLemma] = useState("");
  const [editRadical, setEditRadical] = useState("");
  const [editPrefix, setEditPrefix] = useState("");
  const [editSuffix, setEditSuffix] = useState("");

  // Champs d'ajout de phrase d'exemple
  const [newContentRaw, setNewContentRaw] = useState("");
  const [newHint, setNewHint] = useState("");
  const [newSynonyms, setNewSynonyms] = useState("");
  const [isAddingSentence, setIsAddingSentence] = useState(false);

  // Recherche automatique (Debounce)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      // @ts-ignore
      const data = await searchDictionary(lang as string, query);
      setResults(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, lang]);

  // Ouverture du mode édition
  const startEditing = () => {
    if (!selectedWord) return;
    setEditWordText(selectedWord.word || "");
    setEditPartOfSpeech(selectedWord.part_of_speech || "");
    setEditGrammarNotes(selectedWord.grammar_notes || "");
    setEditLemma(selectedWord.lemma || "");
    setEditRadical(selectedWord.radical || "");
    setEditPrefix(selectedWord.prefix || "");
    setEditSuffix(selectedWord.suffix || "");
    setIsEditingWord(true);
  };

  // Enregistrement des modifs du mot
  const handleUpdateWord = async () => {
    if (!selectedWord) return;
    const res = await updateWord(selectedWord.id, {
      word: editWordText,
      part_of_speech: editPartOfSpeech,
      grammar_notes: editGrammarNotes,
      lemma: editLemma,
      radical: editRadical,
      prefix: editPrefix,
      suffix: editSuffix,
    });
    if (res.success) {
      const updatedWord = {
        ...selectedWord,
        word: editWordText,
        part_of_speech: editPartOfSpeech || null,
        grammar_notes: editGrammarNotes || null,
        lemma: editLemma || null,
        radical: editRadical || null,
        prefix: editPrefix || null,
        suffix: editSuffix || null,
      };
      setSelectedWord(updatedWord);
      setIsEditingWord(false);
      // Actualiser la liste principale
      const data = await searchDictionary(lang as string, query);
      setResults(data);
    } else {
      alert("Erreur lors de la modification : " + res.error);
    }
  };

  // Suppression du mot
  const handleDeleteWord = async () => {
    if (!selectedWord) return;
    if (
      !confirm(
        "Es-tu sûr de vouloir supprimer ce mot définitivement ? Cela supprimera également toutes ses phrases d'exemples et révisions."
      )
    )
      return;
    const res = await deleteWord(selectedWord.id);
    if (res.success) {
      setSelectedWord(null);
      // Actualiser la liste principale
      const data = await searchDictionary(lang as string, query);
      setResults(data);
    } else {
      alert("Erreur lors de la suppression : " + res.error);
    }
  };

  // Ajout d'une phrase d'exemple
  const handleAddSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWord || !newContentRaw.trim()) return;
    setIsAddingSentence(true);
    const synonymsList = newSynonyms
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = await addSentence({
      wordId: selectedWord.id,
      targetWord: selectedWord.word,
      languageCode: lang as string,
      contentRaw: newContentRaw,
      hint: newHint,
      synonyms: synonymsList,
    });

    if (res.success) {
      setNewContentRaw("");
      setNewHint("");
      setNewSynonyms("");
      // Actualiser la liste principale et le mot sélectionné
      const data = await searchDictionary(lang as string, query);
      setResults(data);
      const freshWord = data.find((w) => w.id === selectedWord.id);
      if (freshWord) setSelectedWord(freshWord);
    } else {
      alert("Erreur lors de l'ajout de la phrase : " + res.error);
    }
    setIsAddingSentence(false);
  };

  // Suppression d'une phrase
  const handleDeleteSentence = async (sentenceId: string) => {
    if (!confirm("Es-tu sûr de vouloir supprimer cette phrase d'exemple ?"))
      return;
    const res = await deleteSentence(sentenceId);
    if (res.success) {
      // Actualiser la liste principale et le mot sélectionné
      const data = await searchDictionary(lang as string, query);
      setResults(data);
      const freshWord = data.find((w) => w.id === selectedWord.id);
      if (freshWord) {
        setSelectedWord(freshWord);
      } else {
        setSelectedWord(null);
      }
    } else {
      alert("Erreur lors de la suppression de la phrase : " + res.error);
    }
  };

  // Thème adaptatif selon la langue
  const theme = ({
    en: {
      glowBlob1: "bg-blue-200/35",
      glowBlob2: "bg-indigo-200/20",
      accentBg: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/10 hover:shadow-blue-500/20",
      accentText: "text-blue-600",
      borderFocus: "focus:border-blue-500 focus:ring-blue-100",
      badgeBg: "bg-blue-50/50 text-blue-700 border-blue-100/50",
      iconBg: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      hoverBorder: "hover:border-blue-300",
      btnBorder: "border-blue-600 text-blue-600 hover:bg-blue-50",
    },
    es: {
      glowBlob1: "bg-rose-200/35",
      glowBlob2: "bg-orange-200/20",
      accentBg: "from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/10 hover:shadow-rose-500/20",
      accentText: "text-rose-600",
      borderFocus: "focus:border-rose-500 focus:ring-rose-100",
      badgeBg: "bg-rose-50/50 text-rose-700 border-rose-100/50",
      iconBg: "bg-rose-50 text-rose-600 hover:bg-rose-100",
      hoverBorder: "hover:border-rose-300",
      btnBorder: "border-rose-500 text-rose-500 hover:bg-rose-50",
    },
    de: {
      glowBlob1: "bg-amber-200/35",
      glowBlob2: "bg-yellow-200/20",
      accentBg: "from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-amber-500/10 hover:shadow-amber-500/20",
      accentText: "text-amber-600",
      borderFocus: "focus:border-amber-500 focus:ring-amber-100",
      badgeBg: "bg-amber-50/50 text-amber-700 border-amber-100/50",
      iconBg: "bg-amber-50 text-amber-600 hover:bg-amber-100",
      hoverBorder: "hover:border-amber-300",
      btnBorder: "border-amber-500 text-amber-500 hover:bg-amber-50",
    },
    pt: {
      glowBlob1: "bg-emerald-200/35",
      glowBlob2: "bg-teal-200/20",
      accentBg: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/10 hover:shadow-emerald-500/20",
      accentText: "text-emerald-600",
      borderFocus: "focus:border-emerald-500 focus:ring-emerald-100",
      badgeBg: "bg-emerald-50/50 text-emerald-700 border-emerald-100/50",
      iconBg: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
      hoverBorder: "hover:border-emerald-300",
      btnBorder: "border-emerald-600 text-emerald-600 hover:bg-emerald-50",
    },
    it: {
      glowBlob1: "bg-teal-200/35",
      glowBlob2: "bg-rose-200/20",
      accentBg: "from-teal-600 to-rose-600 hover:from-teal-700 hover:to-rose-700 shadow-teal-500/10 hover:shadow-teal-500/20",
      accentText: "text-teal-600",
      borderFocus: "focus:border-teal-500 focus:ring-teal-100",
      badgeBg: "bg-teal-50/50 text-teal-700 border-teal-100/50",
      iconBg: "bg-teal-50 text-teal-600 hover:bg-teal-100",
      hoverBorder: "hover:border-teal-300",
      btnBorder: "border-teal-600 text-teal-600 hover:bg-teal-50",
    },
    zh: {
      glowBlob1: "bg-red-200/35",
      glowBlob2: "bg-amber-200/20",
      accentBg: "from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 shadow-red-500/10 hover:shadow-red-500/20",
      accentText: "text-red-600",
      borderFocus: "focus:border-red-500 focus:ring-red-100",
      badgeBg: "bg-red-50/50 text-red-700 border-red-100/50",
      iconBg: "bg-red-50 text-red-600 hover:bg-red-100",
      hoverBorder: "hover:border-red-300",
      btnBorder: "border-red-600 text-red-600 hover:bg-red-50",
    },
    ja: {
      glowBlob1: "bg-rose-200/35",
      glowBlob2: "bg-slate-200/20",
      accentBg: "from-rose-600 to-slate-700 hover:from-rose-700 hover:to-slate-800 shadow-rose-500/10 hover:shadow-rose-500/20",
      accentText: "text-rose-600",
      borderFocus: "focus:border-rose-500 focus:ring-rose-100",
      badgeBg: "bg-rose-50/50 text-rose-700 border-rose-100/50",
      iconBg: "bg-rose-50 text-rose-600 hover:bg-rose-100",
      hoverBorder: "hover:border-rose-300",
      btnBorder: "border-rose-600 text-rose-600 hover:bg-rose-50",
    },
  } as Record<string, any>)[lang as string] || {
    glowBlob1: "bg-indigo-200/35",
    glowBlob2: "bg-violet-200/20",
    accentBg: "from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/10 hover:shadow-indigo-500/20",
    accentText: "text-indigo-600",
    borderFocus: "focus:border-indigo-500 focus:ring-indigo-100",
    badgeBg: "bg-indigo-50/50 text-indigo-700 border-indigo-100/50",
    iconBg: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    hoverBorder: "hover:border-indigo-300",
    btnBorder: "border-indigo-600 text-indigo-600 hover:bg-indigo-50",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-4 md:p-8 font-sans relative overflow-hidden flex flex-col justify-start items-center">
      {/* Decorative modern background glowing blur blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full filter blur-3xl ${theme.glowBlob1}`} />
        <div className={`absolute top-1/2 right-[-200px] -translate-y-1/2 w-[500px] h-[500px] rounded-full filter blur-3xl ${theme.glowBlob2}`} />
      </div>

      <div className="max-w-3xl w-full space-y-6 z-10 pt-2 md:pt-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              📚 Dictionnaire
            </h1>
            <span className="text-xs bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
              {results.length} mots
            </span>
          </div>
          <Link
            href={`/${lang}`}
            className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm transition-all"
            title="Retour au dashboard de langue"
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

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un mot médical, une racine, une phrase..."
            className={`block w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-2xl text-base outline-none transition-all shadow-sm ${theme.borderFocus}`}
            autoFocus
          />
        </div>

        {/* Results list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
              <svg className="animate-spin h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Recherche en cours...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 p-8 space-y-2">
              <span className="text-3xl block">🔍</span>
              <p className="text-slate-500 font-bold text-sm">
                Aucun mot médical trouvé pour "{query}".
              </p>
              <p className="text-xs text-slate-400">Essayez de saisir un autre terme ou vérifiez l'orthographe.</p>
            </div>
          ) : (
            results.map((wordObj) => (
              <div
                key={wordObj.id}
                onClick={() => setSelectedWord(wordObj)}
                className={`bg-white/85 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/50 hover:shadow-md transition-all cursor-pointer group flex flex-col ${theme.hoverBorder}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Audio Player Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(wordObj.word, lang as string);
                      }}
                      className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100"
                      title="Prononcer le mot"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M10 3.75a.75.75 0 00-1.264-.546L5.27 6.5H3a1 1 0 00-1 1v5a1 1 0 001 1h2.27l3.466 3.296A.75.75 0 0010 16.25V3.75zM12.56 6.47a.75.75 0 10-1.06 1.06 4.25 4.25 0 010 6.01.75.75 0 101.06 1.06 5.75 5.75 0 000-8.13z" />
                      </svg>
                    </button>

                    {/* Word title */}
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                      {wordObj.word}
                    </h3>

                    {/* Meta Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {wordObj.part_of_speech && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/30 text-slate-500 text-[9px] font-extrabold uppercase tracking-wide">
                          {wordObj.part_of_speech}
                        </span>
                      )}
                      {wordObj.grammar_notes && (
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase tracking-wide ${theme.badgeBg}`}>
                          {wordObj.grammar_notes}
                        </span>
                      )}
                      {wordObj.lemma && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wide">
                          Lemme: {wordObj.lemma}
                        </span>
                      )}
                      {wordObj.radical && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50/50 border border-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wide">
                          Radical: {wordObj.radical}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Example sentence snippet */}
                {wordObj.sentences && wordObj.sentences.length > 0 && (
                  <div className="mt-4 space-y-2.5 pl-4 border-l-2 border-slate-100">
                    {wordObj.sentences.slice(0, 2).map((sentence: any) => (
                      <div key={sentence.id} className="text-xs">
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {sentence.content_raw.replace(
                            /\{\{(.+?)::(.+?)\}\}/g,
                            (match: any, p1: string, p2: string) => p1
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          {sentence.hint}
                        </p>
                      </div>
                    ))}
                    {wordObj.sentences.length > 2 && (
                      <p className="text-[10px] text-slate-400 font-bold italic pt-1">
                        + {wordObj.sentences.length - 2} autres phrases d'exemples...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* DETAIL & EDIT MODAL */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200/40 flex flex-col">
            
            {/* Header Modal */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => speak(selectedWord.word, lang as string)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-xl bg-slate-50 border border-slate-100"
                  title="Prononcer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L5.27 6.5H3a1 1 0 00-1 1v5a1 1 0 001 1h2.27l3.466 3.296A.75.75 0 0010 16.25V3.75zM12.56 6.47a.75.75 0 10-1.06 1.06 4.25 4.25 0 010 6.01.75.75 0 101.06 1.06 5.75 5.75 0 000-8.13z" />
                  </svg>
                </button>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {selectedWord.word}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedWord(null);
                  setIsEditingWord(false);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-xl p-1.5 hover:bg-slate-50 transition-colors"
                title="Fermer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-left">
              
              {/* SECTION 1: WORD DETAILS */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Informations du mot
                  </h3>
                  {!isEditingWord ? (
                    <button
                      onClick={startEditing}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all ${theme.btnBorder}`}
                    >
                      Modifier le mot
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateWord}
                        className="px-3 py-1.5 text-xs font-extrabold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-sm"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setIsEditingWord(false)}
                        className="px-3 py-1.5 text-xs font-extrabold text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingWord ? (
                  /* Standard Mode Grid */
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nature grammaticale</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.part_of_speech || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Notes & Grammaire</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.grammar_notes || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Lemme</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.lemma || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Radical</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.radical || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Préfixe</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.prefix || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Suffixe</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedWord.suffix || "—"}</span>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode Form */
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mot médical :</label>
                      <input
                        type="text"
                        value={editWordText}
                        onChange={(e) => setEditWordText(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none font-bold ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nature :</label>
                      <input
                        type="text"
                        value={editPartOfSpeech}
                        onChange={(e) => setEditPartOfSpeech(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes / Temps :</label>
                      <input
                        type="text"
                        value={editGrammarNotes}
                        onChange={(e) => setEditGrammarNotes(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lemme :</label>
                      <input
                        type="text"
                        value={editLemma}
                        onChange={(e) => setEditLemma(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Radical :</label>
                      <input
                        type="text"
                        value={editRadical}
                        onChange={(e) => setEditRadical(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Préfixe :</label>
                      <input
                        type="text"
                        value={editPrefix}
                        onChange={(e) => setEditPrefix(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Suffixe :</label>
                      <input
                        type="text"
                        value={editSuffix}
                        onChange={(e) => setEditSuffix(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: EXAMPLE SENTENCES */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Phrases d'exemples ({selectedWord.sentences?.length || 0})
                </h3>

                {selectedWord.sentences && selectedWord.sentences.length > 0 ? (
                  <div className="space-y-3">
                    {selectedWord.sentences.map((sentence: any) => (
                      <div
                        key={sentence.id}
                        className="flex justify-between items-start gap-4 p-4 bg-white rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-colors shadow-sm"
                      >
                        <div className="space-y-1">
                          <p className="text-xs text-slate-800 leading-relaxed font-bold">
                            {sentence.content_raw.replace(
                              /\{\{(.+?)::(.+?)\}\}/g,
                              (match: any, p1: string, p2: string) => p1
                            )}
                          </p>
                          {sentence.hint && (
                            <p className="text-[11px] text-slate-400 font-semibold italic">
                              Traduction : {sentence.hint}
                            </p>
                          )}
                          {sentence.contextual_synonyms && sentence.contextual_synonyms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase self-center mr-1">Synonymes:</span>
                              {sentence.contextual_synonyms.map((syn: string, idx: number) => (
                                <span key={idx} className="text-[8px] bg-orange-50 text-orange-600 font-extrabold px-1.5 py-0.5 rounded-md border border-orange-100">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSentence(sentence.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors shrink-0 border border-transparent hover:border-red-100"
                          title="Supprimer la phrase d'exemple"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-white p-4 text-center rounded-2xl border border-slate-200/50">
                    Aucune phrase d'exemple associée à ce mot.
                  </p>
                )}

                {/* ADD SENTENCE FORM */}
                <form
                  onSubmit={handleAddSentence}
                  className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl space-y-4"
                >
                  <span className="block text-xs font-bold text-indigo-700 uppercase tracking-widest">
                    Ajouter une phrase d'exemple
                  </span>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Phrase avec mot masqué (format Cloze-Test) :
                    </label>
                    <textarea
                      value={newContentRaw}
                      onChange={(e) => setNewContentRaw(e.target.value)}
                      placeholder="Ex: The patient showed an {{imperative::impératif}} symptom."
                      required
                      rows={2}
                      className={`w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Traduction française (facultative) :
                      </label>
                      <input
                        type="text"
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                        placeholder="Ex: Le patient présentait un symptôme..."
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Synonymes (séparés par des virgules) :
                      </label>
                      <input
                        type="text"
                        value={newSynonyms}
                        onChange={(e) => setNewSynonyms(e.target.value)}
                        placeholder="Ex: crucial, vital"
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none ${theme.borderFocus}`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingSentence}
                      className={`px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 ${theme.accentBg}`}
                    >
                      {isAddingSentence ? "Création..." : "Ajouter la phrase"}
                    </button>
                  </div>
                </form>
              </div>

              {/* DESTRUCTIVE ZONE: DELETE WORD */}
              <div className="pt-6 border-t border-slate-100 flex justify-start">
                <button
                  onClick={handleDeleteWord}
                  className="px-4 py-2.5 text-[10px] font-bold text-red-600 bg-red-50/50 hover:bg-red-50 border border-red-200/50 rounded-xl transition-all"
                >
                  Supprimer définitivement le mot
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
