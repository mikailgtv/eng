"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations";
import { ENGLISH_LEVELS, ROLES, roleLabel, STATUSES } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import type { GroupOption, SafeUser } from "@/types";

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  groups: GroupOption[];
  /** When provided the dialog edits this user; otherwise it creates a new one. */
  user?: SafeUser;
  /** Locks the role selector (used by /admin/teachers and /admin/students). */
  lockedRole?: "TEACHER" | "STUDENT";
}

type FormState = {
  firstName: string;
  lastName: string;
  employeeCode: string;
  username: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  groupId: string;
  englishLevel: string;
  password: string;
};

function stateFromUser(user?: SafeUser, lockedRole?: Role): FormState {
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    employeeCode: user?.employeeCode ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    role: (user?.role as Role) ?? lockedRole ?? "STUDENT",
    status: (user?.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
    groupId: user?.groupId ?? "",
    englishLevel: user?.englishLevel ?? "",
    password: "",
  };
}

/**
 * Create/edit user dialog. Validates with the same zod schemas as the API.
 * Significant changes (role change, deactivation, password reset) require an
 * explicit confirmation step before submitting.
 */
export function UserFormDialog({ open, onClose, groups, user, lockedRole }: UserFormDialogProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = Boolean(user);

  const [form, setForm] = useState<FormState>(() => stateFromUser(user, lockedRole));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const reset = () => {
    setForm(stateFromUser(user, lockedRole));
    setFieldErrors({});
    setFormError(null);
    setConfirm(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: [] }));
  }

  /** Human-readable list of significant changes, used for the confirm step. */
  const significantChanges = useMemo(() => {
    if (!user) return [];
    const changes: string[] = [];
    if (form.role !== user.role) changes.push(`Role: ${roleLabel(user.role as Role)} → ${roleLabel(form.role)}`);
    if (form.status !== user.status) {
      changes.push(form.status === "INACTIVE" ? "Account will be deactivated (sign-in blocked)" : "Account will be reactivated");
    }
    if (form.password) changes.push("Password will be reset");
    if (form.groupId !== (user.groupId ?? "")) {
      const current = user.group?.name ?? "none";
      const next = groups.find((g) => g.id === form.groupId)?.name ?? "none";
      changes.push(`Group: ${current} → ${next}`);
    }
    return changes;
  }, [user, form, groups]);

  async function submit() {
    setBusy(true);
    setFormError(null);
    try {
      if (isEdit && user) {
        const payload: UpdateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          employeeCode: form.employeeCode,
          username: form.username,
          email: form.email,
          role: lockedRole ? user.role as Role : form.role,
          status: form.status,
          groupId: form.groupId,
          englishLevel: form.englishLevel === "" ? null : form.englishLevel,
          password: form.password || undefined,
        };
        const parsed = updateUserSchema.safeParse(payload);
        if (!parsed.success) return failValidation(parsed.error.flatten().fieldErrors);
        await apiFetch(`/api/users/${user.id}`, { method: "PATCH", body: parsed.data });
        notify("success", "User updated.");
      } else {
        const payload: CreateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          employeeCode: form.employeeCode,
          username: form.username,
          email: form.email,
          role: lockedRole ?? form.role,
          status: form.status,
          groupId: form.groupId || undefined,
          englishLevel: form.englishLevel || undefined,
          password: form.password,
        };
        const parsed = createUserSchema.safeParse(payload);
        if (!parsed.success) return failValidation(parsed.error.flatten().fieldErrors);
        await apiFetch("/api/users", { method: "POST", body: parsed.data });
        notify("success", "User created.");
      }
      close();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors as Record<string, string[]>);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  function failValidation(fieldErrors: Record<string, string[]>) {
    setFieldErrors(fieldErrors);
    setFormError("Please fix the highlighted fields.");
    setBusy(false);
    setConfirm(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    if (significantChanges.length > 0) {
      setConfirm(
        significantChanges.length === 1
          ? significantChanges[0] + ". Apply this change?"
          : "You are about to apply these changes:\n• " + significantChanges.join("\n• ") + "\n\nApply?"
      );
      return;
    }
    void submit();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? () => undefined : close}
        title={isEdit ? "Edit user" : "Create user"}
        description={isEdit ? `Editing ${user?.firstName} ${user?.lastName}` : "Add a new user to the platform."}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" loading={busy}>
              {isEdit ? "Save changes" : "Create user"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" htmlFor="uf-firstName" error={fieldErrors.firstName}>
              <Input id="uf-firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} error={Boolean(fieldErrors.firstName?.length)} autoFocus />
            </FormField>
            <FormField label="Last name" htmlFor="uf-lastName" error={fieldErrors.lastName}>
              <Input id="uf-lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} error={Boolean(fieldErrors.lastName?.length)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Employee code" htmlFor="uf-code" error={fieldErrors.employeeCode}>
              <Input id="uf-code" value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} error={Boolean(fieldErrors.employeeCode?.length)} placeholder="e.g. FF-A-105" />
            </FormField>
            <FormField label="Username" htmlFor="uf-username" error={fieldErrors.username} hint="lowercase letters, numbers, . _ -">
              <Input id="uf-username" value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase())} error={Boolean(fieldErrors.username?.length)} autoComplete="off" />
            </FormField>
          </div>

          <FormField label="Email" htmlFor="uf-email" error={fieldErrors.email} optional>
            <Input id="uf-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} error={Boolean(fieldErrors.email?.length)} />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Role" htmlFor="uf-role" error={fieldErrors.role}>
              <Select id="uf-role" value={form.role} onChange={(e) => update("role", e.target.value as Role)} disabled={Boolean(lockedRole)} error={Boolean(fieldErrors.role?.length)}>
                {ROLES.filter((r) => !lockedRole || r === lockedRole).map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="uf-status" error={fieldErrors.status}>
              <Select id="uf-status" value={form.status} onChange={(e) => update("status", e.target.value as "ACTIVE" | "INACTIVE")} error={Boolean(fieldErrors.status?.length)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s === "ACTIVE" ? "Active" : "Inactive"}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Learning group" htmlFor="uf-group" error={fieldErrors.groupId}>
              <Select id="uf-group" value={form.groupId} onChange={(e) => update("groupId", e.target.value)} error={Boolean(fieldErrors.groupId?.length)}>
                <option value="">— No group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="English level" htmlFor="uf-level" error={fieldErrors.englishLevel}>
              <Select id="uf-level" value={form.englishLevel} onChange={(e) => update("englishLevel", e.target.value)} error={Boolean(fieldErrors.englishLevel?.length)}>
                <option value="">Not assessed yet</option>
                {ENGLISH_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField
            label={isEdit ? "New password" : "Password"}
            htmlFor="uf-password"
            error={fieldErrors.password}
            optional={isEdit}
            hint={isEdit ? "leave blank to keep current" : "min 8 chars, letters + numbers"}
          >
            <Input
              id="uf-password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              error={Boolean(fieldErrors.password?.length)}
              autoComplete="new-password"
            />
          </FormField>

          <FormError message={formError} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={submit}
        title={isEdit ? "Confirm changes" : "Confirm"}
        message={<span className="whitespace-pre-line">{confirm}</span>}
        confirmLabel="Apply"
        busy={busy}
        danger={significantChanges.some((c) => c.startsWith("Account will be deactivated") || c.startsWith("Role:"))}
      />
    </>
  );
}
