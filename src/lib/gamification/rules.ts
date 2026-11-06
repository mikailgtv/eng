/** Configurable motivation rules. Learning Level is not an English level. */

export type XpRule = {
  ruleKey: string;
  xpKey: string;
  defaultXp: number;
  minutes: number;
  capKey: string;
  defaultCap: number;
};

export const EVENT_RULES: Record<string, XpRule> = {
  LESSON_COMPLETED: { ruleKey: "lesson", xpKey: "xp.lesson", defaultXp: 20, minutes: 5, capKey: "cap.lesson", defaultCap: 2 },
  PRACTICE_COMPLETED: { ruleKey: "practice", xpKey: "xp.practice", defaultXp: 10, minutes: 5, capKey: "cap.practice", defaultCap: 4 },
  QUESTION_CORRECT: { ruleKey: "practice", xpKey: "xp.practice", defaultXp: 10, minutes: 2, capKey: "cap.practice", defaultCap: 4 },
  SPEAKING_COMPLETED: { ruleKey: "speaking", xpKey: "xp.speaking", defaultXp: 15, minutes: 5, capKey: "cap.speaking", defaultCap: 4 },
  LISTENING_COMPLETED: { ruleKey: "listening", xpKey: "xp.listening", defaultXp: 15, minutes: 5, capKey: "cap.listening", defaultCap: 4 },
  VOCABULARY_CORRECT: { ruleKey: "vocabulary", xpKey: "xp.vocabulary", defaultXp: 5, minutes: 1, capKey: "cap.vocabulary", defaultCap: 8 },
  ASSIGNMENT_COMPLETED: { ruleKey: "assignment", xpKey: "xp.assignment", defaultXp: 20, minutes: 5, capKey: "cap.assignment", defaultCap: 2 },
  EXAM_COMPLETED: { ruleKey: "quiz", xpKey: "xp.quiz", defaultXp: 10, minutes: 5, capKey: "cap.quiz", defaultCap: 2 },
  AI_PRACTICE_COMPLETED: { ruleKey: "practice", xpKey: "xp.practice", defaultXp: 10, minutes: 5, capKey: "cap.practice", defaultCap: 2 },
};

export const DEFAULT_SETTINGS: Record<string, string> = {
  enabled: "true",
  dailyXpCap: "80",
  "xp.lesson": "20",
  "xp.practice": "10",
  "xp.speaking": "15",
  "xp.listening": "15",
  "xp.vocabulary": "5",
  "xp.assignment": "20",
  "xp.quiz": "10",
  "cap.lesson": "2",
  "cap.practice": "4",
  "cap.speaking": "4",
  "cap.listening": "4",
  "cap.vocabulary": "8",
  "cap.assignment": "2",
  "cap.quiz": "2",
  weeklyGoal: "4",
  freezeMax: "1",
};

export const BADGE_SEEDS = [
  { code: "FIRST_STEP", name: "First Step", description: "Completed your first lesson.", icon: "lesson", category: "Lessons", requirementType: "LESSON_COMPLETED", requirementCount: 1, xpReward: 5 },
  { code: "FIRST_CONVERSATION", name: "First Conversation", description: "Completed your first speaking session.", icon: "speaking", category: "Speaking", requirementType: "SPEAKING_COMPLETED", requirementCount: 1, xpReward: 5 },
  { code: "LISTENER", name: "Listener", description: "Completed 10 listening activities.", icon: "listening", category: "Listening", requirementType: "LISTENING_COMPLETED", requirementCount: 10, xpReward: 10 },
  { code: "SPEAKER", name: "Speaker", description: "Completed 10 speaking sessions.", icon: "speaking", category: "Speaking", requirementType: "SPEAKING_COMPLETED", requirementCount: 10, xpReward: 10 },
  { code: "WORD_BUILDER", name: "Word Builder", description: "Practiced 100 vocabulary items.", icon: "vocabulary", category: "Vocabulary", requirementType: "VOCABULARY_CORRECT", requirementCount: 100, xpReward: 10 },
  { code: "STREAK_STARTER", name: "Streak Starter", description: "Practiced on 3 consecutive days.", icon: "streak", category: "Consistency", requirementType: "STREAK_DAYS", requirementCount: 3, xpReward: 5 },
  { code: "CONSISTENT_LEARNER", name: "Consistent Learner", description: "Practiced on 7 consecutive days.", icon: "streak", category: "Consistency", requirementType: "STREAK_DAYS", requirementCount: 7, xpReward: 10 },
  { code: "COURSE_EXPLORER", name: "Course Explorer", description: "Completed 3 lessons.", icon: "lesson", category: "Lessons", requirementType: "LESSON_COMPLETED", requirementCount: 3, xpReward: 10 },
];

