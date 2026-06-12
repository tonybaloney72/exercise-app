import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { error: deleteError } = await supabase.rpc("delete_own_account");

  if (deleteError) {
    console.error("[delete-account] rpc", deleteError);
    return NextResponse.json(
      { error: "Could not delete account. Please try again." },
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
