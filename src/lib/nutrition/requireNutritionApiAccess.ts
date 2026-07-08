import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";

export type NutritionApiAccess =
  | { kind: "user"; userId: string }
  | { kind: "guest" };

/** Signed-in Supabase user required (guests cannot sync FatSecret profiles yet). */
export async function requireNutritionUser(): Promise<{ userId: string } | null> {
  const access = await requireNutritionApiAccess();
  if (!access || access.kind !== "user") return null;
  return { userId: access.userId };
}

/** App session required for nutrition API routes (signed-in or guest). */
export async function requireNutritionApiAccess(): Promise<NutritionApiAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { kind: "user", userId: user.id };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(GUEST_COOKIE_NAME)?.value === "1") {
    return { kind: "guest" };
  }

  return null;
}
