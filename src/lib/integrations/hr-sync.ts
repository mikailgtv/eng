import { prisma } from "../prisma";
import crypto from "crypto";

export interface SyncCandidateUser {
  externalId: string;
  email: string;
  name: string;
  role?: "STUDENT" | "TEACHER";
  department?: string;
  employeeId?: string;
  status?: "ACTIVE" | "INACTIVE" | "TERMINATED";
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  conflicts: number;
  errors: Array<{ externalId: string; error: string }>;
}

export class HrDirectorySyncEngine {
  /**
   * Synchronizes enterprise directory users into the LMS with role-based policies
   * and preserves existing historical learning data even if an employee is deactivated.
   */
  public static async syncUsers(
    providerSlug: string,
    organizationId: string,
    externalUsers: SyncCandidateUser[],
    options: { conflictStrategy: "EXTERNAL_WINS" | "LMS_WINS" | "MANUAL_REVIEW" } = { conflictStrategy: "EXTERNAL_WINS" }
  ): Promise<SyncResult> {
    if (!organizationId) throw new Error("HR sync requires organization scope.");
    const result: SyncResult = {
      total: externalUsers.length,
      created: 0,
      updated: 0,
      deactivated: 0,
      unchanged: 0,
      conflicts: 0,
      errors: [],
    };

    for (const extUser of externalUsers) {
      try {
        const email = extUser.email.toLowerCase().trim();

        // 1. Check if identity link already exists
        const existingLink = await prisma.externalIdentityLink.findFirst({
          where: { provider: providerSlug, externalSubjectId: extUser.externalId, user: { organizationId } },
        });

        if (existingLink) {
          // Employee already linked. Check deactivation status:
          if (extUser.status === "INACTIVE" || extUser.status === "TERMINATED") {
            // NEVER delete learning records, simply update active status on LMS User
            await prisma.user.update({
              where: { id: existingLink.userId },
              data: {
                status: "INACTIVE",
              },
            });
            result.deactivated++;
          } else {
            // Update attributes if external wins
            if (options.conflictStrategy === "EXTERNAL_WINS") {
              const nameParts = extUser.name.split(" ");
              const firstName = nameParts[0] || extUser.name;
              const lastName = nameParts.slice(1).join(" ") || "Employee";

              await prisma.user.update({
                where: { id: existingLink.userId },
                data: {
                  firstName,
                  lastName,
                  status: "ACTIVE",
                },
              });
              result.updated++;
            } else {
              result.unchanged++;
            }
          }
          continue;
        }

        // 2. Check if a local LMS user with the same email already exists
        const existingLmsUser = await prisma.user.findFirst({
          where: { email, organizationId },
        });

        if (existingLmsUser) {
          // Never link an external identity based solely on matching email; require
          // a separately verified account-linking workflow to prevent takeover.
          result.conflicts++;
          result.errors.push({ externalId: extUser.externalId, error: "An LMS account already uses this email. Manual verified identity linking is required." });
          continue;
        }

        // 3. Create new user in LMS if active
        if (extUser.status === "INACTIVE" || extUser.status === "TERMINATED") {
          result.unchanged++;
          continue;
        }

        const nameParts = extUser.name.split(" ");
        const firstName = nameParts[0] || extUser.name;
        const lastName = nameParts.slice(1).join(" ") || "Employee";
        const employeeCode = extUser.employeeId || `EMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const username = email.split("@")[0] + "_" + crypto.randomBytes(2).toString("hex");

        const newUser = await prisma.user.create({
          data: {
            organizationId,
            employeeCode,
            firstName,
            lastName,
            username,
            email,
            role: extUser.role || "STUDENT",
            status: "ACTIVE",
            passwordHash: "SSO_MANAGED_EXTERNAL_IDENTITY", // No local password for SSO/HR users
          },
        });

          await prisma.externalIdentityLink.create({
            data: {
              organizationId,
              userId: newUser.id,
            provider: providerSlug,
            externalSubjectId: extUser.externalId,
            externalEmail: email,
            attributesJson: JSON.stringify({
              department: extUser.department,
              employeeId: extUser.employeeId,
            }),
          },
        });

        result.created++;
      } catch (err: any) {
        result.errors.push({
          externalId: extUser.externalId,
          error: err.message || "Unknown error processing directory user",
        });
      }
    }

    return result;
  }
}
