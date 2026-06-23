CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  broker TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  lots NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster queries by portfolio
CREATE INDEX IF NOT EXISTS idx_portfolio_id ON transactions (portfolio_id);

-- Enable RLS (Row Level Security) and allow anonymous access for hackathon MVP
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON transactions
  FOR DELETE USING (true);
