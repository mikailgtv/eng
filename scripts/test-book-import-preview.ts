import assert from "node:assert/strict";
import { decodeBookImport, previewBookImport } from "../src/lib/books/import-preview";

async function main() {
  const csv = 'key,parentKey,nodeType,title,content,source,rightsNote,rightsConfirmed\nch1,,CHAPTER,"A, B",,,,false\n';
  const decoded = await decodeBookImport("csv", csv);
  const metadataOnly = previewBookImport(decoded);
  assert.equal(metadataOnly.accepted, true);
  assert.equal(metadataOnly.writesPerformed, false);
  assert.equal(metadataOnly.rows[0].title, "A, B");
  assert.equal(metadataOnly.rows[0].proposedStatus, "DRAFT");

  const noRights = previewBookImport([{ key: "l1", nodeType: "LESSON", title: "A lesson", content: "User text" }]);
  assert.equal(noRights.accepted, false);
  assert(noRights.issues.some((issue) => issue.code === "RIGHTS_REVIEW_REQUIRED"));

  const confirmed = previewBookImport([{ key: "l1", nodeType: "LESSON", title: "A lesson", content: "Original text", source: "Author", rightsNote: "Created by submitting teacher", rightsConfirmed: "true" }]);
  assert.equal(confirmed.accepted, true);

  const falseCheckbox = previewBookImport([{ key: "l1", nodeType: "LESSON", title: "A lesson", content: "Text", source: "Source", rightsNote: "No permission", rightsConfirmed: "false" }]);
  assert.equal(falseCheckbox.accepted, false);

  const cycle = previewBookImport([
    { key: "a", parentKey: "b", nodeType: "CHAPTER", title: "A" },
    { key: "b", parentKey: "a", nodeType: "SECTION", title: "B" },
  ]);
  assert.equal(cycle.accepted, false);
  assert(cycle.issues.some((issue) => issue.code === "PARENT_CYCLE"));

  await assert.rejects(() => decodeBookImport("xlsx", new Uint8Array([1, 2, 3])));
  console.log("Book import preview tests passed (write-free; no database accessed).");
}

void main();
