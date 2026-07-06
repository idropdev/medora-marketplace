import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to manually parse env variables from .env.local
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split(/\r?\n/);
            for (const line of lines) {
                // Skip comments and empty lines
                if (line.trim().startsWith('#') || !line.includes('=')) continue;
                const eqIdx = line.indexOf('=');
                const key = line.substring(0, eqIdx).trim();
                let val = line.substring(eqIdx + 1).trim();
                // Strip wrapping quotes if present
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                process.env[key] = val;
            }
        }
    } catch (err) {
        console.warn('⚠️ Warning: Could not read .env.local file. Falling back to system environment variables.');
    }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Missing Supabase credentials in .env.local.');
    console.error('Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function displayBreakdown() {
    console.log('📡 Fetching clinics from Supabase...\n');
    
    const { data: providers, error } = await supabase
        .from('providers')
        .select('*');

    if (error) {
        console.error('❌ Failed to fetch data:', error.message);
        process.exit(1);
    }

    if (!providers || providers.length === 0) {
        console.log('ℹ️ No clinics found in the database. Run the seed script first!');
        return;
    }

    // ── 1. GENERAL METRICS ───────────────────────────────────────────────
    const total = providers.length;
    const promoted = providers.filter(p => p.promoted).length;
    const verified = providers.filter(p => p.verified).length;
    const avgRating = (providers.reduce((sum, p) => sum + (p.rating || 0), 0) / total).toFixed(2);
    const totalClicks = providers.reduce((sum, p) => sum + (p.clicks || 0), 0);

    console.log('====================================================');
    console.log('       🏥  MEDORA CLINICS DATABASE METRICS  🏥       ');
    console.log('====================================================');
    console.log(`📊 Total Registered Clinics : ${total}`);
    console.log(`⭐ Average Rating            : ${avgRating} / 5.0`);
    console.log(`📈 Total Customer Clicks     : ${totalClicks}`);
    console.log(`💎 Promoted (Featured)      : ${promoted}`);
    console.log(`🛡️  Verified Profiles         : ${verified}`);
    console.log('----------------------------------------------------');

    // ── 2. COUNTRY BREAKDOWN ─────────────────────────────────────────────
    const usClinics = providers.filter(p => p.country === 'US');
    const mxClinics = providers.filter(p => p.country === 'MX');

    console.log('\n📍 GEOGRAPHIC DISTRIBUTION');
    console.log(`🇺🇸 United States (El Paso)   : ${usClinics.length} clinics (${((usClinics.length/total)*100).toFixed(0)}%)`);
    console.log(`🇲🇽 Mexico (Ciudad Juarez)    : ${mxClinics.length} clinics (${((mxClinics.length/total)*100).toFixed(0)}%)`);
    console.log('----------------------------------------------------');

    // ── 3. SPECIALTY BREAKDOWN ───────────────────────────────────────────
    const specialtiesMap = {};
    providers.forEach(p => {
        const specs = Array.isArray(p.specialty) ? p.specialty : [p.specialty];
        specs.forEach(spec => {
            specialtiesMap[spec] = (specialtiesMap[spec] || 0) + 1;
        });
    });

    console.log('\n⚕️  CLINICS BY SPECIALTY');
    Object.entries(specialtiesMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([spec, count]) => {
            const label = spec.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            console.log(`  • ${label.padEnd(20)}: ${count}`);
        });
    console.log('----------------------------------------------------');

    // ── 4. DETAILED LIST (TABLE VIEW) ────────────────────────────────────
    console.log('\n📋 DETAILED CLINICS LIST');
    
    // Map data to a clean table structure
    const tableData = providers.map(p => {
        const specs = Array.isArray(p.specialty) ? p.specialty : [p.specialty];
        const primarySpec = specs[0] || 'General';
        const specLabel = primarySpec.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        return {
            'Clinic Name': p.name.length > 30 ? p.name.substring(0, 27) + '...' : p.name,
            'Specialty': specLabel,
            'Location': `${p.city}, ${p.country}`,
            'Rating': p.rating ? `${p.rating}⭐` : 'N/A',
            'Clicks': p.clicks || 0,
            'Status': `${p.promoted ? '💎' : ''}${p.verified ? '🛡️' : ''}` || 'Standard'
        };
    });

    console.table(tableData);

    // ── 5. EXPORT TO CSV ─────────────────────────────────────────────────
    console.log('\n💾 Exporting all records to CSV...');
    const csvHeaders = ['ID', 'Name', 'Specialty', 'Country', 'City', 'Phone', 'Website', 'Address', 'Rating', 'ReviewCount', 'Clicks', 'Promoted', 'Verified', 'Source'];
    const csvRows = providers.map(p => {
        const specs = Array.isArray(p.specialty) ? p.specialty.join(', ') : (p.specialty || '');
        const fields = [
            p.id,
            p.name,
            specs,
            p.country,
            p.city,
            p.phone || '',
            p.website || '',
            p.address || '',
            p.rating || 0,
            p.reviewCount || 0,
            p.clicks || 0,
            p.promoted ? 'true' : 'false',
            p.verified ? 'true' : 'false',
            p.source
        ];
        // Escape double-quotes and commas for standard CSV formatting
        return fields.map(field => {
            const str = String(field).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        }).join(',');
    });
    
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const csvFile = path.resolve(process.cwd(), 'clinics_export.csv');
    fs.writeFileSync(csvFile, csvContent, 'utf8');
    console.log(`✅ Saved all ${providers.length} clinics to: clinics_export.csv`);
    
    console.log('\n💡 Tip: To promote or edit a clinic, you can use the Supabase Dashboard Table Editor directly.');
}

displayBreakdown().catch(console.error);
