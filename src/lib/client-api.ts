"use client";

/**
 * Client-side fetch helper for the API JSON envelope { data } / { error, fieldErrors }.
 * Throws ApiClientError so forms can surface field-level and general messages.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError("Network error — check your connection and try again.", 0);
  }

  let payload: { data?: T; error?: string; fieldErrors?: Record<string, string[]> } | null = null;
  try {
    payload = await res.json();
  } catch {
    // fall through — non-JSON response is handled below
  }

  if (!res.ok) {
    throw new ApiClientError(
      payload?.error ?? "Something went wrong. Please try again.",
      res.status,
      payload?.fieldErrors
    );
  }
  return payload?.data as T;
}
