/**
 * Repair providers whose promoted coordinates fall outside the El Paso /
 * Ciudad Juárez region.
 *
 * Cause: primaryAddress() used to match on the `city` string and fell back to
 * "first address with coordinates", so a doctor who also practises in
 * Guadalajara could be promoted with the Guadalajara pin. Fixed in load.ts;
 * this repairs rows already inserted.
 *
 *   npx tsx scripts/doctoralia/repair-coords.ts            # dry run
 *   npx tsx scripts/doctoralia/repair-coords.ts --commit
 */
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const commit = process.argv.includes('--commit');
const BOX = { minLat: 31.3, maxLat: 32.2, minLng: -106.9, maxLng: -106.0 };

function loadEnv() {
  const out: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf-8').split(/\r?\n/)) {
      if (!line || line.trimStart().startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      out[line.slice(0, i).trim()] ??= line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

const inBox = (lat: number | null, lng: number | null) =>
  lat != null && lng != null && lat >= BOX.minLat && lat <= BOX.maxLat && lng >= BOX.minLng && lng <= BOX.maxLng;

(async () => {
  const providers: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('providers')
      .select('id,name,lat,lng,address,doctoraliaId')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    providers.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const bad = providers.filter((p) => !inBox(p.lat, p.lng));
  console.log(`\n🔧 ${bad.length} providers outside the border region${commit ? '' : ' (dry run)'}\n`);

  let fixed = 0;
  let unfixable = 0;

  for (const p of bad) {
    if (!p.doctoraliaId) {
      unfixable++;
      console.log(`  ? no doctoraliaId, leaving alone: ${p.name}`);
      continue;
    }
    const { data } = await supabase
      .from('doctoralia_doctors')
      .select('raw')
      .eq('doctoralia_id', p.doctoraliaId)
      .single();

    const addrs: any[] = (data?.raw as any)?.addresses ?? [];
    const good = addrs.find((a) => inBox(a.lat, a.lng));
    if (!good) {
      unfixable++;
      console.log(`  ✖ no border-region address: ${p.name} (${p.lat}, ${p.lng})`);
      continue;
    }

    const address = [good.street, good.district, good.postalCode, good.city, good.province, 'México']
      .filter(Boolean)
      .join(', ');

    if (!commit) {
      if (fixed < 5) console.log(`  → ${p.name}: ${p.lat},${p.lng} → ${good.lat},${good.lng}`);
      fixed++;
      continue;
    }

    const { error } = await supabase
      .from('providers')
      .update({ lat: good.lat, lng: good.lng, address })
      .eq('id', p.id);
    if (error) {
      console.error(`  ✖ ${p.name}: ${error.message}`);
      continue;
    }
    fixed++;
  }

  console.log(`\n  ${commit ? 'repaired' : 'would repair'}: ${fixed}`);
  console.log(`  unfixable (no border address): ${unfixable}`);
  if (!commit) console.log('\n  Dry run — re-run with --commit.\n');
})().catch((e) => {
  console.error('✖ fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
