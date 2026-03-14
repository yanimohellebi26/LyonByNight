import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const UpdateEventSchema = z.object({
  titre: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  heure_debut: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  heure_fin: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  type: z.enum([
    "concert", "dj_set", "soiree_theme", "quiz",
    "cultural", "student", "erasmus", "scientific",
    "theater", "festival", "expo", "workshop", "sport", "autre",
  ]).optional(),
  prix_entree: z.string().max(50).nullable().optional(),
  image: z.string().url().nullable().optional(),
  lieu_id: z.string().uuid().nullable().optional(),
  lieu_custom_nom: z.string().max(200).nullable().optional(),
  lieu_custom_adresse: z.string().max(500).nullable().optional(),
  lieu_custom_lat: z.number().min(-90).max(90).nullable().optional(),
  lieu_custom_lng: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
});

// GET /api/user-events/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_events")
    .select("*, lieux(nom, slug, old_id)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: "Event not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

// PUT /api/user-events/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_events")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

// DELETE /api/user-events/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    .from("user_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
