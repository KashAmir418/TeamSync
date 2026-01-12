-- 1. Members Table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES members(id) ON DELETE SET NULL,
  deadline DATE,
  status TEXT CHECK (status IN ('todo', 'in-progress', 'completed')) DEFAULT 'todo',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Meetings Table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  link TEXT,
  suggested_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) - For now, we'll allow all access to keep it simple, 
-- but in a real app, you'd restrict this to authenticated users.
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write" ON meetings FOR ALL USING (true) WITH CHECK (true);

-- Initial Data (Optional)
-- INSERT INTO members (id, name, email, role, avatar) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'Alex Rivera', 'alex@teamsync.com', 'Team Admin / Product Manager', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex');
