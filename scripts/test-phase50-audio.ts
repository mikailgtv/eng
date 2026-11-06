/**
 * Phase 50 — speaking/listening audio fixes: deterministic unit guards.
 *
 * P49-D6: `mistakeCategory()` used to scan `${target} ${heard}`, so any wrong answer to a
 * sentence containing "is/am/are" was filed as an am/is/are mistake (e.g. the response
 * "banana" against "Hello. What is your name?"). Classification must be supported by the
 * target-versus-response comparison, while genuine copula errors must still be caught.
 *
 * These guards also pin `transcriptUnderstood()`, which the fixes must not disturb: the
 * matching rule is all significant words or at least 80% of them, never a pronunciation score.
 *
 * Run: npm run test:phase50
 */
import assert from "node:assert/strict";
import { mistakeCategory, normalizeSpeech, transcriptUnderstood } from "../src/lib/voice/match";

const results: { name: string; ok: boolean; error?: string }[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    console.log(`  \u2717 ${name}`);
    console.log(`      ${error instanceof Error ? error.message : String(error)}`);
  }
}

/* ---------- the reported defect ---------- */
check("an unrelated answer is not filed as an am/is/are mistake", () => {
  const category = mistakeCategory("Hello. What is your name?", "banana");
  assert.notEqual(category, "am/is/are", "the target containing 'is' must not make every answer a copula mistake");
  assert.equal(category, "missing words", "a one-word answer to a five-word target is a missing-words case");
});

check("an unrelated fragment without a copula is not filed as am/is/are", () => {
  assert.notEqual(mistakeCategory("Hello. What is your name?", "what name"), "am/is/are");
});

check("an unrelated answer to a copula sentence keeps a non-grammar category", () => {
  assert.notEqual(mistakeCategory("She is my teacher.", "the cat"), "am/is/are");
});

/* ---------- genuine copula mistakes must still be caught ---------- */
check("the wrong copula is still an am/is/are mistake", () => {
  assert.equal(mistakeCategory("I am happy.", "I is happy"), "am/is/are");
  assert.equal(mistakeCategory("He is a teacher.", "He are a teacher"), "am/is/are");
});

check("an omitted copula in an otherwise attempted sentence is an am/is/are mistake", () => {
  assert.equal(mistakeCategory("I am happy.", "I happy"), "am/is/are");
});

check("a copula added where the target has none is an am/is/are mistake", () => {
  assert.equal(mistakeCategory("I go to school.", "I am go to school"), "am/is/are");
});

/* ---------- the other categories and the fallbacks are preserved ---------- */
check("a missing article keeps its own category", () => {
  // not "understood" (a significant word is missing) and the target's article is absent
  assert.equal(mistakeCategory("I saw a big cat.", "I saw big dog"), "articles");
});

check("article checks keep their existing precedence over missing-words", () => {
  // pre-existing ordering: a target article that the learner dropped is reported as "articles"
  assert.equal(mistakeCategory("Open the window please.", "open window"), "articles");
});

check("a shortened phrase with no article or copula is a missing-words case", () => {
  assert.equal(mistakeCategory("Open window please now.", "open window"), "missing words");
});

check("a same-length but wrong sentence falls back to 'not the full phrase'", () => {
  assert.equal(mistakeCategory("Buy fresh milk today.", "sell old bread later"), "not the full phrase");
});

check("a correct response has no mistake category", () => {
  assert.equal(mistakeCategory("Hello. What is your name?", "hello what is your name"), null);
  assert.equal(mistakeCategory("I am happy.", "I am happy."), null);
});

check("an empty or missing response has no category", () => {
  assert.equal(mistakeCategory("I am happy.", null), null);
  assert.equal(mistakeCategory("I am happy.", undefined), null);
  assert.equal(mistakeCategory("I am happy.", "   "), null);
});

check("a response of pure punctuation is not classified", () => {
  assert.equal(mistakeCategory("I am happy.", "!!!"), null);
});

/* ---------- the matching rule the fixes rely on is unchanged ---------- */
check("transcript matching still ignores case and punctuation", () => {
  assert.equal(transcriptUnderstood("Hello. What is your name?", "hello what is your name"), true);
  assert.equal(transcriptUnderstood("Where are you from?", "WHERE ARE YOU FROM"), true);
});

check("an unrelated transcript is still not understood", () => {
  assert.equal(transcriptUnderstood("Say: Stop.", "go"), false);
  assert.equal(transcriptUnderstood("Hello. What is your name?", "banana"), false);
});

check("a partial transcript at or above 80% of significant words is understood", () => {
  // significant words are those longer than two characters
  assert.equal(transcriptUnderstood("Where is the train station please", "where is the train station"), true);
  assert.equal(transcriptUnderstood("Hello. What is your name?", "what name"), false);
});

check("normalisation is stable", () => {
  assert.equal(normalizeSpeech("  Hello,   World! "), "hello world");
});

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Phase 50 audio unit guards: ${results.length - failed.length} passed, ${failed.length} failed ===\n`);
if (failed.length) process.exitCode = 1;
