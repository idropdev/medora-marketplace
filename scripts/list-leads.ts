/**
 * Prints the "Get listed free" inquiry pipeline.
 *
 * The anon key cannot read `leads` by design (insert-only RLS), so this runs
 * with the service-role key and must stay local / CI only.
 *
 *   npx tsx --env-file=.env.local scripts/list-leads.ts
 *   npx tsx --env-file=.env.local scripts/list-leads.ts new
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const status = process.argv[2];
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
if (status) query = query.eq('status', status);

const { data, error } = await query;

if (error) {
  console.error('❌', error.message);
  process.exit(1);
}

if (!data?.length) {
  console.log(status ? `No leads with status "${status}".` : 'No leads yet.');
  process.exit(0);
}

for (const lead of data) {
  console.log(
    `\n[${lead.status}] ${new Date(lead.created_at).toLocaleString()}\n` +
    `  ${lead.clinic} — ${lead.contact} <${lead.email}>${lead.phone ? ` / ${lead.phone}` : ''}\n` +
    `  ${[lead.specialty, lead.city, lead.plan, lead.locale].filter(Boolean).join(' · ')}` +
    (lead.message ? `\n  "${lead.message}"` : '')
  );
}
console.log(`\n${data.length} lead(s).`);
