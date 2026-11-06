"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function IdentityAction({
  title,
  description,
  action,
  method = "POST",
  fields,
  confirmLabel,
  danger,
}: {
  title: string;
  description?: string;
  action: string;
  method?: string;
  fields: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }[];
  confirmLabel: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3 rounded-xl border border-border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const body: Record<string, string | boolean> = {};
        for (const field of fields) body[field.name] = String(form.get(field.name) ?? "");
        if (form.get("confirm") === "on") body.confirm = true;
        setPending(true);
        setMessage("");
        try {
          const result = await apiFetch<Record<string, unknown>>(action, { method, body });
          setMessage(result.link ? `Link: ${String(result.link)}` : "Saved.");
          router.refresh();
        } catch (err) {
          setMessage(err instanceof ApiClientError ? err.message : "Could not save.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {fields.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input id={field.name} name={field.name} type={field.type ?? "text"} inputMode={field.type === "email" ? "email" : field.name.toLowerCase().includes("code") ? "text" : undefined} autoCapitalize="none" defaultValue={field.defaultValue} required={field.required ?? true} className="min-h-11 text-base" />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input name="confirm" type="checkbox" required={danger} />
        I confirm this change.
      </label>
      <Button type="submit" variant={danger ? "danger" : "primary"} loading={pending}>{confirmLabel}</Button>
      {message ? <p className="text-sm" role="status">{message}</p> : null}
    </form>
  );
}

export function JsonAction({ title, url, method = "POST", body, label }: { title: string; url: string; method?: string; body: Record<string, unknown>; label: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <form className="rounded-xl border border-border p-4" onSubmit={async (event) => {
      event.preventDefault();
      try {
        const result = await apiFetch<Record<string, unknown>>(url, { method, body });
        setMessage(result.link ? String(result.link) : "Done.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Could not complete that action.");
      }
    }}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <Button className="mt-3" type="submit">{label}</Button>
      {message ? <p className="mt-2 text-sm" role="status">{message}</p> : null}
    </form>
  );
}
