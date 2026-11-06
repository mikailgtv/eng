import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { PageHeader } from "@/components/ui/page-header";
import { IdentityAction } from "@/components/identity/actions";
import { permissionMatrix } from "@/lib/identity/service";

export const metadata: Metadata = { title: "Roles and permissions" };

export default async function RolesPage() {
  const actor = await requirePageUser(["ADMIN"]);
  const matrix = await permissionMatrix(actor);
  const categories = [...new Set(matrix.permissions.map((item) => item.category))];
  return (
    <div className="space-y-4">
      <PageHeader title="Roles and permissions" description="This table is generated from the stored role permissions. A blank cell means that role does not have the permission." />
      <ul className="space-y-2 md:hidden">
        {matrix.permissions.map((item) => (
          <li key={item.key} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-medium">{item.key}</p>
            <p className="mt-1 text-muted">{item.category}</p>
            <p className="mt-1">Yes: {matrix.roles.filter((role) => role.permissions.includes(item.key)).map((role) => role.name).join(", ") || "None"}</p>
          </li>
        ))}
      </ul>
      <div className="table-scroll hidden rounded-xl border border-border md:block">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr>
              <th className="px-2 py-2">Permission</th>
              {matrix.roles.map((role) => <th key={role.id} className="px-2 py-2">{role.name}</th>)}
            </tr>
          </thead>
          {categories.map((category) => (
            <tbody key={category}>
              <tr><th className="px-2 py-2 text-left" colSpan={matrix.roles.length + 1}>{category}</th></tr>
              {matrix.permissions.filter((item) => item.category === category).map((item) => (
                <tr key={item.key} className="border-t border-border">
                  <th className="px-2 py-1 font-normal" scope="row">{item.key}</th>
                  {matrix.roles.map((role) => <td key={role.id} className="px-2 py-1">{role.permissions.includes(item.key) ? "Yes" : "No"}</td>)}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <IdentityAction title="Custom role" action="/api/roles" confirmLabel="Create role" fields={[{ name: "name", label: "Name" }, { name: "key", label: "Key" }, { name: "baseRole", label: "Base role (STUDENT, TEACHER or ADMIN)", defaultValue: "TEACHER" }, { name: "permissions", label: "Permission keys, comma separated", required: false }]} />
      <p className="text-sm text-muted">Custom role permissions are saved from the API as a list. Use the permission keys shown in the table.</p>
    </div>
  );
}
