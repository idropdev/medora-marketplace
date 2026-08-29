/**
 * Broad Google Places sweep of Ciudad Juárez, then a free local match against
 * the staged Doctoralia rows.
 *
 *   npx tsx scripts/doctoralia/sweep.ts collect            # dry run + cost estimate
 *   npx tsx scripts/doctoralia/sweep.ts collect --commit   # run the sweep
 *   npx tsx scripts/doctoralia/sweep.ts link               # match locally (free)
 *   npx tsx scripts/doctoralia/sweep.ts link    --commit
 *   npx tsx scripts/doctoralia/sweep.ts report             # what's still missing
 *
 * Why a sweep instead of one lookup per doctor: Google charges per call, and a
 * single "dentists in Juárez" search returns up to 60 businesses. That is far
 * cheaper per provider than 2,700 individual questions, and it also surfaces
 * providers that are not on Doctoralia at all.
 *
 * The trade-off is coverage: each query is capped at 60 results, so a sweep
 * finds what Google ranks highly, not necessarily everyone. Run `report` after
 * `link` to see who is still without a phone; those are the candidates for the
 * targeted (and pricier) enrich.ts pass.
 *
 * Flags:  --limit=N     only run the first N queries
 *         --refetch     ignore the cached Places responses
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { CACHE_DIR } from './config';
import { distanceMeters, nameSimilarity } from './load';

const argv = process.argv.slice(2);
const phase = argv.find((a) => !a.startsWith('--')) ?? 'collect';
const commit = argv.includes('--commit');
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
const COST_PER_1K = { textSearch: 32, details: 20 /* basic + contact data */ };

/** Ciudad Juárez bounding box — drops results Google returns from other cities. */
const BBOX = { minLat: 31.58, maxLat: 31.83, minLng: -106.61, maxLng: -106.28 };
const CENTER = { lat: 31.7, lng: -106.45 };
const RADIUS_M = 20_000;

/** A Google result must be this close to a Doctoralia address to be the same place. */
const MAX_LINK_DISTANCE_M = 200;
const MIN_LINK_SCORE = 0.6;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const calls = { textSearch: 0, details: 0, cached: 0 };

// ── cached Places calls ──────────────────────────────────────────────────────

const PLACES_CACHE = path.join(CACHE_DIR, 'places');

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
      // corrupt entry — refetch
    }
  }

  const res = await fetch(url);
  const json = await res.json();
  calls[kind]++;

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

const inJuarez = (lat: number, lng: number) =>
  lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;

// ── query set, derived from what the scrape actually found ───────────────────

/**
 * Queries come from the distinct Spanish specialization labels already in
 * doctoralia_doctors, so the sweep covers exactly the specialties present in
 * Juárez rather than a hand-written guess.
 */
async function buildQueries(): Promise<string[]> {
  const { data, error } = await supabase.from('doctoralia_doctors').select('specializations');
  if (error) throw new Error(`could not read specializations: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const s of (row.specializations as string[] | null) ?? []) {
      const label = s.trim();
      if (label.length > 2) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  const labels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  // A few generic sweeps catch businesses that no specialty label would.
  const generic = ['consultorio médico', 'clínica médica', 'hospital', 'laboratorio clínico', 'centro médico'];

  return [...new Set([...labels, ...generic])].map((q) => `${q} en Ciudad Juárez, Chihuahua`);
}

// ── phase: collect ───────────────────────────────────────────────────────────

interface PlaceRow {
  place_id: string;
  name: string;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  types: string[];
  business_status: string | null;
  found_via: string[];
}

async function textSearchAll(query: string): Promise<any[]> {
  const results: any[] = [];
  let token: string | undefined;

  // Google returns at most 3 pages (60 results) per query.
  for (let page = 0; page < 3; page++) {
    const url = token
      ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${token}&key=${GOOGLE_KEY}`
      : 'https://maps.googleapis.com/maps/api/place/textsearch/json' +
        `?query=${encodeURIComponent(query)}&location=${CENTER.lat},${CENTER.lng}&radius=${RADIUS_M}&key=${GOOGLE_KEY}`;

    const json = await places(url, 'textSearch');
    results.push(...(json.results ?? []));

    token = json.next_page_token;
    if (!token) break;
    // Google needs a moment before a page token becomes valid.
    await sleep(2_000);
  }

  return results;
}

