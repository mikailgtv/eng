import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createStudentCoursePreview } from "@/lib/learning/level-service";

const schema=z.object({courseId:z.string().min(1)}).strict();
interface Ctx {params:{studentId:string}}
export const POST=apiRoute<Ctx>(async(req,ctx)=>{
 assertSameOrigin(req);
 const viewer=await requireApiUser(["TEACHER","ADMIN"]);
 const {courseId}=schema.parse(await parseJsonBody(req));
 return jsonOk(await createStudentCoursePreview(viewer,ctx.params.studentId,courseId),201);
});
