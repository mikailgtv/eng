import { PrismaClient } from "@prisma/client";
import { assertDisposableSandboxTarget } from "./safe-seed-target";

try { assertDisposableSandboxTarget(); }
catch (error) { console.error(error instanceof Error ? error.message : "Unsafe test fixture target."); process.exit(1); }

if (process.env.NODE_ENV === "production") {
  console.error("Refusing Phase 20 QA fixtures in production.");
  process.exit(1);
}
if (process.env.PHASE20_QA_SEED_CONFIRM !== "YES") {
  console.error("Set PHASE20_QA_SEED_CONFIRM=YES to write tagged progress fixtures for the allowlisted development test learners.");
  process.exit(1);
}

const prisma=new PrismaClient();
const fixtures=[
  {username:"ivan.petrov",courseCode:"EN-STARTER-PREA1",lessonCount:1,xp:20},
  {username:"mei.chen",courseCode:"EB-DEMO-A2",lessonCount:1,xp:25},
  {username:"daniel.kim",courseCode:"EB-DEMO-B1",lessonCount:2,xp:50},
  {username:"lena.torres",courseCode:"EB-DEMO-A1",lessonCount:1,xp:20},
];
async function main(){
 for(const fixture of fixtures){
  const student=await prisma.user.findFirst({where:{username:fixture.username,role:"STUDENT",email:{endsWith:"@demo.example"}},select:{id:true,englishLevel:true,organizationId:true}});
  const course=await prisma.course.findUnique({where:{code:fixture.courseCode},select:{id:true,level:{select:{code:true}}}});
  if(!student||!course)throw new Error(`Required staging fixture account/course missing: ${fixture.username}/${fixture.courseCode}`);
  if(student.englishLevel!==course.level.code)throw new Error(`Refusing mismatched fixture: ${fixture.username} level ${student.englishLevel} does not match ${course.level.code}`);
  const lessons=await prisma.lesson.findMany({where:{module:{courseId:course.id,status:"PUBLISHED"},status:"PUBLISHED"},orderBy:[{module:{order:"asc"}},{order:"asc"}],take:fixture.lessonCount,include:{activities:{where:{required:true,status:"PUBLISHED"},orderBy:{order:"asc"},select:{id:true,points:true,configuration:true}}}});
  if(lessons.length<fixture.lessonCount)throw new Error(`Not enough published lessons for ${fixture.username}`);
  for(const lesson of lessons){
   for(const activity of lesson.activities){
    const config=JSON.parse(activity.configuration) as {correctOptionId?:string};
    if(!config.correctOptionId)throw new Error(`Cannot create a valid staging attempt for ${activity.id}`);
    await prisma.activityAttempt.upsert({where:{id:`p20qa-${student.id}-${activity.id}`},create:{id:`p20qa-${student.id}-${activity.id}`,studentId:student.id,activityId:activity.id,answer:JSON.stringify({optionId:config.correctOptionId}),isCorrect:true,score:activity.points,attemptNumber:1},update:{}}).catch(async()=>{
      const exists=await prisma.activityAttempt.findFirst({where:{studentId:student.id,activityId:activity.id}});if(!exists)throw new Error("Could not save QA activity attempt");
    });
   }
   await prisma.lessonProgress.upsert({where:{studentId_lessonId:{studentId:student.id,lessonId:lesson.id}},create:{studentId:student.id,lessonId:lesson.id,status:"COMPLETED",startedAt:new Date(Date.now()-86400000),completedAt:new Date(Date.now()-3600000),lastAccessedAt:new Date()},update:{}});
   await prisma.learningEvent.upsert({where:{studentId_eventType_sourceType_sourceId:{studentId:student.id,eventType:"LESSON_COMPLETED",sourceType:"PHASE20_QA_FIXTURE",sourceId:lesson.id}},create:{studentId:student.id,eventType:"LESSON_COMPLETED",sourceType:"PHASE20_QA_FIXTURE",sourceId:lesson.id,skillCode:lesson.primarySkill??"reading",payload:JSON.stringify({fixture:true,courseCode:fixture.courseCode})},update:{}});
   await prisma.xpTransaction.upsert({where:{studentId_sourceType_sourceId_ruleKey:{studentId:student.id,sourceType:"PHASE20_QA_FIXTURE",sourceId:lesson.id,ruleKey:"level-demo-seed"}},create:{studentId:student.id,amount:Math.max(1,Math.floor(fixture.xp/fixture.lessonCount)),sourceType:"PHASE20_QA_FIXTURE",sourceId:lesson.id,ruleKey:"level-demo-seed",metadata:JSON.stringify({fixture:true})},update:{}});
  }
  const xp=await prisma.xpTransaction.aggregate({where:{studentId:student.id,reversedAt:null},_sum:{amount:true}});
  await prisma.gamificationProfile.upsert({where:{studentId:student.id},create:{studentId:student.id,totalXp:xp._sum.amount??0},update:{totalXp:xp._sum.amount??0}});
  console.log(`${fixture.username}: ${lessons.length} tagged completed lesson(s); XP ledger total ${xp._sum.amount??0}`);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
