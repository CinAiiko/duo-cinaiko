// utils/tts.ts

export const speak = (text: string, lang: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // 1. Nettoyage du texte
  // On transforme "I {{am eating::mange}} an apple" en "I am eating an apple"
  const cleanText = text.replace(/\{\{(.+?)::.+?\}\}/g, "$1");

  // 2. Configuration de base
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Mapping des langues vers les codes BCP 47
  const langMap: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    fr: "fr-FR",
  };

  const targetLang = langMap[lang] || "en-US";
  utterance.lang = targetLang;

  // 3. Sélection intelligente de la voix (Optimisation Cross-Browser)
  const voices = window.speechSynthesis.getVoices();

  // On récupère toutes les voix compatibles avec la langue (ex: 'en' matche 'en-US', 'en-GB')
  const availableVoices = voices.filter((v) =>
    v.lang.startsWith(targetLang.split("-")[0])
  );

  // Mots-clés pour identifier les voix de haute qualité selon le navigateur :
  // - "Natural" : Souvent les voix "Microsoft Online" sur Edge (Excellente qualité)
  // - "Google" : Les voix neuronales de Google Chrome
  // - "Premium" / "Enhanced" : Les voix améliorées sur macOS et iOS (Siri/System)
  const qualityKeywords = ["Natural", "Google", "Premium", "Enhanced"];

  // On cherche la meilleure voix disponible
  const preferredVoice = availableVoices.find((voice) =>
    qualityKeywords.some((keyword) => voice.name.includes(keyword))
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  } else {
    // Fallback : Si pas de voix "Premium", on essaie de matcher la région exacte (ex: es-ES vs es-MX)
    const exactRegionVoice = availableVoices.find((v) => v.lang === targetLang);
    if (exactRegionVoice) {
      utterance.voice = exactRegionVoice;
    }
  }

  // Configuration de la lecture
  utterance.rate = 0.9; // Rythme légèrement ralenti pour l'apprentissage
  utterance.pitch = 1;

  // 4. Action !
  window.speechSynthesis.cancel(); // Coupe la parole précédente
  window.speechSynthesis.speak(utterance);
};
