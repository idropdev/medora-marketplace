/**
 * Backfill `providers.insurances` and `providers.bookingUrl` from the scrape.
 *
 *   npx tsx scripts/doctoralia/backfill-extras.ts            # dry run
 *   npx tsx scripts/doctoralia/backfill-extras.ts --commit
 *
 * Both fields come from our own Doctoralia data, so they can live in the
 * database permanently. (Google Places content cannot — only place_id may be
 * stored indefinitely, which is why photos and reviews are fetched at render
 * time instead.)
 *
 * `bookingUrl` is set only where the listing actually had a calendar with
 * bookable slots; a profile link with no calendar is a dead end for a patient.
 */
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { INDEX_FILE, PROFILES_FILE } from './config';
import type { DoctoraliaProfile, IndexEntry } from './types';

const commit = process.argv.includes('--commit');

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

function readJsonl<T>(file: string, key: (row: T) => string): Map<string, T> {
  const out = new Map<string, T>();
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean)) {
    try {
      const row = JSON.parse(line) as T;
      out.set(key(row), row);
    } catch {
      // half-written line from an interrupted run
    }
  }
  return out;
}

async function run() {
  const profiles = readJsonl<DoctoraliaProfile>(PROFILES_FILE, (p) => p.doctoraliaId);
  const index = readJsonl<IndexEntry>(INDEX_FILE, (e) => e.doctoraliaId);

  const providers: { id: string; name: string; doctoraliaId: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('providers')
      .select('id,name,"doctoraliaId"')
      .not('doctoraliaId', 'is', null)
      .range(from, from + 999);
    if (error) throw new Error(`could not read providers: ${error.message}`);
    providers.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  console.log(`\n📋 Backfilling extras for ${providers.length} Doctoralia-sourced providers${commit ? '' : ' (dry run)'}\n`);

  let withInsurers = 0;
  let withBooking = 0;
  let updated = 0;
  const samples: string[] = [];

  for (const p of providers) {
    const profile = p.doctoraliaId ? profiles.get(p.doctoraliaId) : undefined;
    const entry = p.doctoraliaId ? index.get(p.doctoraliaId) : undefined;
    if (!profile) continue;

    const insurances = profile.insurances ?? [];
    // Only a profile with a real calendar gets a booking link.
    const bookingUrl = entry?.hasCalendar ? profile.url : null;

    if (insurances.length) withInsurers++;
    if (bookingUrl) withBooking++;
    if (!insurances.length && !bookingUrl) continue;

    if (samples.length < 5) {
      samples.push(
        `    ${p.name} · ${insurances.length ? insurances.slice(0, 3).join(', ') : 'no insurers'}` +
          `${bookingUrl ? ' · bookable' : ''}`,
      );
    }

    if (!commit) {
      updated++;
      continue;
    }

    const { error } = await supabase
      .from('providers')
      .update({ insurances, bookingUrl })
      .eq('id', p.id);
    if (error) {
      console.error(`  ✖ ${p.name}: ${error.message}`);
      continue;
    }
    updated++;
    if (updated % 100 === 0) process.stdout.write(`\r  updated ${updated}`);
  }

  console.log(`\n  providers with insurers listed: ${withInsurers}`);
  console.log(`  providers with a booking link:  ${withBooking}`);
  console.log(`  ${commit ? 'rows updated' : 'rows that would update'}: ${updated}`);
  if (samples.length) console.log(`\n  sample:\n${samples.join('\n')}`);
  if (!commit) console.log('\n  Dry run — re-run with --commit.\n');
}

run().catch((err) => {
  console.error('\n✖ fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
