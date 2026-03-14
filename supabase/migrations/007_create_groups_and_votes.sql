-- ============================================================
-- Migration 007: Groups, members, shared events & votes
-- ============================================================

-- ── Groups ──────────────────────────────────────────────────

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎉',
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private')),

  -- Invite system: 8-char alphanumeric code
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_owner ON groups (owner_id);
CREATE INDEX idx_groups_invite_code ON groups (invite_code);

-- ── Group members ───────────────────────────────────────────

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_group_members_user ON group_members (user_id);

-- ── Group events (shared events within a group) ────────────

CREATE TABLE group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Link to either a scraped event or a user-created event
  evenement_id UUID REFERENCES evenements(id) ON DELETE CASCADE,
  user_event_id UUID REFERENCES user_events(id) ON DELETE CASCADE,

  note TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one event reference must be set
  CONSTRAINT group_event_has_ref CHECK (
    evenement_id IS NOT NULL OR user_event_id IS NOT NULL
  )
);

CREATE INDEX idx_group_events_group ON group_events (group_id);

-- ── Event votes ─────────────────────────────────────────────

CREATE TABLE event_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('interested', 'maybe', 'not_interested')),
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_event_id, user_id)
);

CREATE INDEX idx_event_votes_group_event ON event_votes (group_event_id);
CREATE INDEX idx_event_votes_user ON event_votes (user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_votes ENABLE ROW LEVEL SECURITY;

-- ── Groups: public groups readable by all, private by members only ──

CREATE POLICY "Public groups readable"
  ON groups FOR SELECT
  USING (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner update group"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner delete group"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

-- ── Group members: readable by fellow members ──

CREATE POLICY "Members read group_members"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated join group"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self leave group"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can remove members
CREATE POLICY "Admin remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Group events: readable by group members ──

CREATE POLICY "Members read group_events"
  ON group_events FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members add group_events"
  ON group_events FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Adder or admin delete group_events"
  ON group_events FOR DELETE
  USING (
    auth.uid() = added_by
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Event votes: readable by group members, writable by self ──

CREATE POLICY "Members read votes"
  ON event_votes FOR SELECT
  USING (
    group_event_id IN (
      SELECT ge.id FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members cast vote"
  ON event_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_event_id IN (
      SELECT ge.id FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Self update vote"
  ON event_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self delete vote"
  ON event_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Auto-add owner as admin member on group creation
-- ============================================================

CREATE OR REPLACE FUNCTION auto_add_group_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_add_group_owner ON groups;
CREATE TRIGGER trg_auto_add_group_owner
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_group_owner();
