const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lqttzudtwarkwyxcnssd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UYNtiM0r3GfdtYpIdR-AeQ_oH2ivH7p';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probe() {
    const tables = ['karura', 'sponsors', 'activities', 'marathon', 'runners', 'registration_data', 'payments'];
    
    console.log('--- Probing More Tables ---');
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                // console.log(`[${table}] Error: ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`[${table}] FOUND DATA! Columns:`, Object.keys(data[0]));
            } else {
                console.log(`[${table}] Table exists but is empty.`);
            }
        } catch (e) {}
    }
}

probe();
