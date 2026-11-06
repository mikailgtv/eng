/**
 * Phase 3 seed — REAL practice activities for the Pre-A1 course.
 *
 * Every activity is validated with the SAME zod schemas the app uses at
 * runtime, so a typo here fails the seed instead of shipping broken content.
 * Idempotent: activities are keyed by (lesson, title) — re-running updates
 * content in place and never duplicates.
 *
 * Audio: listening activities reference real generated MP3s under
 * /audio/… — never fake URLs.
 */
import { PrismaClient } from "@prisma/client";
import {
  activityConfigSchema,
  multipleChoiceConfig,
  trueFalseConfig,
  fillBlankConfig,
  matchingConfig,
  wordOrderConfig,
  vocabularyRecognitionConfig,
  listenAndChooseConfig,
  listenAndTypeConfig,
  speakingPromptConfig,
  flashcardConfig,
} from "../src/lib/activities/schemas";
import type { ActivityType } from "../src/lib/activities/registry";

type VocabRef = string; // word inside the same lesson

type SeedActivity = {
  title: string;
  type: ActivityType;
  instructions: string;
  order: number;
  points?: number;
  required?: boolean;
  /** GrammarContent title in the same lesson to link (analytics foundation). */
  grammar?: string;
  /** Vocabulary words (same lesson) linked to this activity. */
  vocabulary?: VocabRef[];
  config:
    | { kind: "MULTIPLE_CHOICE"; data: Record<string, unknown> }
    | { kind: "TRUE_FALSE"; data: Record<string, unknown> }
    | { kind: "FILL_BLANK"; data: Record<string, unknown> }
    | { kind: "MATCHING"; data: Record<string, unknown> }
    | { kind: "WORD_ORDER"; data: Record<string, unknown> }
    | { kind: "VOCABULARY_RECOGNITION"; data: Record<string, unknown> }
    | { kind: "LISTEN_AND_CHOOSE"; data: Record<string, unknown> }
    | { kind: "LISTEN_AND_TYPE"; data: Record<string, unknown> }
    | { kind: "SPEAKING_PROMPT"; data: Record<string, unknown> }
    | { kind: "FLASHCARD"; data: Record<string, unknown> };
};

const opts = (texts: string[], correctIndex: number) => ({
  options: texts.map((text, i) => ({ id: `o${i + 1}`, text })),
  correctOptionId: `o${correctIndex + 1}`,
});

const mc = (
  question: string,
  texts: string[],
  correctIndex: number,
  explanation?: string
) => ({ question, ...opts(texts, correctIndex), ...(explanation ? { explanation } : {}) });

const AUDIO = {
  HELLO: "/audio/hello-1.mp3",
  GOODBYE: "/audio/hello-2.mp3",
  MY_NAME: "/audio/myname-1.mp3",
  NUMBERS: "/audio/numbers-1.mp3",
  COLORS: "/audio/colors-1.mp3",
  FAMILY: "/audio/family-1.mp3",
  DAYS: "/audio/days-1.mp3",
  QUESTIONS: "/audio/questions-1.mp3",
} as const;

