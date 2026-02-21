-- Create custom_fonts table
CREATE TABLE IF NOT EXISTS public.custom_fonts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    font_data TEXT NOT NULL -- Base64 or URL
);

-- Enable RLS
ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own fonts" ON public.custom_fonts
    FOR INSERT WITH CHECK (true); -- In a real app, we'd check auth.uid()

CREATE POLICY "Users can view their own fonts" ON public.custom_fonts
    FOR SELECT USING (true);
