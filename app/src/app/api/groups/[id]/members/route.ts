import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

// DELETE /api/groups/[id]/members?user_id=xxx — leave group or admin removes member
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const targetUserId = request.nextUrl.searchParams.get("user_id") ?? user.id;

  // If removing someone else, verify admin role
  if (targetUserId !== user.id) {
    const { data: myMembership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (myMembership?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can remove members" },
        { status: 403 }
      );
    }
  }

  // Prevent owner from leaving (they must delete the group instead)
  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (group?.owner_id === targetUserId) {
    return NextResponse.json(
      { success: false, error: "Owner cannot leave. Delete the group instead." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