export const SEED_ACTIVITIES: { lessonTitle: string; activities: SeedActivity[] }[] = [
  // --------------------------------------------------------------- Module 1
  {
    lessonTitle: "Hello and Goodbye",
    activities: [
      {
        title: "Morning greetings",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the best answer.",
        order: 1,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Sara sees Ali in the morning. What does she say?",
          ["Good morning!", "Good night!", "Goodbye!"],
          0,
          "In the morning we say “Good morning.” We say “Good night” at night, before sleeping."
        ) },
      },
      {
        title: "True or false: Good night",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 2,
        config: { kind: "TRUE_FALSE", data: {
          statement: "We say “Good night” when we arrive at work in the morning.",
          answer: false,
          explanation: "“Good night” is for bedtime. In the morning we say “Good morning.”",
        } },
      },
      {
        title: "Match greetings and meanings",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 3,
        required: true,
        vocabulary: ["hello", "goodbye", "good morning", "good night"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "hello", right: "سلام" },
            { left: "goodbye", right: "خداحافظ" },
            { left: "good morning", right: "صبح بخیر" },
            { left: "good night", right: "شب بخیر" },
          ],
        } },
      },
      {
        title: "Listen: What does Sara ask?",
        type: "LISTEN_AND_CHOOSE",
        instructions: "Listen to the audio, then answer the question.",
        order: 4,
        required: true,
        config: { kind: "LISTEN_AND_CHOOSE", data: {
          audioUrl: AUDIO.HELLO,
          transcript: "Hello! I'm Sara. How are you today?",
          question: "What does Sara ask?",
          ...opts(["How are you today?", "What is your name?", "Where are you from?"], 0),
          explanation: "Sara says hello and asks “How are you today?”",
        } },
      },
      {
        title: "Listen and type: Goodbye",
        type: "LISTEN_AND_TYPE",
        instructions: "Listen and type exactly what you hear.",
        order: 5,
        config: { kind: "LISTEN_AND_TYPE", data: {
          audioUrl: AUDIO.GOODBYE,
          transcript: "Goodbye! See you tomorrow.",
          explanation: "“Goodbye! See you tomorrow.” — خداحافظ! فردا می‌بینمت.",
        } },
      },
    ],
  },
  {
    lessonTitle: "My Name Is...",
    activities: [
      {
        title: "My name ___ Ali",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 1,
        required: true,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "My name ___ Ali.",
          acceptedAnswers: ["is"],
          options: ["am", "is", "are"],
          explanation: "We say “My name is Ali.” — name is always with “is”.",
        } },
      },
      {
        title: "___ am Sara",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 2,
        required: true,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "___ am Sara.",
          acceptedAnswers: ["I"],
          options: ["I", "You", "He"],
          explanation: "“I” means من. We say “I am Sara.”",
        } },
      },
      {
        title: "Put the words in order",
        type: "WORD_ORDER",
        instructions: "Tap the words in the correct order to make a sentence.",
        order: 3,
        required: true,
        config: { kind: "WORD_ORDER", data: {
          words: ["My", "name", "is", "Ali"],
          explanation: "“My name is Ali.” — اسم من علی است.",
        } },
      },
      {
        title: "Listen and type: My name is Ali",
        type: "LISTEN_AND_TYPE",
        instructions: "Listen and type exactly what you hear.",
        order: 4,
        config: { kind: "LISTEN_AND_TYPE", data: {
          audioUrl: AUDIO.MY_NAME,
          transcript: "Hi! My name is Ali. What is your name?",
          explanation: "“Hi! My name is Ali. What is your name?” — سلام! اسم من علی است. اسم تو چیست؟",
        } },
      },
      {
        title: "Grammar check: I am / You are",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct sentence.",
        order: 5,
        grammar: "I am / You are",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Which sentence is correct when you talk about YOURSELF?",
          ["I am a student.", "You am a student.", "I is a student."],
          0,
          "We say “I am”. With “you” we say “You are”."
        ) },
      },
      {
        title: "Flashcards: name, my, your",
        type: "FLASHCARD",
        instructions: "Tap a card to flip it. Say the word out loud, then tell us if you knew it.",
        order: 6,
        vocabulary: ["name", "my", "your"],
        config: { kind: "FLASHCARD", data: {
          items: [
            { word: "name", translation: "نام، اسم", phonetic: "/neɪm/", example: "My name is Ali." },
            { word: "my", translation: "مالِ من", phonetic: "/maɪ/", example: "This is my book." },
            { word: "your", translation: "مالِ تو", phonetic: "/jʊr/", example: "What is your name?" },
          ],
        } },
      },
    ],
  },
  {
    lessonTitle: "Basic Classroom English",
    activities: [
      {
        title: "Match classroom verbs",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        vocabulary: ["listen", "repeat", "read", "write"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "listen", right: "گوش دادن" },
            { left: "repeat", right: "تکرار کردن" },
            { left: "read", right: "خواندن" },
            { left: "write", right: "نوشتن" },
          ],
        } },
      },
      {
        title: "The teacher says…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the best answer.",
        order: 2,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "The teacher says: “Open your book, please.” What do you do?",
          ["Open my book", "Close my book", "Go to sleep"],
          0,
          "“Open your book” means کتابت را باز کن."
        ) },
      },
      {
        title: "Vocabulary check: classroom words",
        type: "VOCABULARY_RECOGNITION",
        instructions: "Choose the correct meaning.",
        order: 3,
        vocabulary: ["repeat"],
        config: { kind: "VOCABULARY_RECOGNITION", data: {
          mode: "WORD_TO_MEANING",
          prompt: "repeat",
          ...opts(["تکرار کردن", "نوشتن", "بستن"], 0),
          explanation: "repeat = تکرار کردن. “Repeat after me.”",
        } },
      },
    ],
  },
  // --------------------------------------------------------------- Module 2
  {
    lessonTitle: "The English Alphabet",
    activities: [
      {
        title: "How many letters?",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct answer.",
        order: 1,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "How many letters are in the English alphabet?",
          ["24", "26", "28"],
          1,
          "The English alphabet has 26 letters, from A to Z."
        ) },
      },
      {
        title: "After C comes…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the letter that comes next.",
        order: 2,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Which letter comes after C?",
          ["B", "D", "E"],
          1,
          "The order is A, B, C, D, E — after C comes D."
        ) },
      },
      {
        title: "Match big and small letters",
        type: "MATCHING",
        instructions: "Tap a big letter, then tap its small letter.",
        order: 3,
        required: true,
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "A", right: "a" },
            { left: "G", right: "g" },
            { left: "Q", right: "q" },
            { left: "E", right: "e" },
          ],
        } },
      },
      {
        title: "True or false: vowels",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 4,
        config: { kind: "TRUE_FALSE", data: {
          statement: "The vowels are A, E, I, O, U.",
          answer: true,
          explanation: "Yes! A, E, I, O, U are the five vowels.",
        } },
      },
    ],
  },
  // --------------------------------------------------------------- Module 3
  {
    lessonTitle: "People",
    activities: [
      {
        title: "Match people words",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        vocabulary: ["man", "woman", "boy", "girl"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "man", right: "مرد" },
            { left: "woman", right: "زن" },
            { left: "boy", right: "پسر (کودک)" },
            { left: "girl", right: "دختر (کودک)" },
          ],
        } },
      },
      {
        title: "He or she?",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct word.",
        order: 2,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Sara is a woman. ___ is my teacher.",
          ["He", "She", "It"],
          1,
          "We use “she” for a woman: She is my teacher."
        ) },
      },
    ],
  },
  {
    lessonTitle: "Family",
    activities: [
      {
        title: "Match family words",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        vocabulary: ["mother", "father", "brother", "sister"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "mother", right: "مادر" },
            { left: "father", right: "پدر" },
            { left: "brother", right: "برادر" },
            { left: "sister", right: "خواهر" },
          ],
        } },
      },
      {
        title: "My parents' son",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct answer.",
        order: 2,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Ali is the son of my parents. Ali is my …",
          ["brother", "sister", "mother"],
          0,
          "Your parents' son is your brother."
        ) },
      },
      {
        title: "True or false: sister",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 3,
        config: { kind: "TRUE_FALSE", data: {
          statement: "My father's daughter is my sister.",
          answer: true,
          explanation: "Yes — your father's daughter is your sister.",
        } },
      },
      {
        title: "Fill the blank: parents",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 4,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "My father and my mother are my ___.",
          acceptedAnswers: ["parents"],
          options: ["parents", "brothers", "students"],
          explanation: "Father + mother = parents (پدر و مادر).",
        } },
      },
      {
        title: "Listen: Who is Maryam?",
        type: "LISTEN_AND_CHOOSE",
        instructions: "Listen to the audio, then answer the question.",
        order: 5,
        required: true,
        config: { kind: "LISTEN_AND_CHOOSE", data: {
          audioUrl: AUDIO.FAMILY,
          transcript: "This is my mother. Her name is Maryam.",
          question: "Who is Maryam?",
          ...opts(["my mother", "my sister", "my teacher"], 0),
          explanation: "“This is my mother. Her name is Maryam.” — Maryam is the mother.",
        } },
      },
    ],
  },
  {
    lessonTitle: "Common Objects",
    activities: [
      {
        title: "Match object words",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        vocabulary: ["book", "pen", "door", "window"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "book", right: "کتاب" },
            { left: "pen", right: "خودکار، قلم" },
            { left: "door", right: "در" },
            { left: "window", right: "پنجره" },
          ],
        } },
      },
      {
        title: "You write with a…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct answer.",
        order: 2,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "You write with a …",
          ["pen", "door", "window"],
          0,
          "We write with a pen (خودکار)."
        ) },
      },
      {
        title: "Fill the blank: I read a…",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 3,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "I read a ___ every night.",
          acceptedAnswers: ["book"],
          options: ["book", "chair", "door"],
          explanation: "We read a book (کتاب می‌خوانیم).",
        } },
      },
      {
        title: "True or false: window",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 4,
        config: { kind: "TRUE_FALSE", data: {
          statement: "“Window” means پنجره.",
          answer: true,
          explanation: "Yes! window = پنجره.",
        } },
      },
    ],
  },
  {
    lessonTitle: "Colors",
    activities: [
      {
        title: "Listen: What color is the apple?",
        type: "LISTEN_AND_CHOOSE",
        instructions: "Listen to the audio, then answer the question.",
        order: 1,
        required: true,
        config: { kind: "LISTEN_AND_CHOOSE", data: {
          audioUrl: AUDIO.COLORS,
          transcript: "The sky is blue. The apple is red.",
          question: "What color is the apple?",
          ...opts(["blue", "red", "green"], 1),
          explanation: "“The apple is red.” — سیب قرمز است.",
        } },
      },
      {
        title: "What color is a banana?",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct color.",
        order: 2,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "What color is a banana?",
          ["yellow", "blue", "black"],
          0,
          "A banana is yellow (زرد)."
        ) },
      },
      {
        title: "The sky is ___",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 3,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "The sky is ___.",
          acceptedAnswers: ["blue"],
          options: ["red", "blue", "green"],
          explanation: "The sky is blue — آسمان آبی است.",
        } },
      },
      {
        title: "Match colors",
        type: "MATCHING",
        instructions: "Tap a color, then tap its meaning.",
        order: 4,
        required: true,
        vocabulary: ["red", "blue", "green", "yellow"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "red", right: "قرمز" },
            { left: "blue", right: "آبی" },
            { left: "green", right: "سبز" },
            { left: "yellow", right: "زرد" },
          ],
        } },
      },
      {
        title: "Flashcards: colors",
        type: "FLASHCARD",
        instructions: "Tap a card to flip it. Say the word out loud, then tell us if you knew it.",
        order: 5,
        vocabulary: ["black", "white", "orange"],
        config: { kind: "FLASHCARD", data: {
          items: [
            { word: "black", translation: "سیاه", phonetic: "/blæk/", example: "The night is black." },
            { word: "white", translation: "سفید", phonetic: "/waɪt/", example: "The snow is white." },
            { word: "orange", translation: "نارنجی", phonetic: "/ˈɔːrɪndʒ/", example: "The safety vest is orange." },
          ],
        } },
      },
    ],
  },
  // --------------------------------------------------------------- Module 4
  {
    lessonTitle: "I, You, He, She",
    activities: [
      {
        title: "Match pronouns",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        grammar: "Basic pronouns",
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "I", right: "من" },
            { left: "you", right: "تو، شما" },
            { left: "he", right: "او (مرد)" },
            { left: "she", right: "او (زن)" },
          ],
        } },
      },
      {
        title: "Sara is a girl…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct word.",
        order: 2,
        required: true,
        grammar: "Basic pronouns",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Sara is a girl. ___ is my friend.",
          ["He", "She", "I"],
          1,
          "We use “she” for a girl or a woman."
        ) },
      },
      {
        title: "Ali is a boy…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct word.",
        order: 3,
        required: true,
        grammar: "Basic pronouns",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Ali is a boy. ___ is ten years old.",
          ["She", "He", "You"],
          1,
          "We use “he” for a boy or a man."
        ) },
      },
      {
        title: "This is my mother. ___ is a teacher.",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 4,
        grammar: "Basic pronouns",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "This is my mother. ___ is a teacher.",
          acceptedAnswers: ["she"],
          options: ["He", "She", "It"],
          explanation: "Mother is a woman, so we say “She is a teacher.”",
        } },
      },
      {
        title: "True or false: he",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 5,
        grammar: "Basic pronouns",
        config: { kind: "TRUE_FALSE", data: {
          statement: "We use “he” for a woman.",
          answer: false,
          explanation: "“He” is for a man or a boy. For a woman we use “she”.",
        } },
      },
    ],
  },
  {
    lessonTitle: "The verb “to be”",
    activities: [
      {
        title: "I ___ a student",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 1,
        required: true,
        grammar: "Verb to be",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "I ___ a student.",
          acceptedAnswers: ["am"],
          options: ["am", "is", "are"],
          explanation: "We use “am” with “I.” — I am a student.",
        } },
      },
      {
        title: "She ___ my sister",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 2,
        required: true,
        grammar: "Verb to be",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "She ___ my sister.",
          acceptedAnswers: ["is"],
          options: ["am", "is", "are"],
          explanation: "We use “is” with he, she and it. — She is my sister.",
        } },
      },
      {
        title: "They ___ my friends",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 3,
        required: true,
        grammar: "Verb to be",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "They ___ my friends.",
          acceptedAnswers: ["are"],
          options: ["am", "is", "are"],
          explanation: "We use “are” with you, we and they. — They are my friends.",
        } },
      },
      {
        title: "Which sentence is correct?",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct sentence.",
        order: 4,
        required: true,
        grammar: "Verb to be",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Which sentence is correct?",
          ["He is my brother.", "He am my brother.", "He are my brother."],
          0,
          "With “he” we use “is”. — He is my brother.",
        ) },
      },
      {
        title: "Put the words in order",
        type: "WORD_ORDER",
        instructions: "Tap the words in the correct order to make a sentence.",
        order: 5,
        grammar: "Verb to be",
        config: { kind: "WORD_ORDER", data: {
          words: ["I", "am", "a", "teacher"],
          explanation: "“I am a teacher.” — من معلم هستم.",
        } },
      },
    ],
  },
  {
    lessonTitle: "This and That",
    activities: [
      {
        title: "The book in my hand",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct sentence.",
        order: 1,
        required: true,
        grammar: "This / That",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "The book is in my hand, very near me. I say: …",
          ["This is my book.", "That is my book.", "Those is my book."],
          0,
          "Near things are “this”. Far things are “that”."
        ) },
      },
      {
        title: "The car across the street",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct sentence.",
        order: 2,
        required: true,
        grammar: "This / That",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "The car is far away, across the street. I say: …",
          ["That is a car.", "This is a car.", "These is a car."],
          0,
          "Far things are “that”. — That is a car."
        ) },
      },
      {
        title: "___ is my bag (near me)",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 3,
        grammar: "This / That",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "___ is my bag. (the bag is near me)",
          acceptedAnswers: ["this"],
          options: ["This", "That"],
          explanation: "Near me → “This is my bag.”",
        } },
      },
      {
        title: "Match this and that",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 4,
        vocabulary: ["this", "that"],
        grammar: "This / That",
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "this", right: "این" },
            { left: "that", right: "آن" },
          ],
        } },
      },
    ],
  },
  {
    lessonTitle: "Simple Questions",
    activities: [
      {
        title: "Match question words",
        type: "MATCHING",
        instructions: "Tap a word, then tap its meaning.",
        order: 1,
        required: true,
        grammar: "Questions with “to be”",
        vocabulary: ["what", "where", "who"],
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "What", right: "چه" },
            { left: "Where", right: "کجا" },
            { left: "Who", right: "چه کسی" },
          ],
        } },
      },
      {
        title: "Asking about a place",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct question.",
        order: 2,
        required: true,
        grammar: "Questions with “to be”",
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "You want to know the place of the school. You ask: …",
          ["Where is the school?", "What is the school?", "Who is the school?"],
          0,
          "“Where” asks about a place (کجا)."
        ) },
      },
      {
        title: "___ is your name?",
        type: "FILL_BLANK",
        instructions: "Complete the question.",
        order: 3,
        required: true,
        grammar: "Questions with “to be”",
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "___ is your name?",
          acceptedAnswers: ["what"],
          options: ["What", "Where", "Who"],
          explanation: "We ask “What is your name?” — اسم تو چیست؟",
        } },
      },
      {
        title: "Put the question in order",
        type: "WORD_ORDER",
        instructions: "Tap the words in the correct order to make a question.",
        order: 4,
        required: true,
        grammar: "Questions with “to be”",
        config: { kind: "WORD_ORDER", data: {
          words: ["What", "is", "your", "name"],
          explanation: "“What is your name?” — اسم تو چیست؟",
        } },
      },
      {
        title: "Listen and type: Where are you from?",
        type: "LISTEN_AND_TYPE",
        instructions: "Listen and type exactly what you hear.",
        order: 5,
        config: { kind: "LISTEN_AND_TYPE", data: {
          audioUrl: AUDIO.QUESTIONS,
          transcript: "Where are you from?",
          explanation: "“Where are you from?” — اهل کجا هستی؟",
        } },
      },
      {
        title: "Speaking practice: introduce yourself",
        type: "SPEAKING_PROMPT",
        instructions: "Say the sentence out loud. You can record yourself if you want to.",
        order: 6,
        grammar: "Questions with “to be”",
        config: { kind: "SPEAKING_PROMPT", data: {
          text: "What is your name? My name is …",
          tip: "Say it slowly and clearly. Ask a friend, then answer with your own name.",
          translation: "اسم تو چیست؟ اسم من … است.",
        } },
      },
    ],
  },
  // --------------------------------------------------------------- Module 5
  {
    lessonTitle: "Numbers 1–20",
    activities: [
      {
        title: "After seven comes…",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct number.",
        order: 1,
        required: true,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "Which number comes after seven?",
          ["six", "eight", "nine"],
          1,
          "The order is six, seven, eight — after seven comes eight."
        ) },
      },
      {
        title: "Two apples plus three",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct answer.",
        order: 2,
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "You have two apples. You buy three more. How many apples do you have?",
          ["four", "five", "six"],
          1,
          "Two plus three is five (۲ + ۳ = ۵)."
        ) },
      },
      {
        title: "Listen: Which number is last?",
        type: "LISTEN_AND_CHOOSE",
        instructions: "Listen to the audio, then answer the question.",
        order: 3,
        required: true,
        config: { kind: "LISTEN_AND_CHOOSE", data: {
          audioUrl: AUDIO.NUMBERS,
          transcript: "Seven, eight, nine, ten!",
          question: "Which number do you hear LAST?",
          ...opts(["seven", "nine", "ten"], 2),
          explanation: "“Seven, eight, nine, ten!” — the last number is ten.",
        } },
      },
      {
        title: "Match numbers and words",
        type: "MATCHING",
        instructions: "Tap a number, then tap its word.",
        order: 4,
        required: true,
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "3", right: "three" },
            { left: "6", right: "six" },
            { left: "9", right: "nine" },
            { left: "12", right: "twelve" },
          ],
        } },
      },
      {
        title: "2 + 3 = ___",
        type: "FILL_BLANK",
        instructions: "Write the answer as a word.",
        order: 5,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "2 + 3 = ___",
          acceptedAnswers: ["five", "5"],
          options: ["four", "five", "six"],
          explanation: "2 + 3 = five.",
        } },
      },
    ],
  },
  {
    lessonTitle: "Days of the Week",
    activities: [
      {
        title: "Listen: What day is tomorrow?",
        type: "LISTEN_AND_CHOOSE",
        instructions: "Listen to the audio, then answer the question.",
        order: 1,
        required: true,
        config: { kind: "LISTEN_AND_CHOOSE", data: {
          audioUrl: AUDIO.DAYS,
          transcript: "Today is Monday. Tomorrow is Tuesday.",
          question: "What day is tomorrow?",
          ...opts(["Monday", "Sunday", "Tuesday"], 2),
          explanation: "“Today is Monday. Tomorrow is Tuesday.” — فردا سه‌شنبه است.",
        } },
      },
      {
        title: "How many days?",
        type: "MULTIPLE_CHOICE",
        instructions: "Choose the correct answer.",
        order: 2,
        required: true,
        vocabulary: ["week"],
        config: { kind: "MULTIPLE_CHOICE", data: mc(
          "How many days are in a week?",
          ["5", "6", "7"],
          2,
          "There are seven days in a week."
        ) },
      },
      {
        title: "Match the days",
        type: "MATCHING",
        instructions: "Tap a day, then tap its meaning.",
        order: 3,
        required: true,
        config: { kind: "MATCHING", data: {
          pairs: [
            { left: "Saturday", right: "شنبه" },
            { left: "Monday", right: "دوشنبه" },
            { left: "Friday", right: "جمعه" },
            { left: "Sunday", right: "یکشنبه" },
          ],
        } },
      },
      {
        title: "The day after Monday",
        type: "FILL_BLANK",
        instructions: "Complete the sentence.",
        order: 4,
        required: true,
        config: { kind: "FILL_BLANK", data: {
          sentenceWithBlank: "The day after Monday is ___.",
          acceptedAnswers: ["tuesday"],
          options: ["Tuesday", "Sunday", "Friday"],
          explanation: "After Monday comes Tuesday (سه‌شنبه).",
        } },
      },
      {
        title: "True or false: big letters",
        type: "TRUE_FALSE",
        instructions: "Read the sentence. Is it true or false?",
        order: 5,
        config: { kind: "TRUE_FALSE", data: {
          statement: "Days of the week always start with a big letter, like “Monday”.",
          answer: true,
          explanation: "Yes — Monday, NOT monday.",
        } },
      },
      {
        title: "Flashcards: day, today, tomorrow",
        type: "FLASHCARD",
        instructions: "Tap a card to flip it. Say the word out loud, then tell us if you knew it.",
        order: 6,
        vocabulary: ["day", "today", "tomorrow", "week"],
        config: { kind: "FLASHCARD", data: {
          items: [
            { word: "day", translation: "روز", phonetic: "/deɪ/", example: "Today is a good day." },
            { word: "today", translation: "امروز", phonetic: "/təˈdeɪ/", example: "Today is Monday." },
            { word: "tomorrow", translation: "فردا", phonetic: "/təˈmɑːroʊ/", example: "See you tomorrow." },
            { word: "week", translation: "هفته", phonetic: "/wiːk/", example: "There are seven days in a week." },
          ],
        } },
      },
    ],
  },
];

