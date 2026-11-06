import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function effectiveLevels(organizationId: string | null) {
  const [levels, policies] = await Promise.all([
    prisma.level.findMany({ where: { status: "ACTIVE", OR: [{ organizationId }, { organizationId: null }] }, orderBy: { order: "asc" } }),
    prisma.levelAccessPolicy.findMany({ where: { active: true, OR: [{ organizationId }, { organizationId: null }] } }),
  ]);
  const orgPolicies = new Map(policies.filter(p=>p.organizationId===organizationId).map(p=>[p.levelCode,p]));
  const globalPolicies = new Map(policies.filter(p=>p.organizationId===null).map(p=>[p.levelCode,p]));
  return levels.map(level=>{
    const policy=orgPolicies.get(level.code)??globalPolicies.get(level.code);
    return { id:level.id,code:level.code,name:policy?.nameOverride??level.name,displayName:policy?.displayNameOverride??level.displayName??level.name,order:level.order,status:level.status,organizationId:level.organizationId,allowLowerLevelReview:policy?.allowLowerLevelReview??true,allowAssignedHigherPreview:policy?.allowAssignedHigherPreview??true,requireExplicitAssignment:policy?.requireExplicitAssignment??true };
  });
}

export async function configureOrgLevel(viewer:{id:string;role:string},input:{levelCode:string;nameOverride?:string|null;displayNameOverride?:string|null;allowLowerLevelReview:boolean;allowAssignedHigherPreview:boolean;requireExplicitAssignment:boolean}) {
  if(viewer.role!=="ADMIN") throw new ApiError(403,"Not authorized.");
  const [actor,level]=await Promise.all([
    prisma.user.findUnique({where:{id:viewer.id},select:{organizationId:true}}),
    prisma.level.findFirst({where:{code:input.levelCode,status:"ACTIVE"},select:{code:true,organizationId:true}}),
  ]);
  if(!actor?.organizationId||!level||(level.organizationId&&level.organizationId!==actor.organizationId)) throw new ApiError(404,"Level not found in this organization.");
  const policy=await prisma.levelAccessPolicy.upsert({
    where:{organizationId_levelCode:{organizationId:actor.organizationId,levelCode:input.levelCode}},
    create:{organizationId:actor.organizationId,levelCode:input.levelCode,nameOverride:input.nameOverride?.trim()||null,displayNameOverride:input.displayNameOverride?.trim()||null,allowLowerLevelReview:input.allowLowerLevelReview,allowAssignedHigherPreview:input.allowAssignedHigherPreview,requireExplicitAssignment:input.requireExplicitAssignment},
    update:{nameOverride:input.nameOverride?.trim()||null,displayNameOverride:input.displayNameOverride?.trim()||null,allowLowerLevelReview:input.allowLowerLevelReview,allowAssignedHigherPreview:input.allowAssignedHigherPreview,requireExplicitAssignment:input.requireExplicitAssignment,active:true},
  });
  await audit({actorId:viewer.id,action:"LEVEL_ACCESS_POLICY_UPDATED",entityType:"CONTENT",entityId:policy.id,metadata:{levelCode:policy.levelCode,allowLowerLevelReview:policy.allowLowerLevelReview,allowAssignedHigherPreview:policy.allowAssignedHigherPreview}});
  return policy;
}

export async function createOrganizationLevel(viewer:{id:string;role:string},input:{code:string;name:string;displayName:string;description?:string|null}) {
  if(viewer.role!=="ADMIN") throw new ApiError(403,"Not authorized.");
  const actor=await prisma.user.findUnique({where:{id:viewer.id},select:{organizationId:true}});
  if(!actor?.organizationId) throw new ApiError(403,"An organization-scoped admin account is required.");
  const org=await prisma.organization.findUnique({where:{id:actor.organizationId},select:{code:true}});
  if(!org) throw new ApiError(404,"Organization not found.");
  const slug=input.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"");
  if(!slug||slug.length>30) throw new ApiError(422,"Enter a short custom level code.");
  const code=`ORG_${org.code}_${slug}`.toUpperCase();
  const max=await prisma.level.aggregate({_max:{order:true}});
  const order=(max._max.order??0)+1;
  const level=await prisma.level.create({data:{organizationId:actor.organizationId,code,name:input.name.trim(),displayName:input.displayName.trim(),description:input.description?.trim()||null,order,status:"ACTIVE"}}).catch((err)=>{if(err instanceof Prisma.PrismaClientKnownRequestError&&err.code==="P2002")throw new ApiError(409,"A level with this code already exists.");throw err;});
  await audit({actorId:viewer.id,action:"ORGANIZATION_LEVEL_CREATED",entityType:"CONTENT",entityId:level.id,metadata:{code:level.code,order:level.order}});
  return level;
}
