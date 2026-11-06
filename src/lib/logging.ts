/** Server-side error logging that never serializes messages, stacks, request data, or secrets. */
export function logSafeError(event: string, error: unknown): void {
  const errorType = error instanceof Error && error.name ? error.name : "UnknownError";
  console.error(JSON.stringify({ level: "error", event, errorType }));
}