const CONFIG_VALIDATORS: Record<SeedActivity["config"]["kind"], (data: unknown) => { success: true } | { success: false; error: string }> = {
  MULTIPLE_CHOICE: (d) => wrap(multipleChoiceConfig.safeParse(d)),
  TRUE_FALSE: (d) => wrap(trueFalseConfig.safeParse(d)),
  FILL_BLANK: (d) => wrap(fillBlankConfig.safeParse(d)),
  MATCHING: (d) => wrap(matchingConfig.safeParse(d)),
  WORD_ORDER: (d) => wrap(wordOrderConfig.safeParse(d)),
  VOCABULARY_RECOGNITION: (d) => wrap(vocabularyRecognitionConfig.safeParse(d)),
  LISTEN_AND_CHOOSE: (d) => wrap(listenAndChooseConfig.safeParse(d)),
  LISTEN_AND_TYPE: (d) => wrap(listenAndTypeConfig.safeParse(d)),
  SPEAKING_PROMPT: (d) => wrap(speakingPromptConfig.safeParse(d)),
  FLASHCARD: (d) => wrap(flashcardConfig.safeParse(d)),
};

function wrap(r: { success: boolean; error?: { message: string } }): { success: true } | { success: false; error: string } {
  return r.success ? { success: true } : { success: false, error: r.error?.message ?? "invalid" };
}

