import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { IdentityAction } from "@/components/identity/actions";
import { ensureIdentity } from "@/lib/identity/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage() {
  await requirePageUser(["ADMIN"]);
  const org = await ensureIdentity();
  const settings = org ? await prisma.organizationSetting.findUnique({ where: { organizationId: org.id } }) : null;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Organization" description="Name, timezone, language and security policy. Existing groups stay in this organization." />
      <Card className="mb-4">
        <CardBody>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Name</dt><dd>{org?.name ?? "Not created"}</dd></div>
            <div><dt className="text-muted">Code</dt><dd>{org?.code ?? "—"}</dd></div>
            <div><dt className="text-muted">Timezone</dt><dd>{org?.timezone ?? "UTC"}</dd></div>
            <div><dt className="text-muted">MFA</dt><dd>{settings?.mfaMode ?? "OPTIONAL"}</dd></div>
          </dl>
        </CardBody>
      </Card>
      {org ? (
        <IdentityAction
          title="Update organization"
          action="/api/organizations"
          method="PATCH"
          confirmLabel="Save organization"
          fields={[
            { name: "id", label: "Organization id", defaultValue: org.id },
            { name: "name", label: "Name", defaultValue: org.name },
            { name: "timezone", label: "Timezone", defaultValue: org.timezone },
            { name: "language", label: "Language", defaultValue: org.language },
          ]}
        />
      ) : null}
    </div>
  );
}
