"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { fullName } from "@/lib/utils";
import type { SafeUser } from "@/types";

interface AvailableStudent {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  currentGroup: string | null;
}

interface MembersManagerProps {
  group: { id: string; name: string };
  members: SafeUser[];
}

/**
 * Group membership management (ADMIN):
 *  - remove a member (soft: membership cleared, account kept) with confirmation
 *  - search + assign students; warns explicitly when the assignment MOVES a
 *    student out of another group
 */
export function MembersManager({ group, members }: MembersManagerProps) {
  const router = useRouter();
  const { notify } = useToast();

  const [removing, setRemoving] = useState<SafeUser | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AvailableStudent[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState<AvailableStudent | null>(null);
  const [, startTransition] = useTransition();

  // Debounced picker search against the protected API.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<AvailableStudent[]>(
          `/api/groups/${group.id}/available-students?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        setResults(data);
      } catch (err) {
        if (!(err instanceof ApiClientError) || err.status !== 0) {
          setResults(null);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, group.id]);

  async function removeMember() {
    if (!removing) return;
    setBusy(true);
    try {
      await apiFetch(`/api/groups/${group.id}/members`, {
        method: "DELETE",
        body: { userId: removing.id },
      });
      notify("success", `${fullName(removing)} removed from ${group.name}.`);
      setRemoving(null);
      startTransition(() => router.refresh());
    } catch (err) {
      notify("error", err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function assignMember() {
    if (!assigning) return;
    setBusy(true);
    try {
      await apiFetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        body: { userId: assigning.id },
      });
      notify("success", `${fullName(assigning)} assigned to ${group.name}.`);
      setAssigning(null);
      setResults((prev) => prev?.filter((s) => s.id !== assigning.id) ?? prev);
      startTransition(() => router.refresh());
    } catch (err) {
      notify("error", err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Current members */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            Members <span className="font-normal text-muted">({members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {members.length === 0 ? (
            <EmptyInline className="m-5">
              No students in this group yet. Use the search on the right to assign students.
            </EmptyInline>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar person={m} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{fullName(m)}</p>
                    <p className="truncate text-xs tabular-nums text-muted">{m.employeeCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoving(m)}
                    aria-label={`Remove ${fullName(m)} from ${group.name}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-danger/40 hover:bg-danger-subtle hover:text-danger"
                  >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Assign students */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Assign students</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="relative mb-3">
            <label htmlFor="member-search" className="sr-only">Search students to assign</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="member-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all students…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm shadow-sm placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {searching ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !results ? (
            <EmptyInline>Start typing to search students.</EmptyInline>
          ) : results.length === 0 ? (
            <EmptyInline>No matching students found.</EmptyInline>
          ) : (
            <ul className="space-y-2">
              {results.map((s) => (
                <li key={s.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{fullName(s)}</p>
                      <p className="truncate text-xs text-muted">
                        <span className="tabular-nums">{s.employeeCode}</span>
                        {s.currentGroup && <> · currently in {s.currentGroup}</>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssigning(s)}
                      aria-label={`Assign ${fullName(s)} to ${group.name}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary-subtle px-2.5 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary-subtle/70"
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden /> Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-5 text-muted">
            A student belongs to exactly one group. Assigning a student who is already in another group moves them.
          </p>
        </CardBody>
      </Card>

      {/* Confirmations */}
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={removeMember}
        title="Remove from group?"
        danger
        busy={busy}
        confirmLabel="Remove"
        message={
          removing && (
            <>
              Remove <span className="font-medium text-foreground">{fullName(removing)}</span> from{" "}
              <span className="font-medium text-foreground">{group.name}</span>? The student account is kept — only the
              group assignment is cleared.
            </>
          )
        }
      />

      <ConfirmDialog
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        onConfirm={assignMember}
        title={assigning?.currentGroup ? "Move student?" : "Assign student?"}
        busy={busy}
        confirmLabel={assigning?.currentGroup ? "Move student" : "Assign"}
        message={
          assigning && (
            <>
              {assigning.currentGroup ? (
                <>
                  Move <span className="font-medium text-foreground">{fullName(assigning)}</span> from{" "}
                  <span className="font-medium text-foreground">{assigning.currentGroup}</span> to{" "}
                  <span className="font-medium text-foreground">{group.name}</span>?
                </>
              ) : (
                <>
                  Assign <span className="font-medium text-foreground">{fullName(assigning)}</span> to{" "}
                  <span className="font-medium text-foreground">{group.name}</span>?
                </>
              )}
            </>
          )
        }
      />
    </div>
  );
}