export const MILESTONE_SEEDS = [
  { code: "LESSONS_10", name: "10 lessons completed", description: "Ten lessons are recorded as completed.", requirementType: "LESSON_COMPLETED", requirementCount: 10 },
  { code: "VOCAB_50", name: "50 vocabulary items practiced", description: "Fifty vocabulary reviews are recorded.", requirementType: "VOCABULARY_CORRECT", requirementCount: 50 },
  { code: "SPEAKING_10", name: "10 speaking sessions completed", description: "Ten speaking sessions are recorded.", requirementType: "SPEAKING_COMPLETED", requirementCount: 10 },
  { code: "LISTENING_MINUTES_100", name: "100 minutes of listening practice", description: "Listening activities added up to 100 estimated minutes. This is not a timer of the page being open.", requirementType: "LISTENING_MINUTES", requirementCount: 100 },
];

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function applyStreakStep(input: {
  current: number;
  longest: number;
  lastDate: string | null;
  today: string;
  freezes: number;
}) {
  if (!input.lastDate || input.lastDate === input.today) {
    const current = input.lastDate ? input.current : 1;
    return { current, longest: Math.max(input.longest, current), status: "ACTIVE" as const, useFreeze: false, note: null as string | null };
  }
  const gap = daysBetween(input.lastDate, input.today);
  if (gap === 1) {
    const current = input.current + 1;
    return { current, longest: Math.max(input.longest, current), status: "ACTIVE" as const, useFreeze: false, note: null };
  }
  if (gap === 2) {
    const current = input.current + 1;
    return { current, longest: Math.max(input.longest, current), status: "ACTIVE" as const, useFreeze: false, note: "Streak resumed." };
  }
  if (gap === 3 && input.freezes > 0) {
    const current = Math.max(1, input.current);
    return { current, longest: Math.max(input.longest, current), status: "ACTIVE" as const, useFreeze: true, note: "A saved freeze covered one missed day." };
  }
  return { current: 1, longest: Math.max(input.longest, 1), status: "ACTIVE" as const, useFreeze: false, note: "Let's continue from here." };
}

export function levelProgress(totalXp: number, levels: { level: number; xpRequired: number }[]) {
  const sorted = [...levels].sort((a, b) => a.xpRequired - b.xpRequired);
  let current = sorted[0] ?? { level: 1, xpRequired: 0 };
  let next: { level: number; xpRequired: number } | null = null;
  for (const row of sorted) {
    if (totalXp >= row.xpRequired) current = row;
    else {
      next = row;
      break;
    }
  }
  const span = next ? Math.max(1, next.xpRequired - current.xpRequired) : 60;
  const into = Math.max(0, totalXp - current.xpRequired);
  const remaining = next ? Math.max(0, next.xpRequired - totalXp) : Math.max(0, span - into);
  return {
    level: current.level,
    percent: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    remaining,
    nextLevel: next?.level ?? null,
  };
}

export function streakMessage(lastDate: string | null, today: string, current: number) {
  if (!lastDate) return "A learning streak starts when you finish an activity. Opening the page does not count.";
  const gap = daysBetween(lastDate, today);
  if (gap <= 0) return `${current}-day learning streak`;
  if (gap === 1) return `${current}-day learning streak. Finish one activity to continue it.`;
  if (gap === 2) return "Resume your learning streak. A missed day is not a penalty.";
  return "Let's continue from here.";
}
