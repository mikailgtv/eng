import assert from "node:assert/strict";
import { sessionCompletionIssues } from "../src/lib/teaching/session-rules";

const incomplete = sessionCompletionIssues({
  status: "IN_PROGRESS",
  actualStart: new Date("2026-10-06T10:00:00Z"),
  hasValidLesson: false,
  activeStudentIds: ["s1", "s2"],
  attendedStudentIds: ["s1"],
});
assert.equal(incomplete.length, 2);
assert(incomplete.some((item) => item.includes("published lesson")));
assert(incomplete.some((item) => item.includes("1 active student")));

const valid = sessionCompletionIssues({
  status: "IN_PROGRESS",
  actualStart: new Date("2026-10-06T10:00:00Z"),
  hasValidLesson: true,
  activeStudentIds: ["s1"],
  attendedStudentIds: ["s1"],
});
assert.deepEqual(valid, []);

const unstarted = sessionCompletionIssues({
  status: "SCHEDULED",
  actualStart: null,
  hasValidLesson: true,
  activeStudentIds: [],
  attendedStudentIds: [],
});
assert.equal(unstarted.length, 3);
console.log("Session completion rule tests passed (pure, no database access).");
