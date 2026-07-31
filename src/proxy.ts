import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY = ["/admin"];
const LEADER_UP = ["/appointments", "/reports"];

export async function proxy(request: NextRequest) {
  // Cookies the Supabase SDK wants refreshed (e.g. a rotated auth token) are
  // captured here rather than written straight to a response object, since
  // the actual response isn't built until the very end — see the comment
  // below on why headers and cookies can't both be applied eagerly.
  let pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies = cookiesToSet;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  function withCookies(response: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCookies(NextResponse.redirect(url));
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withCookies(NextResponse.redirect(url));
  }

  // Request headers set here are how the rest of the request (Server
  // Components, via next/headers) learns who's signed in. Without this,
  // every single page would repeat the auth.getUser() + profile lookup
  // this proxy just did, doubling the round-trips to Supabase on every
  // navigation — that redundant pair of network calls was the site-wide
  // slowness. getSession() in src/lib/session.ts reads these instead.
  const requestHeaders = new Headers(request.headers);

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return withCookies(NextResponse.redirect(url));
    }

    if (ADMIN_ONLY.some((p) => path.startsWith(p)) && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return withCookies(NextResponse.redirect(url));
    }

    if (
      LEADER_UP.some((p) => path.startsWith(p)) &&
      profile.role !== "admin" &&
      profile.role !== "team_leader" &&
      profile.role !== "showroom"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return withCookies(NextResponse.redirect(url));
    }

    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-full-name", profile.full_name);
    requestHeaders.set("x-user-username", profile.username);
    requestHeaders.set("x-user-role", profile.role);
    requestHeaders.set("x-user-status", profile.status);
  }

  return withCookies(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
