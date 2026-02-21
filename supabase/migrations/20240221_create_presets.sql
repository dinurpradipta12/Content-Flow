-- Create carousel_presets table
CREATE TABLE IF NOT EXISTS carousel_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE carousel_presets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own presets" 
ON carousel_presets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets" 
ON carousel_presets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" 
ON carousel_presets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" 
ON carousel_presets FOR DELETE 
USING (auth.uid() = user_id);
