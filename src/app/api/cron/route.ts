import { connection } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Daily Vercel cron (see vercel.json). It deletes rooms older than 24 h, which is a real query, so
// the free Supabase project is never paused for inactivity.
export async function GET(request: Request) {
  await connection();

  // Vercel sends this header when CRON_SECRET is set in the project settings.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { error } = await supabaseAdmin().rpc("delete_old_rooms");
  if (error) {
    console.error("[cron] delete_old_rooms error:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
