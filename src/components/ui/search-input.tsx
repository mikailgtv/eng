"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  label: string;
  placeholder: string;
  /** Current value (server-rendered from the URL). */
  value: string;
  /** URL param name this search writes to. */
  param?: string;
  /** Other URL params to preserve while searching. */
  preserveParams?: Record<string, string>;
  className?: string;
}

/**
 * Debounced search box that writes into the URL query string, so search is
 * server-rendered, shareable and works without client-side data stores.
 */
export function SearchInput({ label, placeholder, value, param = "q", preserveParams = {}, className }: SearchInputProps) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Keep in sync when the URL changes (e.g. back/forward navigation).
  useEffect(() => setText(value), [value]);

  function applySearch(next: string) {
    const params = new URLSearchParams();
    if (next.trim()) params.set(param, next.trim());
    for (const [k, v] of Object.entries(preserveParams)) if (v) params.set(k, v);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => applySearch(next), 350);
  }

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <label htmlFor="list-search" className="sr-only">
        {label}
      </label>
      <Search
        className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isPending ? "text-primary" : "text-muted")}
        aria-hidden
      />
      <input
        id="list-search"
        type="search"
        role="searchbox"
        value={text}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm shadow-sm placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
