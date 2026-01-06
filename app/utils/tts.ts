// utils/tts.ts

// --- FIX DESKTOP : PRÉCHARGEMENT DES VOIX ---
// On stocke les voix en dehors de la fonction speak pour qu'elles soient prêtes
// dès le premier clic (sinon le 1er clic est souvent robotique sur Chrome/Safari Desktop).
let voicesCache: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesCache = voices;
  }
};

// On lance le chargement immédiatement au démarrage de l'app
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  // Chrome et Safari déclenchent cet événement quand la liste change (ou finit de charger)
  window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

export const speak = (text: string, lang: string) => {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // 1. Nettoyage du texte
  const cleanText = text.replace(/\{\{(.+?)::.+?\}\}/g, "$1");

  // 2. Configuration de base
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Mapping des langues
  const langMap: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    fr: "fr-FR",
  };

  const targetLang = langMap[lang] || "en-US";
  utterance.lang = targetLang;

  // 3. Récupération des voix (Via le cache ou en direct si le cache est vide)
  if (voicesCache.length === 0) loadVoices();

  const currentVoices =
    voicesCache.length > 0 ? voicesCache : window.speechSynthesis.getVoices();

  // Filtrage par langue
  const availableVoices = currentVoices.filter((v) =>
    v.lang.startsWith(targetLang.split("-")[0])
  );

  let preferredVoice: SpeechSynthesisVoice | undefined;

  // --- A. SPÉCIFIQUE IOS (iPhone/iPad) ---
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS && targetLang === "en-US") {
    // Sur iOS, on force "Ava" si disponible (c'est souvent la meilleure voix Premium)
    preferredVoice = availableVoices.find((v) => v.name.includes("Ava"));
  }

  // --- B. STANDARD (Desktop / Mac / Android) ---
  // Si on n'a pas trouvé de voix (ou si on n'est pas sur iOS)
  if (!preferredVoice) {
    const qualityKeywords = ["Natural", "Google", "Premium", "Enhanced"];
    preferredVoice = availableVoices.find((voice) =>
      qualityKeywords.some((keyword) => voice.name.includes(keyword))
    );
  }

  // --- C. FALLBACK ---
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  } else {
    // Si pas de voix Premium trouvée, on essaie la région exacte (ex: en-US vs en-GB)
    const exactRegionVoice = availableVoices.find((v) => v.lang === targetLang);
    if (exactRegionVoice) {
      utterance.voice = exactRegionVoice;
    }
  }

  // Configuration de la lecture
  utterance.rate = 0.9;
  utterance.pitch = 1;

  // 4. Action !
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};
