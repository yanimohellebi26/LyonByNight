import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const VoteSchema = z.object({
  vote: z.enum(["interested", "maybe", "not_interested"]),
});

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

// POST /api/groups/[id]/events/[eventId]/vote — cast or update a vote
export async function POST(request: NextRequest, { params }: Params) {
  const { id: groupId, eventId: groupEventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { success: false, error: "Not a member" },
      { status: 403 }
    );
  }

  // Verify group_event belongs to this group
  const { data: groupEvent } = await supabase
    .from("group_events")
    .select("id")
    .eq("id", groupEventId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!groupEvent) {
    return NextResponse.json(
      { success: false, error: "Event not found in group" },
      { status: 404 }
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

  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid vote" },
      { status: 400 }
    );
  }

  // Upsert vote (insert or update)
  const { data: existing } = await supabase
    .from("event_votes")
    .select("id")
    .eq("group_event_id", groupEventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data: vote, error } = await supabase
      .from("event_votes")
      .update({ vote: parsed.data.vote, voted_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: vote });
  }

  const { data: vote, error } = await supabase
    .from("event_votes")
    .insert({
      group_event_id: groupEventId,
      user_id: user.id,
      vote: parsed.data.vote,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: vote }, { status: 201 });
}

// DELETE /api/groups/[id]/events/[eventId]/vote — remove vote
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { eventId: groupEventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("event_votes")
    .delete()
    .eq("group_event_id", groupEventId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
