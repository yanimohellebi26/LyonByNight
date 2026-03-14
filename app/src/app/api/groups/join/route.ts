import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const JoinSchema = z.object({
  invite_code: z.string().min(1).max(20),
});

// POST /api/groups/join — join a group via invite code
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = JoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid invite code" },
      { status: 400 }
    );
  }

  // Find group by invite code
  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id, nom, emoji")
    .eq("invite_code", parsed.data.invite_code.toUpperCase())
    .single();

  if (groupErr || !group) {
    return NextResponse.json(
      { success: false, error: "Invalid invite code" },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: true, data: group, already_member: true }
    );
  }

  // Join as member
  const { error: joinErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" });

  if (joinErr) {
    return NextResponse.json(
      { success: false, error: joinErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, data: group, already_member: false },
    { status: 201 }
  );
}
