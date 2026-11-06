import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { effectiveLevels } from "@/lib/learning/level-catalog";
import { LevelCatalogAdmin } from "@/components/admin/level-catalog-admin";
export default async function LearningLevelsPage(){
 const user=await requirePageUser(["ADMIN"]);
 const actor=await prisma.user.findUnique({where:{id:user.id},select:{organizationId:true}});
 const levels=await effectiveLevels(actor?.organizationId??null);
 return <LevelCatalogAdmin initial={levels}/>;
}
