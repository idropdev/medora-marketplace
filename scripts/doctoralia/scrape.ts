/**
 * Doctoralia → Ciudad Juárez provider scrape.
 *
 * Two phases, each resumable. Kill it at any point and re-run; every fetched
 * page is on disk in .cache/ and every parsed record is appended to out/*.jsonl,
 * so a restart costs nothing but the parse.
 *
 *   npx tsx scripts/doctoralia/scrape.ts discover     # listing pages → out/index.jsonl
 *   npx tsx scripts/doctoralia/scrape.ts profiles     # each profile  → out/profiles.jsonl
 *   npx tsx scripts/doctoralia/scrape.ts all
 *
 * Flags:  --limit=N     stop after N entities (smoke test)
 *         --refetch     ignore the HTTP cache
 *         --only=slug   walk a single specialty landing page (e.g. --only=cardiologo)
 */
import * as fs from 'fs';
import { INDEX_FILE, OUT_DIR, PROFILES_FILE, REPORT_FILE } from './config';
import { crawlLandingPage, listCityLandingPages, mergeIndex, slugFromLandingPage } from './discover';
import { politeGet, stats } from './http';
import { parseProfile } from './parse';
import { unmappedSlugs } from './specialties';
import type { DoctoraliaProfile, IndexEntry } from './types';

const argv = process.argv.slice(2);
const phase = argv.find((a) => !a.startsWith('--')) ?? 'all';
const limit = Number(argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);
const refetch = argv.includes('--refetch');
const only = argv.find((a) => a.startsWith('--only='))?.split('=')[1];

fs.mkdirSync(OUT_DIR, { recursive: true });

function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return []; // half-written final line from a hard kill
      }
    });
}

const appendJsonl = (file: string, row: unknown) =>
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf-8');

async function discover() {
  console.log('\n📍 Phase 1 — discovering Ciudad Juárez landing pages\n');

  const allLandingPages = await listCityLandingPages();
  const landingPages = only
    ? allLandingPages.filter((u) => slugFromLandingPage(u) === only)
    : allLandingPages;
  if (only && !landingPages.length) {
    console.error(`  ✖ no Ciudad Juárez landing page for slug "${only}"`);
    process.exit(1);
  }
  const slugs = landingPages.map(slugFromLandingPage);
  console.log(`  ${landingPages.length} landing pages for Ciudad Juárez`);

  const unmapped = unmappedSlugs(slugs);
  if (unmapped.length) {
    console.warn(`  ⚠ ${unmapped.length} slug(s) missing from SPECIALTY_MAP, will fall back to 'general':`);
    console.warn(`    ${unmapped.join(', ')}`);
  }

  // Resume: skip landing pages already walked in a previous run.
  const existing = readJsonl<IndexEntry>(INDEX_FILE);
  const doneSlugs = new Set(existing.flatMap((e) => e.foundUnderSlugs));
  const todo = landingPages.filter((u) => !doneSlugs.has(slugFromLandingPage(u)));
  console.log(`  ${todo.length} to walk (${landingPages.length - todo.length} already done)\n`);

  for (const [i, url] of todo.entries()) {
    console.log(`  [${i + 1}/${todo.length}] ${url}`);
    for (const entry of await crawlLandingPage(url)) appendJsonl(INDEX_FILE, entry);
  }

  const merged = mergeIndex(readJsonl<IndexEntry>(INDEX_FILE));
  console.log(`\n  ✅ ${merged.length} unique entities across ${landingPages.length} landing pages`);
  console.log(`     doctors: ${merged.filter((e) => e.entityType === 'doctor').length}`);
  console.log(`     clinics: ${merged.filter((e) => e.entityType === 'facility').length}`);
  return merged;
}

