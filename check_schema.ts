import { supabase } from './src/services/supabaseClient';
async function run() {
  const { data, error } = await supabase.from('workspace_chat_groups').select('*').limit(1);
  if (error) {
    console.log('Error fetching workspace_chat_groups:', error);
  } else {
    console.log('Success fetching workspace_chat_groups:', data);
  }
  
  const { data: users, error: userError } = await supabase.from('app_users').select('id').limit(1);
  console.log('Sample User ID:', users?.[0]?.id);
}
run();
