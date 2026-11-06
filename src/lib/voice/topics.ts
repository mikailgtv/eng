/** Beginner speaking scripts. These are practice prompts, not official exams. */

export type SpeakingTopic = {
  id: string;
  title: string;
  prompts: string[];
  words: string[];
};

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  { id: "greetings", title: "Greetings", prompts: ["Hello. What is your name?", "How are you?"], words: ["hello", "name"] },
  { id: "introduce", title: "Introducing yourself", prompts: ["What is your name?", "Where do you work?"], words: ["name", "work"] },
  { id: "job", title: "Job", prompts: ["What is your job?", "Say: I work at a station."], words: ["job", "work"] },
  { id: "workplace", title: "Workplace", prompts: ["Where do you work?", "Say: I work at a fire station."], words: ["work", "station"] },
  { id: "numbers", title: "Numbers", prompts: ["Say the number: three.", "Say the number: ten."], words: ["three", "ten"] },
  { id: "time", title: "Time", prompts: ["Say: It is nine o'clock.", "Say: Good morning."], words: ["morning", "nine"] },
  { id: "days", title: "Days of the week", prompts: ["Say: Today is Monday.", "Say: I work on Tuesday."], words: ["Monday", "Tuesday"] },
  { id: "food", title: "Food", prompts: ["Say: I like water.", "Say: I eat bread."], words: ["water", "bread"] },
  { id: "family", title: "Family", prompts: ["Say: This is my family.", "Say: I have a brother."], words: ["family", "brother"] },
  { id: "directions", title: "Basic directions", prompts: ["Say: Turn left.", "Say: Go straight."], words: ["left", "straight"] },
  { id: "help", title: "Asking for help", prompts: ["Say: Can you help me?", "Say: I need help."], words: ["help"] },
  { id: "safety", title: "Basic safety words", prompts: ["Say: Stop.", "Say: Be careful."], words: ["stop", "careful"] },
  { id: "firefighter", title: "Basic workplace words", prompts: ["Say: I am a firefighter.", "Say: I work at a fire station."], words: ["firefighter", "station"] },
];

export function topicById(id: string | null | undefined) {
  return SPEAKING_TOPICS.find((topic) => topic.id === id) ?? SPEAKING_TOPICS[0];
}
