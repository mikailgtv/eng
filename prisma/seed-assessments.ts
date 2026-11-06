/**
 * Phase 4 seed — REAL Pre-A1 question bank + assessments.
 *
 * Everything is real beginner English from the curriculum (no placeholders).
 * Idempotent: questions are keyed by their exact questionText, assessments by
 * title; re-running refreshes content and question lists without touching
 * student attempts.
 */
import { PrismaClient } from "@prisma/client";

type OptionSpec = { text: string; isCorrect: boolean };

type QuestionSpec = {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "MATCHING" | "WORD_ORDER" | "LISTENING";
  skill: "VOCABULARY" | "GRAMMAR" | "READING" | "LISTENING";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  points?: number;
  lesson?: string;
  explanation?: string;
  options?: OptionSpec[];
  config?: Record<string, unknown>;
};

const mc = (texts: string[], correctIndex: number): OptionSpec[] =>
  texts.map((text, i) => ({ text, isCorrect: i === correctIndex }));

export const SEED_QUESTIONS: QuestionSpec[] = [
  // ---- Greetings / vocabulary --------------------------------------------
  {
    text: "Sara sees Ali in the morning. What does she say?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    explanation: "In the morning we say “Good morning.”",
    options: mc(["Good morning!", "Good night!", "Goodbye!"], 0),
  },
  {
    text: "It is 10 o'clock at night. Ali goes to bed. He says:",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    explanation: "“Good night” is for bedtime.",
    options: mc(["Good night!", "Good morning!", "Good afternoon!"], 0),
  },
  {
    text: "Your friend says “Goodbye.” What do you say?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    explanation: "We answer with “Goodbye” (or “Bye”).",
    options: mc(["Goodbye!", "Good morning!", "Thank you!"], 0),
  },
  {
    text: "What does “hello” mean?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    options: mc(["سلام", "خداحافظ", "شب بخیر"], 0),
  },
  {
    text: "What does “goodbye” mean?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    options: mc(["خداحافظ", "سلام", "صبح بخیر"], 0),
  },
  {
    text: "What does “red” mean?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Colors",
    options: mc(["قرمز", "آبی", "سبز"], 0),
  },
  {
    text: "What does “book” mean?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Common Objects",
    options: mc(["کتاب", "پنجره", "در"], 0),
  },
  {
    text: "What does “mother” mean?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Family",
    options: mc(["مادر", "پدر", "خواهر"], 0),
  },
  {
    text: "Match the greetings with their meanings.",
    type: "MATCHING", skill: "VOCABULARY", difficulty: "EASY", points: 2, lesson: "Hello and Goodbye",
    explanation: "hello = سلام, goodbye = خداحافظ, good morning = صبح بخیر",
    config: {
      pairs: [
        { left: "hello", right: "سلام" },
        { left: "goodbye", right: "خداحافظ" },
        { left: "good morning", right: "صبح بخیر" },
      ],
    },
  },
  {
    text: "Match the colors with their meanings.",
    type: "MATCHING", skill: "VOCABULARY", difficulty: "EASY", points: 2, lesson: "Colors",
    config: {
      pairs: [
        { left: "red", right: "قرمز" },
        { left: "blue", right: "آبی" },
        { left: "green", right: "سبز" },
      ],
    },
  },
  {
    text: "Match the objects with their meanings.",
    type: "MATCHING", skill: "VOCABULARY", difficulty: "MEDIUM", points: 2, lesson: "Common Objects",
    config: {
      pairs: [
        { left: "book", right: "کتاب" },
        { left: "pen", right: "قلم" },
        { left: "door", right: "در" },
      ],
    },
  },
  {
    text: "We say “Good morning” in the morning.",
    type: "TRUE_FALSE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Hello and Goodbye",
    config: { answer: true },
  },

  // ---- Alphabet & numbers -------------------------------------------------
  {
    text: "How many letters are in the English alphabet?",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "The English Alphabet",
    explanation: "The English alphabet has 26 letters, from A to Z.",
    options: mc(["24", "26", "28"], 1),
  },
  {
    text: "Which letter comes after C?",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "The English Alphabet",
    options: mc(["B", "D", "E"], 1),
  },
  {
    text: "Which of these is a vowel?",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "The English Alphabet",
    explanation: "A, E, I, O, U are the vowels.",
    options: mc(["B", "A", "D"], 1),
  },
  {
    text: "The vowels are A, E, I, O, U.",
    type: "TRUE_FALSE", skill: "GRAMMAR", difficulty: "EASY", lesson: "The English Alphabet",
    config: { answer: true },
  },
  {
    text: "Which number comes after seven?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Numbers 1–20",
    explanation: "Six, seven, eight — after seven comes eight.",
    options: mc(["six", "eight", "nine"], 1),
  },
  {
    text: "You have two apples. You buy three more. How many apples?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Numbers 1–20",
    options: mc(["four", "five", "six"], 1),
  },
  {
    text: "2 + 2 = four.",
    type: "TRUE_FALSE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Numbers 1–20",
    config: { answer: true },
  },
  {
    text: "Write the answer as a word: 2 + 3 = ___",
    type: "FILL_BLANK", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Numbers 1–20",
    explanation: "2 + 3 = five.",
    config: { acceptedAnswers: ["five", "5"] },
  },
  {
    text: "Match the numbers with the words.",
    type: "MATCHING", skill: "VOCABULARY", difficulty: "MEDIUM", points: 2, lesson: "Numbers 1–20",
    config: {
      pairs: [
        { left: "3", right: "three" },
        { left: "6", right: "six" },
        { left: "9", right: "nine" },
      ],
    },
  },

  // ---- Pronouns & verb to be ----------------------------------------------
  {
    text: "Sara is a girl. ___ is my friend.",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "I, You, He, She",
    explanation: "We use “she” for a girl or a woman.",
    options: mc(["He", "She", "I"], 1),
  },
  {
    text: "Ali is a boy. ___ is ten years old.",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "I, You, He, She",
    explanation: "We use “he” for a boy or a man.",
    options: mc(["She", "He", "You"], 1),
  },
  {
    text: "This is my mother. ___ is a teacher.",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "EASY", lesson: "I, You, He, She",
    options: mc(["He", "She", "It"], 1),
  },
  {
    text: "We use “he” for a woman.",
    type: "TRUE_FALSE", skill: "GRAMMAR", difficulty: "EASY", lesson: "I, You, He, She",
    explanation: "“He” is for a man or a boy; “she” is for a woman.",
    config: { answer: false },
  },
  {
    text: "My name ___ Ali.",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "EASY", lesson: "My Name Is...",
    explanation: "We say “My name is Ali.” — name is always with “is”.",
    config: { acceptedAnswers: ["is"] },
  },
  {
    text: "I ___ a student.",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "EASY", lesson: "The verb “to be”",
    explanation: "We use “am” with “I.”",
    config: { acceptedAnswers: ["am"] },
  },
  {
    text: "She ___ my sister.",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "EASY", lesson: "The verb “to be”",
    explanation: "We use “is” with he, she and it.",
    config: { acceptedAnswers: ["is"] },
  },
  {
    text: "They ___ my friends.",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "The verb “to be”",
    explanation: "We use “are” with you, we and they.",
    config: { acceptedAnswers: ["are"] },
  },
  {
    text: "We say “My name are Ali.”",
    type: "TRUE_FALSE", skill: "GRAMMAR", difficulty: "EASY", lesson: "My Name Is...",
    config: { answer: false },
  },
  {
    text: "Put the words in the correct order: introduce yourself.",
    type: "WORD_ORDER", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "My Name Is...",
    explanation: "“My name is Ali.”",
    config: { words: ["My", "name", "is", "Ali"] },
  },
  {
    text: "Put the words in the correct order: say what you are.",
    type: "WORD_ORDER", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "The verb “to be”",
    explanation: "“I am a teacher.”",
    config: { words: ["I", "am", "a", "teacher"] },
  },
  {
    text: "Put the words in the correct order: talk about your sister.",
    type: "WORD_ORDER", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "The verb “to be”",
    explanation: "“She is my sister.”",
    config: { words: ["She", "is", "my", "sister"] },
  },
  {
    text: "Match the pronouns with their meanings.",
    type: "MATCHING", skill: "GRAMMAR", difficulty: "MEDIUM", points: 2, lesson: "I, You, He, She",
    config: {
      pairs: [
        { left: "I", right: "من" },
        { left: "you", right: "تو، شما" },
        { left: "he", right: "او (مرد)" },
      ],
    },
  },

  // ---- Family / objects / colors / this-that / questions / days -----------
  {
    text: "My father's daughter is my …",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Family",
    explanation: "Your father's daughter is your sister.",
    options: mc(["sister", "mother", "teacher"], 0),
  },
  {
    text: "My mother's son is my …",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Family",
    options: mc(["brother", "father", "friend"], 0),
  },
  {
    text: "You read a …",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Common Objects",
    options: mc(["book", "door", "window"], 0),
  },
  {
    text: "You look out of the ___ at school.",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Common Objects",
    options: mc(["window", "pen", "table"], 0),
  },
  {
    text: "What color is a banana?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Colors",
    options: mc(["yellow", "blue", "black"], 0),
  },
  {
    text: "The snow is black.",
    type: "TRUE_FALSE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Colors",
    explanation: "The snow is white.",
    config: { answer: false },
  },
  {
    text: "The book is in my hand, very near me. I say:",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "This and That",
    explanation: "Near things are “this”; far things are “that”.",
    options: mc(["This is my book.", "That is my book."], 0),
  },
  {
    text: "The car is far away, across the street. I say:",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "This and That",
    options: mc(["That is a car.", "This is a car."], 0),
  },
  {
    text: "You want to know a place. You ask:",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "Simple Questions",
    explanation: "“Where” asks about a place.",
    options: mc(["Where is the school?", "What is the school?", "Who is the school?"], 0),
  },
  {
    text: "You want to know a person. You ask:",
    type: "MULTIPLE_CHOICE", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "Simple Questions",
    options: mc(["Who is your teacher?", "Where is your teacher?", "What is your teacher?"], 0),
  },
  {
    text: "___ is your name?",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "EASY", lesson: "Simple Questions",
    explanation: "We ask “What is your name?”",
    config: { acceptedAnswers: ["what"] },
  },
  {
    text: "___ is my bag. (the bag is near me)",
    type: "FILL_BLANK", skill: "GRAMMAR", difficulty: "MEDIUM", lesson: "This and That",
    config: { acceptedAnswers: ["this"] },
  },
  {
    text: "How many days are in a week?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Days of the Week",
    options: mc(["7", "5", "6"], 0),
  },
  {
    text: "Which day comes after Tuesday?",
    type: "MULTIPLE_CHOICE", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Days of the Week",
    options: mc(["Wednesday", "Thursday", "Monday"], 0),
  },
  {
    text: "The day after Monday is ___.",
    type: "FILL_BLANK", skill: "VOCABULARY", difficulty: "MEDIUM", lesson: "Days of the Week",
    config: { acceptedAnswers: ["tuesday"] },
  },
  {
    text: "Days of the week always start with a big letter, like “Monday”.",
    type: "TRUE_FALSE", skill: "GRAMMAR", difficulty: "EASY", lesson: "Days of the Week",
    config: { answer: true },
  },
  {
    text: "“Window” means پنجره.",
    type: "TRUE_FALSE", skill: "VOCABULARY", difficulty: "EASY", lesson: "Common Objects",
    config: { answer: true },
  },

  // ---- Listening (real audio files) ---------------------------------------
  {
    text: "Listen. What does Sara ask?",
    type: "LISTENING", skill: "LISTENING", difficulty: "EASY", points: 2, lesson: "Hello and Goodbye",
    config: { audioUrl: "/audio/hello-1.mp3", transcript: "Hello! I'm Sara. How are you today?" },
    options: mc(["How are you today?", "What is your name?", "Where are you from?"], 0),
  },
  {
    text: "Listen. What day is tomorrow?",
    type: "LISTENING", skill: "LISTENING", difficulty: "MEDIUM", points: 2, lesson: "Days of the Week",
    config: { audioUrl: "/audio/days-1.mp3", transcript: "Today is Monday. Tomorrow is Tuesday." },
    options: mc(["Tuesday", "Monday", "Sunday"], 0),
  },
  {
    text: "Listen. Which number do you hear LAST?",
    type: "LISTENING", skill: "LISTENING", difficulty: "MEDIUM", points: 2, lesson: "Numbers 1–20",
    config: { audioUrl: "/audio/numbers-1.mp3", transcript: "Seven, eight, nine, ten!" },
    options: mc(["ten", "seven", "nine"], 0),
  },
  {
    text: "Listen. What color is the apple?",
    type: "LISTENING", skill: "LISTENING", difficulty: "EASY", points: 2, lesson: "Colors",
    config: { audioUrl: "/audio/colors-1.mp3", transcript: "The sky is blue. The apple is red." },
    options: mc(["red", "blue", "green"], 0),
  },
  {
    text: "Listen. Who is Maryam?",
    type: "LISTENING", skill: "LISTENING", difficulty: "MEDIUM", points: 2, lesson: "Family",
    config: { audioUrl: "/audio/family-1.mp3", transcript: "This is my mother. Her name is Maryam." },
    options: mc(["my mother", "my sister", "my teacher"], 0),
  },
  {
    text: "Listen. What is his name?",
    type: "LISTENING", skill: "LISTENING", difficulty: "EASY", points: 2, lesson: "My Name Is...",
    config: { audioUrl: "/audio/myname-1.mp3", transcript: "Hi! My name is Ali. What is your name?" },
    options: mc(["Ali", "Sara", "Ahmad"], 0),
  },
];

