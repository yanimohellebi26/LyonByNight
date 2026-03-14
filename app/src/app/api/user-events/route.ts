import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const CreateEventSchema = z.object({
  titre: z.string().min(2).max(200),
  description: z.string().max(2000).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure_debut: z.string().regex(/^\d{2}:\d{2}$/),
  heure_fin: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.enum([
    "concert", "dj_set", "soiree_theme", "quiz",
    "cultural", "student", "erasmus", "scientific",
    "theater", "festival", "expo", "workshop", "sport", "autre",
  ]),
  prix_entree: z.string().max(50).optional(),
  image: z.string().url().optional(),
  lieu_id: z.string().uuid().optional(),
  lieu_custom_nom: z.string().max(200).optional(),
  lieu_custom_adresse: z.string().max(500).optional(),
  lieu_custom_lat: z.number().min(-90).max(90).optional(),
  lieu_custom_lng: z.number().min(-180).max(180).optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

// GET /api/user-events — list current user's events
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("user_events")
    .select("*, lieux(nom, slug, old_id)")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

// POST /api/user-events — create a new event
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

  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: event, error } = await supabase
    .from("user_events")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: event }, { status: 201 });
}
