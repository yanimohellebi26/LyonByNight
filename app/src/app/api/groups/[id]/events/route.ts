import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const AddEventSchema = z.object({
  evenement_id: z.string().uuid().optional(),
  user_event_id: z.string().uuid().optional(),
  note: z.string().max(500).default(""),
}).refine(
  (d) => d.evenement_id || d.user_event_id,
  { message: "Must provide evenement_id or user_event_id" }
);

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/events — add an event to the group
export async function POST(request: NextRequest, { params }: Params) {
  const { id: groupId } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = AddEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: groupEvent, error } = await supabase
    .from("group_events")
    .insert({
      group_id: groupId,
      added_by: user.id,
      evenement_id: parsed.data.evenement_id ?? null,
      user_event_id: parsed.data.user_event_id ?? null,
      note: parsed.data.note,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: groupEvent }, { status: 201 });
}
