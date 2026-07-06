import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split(/\r?\n/);
            for (const line of lines) {
                if (line.trim().startsWith('#') || !line.includes('=')) continue;
                const eqIdx = line.indexOf('=');
                const key = line.substring(0, eqIdx).trim();
                let val = line.substring(eqIdx + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                process.env[key] = val;
            }
        }
    } catch (err) {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findDentist() {
    const { data, error } = await supabase
        .from('providers')
        .select('id, name, googlePlaceId')
        .ilike('name', 'East El Paso Dentist');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Result:', JSON.stringify(data, null, 2));
}

findDentist().catch(console.error);
