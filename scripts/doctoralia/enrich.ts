/**
 * Google Places enrichment for scraped Doctoralia entities.
 *
 * Doctoralia publishes almost no contact details. This fills the gap by asking
 * Google Places about the same practice, at the same coordinates, and records
 * the answer alongside the scraped data — never overwriting it.
 *
 *   npx tsx scripts/doctoralia/enrich.ts              # dry run + cost estimate
 *   npx tsx scripts/doctoralia/enrich.ts --commit     # write to doctoralia_doctors
 *   npx tsx scripts/doctoralia/enrich.ts --commit --limit=100
 *
 * Flags:  --limit=N       cap the number of entities looked up
 *         --all           include entities that already have a phone
 *         --venue         also accept venue-level matches (see below)
 *         --refetch       ignore the Places response cache
 *
 * THIS PHASE COSTS MONEY. Every entity is one Text Search call, plus one
 * Details call when a candidate passes. Run it without --commit first: it
 * prints the call count and an estimated bill before you spend anything.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { CACHE_DIR, PROFILES_FILE } from './config';
import { distanceMeters, nameSimilarity } from './load';
import type { DoctoraliaAddress, DoctoraliaProfile } from './types';

const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const includeAll = argv.includes('--all');
const acceptVenue = argv.includes('--venue');
const refetch = argv.includes('--refetch');
const limit = Number(argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);

/**
 * IMPORTANT: these are Google's LIST prices, not what you will actually be
 * billed. Google Maps Platform includes a free monthly allowance per SKU
 * (10,000 calls for Essentials, 5,000 for Pro, 1,000 for Enterprise), which
 * resets each month. The original seed-providers.ts run cost nothing for
 * exactly this reason.
 *
 * Requesting contact fields (phone, website) puts Place Details in the priciest
 * tier, where only ~1,000 calls/month are free — so that is usually the only
 * line that costs anything here. Treat the printed figure as a worst case with
 * zero free allowance remaining, and check the real number in
 * Google Cloud Console -> Billing -> Reports, grouped by SKU.
 */
const COST_PER_1K = { textSearch: 32, details: 17, contactData: 3 };

