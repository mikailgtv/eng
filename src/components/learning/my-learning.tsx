import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronRight, LockKeyhole, PlayCircle, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import type { CourseOverview, LearningSummary, LessonRef, ModuleRef } from "@/types/learning";
import { cn } from "@/lib/utils";

/** Student learning map derived from published, assigned database content. */
export function MyLearning({ learning }: { learning: LearningSummary }) {
  if (learning.courses.length === 0) {
    return <Card><EmptyState icon={BookOpen} title="No level-based course is available yet." description="Your assigned level or course will appear here after your teacher sets it." className="py-14" /></Card>;
  }
  return <div className="space-y-9">{learning.courses.map((course) => <CourseSection key={course.id} course={course} recommendedId={learning.continueLearning?.current.id ?? null} />)}</div>;
}

function CourseSection({ course, recommendedId }: { course: CourseOverview; recommendedId: string | null }) {
  return <section aria-labelledby={`course-${course.id}`}>
    <Card className="mb-5 overflow-hidden">
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">{course.level.displayName}</span>
              {course.isDemo && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Demo curriculum · original content</span>}
            </div>
            <h2 id={`course-${course.id}`} className="text-lg font-semibold tracking-tight text-foreground">{course.title}</h2>
            {course.description && <p className="mt-1 max-w-2xl text-sm text-muted">{course.description}</p>}
            <p className="mt-2 text-xs text-muted">{course.completedLessons} of {course.totalLessons} lessons completed · {course.modules.length} units</p>
          </div>
          {course.totalLessons > 0 && course.completedLessons === course.totalLessons && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden/>Course completed</span>}
        </div>
        {course.totalLessons > 0 && <ProgressBar value={course.percent} label="Course progress" size="lg" className="mt-4" />}
      </CardBody>
    </Card>
    <div className="space-y-7">{course.modules.map((module, mi) => <ModulePath key={module.id} module={module} index={mi+1} recommendedId={recommendedId}/>)}</div>
  </section>;
}

function ModulePath({module,index,recommendedId}:{module:ModuleRef;index:number;recommendedId:string|null}) {
  const completed=module.lessons.filter(l=>l.progress==="COMPLETED").length;
  return <section aria-labelledby={`unit-${module.id}`}>
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-lg shadow-sm">🔥</span>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">UNIT {String(index).padStart(2,"0")}</p><h3 id={`unit-${module.id}`} className="font-semibold">{module.title}</h3>{module.description&&<p className="mt-0.5 text-xs text-muted">{module.description}</p>}</div>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-muted">{completed}/{module.lessons.length}</span>
    </div>
    <ol className="relative ml-5 space-y-3 border-l-2 border-dashed border-primary/20 pl-5 sm:ml-8 sm:pl-8" aria-label={`${module.title} learning path`}>
      {module.lessons.map((lesson,i)=><LessonNode key={lesson.id} lesson={lesson} index={i} recommended={lesson.id===recommendedId&&!lesson.lockedReason}/>)}
    </ol>
  </section>;
}

function LessonNode({lesson,index,recommended}:{lesson:LessonRef;index:number;recommended:boolean}) {
  const locked=Boolean(lesson.lockedReason),completed=lesson.progress==="COMPLETED",inProgress=lesson.progress==="IN_PROGRESS";
  const icon=lesson.primarySkill?.toLowerCase().includes("listen")?"🎧":lesson.primarySkill?.toLowerCase().includes("speak")?"🎙️":lesson.primarySkill?.toLowerCase().includes("write")?"✍️":lesson.primarySkill?.toLowerCase().includes("grammar")?"🧩":lesson.primarySkill?.toLowerCase().includes("vocab")?"📖":"✨";
  const card=<div className={cn("relative rounded-2xl border p-3.5 transition sm:p-4",completed?"border-emerald-200 bg-emerald-50/65":locked?"border-border bg-slate-50 opacity-80":recommended?"border-primary/30 bg-primary-subtle/50 shadow-sm":"border-border bg-white hover:border-primary/25 hover:shadow-sm")}>
    <div className="flex items-start gap-3"><span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg",completed?"bg-emerald-100":locked?"bg-slate-200":"bg-white shadow-sm")}>{locked?<LockKeyhole className="h-5 w-5 text-muted" aria-hidden/>:completed?<CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden/>:icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{lesson.title}</h4>{recommended&&<span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white"><Sparkles className="h-3 w-3"/>Next</span>}{completed&&<span className="text-[10px] font-bold text-emerald-700">COMPLETED</span>}{inProgress&&!locked&&<span className="text-[10px] font-bold text-blue-700">IN PROGRESS</span>}</div><p className="mt-1 text-xs text-muted">{lesson.primarySkill??"Lesson"}{lesson.durationMin?` · ${lesson.durationMin} min`:""}</p>{lesson.lockedReason&&<p className="mt-2 text-xs font-medium text-amber-800">🔒 {lesson.lockedReason}</p>}</div></div>
    {!locked&&<div className="mt-3 flex justify-end"><Link href={`/student/learn/${lesson.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:opacity-90">{completed?"Review":"Start"}<ChevronRight className="h-3.5 w-3.5" aria-hidden/></Link></div>}
  </div>;
  return <li className="relative list-none"><span aria-hidden className={cn("absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white ring-2 sm:-left-[43px]",completed?"bg-emerald-500 ring-emerald-200":locked?"bg-slate-400 ring-slate-200":recommended?"bg-primary ring-primary/20":"bg-cyan-500 ring-cyan-100")}/><div className={cn(index%2===0?"sm:ml-0 sm:mr-5":"sm:ml-5 sm:mr-0")}>{locked?<div aria-disabled="true">{card}</div>:<div>{card}</div>}</div></li>;
}

export function MyLearningHeader({currentLevel,targetLevel}:{currentLevel:string|null;targetLevel:string|null}) {
  return <header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">{currentLevel?`Current level · ${currentLevel}`:"Level not assigned yet."}</span>{targetLevel&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Goal · {targetLevel}</span>}</div><h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Your learning path</h1><p className="mt-1 text-sm text-muted">Follow each unit, lesson and practice step. Your progress is saved to your account.</p></div><Link href="/student"><Button variant="secondary" size="sm">Home</Button></Link></header>;
}
