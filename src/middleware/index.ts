import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server";

const PUBLIC_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/reset",
  "/auth/update-password",
  "/api/auth/session",
  "/api/auth/logout",
]);

const AUTH_ONLY_PATH_PREFIXES = ["/dashboard", "/notes", "/plans"];
const LOGIN_REDIRECT_PATH = "/dashboard";
const AUTH_REDIRECT_PATHS = new Set(["/auth/login", "/auth/register"]);

const shouldEnforceAuth = import.meta.env.VITE_AUTH_ENFORCED === "true";

const isProtectedPath = (pathname: string) =>
  AUTH_ONLY_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const onRequest = defineMiddleware(async ({ locals, cookies, request, redirect, url }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  locals.session = session ?? null;
  locals.user = session?.user ?? null;

  const { pathname } = url;

  if (locals.user && AUTH_REDIRECT_PATHS.has(pathname)) {
    return redirect(LOGIN_REDIRECT_PATH);
  }

  if (!locals.user && shouldEnforceAuth && isProtectedPath(pathname)) {
    return redirect("/auth/login");
  }

  if (!locals.user && PUBLIC_PATHS.has(pathname)) {
    return next();
  }

  return next();
});
