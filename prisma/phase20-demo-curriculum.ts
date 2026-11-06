import type { PrismaClient } from "@prisma/client";
import { multipleChoiceConfig } from "../src/lib/activities/schemas";

const SAMPLE = [
  {
    code: "EB-DEMO-A1",
    title: "DEMO CURRICULUM · A1 Everyday Communication",
    description: "Original, short A1 sample lessons. This is staging curriculum content, not a commercial textbook.",
    levelCode: "A1",
    module: "Everyday introductions",
    lessons: [
      { title: "Introduce yourself", description: "Share your name and where you are from.", objective: "Use a simple introduction with I am and My name is.", example: "Hello. My name is Lina. I am from Lyon.", question: "Which sentence introduces yourself?", options: ["My name is Lina.", "Your name are Lina.", "Name Lina my."], answer: 0, vocabulary: [["introduce","معرفی کردن"],["from","از"],["name","نام"]] },
      { title: "Ask a friendly question", description: "Ask another person for their name and how they are.", objective: "Ask What's your name? and How are you?", example: "What is your name? — My name is Jules.", question: "Choose the natural question.", options: ["How are you?","How you is?","You how are?"], answer: 0, vocabulary: [["friendly","دوستانه"],["today","امروز"],["well","خوب"]] },
    ],
  },
  {
    code: "EB-DEMO-A2",
    title: "DEMO CURRICULUM · A2 Everyday Work",
    description: "Original, short A2 sample lessons for routine workplace communication. No book text is copied.",
    levelCode: "A2",
    module: "Clear workplace exchanges",
    lessons: [
      { title: "Ask someone to repeat", description: "Use a polite phrase when you miss information.", objective: "Ask for repetition with could and please.", example: "Could you repeat the room number, please?", question: "Which phrase is a polite request?", options: ["Could you repeat that, please?","Repeat now.","You repeat."], answer: 0, vocabulary: [["repeat","تکرار کردن"],["please","لطفاً"],["number","شماره"]] },
      { title: "Give a short update", description: "Share one completed task and one next step.", objective: "Use the past simple for a completed task and a clear next action.", example: "I checked the list. Next, I will call the team.", question: "What signals the next step?", options: ["Next, I will…","Yesterday I did…","At the moment…"], answer: 0, vocabulary: [["checked","بررسی کرد"],["next","بعدی"],["team","گروه"]] },
    ],
  },
  {
    code: "EB-DEMO-B1",
    title: "DEMO CURRICULUM · B1 Team Communication",
    description: "Original, short B1 sample lessons focused on clear, respectful team updates.",
    levelCode: "B1",
    module: "Team updates and explanations",
    lessons: [
      { title: "Explain a change of plan", description: "Give the reason for a change and state the next action.", objective: "Connect a reason and response using because and so.", example: "The room is in use, so we will meet in the training area instead.", question: "Which connector introduces a reason?", options: ["because","instead","next"], answer: 0, vocabulary: [["instead","در عوض"],["available","در دسترس"],["schedule","برنامه"]] },
      { title: "Report a safety concern clearly", description: "State what you observed and what action is needed without blame.", objective: "Describe an observation and make a calm, specific request.", example: "The west exit is blocked. Please keep the area clear while we report it.", question: "Which report is specific and neutral?", options: ["The west exit is blocked. Please keep it clear.","Someone is always careless.","This is bad."], answer: 0, vocabulary: [["exit","خروجی"],["blocked","مسدود"],["report","گزارش کردن"]] },
    ],
  },
] as const;