async function detailsFor(placeId: string) {
  const fields =
    'place_id,name,formatted_address,geometry,international_phone_number,website,rating,user_ratings_total,types,business_status';
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    `?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`;
  const json = await places(url, 'details');
  return json.status === 'OK' ? json.result : null;
}

async function collect() {
  const queries = (await buildQueries()).slice(0, limit);

  console.log('\n🗺  Google Places sweep — Ciudad Juárez\n');
  console.log(`  queries               ${queries.length}`);

  // Text search: ~2 pages average. Details: one per unique place, and sweeps
  // overlap heavily, so unique places land well below queries x 60.
  const estSearches = Math.round(queries.length * 2);
  const estDetails = 1_800;
  const estUsd =
    (estSearches / 1000) * COST_PER_1K.textSearch + (estDetails / 1000) * COST_PER_1K.details;
  console.log(`  estimated             ~${estSearches} searches + ~${estDetails} details ≈ US$${estUsd.toFixed(2)}`);
  console.log(`  (vs ~US$135 for asking about all 2,794 entities one at a time)`);
  console.log('');
  console.log('  That is LIST price with no free allowance left. Google includes a free');
  console.log('  monthly quota per SKU (1,000-10,000 calls depending on tier), so the real');
  console.log('  bill is usually far lower or zero. Check Cloud Console > Billing > Reports.');

  if (!commit) {
    console.log('\n  Dry run — no API calls made, nothing written.');
    console.log('  Re-run with --commit to sweep.\n');
    return;
  }

  const found = new Map<string, PlaceRow>();
  const started = Date.now();

  for (const [i, query] of queries.entries()) {
    let results: any[];
    try {
      results = await textSearchAll(query);
    } catch (err) {
      console.error(`\n✖ stopping: ${err instanceof Error ? err.message : err}`);
      break;
    }

    let kept = 0;
    for (const r of results) {
      const lat = r?.geometry?.location?.lat;
      const lng = r?.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number' || !r.place_id) continue;
      if (!inJuarez(lat, lng)) continue; // Google drifts to other cities on thin queries

      const existing = found.get(r.place_id);
      if (existing) {
        existing.found_via.push(query);
        continue;
      }
      found.set(r.place_id, {
        place_id: r.place_id,
        name: r.name ?? '',
        formatted_address: r.formatted_address ?? null,
        lat,
        lng,
        phone: null, // only Details carries contact data
        website: null,
        rating: typeof r.rating === 'number' ? r.rating : null,
        review_count: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
        types: Array.isArray(r.types) ? r.types : [],
        business_status: r.business_status ?? null,
        found_via: [query],
      });
      kept++;
    }

    process.stdout.write(
      `\r  [${i + 1}/${queries.length}] ${found.size} unique places · ` +
        `${calls.textSearch} searches, ${calls.cached} cached · +${kept}   `,
    );
  }

  console.log(`\n\n  ${found.size} unique places in the Juárez bounding box`);
  console.log('  fetching contact details…');

  const rows = [...found.values()];
  for (const [i, row] of rows.entries()) {
    try {
      const d = await detailsFor(row.place_id);
      if (d) {
        row.phone = d.international_phone_number ?? null;
        row.website = d.website ?? null;
        row.formatted_address = d.formatted_address ?? row.formatted_address;
        row.rating = typeof d.rating === 'number' ? d.rating : row.rating;
        row.review_count = typeof d.user_ratings_total === 'number' ? d.user_ratings_total : row.review_count;
        row.business_status = d.business_status ?? row.business_status;
      }
    } catch (err) {
      console.error(`\n✖ stopping: ${err instanceof Error ? err.message : err}`);
      break;
    }
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      process.stdout.write(`\r  details ${i + 1}/${rows.length} · ${calls.details} calls, ${calls.cached} cached   `);
    }
  }

  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('google_places_juarez').upsert(chunk, { onConflict: 'place_id' });
    if (error) throw new Error(`google_places_juarez upsert failed: ${error.message}`);
  }

  const spent =
    (calls.textSearch / 1000) * COST_PER_1K.textSearch + (calls.details / 1000) * COST_PER_1K.details;
  const withPhone = rows.filter((r) => r.phone).length;

  console.log(`\n\n  Swept in ${((Date.now() - started) / 60_000).toFixed(1)} min`);
  console.log(`    places stored     ${rows.length}`);
  console.log(`    with a phone      ${withPhone}`);
  console.log(`    with a website    ${rows.filter((r) => r.website).length}`);
  console.log(`\n  API: ${calls.textSearch} searches, ${calls.details} details, ${calls.cached} cached`);
  console.log(`  Estimated spend: US$${spent.toFixed(2)}`);
  console.log('\n  Next: npx tsx scripts/doctoralia/sweep.ts link --commit   (free, no API calls)');
}

