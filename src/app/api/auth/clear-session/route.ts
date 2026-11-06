import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/** Clears a stale cookie and returns to the sign-in page. Safe to call without a session. */
export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
