import { NextResponse } from "next/server";
import { buildAppVersionPayload } from "@/lib/appVersion";

export async function GET() {
  return NextResponse.json(buildAppVersionPayload(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