/**
 * Supabase REST caps a single select at 1,000 rows. Both tables here are larger
 * than that, so every read must page or the match silently runs against a
 * fraction of the data.
 */
async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`could not read ${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ── phase: link (free — pure local matching) ─────────────────────────────────

async function link() {
  const gPlaces = await selectAll<{
    place_id: string; name: string; lat: number | null; lng: number | null;
    phone: string | null; website: string | null;
  }>('google_places_juarez', 'place_id,name,lat,lng,phone,website');

  if (!gPlaces.length) {
    console.error('✖ google_places_juarez is empty — run the collect phase first.');
    process.exit(1);
  }

  const docs = await selectAll<{ doctoralia_id: string; name: string; raw: any }>(
    'doctoralia_doctors',
    'doctoralia_id,name,raw',
  );

  console.log(`\n🔗 Linking ${gPlaces.length} Google places to ${docs?.length ?? 0} Doctoralia entities (no API calls)\n`);

  const links: {
    place_id: string; doctoralia_id: string; score: number; distance: number; type: 'entity' | 'venue';
  }[] = [];
  const claimed = new Set<string>();

  for (const g of gPlaces) {
    if (g.lat == null || g.lng == null) continue;
    let best: { id: string; score: number; distance: number; type: 'entity' | 'venue' } | null = null;

    for (const d of docs) {
      const addrs = (d.raw as any)?.addresses ?? [];
      for (const a of addrs) {
        if (a.lat == null || a.lng == null) continue;
        const distance = distanceMeters(g.lat, g.lng, a.lat, a.lng);
        if (distance > MAX_LINK_DISTANCE_M) continue;

        // Two very different kinds of hit, and conflating them publishes a
        // clinic switchboard as a named doctor's direct line:
        //   entity — the Google listing IS this provider
        //   venue  — the Google listing is the building they practise in
        const entityScore = nameSimilarity(g.name, d.name);
        const venueScore = a.clinicName ? nameSimilarity(g.name, a.clinicName) : 0;

        const isEntity = entityScore >= venueScore;
        const score = isEntity ? entityScore : venueScore;
        if (score < MIN_LINK_SCORE) continue;

        const type: 'entity' | 'venue' = isEntity ? 'entity' : 'venue';
        // An entity hit always beats a venue hit, however well the venue scores.
        const better =
          !best ||
          (type === 'entity' && best.type === 'venue') ||
          (type === best.type && (score > best.score || (score === best.score && distance < best.distance)));
        if (better) best = { id: d.doctoralia_id, score, distance, type };
      }
    }

    if (best && !claimed.has(best.id)) {
      claimed.add(best.id);
      links.push({
        place_id: g.place_id,
        doctoralia_id: best.id,
        score: best.score,
        distance: best.distance,
        type: best.type,
      });
    }
  }

  const withPhone = links.filter((l) => gPlaces.find((g) => g.place_id === l.place_id)?.phone).length;
  const entityLinks = links.filter((l) => l.type === 'entity');
  const venueLinks = links.filter((l) => l.type === 'venue');
  console.log(`  linked                       ${links.length}`);
  console.log(`    entity (the provider)      ${entityLinks.length}  ← safe to publish as theirs`);
  console.log(`    venue  (their building)    ${venueLinks.length}  ← switchboard, review first`);
  console.log(`  …of which carry a phone      ${withPhone}`);
  console.log(`  google places left unlinked  ${gPlaces.length - links.length}  (providers not on Doctoralia)`);

  if (!commit) {
    console.log('\n  Dry run — nothing written. Re-run with --commit.\n');
    return;
  }

  // Clear the previous link state first. Without this, a re-run leaves stale
  // rows behind: a doctor who was matched last time but not this time keeps the
  // old phone and match type, silently mixing two runs' results.
  const { error: c1 } = await supabase
    .from('google_places_juarez')
    .update({ doctoralia_id: null, link_score: null, link_distance_m: null })
    .not('doctoralia_id', 'is', null);
  if (c1) throw new Error(`could not clear google_places_juarez links: ${c1.message}`);

  const { error: c2 } = await supabase
    .from('doctoralia_doctors')
    .update({
      google_place_id: null,
      google_name: null,
      google_phone: null,
      google_website: null,
      google_match_type: null,
      google_match_score: null,
      google_distance_m: null,
      enriched_at: null,
    })
    .not('google_place_id', 'is', null);
  if (c2) throw new Error(`could not clear doctoralia_doctors links: ${c2.message}`);

  let placesUpdated = 0;
  let doctorsUpdated = 0;

  for (const l of links) {
    const g = gPlaces.find((x) => x.place_id === l.place_id)!;

    const { error: pErr } = await supabase
      .from('google_places_juarez')
      .update({
        doctoralia_id: l.doctoralia_id,
        link_score: Number(l.score.toFixed(2)),
        link_distance_m: Math.round(l.distance),
        updated_at: new Date().toISOString(),
      })
      .eq('place_id', l.place_id);
    // Never swallow a write error. A missing column fails every row silently
    // and the run still prints a cheerful success line.
    if (pErr) throw new Error(`google_places_juarez update failed (${l.place_id}): ${pErr.message}`);
    placesUpdated++;

    const { error: dErr } = await supabase
      .from('doctoralia_doctors')
      .update({
        google_place_id: g.place_id,
        google_name: g.name,
        google_phone: g.phone,
        google_website: g.website,
        google_match_type: l.type,
        google_match_score: Number(l.score.toFixed(2)),
        google_distance_m: Math.round(l.distance),
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('doctoralia_id', l.doctoralia_id);
    if (dErr) {
      throw new Error(
        `doctoralia_doctors update failed (${l.doctoralia_id}): ${dErr.message}. ` +
          `If this mentions a missing google_* column, run schema-enrichment.sql first.`,
      );
    }
    doctorsUpdated++;
  }

  console.log('');
  console.log(`  ✅ linked — ${placesUpdated} places, ${doctorsUpdated} doctors updated`);
}

// ── phase: report ────────────────────────────────────────────────────────────

async function report() {
  const count = async (q: string) => {
    const { count: n } = await supabase
      .from(q.split('?')[0])
      .select('*', { count: 'exact', head: true });
    return n ?? 0;
  };

  const total = await count('doctoralia_doctors');
  const { count: enriched } = await supabase
    .from('doctoralia_doctors')
    .select('*', { count: 'exact', head: true })
    .not('google_phone', 'is', null);
  const { count: swept } = await supabase
    .from('google_places_juarez')
    .select('*', { count: 'exact', head: true });
  const { count: unlinked } = await supabase
    .from('google_places_juarez')
    .select('*', { count: 'exact', head: true })
    .is('doctoralia_id', null);

  console.log('\n📊 Coverage\n');
  console.log(`  doctoralia entities             ${total}`);
  console.log(`  …now with a Google phone        ${enriched ?? 0}`);
  console.log(`  …still without one              ${total - (enriched ?? 0)}   ← enrich.ts candidates`);
  console.log(`\n  google places swept             ${swept ?? 0}`);
  console.log(`  …not matching any Doctoralia row ${unlinked ?? 0}   ← providers only Google knows about`);
  console.log();
}

const run = phase === 'link' ? link : phase === 'report' ? report : collect;
run().catch((err) => {
  console.error('\n✖ fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
