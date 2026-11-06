/**
 * Edge middleware — coarse, fast route protection.
 *
 * This is the FIRST layer only. The authoritative check always happens
 * server-side (lib/guards.ts for pages, requireApiUser for APIs), where the
 * session is re-validated against the database. This layer provides instant
 * redirects and keeps unauthenticated traffic away from app routes.
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "eb.session";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

async function getSessionPayload(req: NextRequest): Promise<{ sub: string; role?: string } | null> {
  const secret = process.env.SESSION_SECRET;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.sub) return null;
    return { sub: payload.sub, role: typeof payload.role === "string" ? payload.role : undefined };
  } catch {
    return null;
  }
}

function redirectTo(req: NextRequest, pathname: string, search?: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = search ?? "";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");
  const session = await getSessionPayload(req);

  // --- Unauthenticated -----------------------------------------------------
  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "You need to sign in to continue." }, { status: 401 });
    }
    if (pathname === "/login") return NextResponse.next();
    return redirectTo(req, "/login", `?next=${encodeURIComponent(pathname)}`);
  }

  // --- Authenticated: keep them away from the login page --------------------
  if (pathname === "/login") {
    return redirectTo(req, ROLE_HOME[session.role ?? ""] ?? "/dashboard");
  }

  // /dashboard is a role-neutral alias → send each role to its own home.
  if (pathname === "/dashboard") {
    return redirectTo(req, ROLE_HOME[session.role ?? ""] ?? "/login");
  }

  // --- Role-based route protection ------------------------------------------
  const unauthorized = () =>
    isApi
      ? NextResponse.json({ error: "You do not have permission to access this resource." }, { status: 403 })
      : redirectTo(req, "/unauthorized");

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") return unauthorized();
  if (pathname.startsWith("/teacher") && session.role !== "TEACHER" && session.role !== "ADMIN") {
    return unauthorized();
  }
  if (pathname.startsWith("/student") && session.role !== "STUDENT" && session.role !== "ADMIN") {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/dashboard",
    "/notifications",
    "/login",
    "/api/users/:path*",
    "/api/groups/:path*",
    "/api/lessons/:path*",
    "/api/activities/:path*",
    "/api/practice/:path*",
    "/api/vocabulary/:path*",
    "/api/assessments/:path*",
    "/api/questions/:path*",
    "/api/results/:path*",
    "/api/teaching/:path*",
    "/api/notifications/:path*",
    "/api/communication/:path*",
    "/api/messages/:path*",
    "/api/ai/:path*",
    "/api/voice/:path*",
    "/api/adaptive/:path*",
    "/api/gamification/:path*",
    "/api/certificates/:path*",
    "/api/content/:path*",
    "/api/admin/:path*",
    "/api/organizations/:path*",
    "/api/departments/:path*",
    "/api/teams/:path*",
    "/api/roles/:path*",
    "/api/permissions/:path*",
    "/api/sessions/:path*",
    "/api/security/:path*",
    "/api/access-reviews/:path*",
    "/api/delegations/:path*",
    "/account/:path*",
  ],
};
