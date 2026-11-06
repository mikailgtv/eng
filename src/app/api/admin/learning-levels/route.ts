import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { configureOrgLevel, createOrganizationLevel, effectiveLevels } from "@/lib/learning/level-catalog";

const customSchema=z.object({kind:z.literal("CUSTOM"),code:z.string().trim().min(1).max(30),name:z.string().trim().min(2).max(80),displayName:z.string().trim().min(2).max(80),description:z.string().trim().max(500).nullable().optional()}).strict();
const policySchema=z.object({kind:z.literal("POLICY"),levelCode:z.string().min(1).max(80),nameOverride:z.string().trim().max(80).nullable().optional(),displayNameOverride:z.string().trim().max(80).nullable().optional(),allowLowerLevelReview:z.boolean(),allowAssignedHigherPreview:z.boolean(),requireExplicitAssignment:z.boolean()}).strict();

export const GET=apiRoute(async()=>{
 const viewer=await requireApiUser(["ADMIN"]);
 const actor=await prisma.user.findUnique({where:{id:viewer.id},select:{organizationId:true}});
 return jsonOk({levels:await effectiveLevels(actor?.organizationId??null)});
});
export const POST=apiRoute(async(req)=>{
 assertSameOrigin(req);
 const viewer=await requireApiUser(["ADMIN"]);
 const body=await parseJsonBody(req);
 if((body as {kind?:string})?.kind==="CUSTOM") return jsonOk({level:await createOrganizationLevel(viewer,customSchema.parse(body))},201);
 return jsonOk({policy:await configureOrgLevel(viewer,policySchema.parse(body))});
});
