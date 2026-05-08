const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lqttzudtwarkwyxcnssd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UYNtiM0r3GfdtYpIdR-AeQ_oH2ivH7p';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probe() {
    const tables = ['registrations', 'volunteers', 'karura_runners', 'sponsorships', 'runners', 'registration'];
    
    console.log('--- Probing Supabase Tables ---');
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`[${table}] Error: ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`[${table}] FOUND DATA! Columns:`, Object.keys(data[0]));
                console.log(`First row:`, JSON.stringify(data[0], null, 2));
            } else {
                console.log(`[${table}] Table exists but is empty.`);
            }
        } catch (e) {
            console.log(`[${table}] Exception: ${e.message}`);
        }
    }
}

probe();