export async function seedPhase20DemoCurriculum(prisma: PrismaClient) {
  await prisma.level.updateMany({ where: { organizationId: null }, data: { status: "ACTIVE" } });
  const organization = await prisma.organization.findFirst({ where: { status: "ACTIVE" }, select: { id: true } });
  const curriculumTitle = "DEMO CURRICULUM · Original English Foundations";
  let curriculum = await prisma.curriculum.findFirst({ where: { title: curriculumTitle, status: { not: "ARCHIVED" } } });
  if (!curriculum) curriculum = await prisma.curriculum.create({ data: { title: curriculumTitle, description: "Small original staging curriculum used to exercise level access, lesson progress, practice, and future book mapping.", levelCode: "MULTI_LEVEL", status: "ACTIVE", isDemo: true } });
  else if (!curriculum.isDemo || curriculum.status !== "ACTIVE") curriculum = await prisma.curriculum.update({ where: { id: curriculum.id }, data: { isDemo: true, status: "ACTIVE" } });

  const courseIds = new Map<string, string>();
  const allCourses = await prisma.course.findMany({ where: { code: { in: ["EN-STARTER-PREA1", ...SAMPLE.map(x=>x.code)] } }, select: { id:true,code:true } });
  for (const row of allCourses) courseIds.set(row.code,row.id);
  const preA1 = courseIds.get("EN-STARTER-PREA1");
  if (preA1) await prisma.course.update({ where: { id: preA1 }, data: { curriculumId: curriculum.id, courseType: "GENERAL_ENGLISH" } });

  for (const item of SAMPLE) {
    let course = await prisma.course.findUnique({ where: { code: item.code }, select: { id: true } });
    if (!course) {
      const level = await prisma.level.findUnique({ where: { code: item.levelCode }, select: { id: true } });
      if (!level) throw new Error(`Missing level ${item.levelCode}`);
      course = await prisma.course.create({
        data: {
          code: item.code, title: item.title, description: item.description, levelId: level.id,
          status: "PUBLISHED", courseType: "GENERAL_ENGLISH", curriculumId: curriculum.id,
          completionRule: "VIEW_AND_REQUIRED_ACTIVITIES",
          modules: { create: [{
            title: item.module, description: `An original ${item.levelCode} demo unit.`, order: 1, status: "PUBLISHED",
            lessons: { create: item.lessons.map((lesson, index) => ({
              title: lesson.title, description: lesson.description, objectives: JSON.stringify([lesson.objective]),
              durationMin: 5, order: index + 1, status: "PUBLISHED", primarySkill: "vocabulary",
              blocks: { create: [
                { type: "HEADING", order: 1, data: JSON.stringify({ type:"HEADING", text: lesson.title, level: 2 }) },
                { type: "TEXT", order: 2, data: JSON.stringify({ type:"TEXT", text: lesson.description }) },
                { type: "EXAMPLE", order: 3, data: JSON.stringify({ type:"EXAMPLE", intro:"Original example", items:[{text:lesson.example}] }) },
                { type: "TIP", order: 4, data: JSON.stringify({ type:"TIP", text:"Read the example aloud. Focus on clear, friendly communication." }) },
              ] },
              vocabulary: { create: lesson.vocabulary.map(([word,translation], vi)=>({word,translation,order:vi+1,levelCode:item.levelCode,exampleSentence:lesson.example})) },
            })) },
          }] },
        }, select: { id: true },
      });
    }
    courseIds.set(item.code,course.id);
    const groups = await prisma.learningGroup.findMany({ select: { id:true } });
    for (const group of groups) await prisma.courseAssignment.upsert({
      where: { courseId_groupId: { courseId: course.id, groupId: group.id } },
      create: { courseId: course.id, groupId: group.id }, update: {},
    });
    const lessons = await prisma.lesson.findMany({ where: { module: { courseId: course.id }, status: "PUBLISHED" }, orderBy: { order:"asc" }, select: { id:true,title:true } });
    for (const [index, lesson] of lessons.entries()) {
      const source = item.lessons[index];
      const configuration = multipleChoiceConfig.parse({
        question: source.question,
        options: source.options.map((text, i)=>({id:`${item.code.toLowerCase()}-o${i+1}`,text})),
        correctOptionId: `${item.code.toLowerCase()}-o${source.answer+1}`,
        explanation: "This is an original staging exercise. Review the lesson example and try again.",
      });
      const title = `${source.title} · Quick practice`;
      const existing = await prisma.activity.findFirst({ where: { lessonId: lesson.id, title }, select: { id:true } });
      if (existing) await prisma.activity.update({ where: { id:existing.id }, data: { configuration: JSON.stringify(configuration), status:"PUBLISHED", required:true } });
      else await prisma.activity.create({ data: { lessonId:lesson.id, type:"MULTIPLE_CHOICE", title, instructions:"Choose the most natural answer.", order:1, points:10, required:true, status:"PUBLISHED", configuration:JSON.stringify(configuration) } });
    }
  }

  // Create one original, clearly labeled Demo Book structure mapped to existing LMS records.
  const bookTitle = "DEMO BOOK · Demo Beginner English";
  let book = await prisma.book.findFirst({ where: { title: bookTitle, organizationId: organization?.id ?? null } });
  if (!book) book = await prisma.book.create({ data: {
    organizationId: organization?.id ?? null, title: bookTitle, author: "EnglishBridge Learning Team",
    publisher: "EnglishBridge · Original Demo Material", edition: "1.0", language: "en", levelCode: "PRE_A1",
    description: "A non-commercial, original demo structure for testing book-to-course mapping. Not a commercial textbook.", status: "ACTIVE",
  } });
  const firstCourse = preA1 ? await prisma.course.findUnique({ where:{id:preA1}, include:{modules:{where:{status:"PUBLISHED"},orderBy:{order:"asc"},include:{lessons:{where:{status:"PUBLISHED"},orderBy:{order:"asc"},include:{activities:{where:{status:"PUBLISHED"},orderBy:{order:"asc"}}}}}}} }) : null;
  if (firstCourse?.modules[0]) {
    const mod = firstCourse.modules[0];
    let unit = await prisma.unit.findFirst({ where:{moduleId:mod.id, title:"Basic Greetings · Demo Book Unit 1"}, select:{id:true} });
    if (!unit) unit = await prisma.unit.create({ data:{moduleId:mod.id,title:"Basic Greetings · Demo Book Unit 1",description:"An original starter unit mapped to the first Pre-A1 module.",goal:"Use simple greetings and introductions.",order:1,status:"PUBLISHED"},select:{id:true} });
    await prisma.lesson.updateMany({where:{moduleId:mod.id,unitId:null},data:{unitId:unit.id}});
    const upsertNode = async (parentId:string|null,nodeType:string,title:string,sortOrder:number,mapping:Record<string,string|null>={}) => {
      const found=await prisma.bookContentNode.findFirst({where:{bookId:book!.id,nodeType,title},select:{id:true}});
      const data={bookId:book!.id,parentId,nodeType,title,sortOrder,status:"PUBLISHED",...mapping};
      return found?prisma.bookContentNode.update({where:{id:found.id},data}):prisma.bookContentNode.create({data});
    };
    const chapter=await upsertNode(null,"CHAPTER","Chapter 1 · First words",1);
    const bookUnit=await upsertNode(chapter.id,"UNIT","Unit 1 · Basic Greetings",1,{mappedModuleId:mod.id});
    for (const [li,lesson] of mod.lessons.entries()) {
      const lessonNode=await upsertNode(bookUnit.id,"LESSON",lesson.title,li+1,{mappedLessonId:lesson.id});
      for (const [ai,activity] of lesson.activities.entries()) await upsertNode(lessonNode.id,"EXERCISE",activity.title||`Practice ${ai+1}`,ai+1,{mappedActivityId:activity.id});
    }
    await prisma.bookVersion.upsert({ where:{bookId_version:{bookId:book.id,version:1}},create:{bookId:book.id,version:1,snapshot:JSON.stringify({bookTitle,courseId:firstCourse.id,moduleId:mod.id}),note:"Seeded original demo mapping"},update:{} });
  }

  // Ensure every existing student has a persisted profile without changing existing profiles.
  const students=await prisma.user.findMany({where:{role:"STUDENT",status:"ACTIVE",archivedAt:null},select:{id:true,englishLevel:true,organizationId:true,groupId:true,group:{select:{teacherId:true}}}});
  const codeToCourse=new Map<string,string>([["PRE_A1",preA1??""]]);
  for(const item of SAMPLE) codeToCourse.set(item.levelCode,courseIds.get(item.code)??"");
  const nextLevel:Record<string,string|null>={PRE_A1:"A1",A1:"A2",A2:"B1",B1:"B2",B2:"C1",C1:"C2",C2:null};
  for(const student of students){
    const existing=await prisma.studentLearningProfile.findUnique({where:{studentId:student.id},select:{studentId:true}});
    if(existing) continue;
    await prisma.studentLearningProfile.create({data:{
      studentId:student.id,organizationId:student.organizationId,levelStatus:student.englishLevel?"CONFIRMED":"UNCONFIRMED",
      targetLevelCode:student.englishLevel?nextLevel[student.englishLevel]??null:null,
      assignedTeacherId:student.group?.teacherId??null,assignedCourseId:student.englishLevel?codeToCourse.get(student.englishLevel)||null:null,
      learningPace:"STANDARD",dailyGoalMinutes:10,
    }});
  }
  return { curriculumId:curriculum.id, bookId:book.id, courses:[...courseIds.keys()] };
}
