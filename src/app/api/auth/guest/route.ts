import { NextResponse } from "next/server";
import {
  GUEST_COOKIE_MAX_AGE_SECONDS,
  GUEST_COOKIE_NAME,
} from "@/lib/auth/constants";

const COOKIE_OPTIONS = {
  name: GUEST_COOKIE_NAME,
  path: "/",
  sameSite: "lax" as const,
  // Not httpOnly - client-side store also reads this to render guest UI.
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
};

export async function POST() {
  const res = NextResponse.json({ ok: true, mode: "guest" });
  res.cookies.set({
    ...COOKIE_OPTIONS,
    value: "1",
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, mode: "anonymous" });
  res.cookies.set({
    ...COOKIE_OPTIONS,
    value: "",
    maxAge: 0,
  });
  return res;
}
