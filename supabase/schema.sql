-- Pokemon Unbound Companion - Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable Row Level Security on all tables

CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_team (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own team" ON user_team
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_pc (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_pc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own PC" ON user_pc
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_caught (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_caught ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own caught data" ON user_caught
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_items (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own items" ON user_items
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_missions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own missions" ON user_missions
  FOR ALL USING (auth.uid() = user_id);