type AssessmentSpec = {
  title: string;
  type: "QUIZ" | "EXAM";
  description: string;
  durationMinutes: number | null;
  passingScore: number;
  maxAttempts: number | null;
  status: "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "ARCHIVED";
  startAt?: string;
  endAt?: string;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  /** [questionText, points] */
  questions: [string, number][];
};

export const SEED_ASSESSMENTS: AssessmentSpec[] = [
  {
    title: "Quiz 1: Basic Greetings",
    type: "QUIZ",
    description: "Hello, goodbye and the greetings from the first lessons.",
    durationMinutes: 10,
    passingScore: 70,
    maxAttempts: 3,
    status: "OPEN",
    questions: [
      ["Sara sees Ali in the morning. What does she say?", 1],
      ["It is 10 o'clock at night. Ali goes to bed. He says:", 1],
      ["What does “hello” mean?", 1],
      ["What does “goodbye” mean?", 1],
      ["We say “Good morning” in the morning.", 1],
      ["Match the greetings with their meanings.", 2],
      ["Listen. What does Sara ask?", 2],
      ["Put the words in the correct order: introduce yourself.", 1],
    ],
  },
  {
    title: "Quiz 2: Alphabet & Numbers",
    type: "QUIZ",
    description: "The alphabet, vowels and numbers 1–20.",
    durationMinutes: 10,
    passingScore: 70,
    maxAttempts: 3,
    status: "OPEN",
    questions: [
      ["How many letters are in the English alphabet?", 1],
      ["Which letter comes after C?", 1],
      ["Which of these is a vowel?", 1],
      ["The vowels are A, E, I, O, U.", 1],
      ["Which number comes after seven?", 1],
      ["2 + 2 = four.", 1],
      ["Write the answer as a word: 2 + 3 = ___", 1],
      ["Listen. Which number do you hear LAST?", 2],
      ["Match the numbers with the words.", 2],
    ],
  },
  {
    title: "Quiz 3: Verb to be",
    type: "QUIZ",
    description: "am, is, are — with I, he, she and they.",
    durationMinutes: 10,
    passingScore: 70,
    maxAttempts: 3,
    status: "OPEN",
    questions: [
      ["My name ___ Ali.", 1],
      ["I ___ a student.", 1],
      ["She ___ my sister.", 1],
      ["They ___ my friends.", 1],
      ["We say “My name are Ali.”", 1],
      ["Sara is a girl. ___ is my friend.", 1],
      ["Put the words in the correct order: introduce yourself.", 1],
      ["Put the words in the correct order: talk about your sister.", 1],
      ["Listen. What is his name?", 2],
    ],
  },
  {
    title: "English Starter — Final Assessment",
    type: "EXAM",
    description: "Everything from the Starter course: greetings, alphabet, numbers, family, colors, verb to be, questions and days.",
    durationMinutes: 30,
    passingScore: 70,
    maxAttempts: 1,
    status: "SCHEDULED",
    startAt: "2026-10-05T08:00:00Z",
    endAt: "2026-10-12T21:00:00Z",
    randomizeQuestions: true,
    randomizeOptions: true,
    questions: "ALL_MIXED" as unknown as [string, number][],
  },
];