async function profiles() {
  console.log('\n📄 Phase 2 — fetching profiles\n');

  const index = mergeIndex(readJsonl<IndexEntry>(INDEX_FILE));
  if (!index.length) {
    console.error('  ✖ out/index.jsonl is empty — run the discover phase first.');
    process.exit(1);
  }

  const done = new Set(readJsonl<DoctoraliaProfile>(PROFILES_FILE).map((p) => p.doctoraliaId));
  const todo = index.filter((e) => !done.has(e.doctoraliaId)).slice(0, limit);
  console.log(`  ${todo.length} to fetch (${done.size} already scraped)`);

  const eta = (todo.length * 3.25) / 60;
  console.log(`  ~${eta < 60 ? `${Math.round(eta)} min` : `${(eta / 60).toFixed(1)} h`} at the configured rate\n`);

  const started = Date.now();
  for (const [i, entry] of todo.entries()) {
    const html = await politeGet(entry.url, { useCache: !refetch });
    if (!html) {
      console.warn(`  ✖ [${i + 1}/${todo.length}] gone: ${entry.url}`);
      continue;
    }

    try {
      appendJsonl(PROFILES_FILE, parseProfile(html, entry));
    } catch (err) {
      console.error(`  ✖ parse failed for ${entry.url}:`, err instanceof Error ? err.message : err);
      continue;
    }

    if ((i + 1) % 10 === 0 || i === todo.length - 1) {
      const mins = (Date.now() - started) / 60_000;
      const remaining = ((todo.length - i - 1) * mins) / (i + 1);
      process.stdout.write(
        `\r  ${i + 1}/${todo.length} · ${mins.toFixed(1)}m elapsed · ~${remaining.toFixed(0)}m left · ` +
          `${stats.fetched} fetched, ${stats.cached} cached, ${stats.retries} retries   `,
      );
    }
  }
  console.log('\n');
  report();
}

function report() {
  const all = readJsonl<DoctoraliaProfile>(PROFILES_FILE);
  if (!all.length) return;

  const pct = (n: number) => `${((n / all.length) * 100).toFixed(1)}%`;
  const withAddr = all.filter((p) => p.addresses.length);
  const inJuarez = all.filter((p) => p.addresses.some((a) => /ju[aá]rez/i.test(a.city ?? '')));

  const coverage = {
    total: all.length,
    doctors: all.filter((p) => p.entityType === 'doctor').length,
    clinics: all.filter((p) => p.entityType === 'facility').length,
    withCedula: all.filter((p) => p.cedulas.length).length,
    withAddress: withAddr.length,
    withCoordinates: all.filter((p) => p.addresses.some((a) => a.lat !== null)).length,
    withRating: all.filter((p) => p.rating).length,
    withServices: all.filter((p) => p.addresses.some((a) => a.services.length)).length,
    withPricedService: all.filter((p) => p.addresses.some((a) => a.services.some((s) => s.price))).length,
    withInsurances: all.filter((p) => p.insurances.length).length,
    withPhoto: all.filter((p) => p.imageUrl).length,
    withRealPhone: all.filter((p) => p.addresses.some((a) => a.phone)).length,
    withWebsite: all.filter((p) => p.website).length,
    entitiesWithJuarezAddress: inJuarez.length,
    totalAddresses: all.reduce((n, p) => n + p.addresses.length, 0),
    embeddedReviews: all.reduce((n, p) => n + p.reviews.length, 0),
    claimedReviewTotal: all.reduce((n, p) => n + p.reviewCount, 0),
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(coverage, null, 2), 'utf-8');

  console.log('  Field coverage');
  console.log(`    entities              ${coverage.total} (${coverage.doctors} doctors, ${coverage.clinics} clinics)`);
  console.log(`    cédula profesional    ${coverage.withCedula} (${pct(coverage.withCedula)})`);
  console.log(`    address               ${coverage.withAddress} (${pct(coverage.withAddress)})`);
  console.log(`    lat/lng               ${coverage.withCoordinates} (${pct(coverage.withCoordinates)})`);
  console.log(`    rating                ${coverage.withRating} (${pct(coverage.withRating)})`);
  console.log(`    services              ${coverage.withServices} (${pct(coverage.withServices)})`);
  console.log(`    …with a price         ${coverage.withPricedService} (${pct(coverage.withPricedService)})`);
  console.log(`    insurances            ${coverage.withInsurances} (${pct(coverage.withInsurances)})`);
  console.log(`    photo                 ${coverage.withPhoto} (${pct(coverage.withPhoto)})`);
  console.log(`    direct phone          ${coverage.withRealPhone} (${pct(coverage.withRealPhone)}) — clinics only`);
  console.log(`    website               ${coverage.withWebsite} (${pct(coverage.withWebsite)}) — clinics only`);
  console.log(`    reviews embedded      ${coverage.embeddedReviews} of ${coverage.claimedReviewTotal} claimed`);
  console.log(`\n  → ${REPORT_FILE}`);
}

(async () => {
  if (phase === 'discover' || phase === 'all') await discover();
  if (phase === 'profiles' || phase === 'all') await profiles();
  if (phase === 'report') report();
  console.log(
    `\n🌐 HTTP: ${stats.fetched} fetched · ${stats.cached} cached · ${stats.retries} retries · ` +
      `${stats.notFound} gone · ${stats.failed} failed · ${stats.cacheWriteFailures} cache-write misses`,
  );
})().catch((err) => {
  console.error('\n✖ fatal:', err);
  process.exit(1);
});