/**
 * Seed all activities. Idempotent: keyed by (lessonId, title). Re-running
 * updates content in place, refreshes vocabulary/grammar links, and never
 * touches ActivityAttempt history.
 */
export async function seedActivities(prisma: PrismaClient): Promise<number> {
  const course = await prisma.course.findFirst({ where: { code: "EN-STARTER-PREA1" } });
  if (!course) throw new Error("Seed course EN-STARTER-PREA1 not found — run the main seed first.");

  let count = 0;
  for (const { lessonTitle, activities } of SEED_ACTIVITIES) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: lessonTitle, module: { courseId: course.id } },
      include: {
        grammar: { select: { id: true, title: true } },
        vocabulary: { select: { id: true, word: true } },
      },
    });
    if (!lesson) throw new Error(`Seed lesson not found: ${lessonTitle}`);

    const vocabByWord = new Map(lesson.vocabulary.map((v) => [v.word, v.id]));

    for (const spec of activities) {
      // Validate with the runtime schemas — fail the seed on bad content.
      const validated = CONFIG_VALIDATORS[spec.config.kind](spec.config.data);
      if (!validated.success) {
        throw new Error(`Invalid ${spec.config.kind} config for “${lessonTitle} / ${spec.title}”: ${validated.error}`);
      }

      const grammarId = spec.grammar
        ? (lesson.grammar.find((g) => g.title === spec.grammar)?.id ?? null)
        : null;
      if (spec.grammar && !grammarId) {
        throw new Error(`Grammar “${spec.grammar}” not found in lesson “${lessonTitle}”`);
      }

      const vocabularyIds: string[] = [];
      for (const word of spec.vocabulary ?? []) {
        const id = vocabByWord.get(word);
        if (!id) throw new Error(`Vocabulary “${word}” not found in lesson “${lessonTitle}”`);
        vocabularyIds.push(id);
      }

      // FLASHCARD configs may embed vocabularyIds directly on items.
      let configuration = spec.config.data;
      if (spec.config.kind === "FLASHCARD") {
        const items = (configuration as { items: Record<string, unknown>[] }).items.map((item) => {
          const linked = item.word && vocabByWord.get(String(item.word));
          return linked ? { ...item, vocabularyId: linked } : item;
        });
        configuration = { items };
      }

      const data = {
        type: spec.type,
        instructions: spec.instructions,
        order: spec.order,
        points: spec.points ?? 1,
        required: spec.required ?? false,
        status: "PUBLISHED" as const,
        configuration: JSON.stringify(configuration),
        grammarId,
      };

      const existing = await prisma.activity.findFirst({
        where: { lessonId: lesson.id, title: spec.title },
        select: { id: true },
      });

      const activity = existing
        ? await prisma.activity.update({ where: { id: existing.id }, data })
        : await prisma.activity.create({ data: { ...data, lessonId: lesson.id, title: spec.title } });

      await prisma.activityVocabulary.deleteMany({ where: { activityId: activity.id } });
      if (vocabularyIds.length > 0) {
        await prisma.activityVocabulary.createMany({
          data: vocabularyIds.map((vocabularyId) => ({ activityId: activity.id, vocabularyId })),
        });
      }
      count += 1;
    }
  }
  return count;
}
