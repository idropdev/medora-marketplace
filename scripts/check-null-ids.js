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

async function checkDuplicates() {
    const { data: nullIds, error: err1 } = await supabase
        .from('providers')
        .select('id, name, city')
        .is('googlePlaceId', null);

    if (err1) {
        console.error('Error fetching nulls:', err1.message);
        return;
    }

    console.log(`Found ${nullIds.length} clinics with null googlePlaceId.`);
    if (nullIds.length > 0) {
        console.log('Sample null clinics:', nullIds.slice(0, 10));
    }
}

checkDuplicates().catch(console.error);
