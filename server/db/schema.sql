-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Jam3iya Table (The Group)
CREATE TABLE IF NOT EXISTS jam3iya (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL, -- Supports large amounts
  currency TEXT DEFAULT 'SAR',
  start_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam3iya_id UUID NOT NULL REFERENCES jam3iya(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT, -- Base64 or URL
  created_at TIMESTAMP DEFAULT NOW()
);

-- Draws Table (The Result)
-- Combining inputs and results in one record to ensure integrity
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam3iya_id UUID NOT NULL REFERENCES jam3iya(id) ON DELETE CASCADE,
  
  -- The Inputs used to generate randomness
  seed TEXT NOT NULL,
  seed_inputs JSONB NOT NULL, -- { members: [], timestamp: 123, salt: "...", externalEvent: "..." }
  
  -- The Output
  results JSONB NOT NULL, -- [{ memberId: "...", score: "...", month: 1 }]
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Security
  is_locked BOOLEAN DEFAULT TRUE -- Draws are immutable by default upon creation
);

-- Audit Log (Optional but recommended)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam3iya_id UUID REFERENCES jam3iya(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
