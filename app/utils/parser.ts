// utils/parser.ts

export type ParsedSentence = {
  display_text: string;
  answer_target: string;
  hint: string | null;
};

export function parseCloze(rawContent: string): ParsedSentence {
  // Regex pour trouver le pattern {{réponse::indice}}
  // Ex: {{am eating::mange}}
  const regex = /\{\{(.+?)::(.+?)\}\}/;
  const match = rawContent.match(regex);

  if (!match) {
    // Si pas de format spécial, on renvoie tout tel quel (fallback)
    return {
      display_text: rawContent,
      answer_target: rawContent,
      hint: null,
    };
  }

  const fullMatch = match[0]; // {{am eating::mange}}
  const answer = match[1]; // am eating
  const hint = match[2]; // mange

  // On remplace le trou par "..."
  const displayText = rawContent.replace(fullMatch, "...");

  return {
    display_text: displayText,
    answer_target: answer.trim(), // On nettoie les espaces
    hint: hint.trim(),
  };
}