/** Mix a fixed, deterministic selection of bank questions for the final exam. */
const FINAL_MIX: [string, number][] = [
  ["Sara sees Ali in the morning. What does she say?", 1],
  ["What does “hello” mean?", 1],
  ["Match the greetings with their meanings.", 2],
  ["We say “Good morning” in the morning.", 1],
  ["How many letters are in the English alphabet?", 1],
  ["Which of these is a vowel?", 1],
  ["Which number comes after seven?", 1],
  ["Write the answer as a word: 2 + 3 = ___", 1],
  ["Listen. Which number do you hear LAST?", 2],
  ["My mother's son is my …", 1],
  ["Listen. Who is Maryam?", 2],
  ["What color is a banana?", 1],
  ["Match the colors with their meanings.", 2],
  ["The snow is black.", 1],
  ["My name ___ Ali.", 1],
  ["I ___ a student.", 1],
  ["They ___ my friends.", 1],
  ["Sara is a girl. ___ is my friend.", 1],
  ["Match the pronouns with their meanings.", 2],
  ["Put the words in the correct order: say what you are.", 1],
  ["You want to know a place. You ask:", 1],
  ["___ is your name?", 1],
  ["How many days are in a week?", 1],
  ["The day after Monday is ___.", 1],
  ["Listen. What day is tomorrow?", 2],
];

