import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const UpdateGroupSchema = z.object({
  nom: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  emoji: z.string().max(4).optional(),
  privacy: z.enum(["public", "private"]).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id] — group detail with members and events
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Fetch group (RLS will enforce membership check)
  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !group) {
    return NextResponse.json(
      { success: false, error: "Group not found" },
      { status: 404 }
    );
  }

  // Fetch members with profile info
  const { data: members } = await supabase
    .from("group_members")
    .select("*, profiles(display_name, avatar_url)")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedMembers = (members ?? []).map((m: any) => ({
    id: m.id,
    group_id: m.group_id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    display_name: m.profiles?.display_name ?? "Unknown",
    avatar_url: m.profiles?.avatar_url ?? null,
  }));

  // Fetch group events with votes
  const { data: groupEvents } = await supabase
    .from("group_events")
    .select("*, evenements(*, lieux(nom, old_id)), user_events(*, lieux(nom, old_id)), event_votes(*)")
    .eq("group_id", id)
    .order("added_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedEvents = (groupEvents ?? []).map((ge: any) => {
    const evt = ge.evenements ?? ge.user_events;
    const votes = ge.event_votes ?? [];

    const summary = {
      interested: votes.filter((v: { vote: string }) => v.vote === "interested").length,
      maybe: votes.filter((v: { vote: string }) => v.vote === "maybe").length,
      not_interested: votes.filter((v: { vote: string }) => v.vote === "not_interested").length,
      total: votes.length,
    };

    return {
      id: ge.id,
      group_id: ge.group_id,
      added_by: ge.added_by,
      evenement_id: ge.evenement_id,
      user_event_id: ge.user_event_id,
      note: ge.note,
      added_at: ge.added_at,
      event: evt
        ? {
            id: evt.old_id ?? evt.id,
            titre: evt.titre ?? "",
            description: evt.description ?? "",
            date: evt.date ?? "",
            heure_debut: evt.heure_debut ?? "",
            heure_fin: evt.heure_fin ?? undefined,
            type: evt.type ?? "autre",
            prix_entree: evt.prix_entree ?? undefined,
            image: evt.image ?? undefined,
            lieu_nom: evt.lieu_nom ?? evt.lieux?.nom ?? undefined,
            lieu_id: evt.lieux?.old_id ?? evt.lieu_id ?? "",
            source: evt.source ?? undefined,
            url: evt.url ?? undefined,
          }
        : null,
      votes,
      vote_summary: summary,
      my_vote: votes.find((v: { user_id: string }) => v.user_id === user.id)?.vote ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      ...group,
      members: enrichedMembers,
      events: enrichedEvents,
      is_owner: group.owner_id === user.id,
      my_role: enrichedMembers.find((m: { user_id: string }) => m.user_id === user.id)?.role ?? null,
    },
  });
}

// PUT /api/groups/[id] — update group (owner only)
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
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

  const parsed = UpdateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: group, error } = await supabase
    .from("groups")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error || !group) {
    return NextResponse.json(
      { success: false, error: "Not found or not authorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: group });
}

// DELETE /api/groups/[id] — delete group (owner only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
