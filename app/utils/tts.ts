// utils/tts.ts

export const speak = (text: string, lang: string) => {
  if (!window.speechSynthesis) return;

  // 1. Nettoyage du texte
  // On transforme "I {{am eating::mange}} an apple" en "I am eating an apple"
  // On enlève les indices français pour ne pas que la voix anglaise essaie de lire "mange"
  const cleanText = text.replace(/\{\{(.+?)::.+?\}\}/g, "$1");

  // 2. Configuration de la voix
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Mapping simple des codes langues vers les codes BCP 47
  // Supabase: 'en', 'es', 'de' -> Navigateur: 'en-US', 'es-ES', 'de-DE'
  const langMap: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    fr: "fr-FR",
  };

  utterance.lang = langMap[lang] || "en-US";
  utterance.rate = 0.9; // Légèrement plus lent pour bien entendre (Optionnel)
  utterance.pitch = 1;

  // 3. Action !
  window.speechSynthesis.cancel(); // Arrête si une autre phrase est en cours
  window.speechSynthesis.speak(utterance);
};