/**
 * Seed the question bank + assessments. Returns the number of questions and
 * assessments written. Attempts are never touched.
 */
export async function seedAssessments(prisma: PrismaClient): Promise<{ questions: number; assessments: number }> {
  const admin = await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } });
  if (!admin) throw new Error("Admin seed user not found");
  // Drop the pre-uniquified word-order row from the first seed draft, if present.
  await prisma.question.deleteMany({ where: { questionText: "Put the words in the correct order." } });

  const lessons = await prisma.lesson.findMany({
    include: { module: { include: { course: { include: { level: true } } } } },
  });
  const lessonByTitle = new Map(lessons.map((l) => [l.title, l]));
  const starter = lessons.find((l) => l.module.course.code === "EN-STARTER-PREA1");
  if (!starter) throw new Error("Starter course not found");
  const levelId = starter.module.course.levelId;
  const courseId = starter.module.course.id;

  // ----- Questions ----------------------------------------------------------
  let questionCount = 0;
  for (const spec of SEED_QUESTIONS) {
    const lesson = spec.lesson ? lessonByTitle.get(spec.lesson) : undefined;
    const data = {
      type: spec.type,
      questionText: spec.text,
      explanation: spec.explanation ?? null,
      difficulty: spec.difficulty,
      points: spec.points ?? 1,
      skill: spec.skill,
      levelId,
      lessonId: lesson?.id ?? null,
      moduleId: lesson?.moduleId ?? null,
      status: "PUBLISHED",
      configuration: JSON.stringify(spec.config ?? {}),
      createdById: admin.id,
    };
    const existing = await prisma.question.findFirst({
      where: { questionText: spec.text, type: spec.type },
      select: { id: true },
    });
    const question = existing
      ? await prisma.question.update({ where: { id: existing.id }, data })
      : await prisma.question.create({ data });

    // Refresh options (deterministic content).
    await prisma.questionOption.deleteMany({ where: { questionId: question.id } });
    if (spec.options?.length) {
      await prisma.questionOption.createMany({
        data: spec.options.map((o, i) => ({ questionId: question.id, text: o.text, isCorrect: o.isCorrect, order: i + 1 })),
      });
    }
    questionCount += 1;
  }

  // ----- Assessments ----------------------------------------------------------
  let assessmentCount = 0;
  for (const spec of SEED_ASSESSMENTS) {
    const rows: [string, number][] = Array.isArray(spec.questions) ? spec.questions : FINAL_MIX;
    const data = {
      title: spec.title,
      description: spec.description,
      type: spec.type,
      courseId,
      levelId,
      durationMinutes: spec.durationMinutes,
      passingScore: spec.passingScore,
      maxAttempts: spec.maxAttempts,
      randomizeQuestions: spec.randomizeQuestions ?? false,
      randomizeOptions: spec.randomizeOptions ?? false,
      showResults: true,
      showCorrectAnswers: true,
      allowNavigation: true,
      status: spec.status,
      startAt: spec.startAt ? new Date(spec.startAt) : null,
      endAt: spec.endAt ? new Date(spec.endAt) : null,
      createdById: admin.id,
    };

    const existing = await prisma.assessment.findFirst({ where: { title: spec.title }, select: { id: true } });
    const assessment = existing
      ? await prisma.assessment.update({ where: { id: existing.id }, data })
      : await prisma.assessment.create({ data });

    // Refresh the question list from the bank.
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    let order = 0;
    for (const [text, points] of rows) {
      const question = await prisma.question.findFirst({
        where: { questionText: text, status: "PUBLISHED" },
        select: { id: true },
      });
      if (!question) throw new Error(`Seed question not found for assessment: ${text}`);
      order += 1;
      await prisma.assessmentQuestion.create({
        data: { assessmentId: assessment.id, questionId: question.id, points, order },
      });
    }
    assessmentCount += 1;
  }

  return { questions: questionCount, assessments: assessmentCount };
}
