-- ============================================
-- SUPABASE SETUP SCRIPT
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- Create table for storing content metrics
CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  content_link TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  
  -- Calculated fields
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  engagement_count INTEGER GENERATED ALWAYS AS (likes + comments + shares + COALESCE(saves, 0)) STORED,
  
  -- Metadata
  caption TEXT,
  thumbnail_url TEXT,
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(content_link)
);

-- Create indexes for better query performance
CREATE INDEX idx_content_metrics_platform ON content_metrics(platform);
CREATE INDEX idx_content_metrics_last_scraped ON content_metrics(last_scraped_at DESC);
CREATE INDEX idx_content_metrics_content_id ON content_metrics(content_id);

-- Enable RLS
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read (for real-time updates)
CREATE POLICY "Allow public read" ON content_metrics
  FOR SELECT USING (true);

-- Create policy to allow authenticated insert/update
CREATE POLICY "Allow authenticated insert/update" ON content_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update own" ON content_metrics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_metrics_updated_at
BEFORE UPDATE ON content_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a stored procedure to scrape and update metrics
CREATE OR REPLACE FUNCTION scrape_instagram_metrics(
  p_content_link TEXT,
  p_username TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_views INTEGER;
  v_likes INTEGER;
  v_comments INTEGER;
  v_engagement_rate DECIMAL;
BEGIN
  -- This will be called by the Edge Function
  -- For now, returning a placeholder
  RETURN json_build_object(
    'success', true,
    'message', 'Scrape function ready for Edge Function integration'
  );
END;
$$ LANGUAGE plpgsql;
