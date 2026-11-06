import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
  }
}

function uniqueConstraintMessage(err: Prisma.PrismaClientKnownRequestError): string {
  const targets = (err.meta?.target as string[] | undefined) ?? [];
  if (targets.includes("username")) return "That username is already taken.";
  if (targets.includes("email")) return "That email address is already in use.";
  if (targets.includes("employeeCode")) return "That employee code is already registered.";
  if (targets.includes("name")) return "A group with that name already exists.";
  return "That value is already in use.";
}

/** Converts expected application errors to safe responses; unexpected details stay server-side. */
export function handleApiError(err: unknown, requestId: string = randomUUID()): NextResponse {
  let status = 500;
  let errorCode = "INTERNAL_ERROR";
  let message = "Something went wrong on our side. Please try again.";
  let fieldErrors: Record<string, string[]> | undefined;
  if (err instanceof ApiError) {
    status = err.status;
    errorCode = `HTTP_${err.status}`;
    message = err.message;
    fieldErrors = err.fieldErrors;
  } else if (err instanceof ZodError) {
    status = 422;
    errorCode = "VALIDATION_ERROR";
    message = "Please check the highlighted fields.";
    fieldErrors = err.flatten().fieldErrors as Record<string, string[]>;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    status = 409;
    errorCode = "DUPLICATE_RECORD";
    message = uniqueConstraintMessage(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    status = 404;
    errorCode = "RECORD_NOT_FOUND";
    message = "The requested record no longer exists.";
  } else {
    const errorType = err instanceof Error ? err.name : "UnknownError";
    console.error(JSON.stringify({ level: "error", event: "api.unhandled", requestId, errorType }));
  }
  return NextResponse.json(
    { success: false, error: message, errorCode, requestId, ...(fieldErrors ? { fieldErrors } : {}) },
    { status, headers: { "x-request-id": requestId } }
  );
}
