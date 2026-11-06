import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REACTIONS: Record<string,{code:string;caption:string}>={
  LESSON_COMPLETED:{code:"CELEBRATING",caption:"Lesson complete! Your steady practice is adding up."},
  QUESTION_CORRECT:{code:"HAPPY",caption:"Nice work — you found the right answer."},
  QUESTION_INCORRECT:{code:"ENCOURAGING",caption:"Every try helps you learn. Take a breath and try again."},
  LISTENING_COMPLETED:{code:"LISTENING",caption:"Listening practice complete. Great focus."},
  SPEAKING_COMPLETED:{code:"CHEERING",caption:"You practiced speaking today. That took courage."},
};

async function settings(){
 const rows=await prisma.gamificationSetting.findMany({where:{scopeKey:"GLOBAL",key:{in:["mascot.enabled","mascot.cooldownMinutes","mascot.dailyLimit"]}}});
 const map=new Map(rows.map(r=>[r.key,r.value]));
 const number=(key:string,fallback:number)=>{const n=Number(map.get(key)??fallback);return Number.isFinite(n)?Math.max(1,n):fallback};
 return {enabled:(map.get("mascot.enabled")??"true")==="true",cooldownMinutes:number("mascot.cooldownMinutes",20),dailyLimit:number("mascot.dailyLimit",3)};
}

/** Called only after an append-only learning event is successfully stored. */
export async function maybeCreateMascotReaction(studentId:string,eventId:string,eventType:string){
 const reaction=REACTIONS[eventType];if(!reaction)return false;
 const config=await settings();if(!config.enabled)return false;
 const now=new Date();const startOfDay=new Date(now);startOfDay.setUTCHours(0,0,0,0);
 const [todayCount,recent]=await Promise.all([
  prisma.mascotReactionLog.count({where:{studentId,createdAt:{gte:startOfDay}}}),
  prisma.mascotReactionLog.findFirst({where:{studentId,createdAt:{gte:new Date(now.getTime()-config.cooldownMinutes*60_000)}},select:{id:true}}),
 ]);
 if(todayCount>=config.dailyLimit||recent)return false;
 try{await prisma.mascotReactionLog.create({data:{studentId,sourceEventId:eventId,reactionCode:reaction.code,caption:reaction.caption}});return true}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return false;throw error}
}

/** Return each stored reaction to the learner at most once. */
export async function takePendingMascotReaction(studentId:string){
 const row=await prisma.mascotReactionLog.findFirst({where:{studentId,displayedAt:null,createdAt:{gte:new Date(Date.now()-24*60*60_000)}},orderBy:{createdAt:"desc"},select:{id:true,reactionCode:true,caption:true}});
 if(!row)return null;
 const claimed=await prisma.mascotReactionLog.updateMany({where:{id:row.id,displayedAt:null},data:{displayedAt:new Date()}});
 return claimed.count===1?{reactionCode:row.reactionCode,caption:row.caption}:null;
}
