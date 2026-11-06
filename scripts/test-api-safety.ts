import assert from "node:assert/strict";
import { handleApiError } from "../src/lib/api-errors";
import { logSafeError } from "../src/lib/logging";

async function main() {
  const privateMarker = "sensitive-diagnostic-7e5a";
  const logged: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => logged.push(args.map(String).join(" "));
  try {
    const response = handleApiError(new Error(privateMarker), "phase27-safe-test");
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.errorCode, "INTERNAL_ERROR");
    assert.equal(body.requestId, "phase27-safe-test");
    assert.doesNotMatch(JSON.stringify(body), /sensitive-diagnostic|stack|DATABASE_URL|SESSION_SECRET/i);
    assert.doesNotMatch(logged.join("\n"), /sensitive-diagnostic|stack|DATABASE_URL|SESSION_SECRET/i);

    logSafeError("phase27.test", new Error(privateMarker));
    assert.doesNotMatch(logged.join("\n"), /sensitive-diagnostic|stack|DATABASE_URL|SESSION_SECRET/i);
    assert.match(logged.join("\n"), /Error/);
  } finally {
    console.error = original;
  }

  console.log("API error and server log safety tests passed (synthetic diagnostic only).");
}

void main();
