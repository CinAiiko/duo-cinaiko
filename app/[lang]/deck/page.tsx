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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* En-tête + Retour */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📚 Dictionnaire{" "}
            <span className="text-slate-400 text-sm font-normal">
              ({results.length})
            </span>
          </h1>
          <Link
            href={`/${lang}`}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            ← Retour
          </Link>
        </div>

        {/* Barre de Recherche */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-slate-400 text-lg">🔍</span>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un mot, une phrase..."
            className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm group-hover:border-slate-300"
            autoFocus
          />
        </div>

        {/* Liste des Résultats */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              Chargement...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500">
                Aucun résultat trouvé pour "{query}".
              </p>
            </div>
          ) : (
            results.map((wordObj) => (
              <div
                key={wordObj.id}
                onClick={() => setSelectedWord(wordObj)}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {/* Bouton Audio */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(wordObj.word, lang as string);
                      }}
                      className="text-slate-300 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-indigo-50"
                      title="Écouter le mot"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6"
                      >
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                      </svg>
                    </button>

                    {/* Le Mot Cible */}
                    <h3 className="text-xl font-bold text-slate-800">
                      {wordObj.word}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {wordObj.part_of_speech && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          {wordObj.part_of_speech}
                        </span>
                      )}
                      {wordObj.grammar_notes && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                          {wordObj.grammar_notes}
                        </span>
                      )}
                      {wordObj.lemma && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          Lemme: {wordObj.lemma}
                        </span>
                      )}
                      {wordObj.radical && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                          Radical: {wordObj.radical}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exemples de Phrases */}
                {wordObj.sentences && wordObj.sentences.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-slate-100">
                    {wordObj.sentences.slice(0, 3).map((sentence: any) => (
                      <div key={sentence.id} className="text-sm">
                        <p className="text-slate-600 leading-relaxed">
                          {sentence.content_raw.replace(
                            /\{\{(.+?)::(.+?)\}\}/g,
                            (match: any, p1: string, p2: string) => p1
                          )}
                        </p>
                        <p className="text-xs text-slate-400 italic">
                          {sentence.hint}
                        </p>
                      </div>
                    ))}
                    {wordObj.sentences.length > 3 && (
                      <p className="text-xs text-slate-400 italic mt-1">
                        + {wordObj.sentences.length - 3} autres exemples...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE DETAIL & EDITION */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            
            {/* Header Modal */}
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => speak(selectedWord.word, lang as string)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-indigo-50"
                  title="Écouter"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                  </svg>
                </button>
                <h2 className="text-2xl font-extrabold text-slate-800">
                  {selectedWord.word}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedWord(null);
                  setIsEditingWord(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* SECTION 1 : INFOS DU MOT / EDITION */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Informations du mot
                  </h3>
                  {!isEditingWord ? (
                    <button
                      onClick={startEditing}
                      className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-all"
                    >
                      Modifier le mot
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateWord}
                        className="px-3 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setIsEditingWord(false)}
                        className="px-3 py-1 text-xs font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingWord ? (
                  /* Affichage Normal */
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Nature :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.part_of_speech || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Notes / Temps :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.grammar_notes || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Lemme :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.lemma || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Radical :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.radical || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Préfixe :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.prefix || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-400">Suffixe :</span>
                      <span className="font-semibold text-slate-700">{selectedWord.suffix || "—"}</span>
                    </div>
                  </div>
                ) : (
                  /* Mode Formulaire d'Édition */
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1">Mot cible :</label>
                      <input
                        type="text"
                        value={editWordText}
                        onChange={(e) => setEditWordText(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Nature :</label>
                      <input
                        type="text"
                        value={editPartOfSpeech}
                        onChange={(e) => setEditPartOfSpeech(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Notes / Temps :</label>
                      <input
                        type="text"
                        value={editGrammarNotes}
                        onChange={(e) => setEditGrammarNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Lemme :</label>
                      <input
                        type="text"
                        value={editLemma}
                        onChange={(e) => setEditLemma(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Radical :</label>
                      <input
                        type="text"
                        value={editRadical}
                        onChange={(e) => setEditRadical(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Préfixe :</label>
                      <input
                        type="text"
                        value={editPrefix}
                        onChange={(e) => setEditPrefix(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Suffixe :</label>
                      <input
                        type="text"
                        value={editSuffix}
                        onChange={(e) => setEditSuffix(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2 : PHRASES D'EXEMPLES */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Phrases d'exemples ({selectedWord.sentences?.length || 0})
                </h3>

                {selectedWord.sentences && selectedWord.sentences.length > 0 ? (
                  <div className="space-y-3">
                    {selectedWord.sentences.map((sentence: any) => (
                      <div
                        key={sentence.id}
                        className="flex justify-between items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-sm text-slate-800 leading-relaxed font-medium">
                            {sentence.content_raw.replace(
                              /\{\{(.+?)::(.+?)\}\}/g,
                              (match: any, p1: string, p2: string) => p1
                            )}
                          </p>
                          {sentence.hint && (
                            <p className="text-xs text-slate-400 italic">
                              Traduction : {sentence.hint}
                            </p>
                          )}
                          {sentence.contextual_synonyms && sentence.contextual_synonyms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <span className="text-[9px] text-slate-400 font-bold uppercase self-center mr-1">Syns:</span>
                              {sentence.contextual_synonyms.map((syn: string, idx: number) => (
                                <span key={idx} className="text-[9px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded border border-orange-100">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSentence(sentence.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          title="Supprimer la phrase"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
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
                  <p className="text-sm text-slate-400 italic bg-white p-4 text-center rounded-xl border border-slate-200">
                    Aucune phrase d'exemple associée à ce mot.
                  </p>
                )}

                {/* FORMULAIRE AJOUT PHRASE */}
                <form
                  onSubmit={handleAddSentence}
                  className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl space-y-3"
                >
                  <span className="block text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Ajouter une phrase d'exemple
                  </span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Phrase brute (format Cloze-Test) :
                    </label>
                    <textarea
                      value={newContentRaw}
                      onChange={(e) => setNewContentRaw(e.target.value)}
                      placeholder="Ex: She likes {{cooking::cuisiner}} every day."
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Traduction française (facultative) :
                      </label>
                      <input
                        type="text"
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                        placeholder="Ex: Elle aime cuisiner..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Synonymes (séparés par des virgules) :
                      </label>
                      <input
                        type="text"
                        value={newSynonyms}
                        onChange={(e) => setNewSynonyms(e.target.value)}
                        placeholder="Ex: baking, preparing"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingSentence}
                      className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md active:scale-95 duration-100 disabled:opacity-50"
                    >
                      {isAddingSentence ? "Ajout..." : "Ajouter la phrase"}
                    </button>
                  </div>
                </form>
              </div>

              {/* DANGER ZONE : SUPPRIMER MOT */}
              <div className="pt-6 border-t border-slate-100 flex justify-start">
                <button
                  onClick={handleDeleteWord}
                  className="px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-all shrink-0"
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
