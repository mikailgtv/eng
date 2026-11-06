import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { canAccessCourseAtLevel, getStudentLevelAccessContext, studentCanAccessCourse } from "../../src/lib/learning/level-access";
import { getAssignedCourseOverviews } from "../../src/lib/learning";

async function main(){
  const expected=[
    {username:"ivan.petrov",level:"PRE_A1",allowed:["PRE_A1"],completed:1,xp:20},
    {username:"lena.torres",level:"A1",allowed:["PRE_A1","A1"],completed:1,xp:20},
    {username:"mei.chen",level:"A2",allowed:["PRE_A1","A1","A2"],completed:1,xp:25},
    {username:"daniel.kim",level:"B1",allowed:["PRE_A1","A1","A2","B1"],completed:2,xp:50},
  ];
  const result:Record<string,unknown>={};
  for(const item of expected){
    const user=await prisma.user.findFirst({where:{username:item.username,role:"STUDENT",email:{endsWith:"@demo.example"}},select:{id:true,englishLevel:true,groupId:true,organizationId:true,learningProfile:{select:{levelStatus:true,targetLevelCode:true}}}});
    assert(user,`missing staging account ${item.username}`);
    assert.equal(user.englishLevel,item.level,`${item.username} current level`);
    assert.equal(user.learningProfile?.levelStatus,"CONFIRMED",`${item.username} level confirmation`);
    assert(user.learningProfile?.targetLevelCode,`${item.username} target level`);
    const courses=await getAssignedCourseOverviews(user.id,user.groupId);
    const levels=[...new Set(courses.map(c=>c.level.code))];
    assert.deepEqual(levels,item.allowed,`${item.username} visible levels`);
    const rows=await prisma.lessonProgress.count({where:{studentId:user.id,status:"COMPLETED"}});
    assert.equal(rows,item.completed,`${item.username} fixture progress rows`);
    const xp=(await prisma.xpTransaction.aggregate({where:{studentId:user.id,reversedAt:null},_sum:{amount:true}}))._sum.amount??0;
    assert.equal(xp,item.xp,`${item.username} XP ledger total`);
    result[item.username]={level:user.englishLevel,courseLevels:levels,completedLessons:rows,xp};
  }

  const context=await getStudentLevelAccessContext((await prisma.user.findFirstOrThrow({where:{username:"mei.chen"},select:{id:true}})).id);
  assert(context);
  assert.equal(canAccessCourseAtLevel({context,courseLevelOrder:2,groupAssigned:true,explicitAssignment:false}),true,"lower review allowed by default");
  assert.equal(canAccessCourseAtLevel({context,courseLevelOrder:4,groupAssigned:true,explicitAssignment:false}),false,"group assignment alone cannot expose higher level");
  assert.equal(canAccessCourseAtLevel({context,courseLevelOrder:4,groupAssigned:false,explicitAssignment:true}),true,"explicit preview may grant next level");
  assert.equal(canAccessCourseAtLevel({context:{...context,allowLowerLevelReview:false},courseLevelOrder:1,groupAssigned:true,explicitAssignment:false}),false,"organization can disable lower review");
  assert.equal(canAccessCourseAtLevel({context:{...context,currentLevelOrder:null},courseLevelOrder:1,groupAssigned:true,explicitAssignment:false}),false,"unassigned student needs an explicit grant");

  const organization=await prisma.organization.findFirstOrThrow({where:{status:"ACTIVE"},select:{id:true}});
  const levels=await prisma.level.findMany({where:{status:"ACTIVE",OR:[{organizationId:organization.id},{organizationId:null}]},orderBy:{order:"asc"},select:{code:true,organizationId:true}});
  assert.deepEqual(levels.filter(l=>["PRE_A1","A1","A2","B1","B2","C1","C2"].includes(l.code)).map(l=>l.code),["PRE_A1","A1","A2","B1","B2","C1","C2"]);
  const demo=await prisma.curriculum.findFirst({where:{isDemo:true,status:"ACTIVE"},include:{courses:{select:{code:true}}}});
  assert(demo,"active original demo curriculum exists");
  assert(demo.courses.some(c=>c.code==="EN-STARTER-PREA1"));
  const book=await prisma.book.findFirst({where:{title:"DEMO BOOK · Demo Beginner English",status:"ACTIVE"},include:{nodes:true}});
  assert(book&&book.nodes.length>=3,"demo book structure is mapped to persistent nodes");
  assert(book.nodes.every(node=>["DRAFT","REVIEW","APPROVED","PUBLISHED","ARCHIVED"].includes(node.status)));
  const previewStudent=await prisma.user.findFirstOrThrow({where:{username:"mei.chen"},select:{id:true}});
  const previewCourse=await prisma.course.findUniqueOrThrow({where:{code:"EB-DEMO-B1"},select:{id:true}});
  assert.equal(await studentCanAccessCourse(previewStudent.id,previewCourse.id),false,"higher-level course locked until teacher grant");
  await prisma.studentCourseAssignment.upsert({where:{studentId_courseId:{studentId:previewStudent.id,courseId:previewCourse.id}},create:{studentId:previewStudent.id,courseId:previewCourse.id,accessType:"PREVIEW",active:true},update:{accessType:"PREVIEW",active:true}});
  try{assert.equal(await studentCanAccessCourse(previewStudent.id,previewCourse.id),true,"teacher preview grant opens only assigned course");}
  finally{await prisma.studentCourseAssignment.deleteMany({where:{studentId:previewStudent.id,courseId:previewCourse.id}});}

  // Cross-organization custom level/curriculum grant must not be readable even if a bad explicit row exists.
  const user=await prisma.user.findFirstOrThrow({where:{username:"mei.chen"},select:{id:true,organizationId:true}});
  const code=`QA20_${Date.now()}`;
  const otherOrg=await prisma.organization.create({data:{name:`QA tenant ${code}`,code:`Q${Date.now()}`,status:"ACTIVE"},select:{id:true}});
  let otherLevelId:string|undefined, otherCourseId:string|undefined;
  try{
    const max=await prisma.level.aggregate({_max:{order:true}});
    const otherLevel=await prisma.level.create({data:{organizationId:otherOrg.id,code:`${code}_LEVEL`,name:"QA Custom",displayName:"QA Custom",order:(max._max.order??10)+1,status:"ACTIVE"},select:{id:true}});otherLevelId=otherLevel.id;
    const otherCourse=await prisma.course.create({data:{code:`${code}_COURSE`,title:"Isolated test course",levelId:otherLevel.id,status:"PUBLISHED"},select:{id:true}});otherCourseId=otherCourse.id;
    await prisma.studentCourseAssignment.create({data:{studentId:user.id,courseId:otherCourse.id,accessType:"PREVIEW",active:true}});
    assert.equal(await studentCanAccessCourse(user.id,otherCourse.id),false,"cross-organization custom-level access denied even if an invalid assignment row exists");
  }finally{
    if(otherCourseId){await prisma.studentCourseAssignment.deleteMany({where:{courseId:otherCourseId}});await prisma.course.delete({where:{id:otherCourseId}})}
    if(otherLevelId)await prisma.level.delete({where:{id:otherLevelId}});
    await prisma.organization.delete({where:{id:otherOrg.id}});
  }

  result.catalog={levels:levels.length,activeDemoBookNodes:book.nodes.length,levelAccess:"passed",crossOrganization:"denied"};
  console.log(JSON.stringify({ok:true,result},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
