"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { groupSchema, updateGroupSchema, type GroupInput } from "@/lib/validations";
import { GROUP_TYPES } from "@/lib/constants";
import type { GroupWithMeta } from "@/types";

export interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface GroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  teachers: TeacherOption[];
  /** When provided the dialog edits this group; otherwise it creates one. */
  group?: GroupWithMeta;
}

type FormState = {
  name: string;
  type: string;
  description: string;
  teacherId: string;
  status: "ACTIVE" | "INACTIVE";
};

/**
 * Create/edit learning-group dialog (ADMIN). Deactivating a group requires a
 * confirmation because it changes what students/teachers see.
 */
export function GroupFormDialog({ open, onClose, teachers, group }: GroupFormDialogProps) {
  const router = useRouter();
  const { notify } = useToast();
  const isEdit = Boolean(group);

  const [form, setForm] = useState<FormState>({
    name: group?.name ?? "",
    type: group?.type ?? GROUP_TYPES[0].value,
    description: group?.description ?? "",
    teacherId: group?.teacher?.id ?? "",
    status: (group?.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const close = () => {
    setFieldErrors({});
    setFormError(null);
    setConfirmDeactivate(false);
    onClose();
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: [] }));
  }

  async function submit() {
    setBusy(true);
    setFormError(null);
    try {
      if (isEdit && group) {
        const payload = {
          name: form.name,
          type: form.type,
          description: form.description,
          teacherId: form.teacherId,
          status: form.status,
        };
        const parsed = updateGroupSchema.safeParse(payload);
        if (!parsed.success) return failValidation(parsed.error.flatten().fieldErrors);
        await apiFetch(`/api/groups/${group.id}`, { method: "PATCH", body: parsed.data });
        notify("success", "Group updated.");
      } else {
        const payload: GroupInput = {
          name: form.name,
          type: form.type,
          description: form.description,
          teacherId: form.teacherId,
          status: form.status,
        };
        const parsed = groupSchema.safeParse(payload);
        if (!parsed.success) return failValidation(parsed.error.flatten().fieldErrors);
        await apiFetch("/api/groups", { method: "POST", body: parsed.data });
        notify("success", "Group created.");
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
      setConfirmDeactivate(false);
    } finally {
      setBusy(false);
    }
  }

  function failValidation(fieldErrors: Record<string, string[]>) {
    setFieldErrors(fieldErrors);
    setFormError("Please fix the highlighted fields.");
    setBusy(false);
    setConfirmDeactivate(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit && group && form.status !== group.status && form.status === "INACTIVE") {
      setConfirmDeactivate(true);
      return;
    }
    void submit();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? () => undefined : close}
        title={isEdit ? "Edit group" : "Create group"}
        description={isEdit ? group?.name : "A learning group brings students together, e.g. a shift or department."}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="group-form" loading={busy}>
              {isEdit ? "Save changes" : "Create group"}
            </Button>
          </>
        }
      >
        <form id="group-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Group name" htmlFor="gf-name" error={fieldErrors.name}>
            <Input id="gf-name" value={form.name} onChange={(e) => update("name", e.target.value)} error={Boolean(fieldErrors.name?.length)} autoFocus placeholder="e.g. Firefighter Shift E" />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Group type" htmlFor="gf-type" error={fieldErrors.type}>
              <Select id="gf-type" value={form.type} onChange={(e) => update("type", e.target.value)} error={Boolean(fieldErrors.type?.length)}>
                {GROUP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="gf-status" error={fieldErrors.status}>
              <Select id="gf-status" value={form.status} onChange={(e) => update("status", e.target.value as "ACTIVE" | "INACTIVE")} error={Boolean(fieldErrors.status?.length)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Lead teacher" htmlFor="gf-teacher" error={fieldErrors.teacherId} optional>
            <Select id="gf-teacher" value={form.teacherId} onChange={(e) => update("teacherId", e.target.value)} error={Boolean(fieldErrors.teacherId?.length)}>
              <option value="">— No lead teacher —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Description" htmlFor="gf-description" error={fieldErrors.description} optional>
            <Textarea id="gf-description" value={form.description} onChange={(e) => update("description", e.target.value)} error={Boolean(fieldErrors.description?.length)} maxLength={300} />
          </FormField>

          <FormError message={formError} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={submit}
        title="Deactivate group?"
        danger
        busy={busy}
        confirmLabel="Deactivate group"
        message={
          <>
            <span className="font-medium text-foreground">{form.name}</span> will be marked inactive. Members keep
            their accounts and history, and the group can be reactivated at any time.
          </>
        }
      />
    </>
  );
}
