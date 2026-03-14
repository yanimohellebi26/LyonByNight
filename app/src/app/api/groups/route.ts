import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const CreateGroupSchema = z.object({
  nom: z.string().min(2).max(100),
  description: z.string().max(500).default(""),
  emoji: z.string().max(4).default("🎉"),
  privacy: z.enum(["public", "private"]).default("private"),
});

// GET /api/groups — list groups the user belongs to
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get group IDs where user is a member
  const { data: memberships, error: memErr } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (memErr) {
    return NextResponse.json(
      { success: false, error: memErr.message },
      { status: 500 }
    );
  }

  const groupIds = (memberships ?? []).map((m) => m.group_id);

  if (groupIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const { data: groups, error } = await supabase
    .from("groups")
    .select("*, group_members(count)")
    .in("id", groupIds)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (groups ?? []).map((g: any) => ({
    ...g,
    member_count: g.group_members?.[0]?.count ?? 0,
    group_members: undefined,
  }));

  return NextResponse.json({ success: true, data: enriched });
}

// POST /api/groups — create a new group
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

  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ ...parsed.data, owner_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  // Owner is auto-added as admin via trigger
  return NextResponse.json({ success: true, data: group }, { status: 201 });
}
