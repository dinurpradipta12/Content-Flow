
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://reqomleljyfujkivesxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcW9tbGVsanlmdWpraXZlc3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDAzNTEsImV4cCI6MjA4NzAxNjM1MX0.kssegIPnTXBfaaHV199T5uox8Qz5Z0rziTBhJ7L_ko4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('developer_inbox')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
