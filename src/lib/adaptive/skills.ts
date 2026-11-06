/** Extensible skill catalog. New skills can be added without a new table. */

export const CORE_SKILLS = [
  { code: "vocabulary", title: "Vocabulary", parentCode: null, order: 1 },
  { code: "grammar", title: "Grammar", parentCode: null, order: 2 },
  { code: "reading", title: "Reading", parentCode: null, order: 3 },
  { code: "writing", title: "Writing", parentCode: null, order: 4 },
  { code: "listening", title: "Listening", parentCode: null, order: 5 },
  { code: "speaking", title: "Speaking", parentCode: null, order: 6 },
  { code: "grammar.pronouns", title: "Pronouns", parentCode: "grammar", order: 10 },
  { code: "grammar.be", title: "Be verb", parentCode: "grammar", order: 11 },
  { code: "grammar.present", title: "Present Simple", parentCode: "grammar", order: 12 },
  { code: "grammar.articles", title: "Articles", parentCode: "grammar", order: 13 },
  { code: "grammar.plurals", title: "Plurals", parentCode: "grammar", order: 14 },
  { code: "grammar.prepositions", title: "Prepositions", parentCode: "grammar", order: 15 },
  { code: "grammar.questions", title: "Question formation", parentCode: "grammar", order: 16 },
  { code: "vocabulary.numbers", title: "Numbers", parentCode: "vocabulary", order: 20 },
  { code: "vocabulary.greetings", title: "Greetings", parentCode: "vocabulary", order: 21 },
  { code: "vocabulary.jobs", title: "Jobs", parentCode: "vocabulary", order: 22 },
  { code: "vocabulary.workplace", title: "Workplace", parentCode: "vocabulary", order: 23 },
  { code: "vocabulary.time", title: "Time", parentCode: "vocabulary", order: 24 },
  { code: "vocabulary.daily", title: "Daily activities", parentCode: "vocabulary", order: 25 },
] as const;

export const CORE_CODES = ["vocabulary", "grammar", "reading", "writing", "listening", "speaking"] as const;

export function grammarSkillCode(title: string | null | undefined) {
  const text = (title || "").toLowerCase();
  if (/pronoun/.test(text)) return "grammar.pronouns";
  if (/to be|be verb|\bam\b|\bis\b|\bare\b/.test(text)) return "grammar.be";
  if (/present/.test(text)) return "grammar.present";
  if (/article/.test(text)) return "grammar.articles";
  if (/plural/.test(text)) return "grammar.plurals";
  if (/preposition/.test(text)) return "grammar.prepositions";
  if (/question/.test(text)) return "grammar.questions";
  return "grammar";
}

export function skillForActivity(type: string, grammarTitle: string | null) {
  if (type.startsWith("LISTEN")) return "listening";
  if (type === "SPEAKING_PROMPT") return "speaking";
  if (type === "FLASHCARD" || type === "VOCABULARY_RECOGNITION" || type === "MATCHING") return "vocabulary";
  if (grammarTitle) return grammarSkillCode(grammarTitle);
  if (type === "WORD_ORDER" || type === "FILL_BLANK") return "grammar";
  return "reading";
}

export function hrefForSkill(code: string) {
  if (code.startsWith("listening")) return "/student/listening";
  if (code.startsWith("speaking")) return "/student/speaking";
  if (code.startsWith("grammar")) return "/student/tutor";
  if (code.startsWith("vocabulary")) return "/student/review";
  if (code === "writing") return "/student/assignments";
  return "/student/learning";
}

export function parentSkill(code: string) {
  return code.includes(".") ? code.split(".")[0] : code;
}
