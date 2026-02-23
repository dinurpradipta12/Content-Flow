import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('content_items').select('id, title, upload_date, status').neq('status', 'Published').order('upload_date', {ascending: true}).limit(20);
  console.log(JSON.stringify(data, null, 2));
}
check();
