const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getTables() {
    const url = 'https://lqttzudtwarkwyxcnssd.supabase.co/rest/v1/';
    const apiKey = 'sb_publishable_UYNtiM0r3GfdtYpIdR-AeQ_oH2ivH7p';

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`
            }
        });
        const spec = await response.json();
        const tables = Object.keys(spec.definitions);
        console.log('--- TABLES FOUND ---');
        console.log(JSON.stringify(tables, null, 2));
    } catch (e) {
        console.error('Error fetching tables:', e.message);
    }
}

getTables();