/** How close a Google result must be to the scraped coordinates to be believed. */
const MAX_MATCH_DISTANCE_M = 250;
/** Name agreement required for an 'entity' match (the provider themselves). */
const MIN_ENTITY_SIMILARITY = 0.6;

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
const GOOGLE_KEY = env.VITE_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!GOOGLE_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('✖ VITE_GOOGLE_MAPS_API_KEY, VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── cached Places calls ──────────────────────────────────────────────────────

const PLACES_CACHE = path.join(CACHE_DIR, 'places');
const calls = { textSearch: 0, details: 0, cached: 0 };

function cacheFile(key: string) {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  const dir = path.join(PLACES_CACHE, hash.slice(0, 2));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${hash}.json`);
}

async function places(url: string, kind: 'textSearch' | 'details'): Promise<any> {
  const file = cacheFile(url);
  if (!refetch && fs.existsSync(file)) {
    try {
      calls.cached++;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      // corrupt cache entry — fall through and refetch
    }
  }

  const res = await fetch(url);
  const json = await res.json();
  calls[kind]++;

  // Quota/billing failures must stop the run, not silently produce 'none' for
  // every remaining entity.
  if (json.status === 'OVER_QUERY_LIMIT' || json.status === 'REQUEST_DENIED') {
    throw new Error(`Places API ${json.status}: ${json.error_message ?? 'no detail'}`);
  }

  try {
    fs.writeFileSync(file, JSON.stringify(json), 'utf-8');
  } catch {
    // cache is an optimisation only
  }
  return json;
}

// ── matching ─────────────────────────────────────────────────────────────────

function primaryAddress(p: DoctoraliaProfile): DoctoraliaAddress | null {
  return (
    p.addresses.find((a) => /ju[aá]rez/i.test(a.city ?? '') && a.lat !== null) ??
    p.addresses.find((a) => a.lat !== null) ??
    null
  );
}

interface Candidate {
  placeId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
  distance: number;
  score: number;
}

function bestCandidate(results: any[], target: string, lat: number, lng: number): Candidate | null {
  let best: Candidate | null = null;

  for (const r of results ?? []) {
    const rLat = r?.geometry?.location?.lat;
    const rLng = r?.geometry?.location?.lng;
    if (typeof rLat !== 'number' || typeof rLng !== 'number' || !r.place_id) continue;

    const distance = distanceMeters(lat, lng, rLat, rLng);
    if (distance > MAX_MATCH_DISTANCE_M) continue;

    const score = nameSimilarity(target, r.name ?? '');
    const cand: Candidate = {
      placeId: r.place_id,
      name: r.name ?? '',
      address: r.formatted_address ?? null,
      lat: rLat,
      lng: rLng,
      rating: typeof r.rating === 'number' ? r.rating : null,
      reviewCount: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
      distance,
      score,
    };
    if (!best || cand.score > best.score || (cand.score === best.score && cand.distance < best.distance)) {
      best = cand;
    }
  }

  return best;
}

async function searchFor(query: string, lat: number, lng: number) {
  const url =
    'https://maps.googleapis.com/maps/api/place/textsearch/json' +
    `?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=1500&key=${GOOGLE_KEY}`;
  const json = await places(url, 'textSearch');
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    console.warn(`    Places search ${json.status} for "${query}"`);
  }
  return (json.results ?? []) as any[];
}

async function detailsFor(placeId: string) {
  const fields = 'place_id,name,formatted_address,geometry,international_phone_number,website,rating,user_ratings_total';
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`;
  const json = await places(url, 'details');
  return json.status === 'OK' ? json.result : null;
}

/**
 * Two-step lookup, because a Doctoralia doctor is a *person* and Google Places
 * indexes *businesses*:
 *
 *  1. Search the entity's own name. A clinic, or a solo doctor whose consultorio
 *    carries their name, matches here → 'entity'. This is the number you can
 *    honestly publish as theirs.
 *  2. Failing that, search the venue they practise at (Hospital Ángeles, etc.)
 *    → 'venue'. That phone is the building's switchboard and is recorded as
 *    such. It is NOT promoted to providers.phone unless you pass --venue,
 *    because listing a hospital switchboard as a named doctor's line is
 *    misleading to a patient.
 */
async function enrichOne(p: DoctoraliaProfile) {
  const addr = primaryAddress(p);
  if (!addr?.lat || !addr?.lng) {
    return { matchType: 'none' as const, score: 0, distance: null, place: null };
  }

  const where = [addr.street, addr.city ?? 'Ciudad Juárez'].filter(Boolean).join(', ');

  const entityHit = bestCandidate(
    await searchFor(`${p.name}, ${where}`, addr.lat, addr.lng),
    p.name,
    addr.lat,
    addr.lng,
  );
  if (entityHit && entityHit.score >= MIN_ENTITY_SIMILARITY) {
    return {
      matchType: 'entity' as const,
      score: entityHit.score,
      distance: entityHit.distance,
      place: await detailsFor(entityHit.placeId),
    };
  }

  if (addr.clinicName && !/^consultorio$/i.test(addr.clinicName)) {
    const venueHit = bestCandidate(
      await searchFor(`${addr.clinicName}, ${where}`, addr.lat, addr.lng),
      addr.clinicName,
      addr.lat,
      addr.lng,
    );
    if (venueHit && venueHit.score >= MIN_ENTITY_SIMILARITY) {
      return {
        matchType: 'venue' as const,
        score: venueHit.score,
        distance: venueHit.distance,
        place: await detailsFor(venueHit.placeId),
      };
    }
  }

  return { matchType: 'none' as const, score: 0, distance: null, place: null };
}

// ── run ──────────────────────────────────────────────────────────────────────

function readProfiles(): DoctoraliaProfile[] {
  if (!fs.existsSync(PROFILES_FILE)) {
    console.error(`✖ ${PROFILES_FILE} not found — run the scrape first.`);
    process.exit(1);
  }
  const byId = new Map<string, DoctoraliaProfile>();
  for (const line of fs.readFileSync(PROFILES_FILE, 'utf-8').split('\n').filter(Boolean)) {
    try {
      const p = JSON.parse(line) as DoctoraliaProfile;
      byId.set(p.doctoraliaId, p);
    } catch {
      // half-written line
    }
  }
  return [...byId.values()];
}

function estimate(n: number) {
  // One search per entity; a second when the entity name misses; details only on a hit.
  const searches = Math.round(n * 1.6);
  const details = Math.round(n * 0.5);
  const usd =
    (searches / 1000) * COST_PER_1K.textSearch +
    (details / 1000) * (COST_PER_1K.details + COST_PER_1K.contactData);
  return { searches, details, usd };
}

async function run() {
  const all = readProfiles();
  const needsContact = all.filter((p) => !p.addresses.some((a) => a.phone) || !p.website);
  const targets = (includeAll ? all : needsContact).slice(0, limit);

  console.log(`\n🗺  Google Places enrichment\n`);
  console.log(`  scraped entities        ${all.length}`);
  console.log(`  missing a phone/website ${needsContact.length}`);
  console.log(`  will look up            ${targets.length}`);

  const est = estimate(targets.length);
  console.log(
    `\n  estimated ~${est.searches} searches + ~${est.details} details ≈ US$${est.usd.toFixed(2)} at list price`,
  );
  console.log(`  (cached responses are reused and cost nothing on a re-run)`);
  console.log('');
  console.log('  That is LIST price with no free allowance left. Google includes a free');
  console.log('  monthly quota per SKU (1,000-10,000 calls depending on tier), so the real');
  console.log('  bill is usually far lower or zero. Check Cloud Console > Billing > Reports.');

  if (!commit) {
    console.log('\n  Dry run — no API calls made, nothing written.');
    console.log('  Re-run with --commit to spend the above and populate the google_* columns.\n');
    return;
  }

  const tally = { entity: 0, venue: 0, none: 0, phones: 0, websites: 0 };
  const started = Date.now();

  for (const [i, p] of targets.entries()) {
    let result;
    try {
      result = await enrichOne(p);
    } catch (err) {
      console.error(`\n✖ stopping: ${err instanceof Error ? err.message : err}`);
      break;
    }

    tally[result.matchType]++;
    const place = result.place;
    if (place?.international_phone_number) tally.phones++;
    if (place?.website) tally.websites++;

    const { error } = await supabase
      .from('doctoralia_doctors')
      .update({
        google_place_id: place?.place_id ?? null,
        google_name: place?.name ?? null,
        google_phone: place?.international_phone_number ?? null,
        google_website: place?.website ?? null,
        google_address: place?.formatted_address ?? null,
        google_rating: typeof place?.rating === 'number' ? place.rating : null,
        google_review_count: typeof place?.user_ratings_total === 'number' ? place.user_ratings_total : null,
        google_match_type: result.matchType,
        google_match_score: Number(result.score.toFixed(2)),
        google_distance_m: result.distance === null ? null : Math.round(result.distance),
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('doctoralia_id', p.doctoraliaId);

    if (error) console.error(`  ✖ update failed for ${p.name}: ${error.message}`);

    if ((i + 1) % 20 === 0 || i === targets.length - 1) {
      const mins = (Date.now() - started) / 60_000;
      process.stdout.write(
        `\r  ${i + 1}/${targets.length} · ${mins.toFixed(1)}m · ` +
          `entity ${tally.entity}, venue ${tally.venue}, none ${tally.none} · ` +
          `${calls.textSearch + calls.details} api calls, ${calls.cached} cached   `,
      );
    }
  }

  const spent =
    (calls.textSearch / 1000) * COST_PER_1K.textSearch +
    (calls.details / 1000) * (COST_PER_1K.details + COST_PER_1K.contactData);

  console.log('\n\n  Results');
  console.log(`    entity matches   ${tally.entity}  (safe to publish as the provider's own)`);
  console.log(`    venue matches    ${tally.venue}  (building switchboard — review before publishing)`);
  console.log(`    no match         ${tally.none}`);
  console.log(`    phones found     ${tally.phones}`);
  console.log(`    websites found   ${tally.websites}`);
  console.log(`\n  API: ${calls.textSearch} searches, ${calls.details} details, ${calls.cached} from cache`);
  console.log(`  Estimated spend this run: US$${spent.toFixed(2)}`);

  console.log(
    `\n  Next: providers rows are filled from google_phone/google_website where` +
      `\n  google_match_type = 'entity'${acceptVenue ? " or 'venue' (--venue passed)" : ''} —` +
      `\n  run: npx tsx scripts/doctoralia/enrich.ts apply --commit${acceptVenue ? ' --venue' : ''}`,
  );
}

/** Copy enriched contact details onto the providers rows already promoted. */
async function apply() {
  const allowed = acceptVenue ? ['entity', 'venue'] : ['entity'];

  const { data, error } = await supabase
    .from('doctoralia_doctors')
    .select('doctoralia_id,name,provider_id,google_phone,google_website,google_place_id,google_match_type')
    .not('provider_id', 'is', null)
    .in('google_match_type', allowed);
  if (error) throw new Error(`could not read enriched rows: ${error.message}`);

  const rows = (data ?? []).filter((r) => r.google_phone || r.google_website);
  console.log(`\n📞 Applying contact details to ${rows.length} promoted providers` +
    `${commit ? '' : ' (dry run)'} · match types: ${allowed.join(', ')}\n`);

  let updated = 0;
  for (const r of rows) {
    if (!commit) {
      if (updated < 5) console.log(`    ${r.name} → ${r.google_phone ?? '—'} · ${r.google_website ?? '—'}`);
      updated++;
      continue;
    }
    // Only fill blanks; never overwrite a number that is already there.
    const { data: existing } = await supabase
      .from('providers')
      .select('phone,website')
      .eq('id', r.provider_id)
      .single();

    const patch: Record<string, string> = {};
    if (!existing?.phone && r.google_phone) patch.phone = r.google_phone;
    if (!existing?.website && r.google_website) patch.website = r.google_website;
    if (r.google_place_id) patch.googlePlaceId = r.google_place_id;
    if (!Object.keys(patch).length) continue;

    const { error: upErr } = await supabase.from('providers').update(patch).eq('id', r.provider_id);
    if (upErr) console.error(`  ✖ ${r.name}: ${upErr.message}`);
    else updated++;
  }

  console.log(`\n  ${commit ? 'updated' : 'would update'}: ${updated}`);
}

const phase = argv.find((a) => !a.startsWith('--'));
(phase === 'apply' ? apply() : run()).catch((err) => {
  console.error('\n✖ fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
