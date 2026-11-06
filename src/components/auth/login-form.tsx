"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input } from "@/components/ui/field";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { LoginInput } from "@/lib/validations";

interface LoginFormProps {
  nextPath: string;
  showDemoHints: boolean;
  demoAccounts: readonly { role: string; identifier: string; password: string }[];
}

export function LoginForm({ nextPath, showDemoHints, demoAccounts }: LoginFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LoginInput>({ identifier: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  function update(field: keyof LoginInput, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: [] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await apiFetch<{ redirect: string }>("/api/auth/login", { method: "POST", body: values });
      router.replace(nextPath || result.redirect);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors as Record<string, string[]>);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Brand />
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">Sign in to your account</h1>
        <p className="mt-1 text-sm text-muted">Organizational English training platform</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="space-y-4">
          <FormField label="Username or email" htmlFor="identifier" error={fieldErrors.identifier}>
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              autoFocus
              required
              value={values.identifier}
              onChange={(e) => update("identifier", e.target.value)}
              error={Boolean(fieldErrors.identifier?.length)}
              placeholder="e.g. james.carter"
            />
          </FormField>
          <FormField label="Password" htmlFor="password" error={fieldErrors.password}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={values.password}
              onChange={(e) => update("password", e.target.value)}
              error={Boolean(fieldErrors.password?.length)}
            />
          </FormField>
          <FormError message={error} />
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>

      {showDemoHints && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-5 text-amber-900">
          <p className="font-semibold">⚠ Development demo accounts</p>
          <p className="mt-1">
            This is a development build seeded with demo data. Remove demo seeding before production.
          </p>
          <ul className="mt-2 space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.identifier} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{a.role}:</span>{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">{a.identifier}</code> /{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">{a.password}</code>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-amber-300 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                  onClick={() => setValues({ identifier: a.identifier, password: a.password })}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
