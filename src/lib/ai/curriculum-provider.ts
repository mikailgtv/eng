/**
 * Course-grounded tutor. Structured practice always uses stored lessons,
 * vocabulary, grammar, and real mistakes. It does not invent grades.
 */
import { beginnerHint, correctOnce, looksConfused } from "./correct";
import { emptyState, type LearningContext, type TutorState, type TutorTurn } from "./types";

const PROVIDER = "curriculum";

function turn(text: string, state: TutorState, extra: Partial<TutorTurn> = {}): TutorTurn {
  return {
    text,
    translation: extra.translation ?? null,
    correction: extra.correction ?? null,
    metadata: {
      practiceLabel: "AI Practice",
      provider: PROVIDER,
      ...(extra.metadata ?? {}),
    },
    nextState: state,
    generated: extra.generated,
    provider: PROVIDER,
  };
}

function withHint(text: string, show: boolean, state: TutorState, extra: Partial<TutorTurn> = {}): TutorTurn {
  const hint = show ? beginnerHint(text) : null;
  return turn(hint ? `${text}\n\nHint: ${hint}` : text, state, { ...extra, translation: hint });
}

export function curriculumReply(input: {
  mode: string;
  level: string;
  difficulty: string;
  showTranslation: boolean;
  context: LearningContext;
  message: string;
  state: TutorState;
  opening: boolean;
}): TutorTurn {
  const { mode, context, message, showTranslation } = input;
  const level = input.level || "PRE_A1";
  const state = { ...input.state };
  const beginner = level === "PRE_A1" || level === "A1";

  if (/\b(change my grade|change my score|mark me present|publish this lesson|delete my exam)\b/i.test(message)) {
    return turn(
      "I cannot change grades, attendance, or course records. I only help you practice English. A teacher handles official records.",
      state,
      { metadata: { refused: "records" } }
    );
  }

  if (input.difficulty === "CHALLENGE" && beginner && !state.warnedChallenge && input.opening) {
    state.warnedChallenge = true;
    const warning = "Challenge uses slightly longer sentences. You can switch back to Easy.";
    const next = replyBody({ ...input, state, opening: true });
    return turn(`${warning}\n\n${next.text}`, next.nextState, next);
  }

  return replyBody({ ...input, state });
}

function replyBody(input: {
  mode: string;
  level: string;
  difficulty: string;
  showTranslation: boolean;
  context: LearningContext;
  message: string;
  state: TutorState;
  opening: boolean;
}): TutorTurn {
  switch (input.mode) {
    case "VOCABULARY":
      return vocabularyTurn(input);
    case "GRAMMAR":
      return grammarTurn(input);
    case "QUIZ":
      return quizTurn(input);
    case "MISTAKE_REVIEW":
      return mistakeTurn(input);
    case "LESSON_HELP":
      return lessonTurn(input);
    case "FREE":
      return freeTurn(input);
    default:
      return conversationTurn(input);
  }
}

function vocabularyTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const words = input.context.vocabulary;
  const state = input.state;
  if (words.length === 0) {
    return turn(
      "Your course does not have vocabulary items stored yet. I will not invent advanced words. Open a lesson, then come back.",
      state
    );
  }
  const current = words[state.vocabIndex % words.length];
  if (input.opening || !input.message.trim()) {
    return withHint(`AI Practice. What is this?\n\n${current.word}`, input.showTranslation || input.level === "PRE_A1", state, {
      metadata: { word: current.word },
    });
  }
  const answer = input.message.trim().toLowerCase();
  const accepted = [current.translation, current.word, current.example].filter(Boolean).map((v) => v!.toLowerCase());
  const ok = accepted.some((item) => answer === item || (current.translation && answer.includes(current.translation.toLowerCase())));
  const practiced = state.vocabPracticed.includes(current.word) ? state.vocabPracticed : [...state.vocabPracticed, current.word];
  const nextIndex = (state.vocabIndex + 1) % words.length;
  const next = words[nextIndex];
  state.vocabIndex = nextIndex;
  state.vocabPracticed = practiced;
  if (ok) {
    const example = current.example ? `\n\nExample: ${current.example}` : "";
    const gloss = current.translation ? `\n\n${current.word} = ${current.translation}` : "";
    return withHint(`Correct!${gloss}${example}\n\nNext. What is this?\n\n${next.word}`, input.showTranslation, state, {
      metadata: { word: next.word, correct: true },
    });
  }
  const say = current.translation ? `${current.word} = ${current.translation}` : `Say the word: ${current.word}.`;
  return turn(`Almost!\n\n${say}\n\nNext. What is this?\n\n${next.word}`, state, {
    correction: { type: "VOCABULARY", say },
    metadata: { word: next.word, correct: false },
  });
}

function grammarTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const grammar = input.context.grammar[0];
  const state = input.state;
  state.grammarTopic = grammar?.title ?? state.grammarTopic;
  if (!grammar) {
    return turn("No grammar concept is stored for your current lesson. I will not invent a new grammar topic.", state);
  }
  const blank = grammarBlank(grammar.title, input.context.firstName);
  if (input.opening || !input.message.trim()) {
    return turn(`AI Practice. ${grammar.title}.\n\nComplete:\n${blank.prompt}`, state, {
      generated: [{ kind: "FILL_BLANK", prompt: blank.prompt, answer: blank.answer }],
      metadata: { grammar: grammar.title },
    });
  }
  const expected = blank.answer.toLowerCase();
  const got = input.message.trim().toLowerCase();
  const next = grammarBlank(grammar.title, "Sara", true);
  if (got === expected || got.includes(expected)) {
    return turn(`Correct.\n\nNext:\n${next.prompt}`, state, {
      metadata: { grammar: grammar.title, correct: true },
      generated: [{ kind: "FILL_BLANK", prompt: next.prompt, answer: next.answer }],
    });
  }
  const brief = grammar.explanation?.slice(0, 180) || `For now, use “${blank.answer}”.`;
  return turn(`Almost!\n\nSay: ${blank.prompt.replace("___", blank.answer)}\n\n${brief}\n\nNext:\n${next.prompt}`, state, {
    correction: { type: "GRAMMAR", say: blank.prompt.replace("___", blank.answer) },
    metadata: { grammar: grammar.title, correct: false },
  });
}

function grammarBlank(title: string, name: string, second = false): { prompt: string; answer: string } {
  const be = /to be|am|is|are/i.test(title);
  if (be) {
    return second
      ? { prompt: "She ___ Sara.", answer: "is" }
      : { prompt: `I ___ ${name}.`, answer: "am" };
  }
  return {
    prompt: `Complete a short line from “${title}”: I ___ English.`,
    answer: "study",
  };
}

function quizTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const state = input.state;
  const total = state.quizTotal || 5;
  if (state.quizIndex >= total && !input.opening) {
    return turn(
      `AI Practice finished. ${total} questions. This is not an exam and it is not a grade.`,
      state,
      { metadata: { quizDone: true } }
    );
  }
  const item = quizItem(input.context, state.quizIndex);
  if (input.opening || !input.message.trim()) {
    return turn(`AI Practice — not an exam.\n\nQuestion ${state.quizIndex + 1} of ${total}.\n${item.prompt}`, state, {
      generated: [{ kind: item.kind, prompt: item.prompt, answer: item.answer }],
      metadata: { quizIndex: state.quizIndex },
    });
  }
  const ok = input.message.trim().toLowerCase() === item.answer.toLowerCase() || input.message.toLowerCase().includes(item.answer.toLowerCase());
  state.quizIndex += 1;
  const note = ok ? "Correct." : `Almost! Say: ${item.answer}.`;
  if (state.quizIndex >= total) {
    return turn(`${note}\n\nAI Practice finished. This is not a grade.`, state, {
      correction: ok ? null : { type: "GRAMMAR", say: item.answer },
      metadata: { quizDone: true },
    });
  }
  const next = quizItem(input.context, state.quizIndex);
  return turn(`${note}\n\nQuestion ${state.quizIndex + 1} of ${total}.\n${next.prompt}`, state, {
    correction: ok ? null : { type: "GRAMMAR", say: item.answer },
    generated: [{ kind: next.kind, prompt: next.prompt, answer: next.answer }],
    metadata: { quizIndex: state.quizIndex },
  });
}

function quizItem(context: LearningContext, index: number): { kind: string; prompt: string; answer: string } {
  const word = context.vocabulary[index % Math.max(1, context.vocabulary.length)];
  if (word) {
    return {
      kind: "VOCAB",
      prompt: `What is this?\n${word.word}`,
      answer: word.translation || word.word,
    };
  }
  const prompts = [
    { kind: "FILL_BLANK", prompt: "Complete: I ___ a student.", answer: "am" },
    { kind: "FILL_BLANK", prompt: "Complete: She ___ Sara.", answer: "is" },
  ];
  return prompts[index % prompts.length];
}

function mistakeTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const mistake = input.context.mistakes[0];
  const state = input.state;
  if (!mistake) {
    return turn(
      "I do not have recent practice mistakes stored for you. That is not a score. We can practice your current lesson instead.",
      state,
      { metadata: { noMistakes: true } }
    );
  }
  state.grammarTopic = mistake.topic;
  if (input.opening) {
    const extra = input.context.adaptiveNote ? ` ${input.context.adaptiveNote}` : "";
    return turn(`Let's practice “${mistake.topic}”. This is AI Practice, not an exam.${extra}\n\nComplete:\nI ___ a student.`, state, {
      generated: [{ kind: "FILL_BLANK", prompt: "I ___ a student.", answer: "am" }],
      metadata: { topic: mistake.topic, count: mistake.count },
    });
  }
  if (input.message.trim().toLowerCase() === "am") {
    return turn("Correct.\n\nNext: She ___ Sara.", state, { metadata: { topic: mistake.topic, correct: true } });
  }
  return turn("Almost!\n\nSay: I am a student.\n\nNext: She ___ Sara.", state, {
    correction: { type: "GRAMMAR", say: "I am a student." },
    metadata: { topic: mistake.topic },
  });
}

function lessonTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const { context } = input;
  const state = input.state;
  if (!context.lessonTitle) {
    return turn("You do not have a current published lesson. I will not invent a lesson.", state, { metadata: { source: "none" } });
  }
  const fromLesson = context.lessonExcerpt
    ? `From your lesson “${context.lessonTitle}”: ${context.lessonExcerpt}`
    : `From your lesson “${context.lessonTitle}”.`;
  if (/am|is|are|to be/i.test(input.message) || input.opening) {
    return turn(
      `${fromLesson}\n\nFor now, remember:\nI → am\nHe → is\nShe → is\n\nExample:\nI am ${context.firstName}.\nShe is Sara.\n\nThis is a short explanation, not a grade.`,
      state,
      { metadata: { source: context.lessonExcerpt ? "lesson" : "lesson-title" } }
    );
  }
  return turn(
    `${fromLesson}\n\nGeneral English: I can explain this simply. Ask about one word or one sentence from the lesson. I do not have a teacher instruction beyond the lesson text.`,
    state,
    { metadata: { source: "lesson" } }
  );
}

function conversationTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  const state = input.state;
  const beginner = input.level === "PRE_A1" || input.level === "A1" || !input.level;
  if (input.opening || !input.message.trim()) {
    const hello = beginner ? "Hello! What is your name?" : `Hello ${input.context.firstName}. What would you like to talk about today?`;
    return withHint(hello, input.showTranslation && beginner, state);
  }
  const correction = correctOnce(input.message);
  if (correction) {
    state.corrections += 1;
    const follow = beginner ? "What is your job?" : "Can you say that in a full sentence?";
    return withHint(`Almost!\n\nSay:\n${correction.say}\n\n${follow}`, input.showTranslation && looksConfused(input.message), state, {
      correction,
    });
  }
  const name = input.message.match(/\b(?:i am|i'm|my name is)\s+([A-Za-z][A-Za-z'-]{1,30})/i);
  if (name) {
    const who = name[1].charAt(0).toUpperCase() + name[1].slice(1);
    const word = input.context.vocabulary[0]?.word;
    const next = word && beginner ? `Do you have a ${word}?` : "How are you?";
    return withHint(`Nice to meet you, ${who}!\n\n${next}`, input.showTranslation, state);
  }
  if (looksConfused(input.message) && beginner) {
    return withHint("Hello! What is your name?", true, state);
  }
  if (beginner) {
    const word = input.context.vocabulary[state.vocabIndex % Math.max(1, input.context.vocabulary.length)];
    const next = word ? `Good. What is this?\n${word.word}` : "Good. How are you?";
    return withHint(next, input.showTranslation, state);
  }
  return turn("Good. Tell me one more sentence about your day. I will correct only the most important mistake.", state);
}

function freeTurn(input: Parameters<typeof replyBody>[0]): TutorTurn {
  if (input.opening) {
    return turn("Free practice. Ask me to practice English. I will not change your records.", input.state);
  }
  if (input.message.trim().length < 2) {
    return turn("Write a short English sentence, or ask for vocabulary practice.", input.state);
  }
  return conversationTurn(input);
}

export function summarizeSession(input: {
  state: TutorState;
  recommendation: string | null;
}): { vocabularyPracticed: number; grammar: string | null; mistakesReviewed: number; next: string } {
  return {
    vocabularyPracticed: input.state.vocabPracticed.length,
    grammar: input.state.grammarTopic,
    mistakesReviewed: input.state.corrections,
    next: input.recommendation ?? "Continue your current lesson.",
  };
}

export function defaultTutorState(): TutorState {
  return emptyState();
}
