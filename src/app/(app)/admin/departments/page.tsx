import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { PageHeader } from "@/components/ui/page-header";
import { IdentityAction } from "@/components/identity/actions";
import { listDepartments, listTeams } from "@/lib/identity/service";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const actor = await requirePageUser(["ADMIN"]);
  const [departments, teams] = await Promise.all([listDepartments(actor), listTeams(actor)]);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader title="Departments and teams" description="Add a department or team without replacing the existing learning groups." />
      <ul className="space-y-2 text-sm">
        {departments.length === 0 ? <li className="text-muted">No departments yet.</li> : departments.map((row) => (
          <li key={row.id} className="rounded-xl border border-border px-3 py-2">{row.name} · {row.code} · {row._count.members} members · {row._count.groups} groups · {row.status}</li>
        ))}
      </ul>
      <IdentityAction title="New department" action="/api/departments" confirmLabel="Create department" fields={[{ name: "name", label: "Name" }, { name: "code", label: "Code" }, { name: "description", label: "Description", required: false }]} />
      <ul className="space-y-2 text-sm">
        {teams.length === 0 ? <li className="text-muted">No teams yet.</li> : teams.map((row) => <li key={row.id} className="rounded-xl border border-border px-3 py-2">{row.name} · {row.code} · {row.department?.name ?? "No department"}</li>)}
      </ul>
      <IdentityAction title="New team" action="/api/teams" confirmLabel="Create team" fields={[{ name: "name", label: "Name" }, { name: "code", label: "Code" }, { name: "departmentId", label: "Department id", required: false }]} />
    </div>
  );
}
