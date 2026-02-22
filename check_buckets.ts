import { supabase } from './src/services/supabaseClient';
async function run() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', data);
  if (error) console.error('Error:', error);
}
run();
