const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://lqttzudtwarkwyxcnssd.supabase.co', 'sb_publishable_UYNtiM0r3GfdtYpIdR-AeQ_oH2ivH7p');

const commonNames = [
    'registrations', 'volunteers', 'sponsorships', 'sponsors', 'karura', 'karura_run', 
    'karura_runners', 'runners', 'participants', 'payments', 'activities', 'logs', 
    'registration', 'marathon', 'marathon_registrations', 'event_registrations',
    'contact_submissions', 'feedback', 'settings', 'admin_users'
];

async function scan() {
    console.log('Scanning for tables...');
    const found = [];
    for (const name of commonNames) {
        try {
            const { data, error } = await s.from(name).select('*').limit(1);
            if (!error) {
                found.push(name);
                console.log(`FOUND: ${name} (${data.length} rows)`);
            }
        } catch (e) {}
    }
    console.log('--- SCAN COMPLETE ---');
    console.log(JSON.stringify(found));
}

scan();
