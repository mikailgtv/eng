import { externalTutorConfigured } from "@/lib/ai/http-provider";

export async function draftQuestionSuggestion() {
  if (!externalTutorConfigured()) {
    return {
      available: false,
      published: false,
      message: "AI drafting is not configured. Write the question yourself. Nothing was saved or published.",
    };
  }
  return {
    available: true,
    published: false,
    label: "AI draft. Not approved.",
    message: "An external assistant is configured, but this action does not publish a question. A teacher must write or approve the official item.",
  };
}

export function writingFeedbackSuggestion(text: string) {
  if (!externalTutorConfigured()) {
    return { available: false, official: false, message: "AI feedback is not configured. Teacher review is the official grade." };
  }
  return {
    available: true,
    official: false,
    label: "AI suggestion. Not an official grade.",
    observations: text.trim() ? ["Review the draft for task completion before grading."] : ["The submission is empty."],
  };
}
