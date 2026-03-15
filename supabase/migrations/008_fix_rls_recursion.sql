-- ============================================================
-- Migration 008: Fix infinite recursion in group_members RLS
-- ============================================================
-- Problem: Policies on group_members query group_members itself,
-- causing infinite recursion. Fix: use SECURITY DEFINER functions
-- that bypass RLS for membership checks.

-- ── Helper functions (bypass RLS) ─────────────────────────────

CREATE OR REPLACE FUNCTION get_user_group_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT group_id FROM group_members WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Drop existing policies that cause recursion ───────────────

DROP POLICY IF EXISTS "Members read group_members" ON group_members;
DROP POLICY IF EXISTS "Admin remove members" ON group_members;

DROP POLICY IF EXISTS "Public groups readable" ON groups;

DROP POLICY IF EXISTS "Members read group_events" ON group_events;
DROP POLICY IF EXISTS "Members add group_events" ON group_events;
DROP POLICY IF EXISTS "Adder or admin delete group_events" ON group_events;

DROP POLICY IF EXISTS "Members read votes" ON event_votes;
DROP POLICY IF EXISTS "Members cast vote" ON event_votes;

-- ── Recreate policies using helper functions ──────────────────

-- Groups: use function instead of subquery
CREATE POLICY "Public groups readable"
  ON groups FOR SELECT
  USING (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR id IN (SELECT get_user_group_ids(auth.uid()))
  );

-- Group members: use function to avoid self-reference
CREATE POLICY "Members read group_members"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT get_user_group_ids(auth.uid()))
  );

CREATE POLICY "Admin remove members"
  ON group_members FOR DELETE
  USING (
    is_group_admin(group_id, auth.uid())
  );

-- Group events: use function
CREATE POLICY "Members read group_events"
  ON group_events FOR SELECT
  USING (
    group_id IN (SELECT get_user_group_ids(auth.uid()))
  );

CREATE POLICY "Members add group_events"
  ON group_events FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND group_id IN (SELECT get_user_group_ids(auth.uid()))
  );

CREATE POLICY "Adder or admin delete group_events"
  ON group_events FOR DELETE
  USING (
    auth.uid() = added_by
    OR is_group_admin(group_id, auth.uid())
  );

-- Event votes: use function
CREATE POLICY "Members read votes"
  ON event_votes FOR SELECT
  USING (
    group_event_id IN (
      SELECT ge.id FROM group_events ge
      WHERE ge.group_id IN (SELECT get_user_group_ids(auth.uid()))
    )
  );

CREATE POLICY "Members cast vote"
  ON event_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_event_id IN (
      SELECT ge.id FROM group_events ge
      WHERE ge.group_id IN (SELECT get_user_group_ids(auth.uid()))
    )
  );
