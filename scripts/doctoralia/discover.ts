import * as cheerio from 'cheerio';
import { BASE, CITY_SLUG, FACILITY_SPEC_CITY_SITEMAP, SPEC_CITY_SITEMAP } from './config';
import { politeGet } from './http';
import type { EntityType, IndexEntry } from './types';

/** Every landing page in a sitemap whose path ends in the Ciudad Juárez slug. */
export async function listCityLandingPages(): Promise<string[]> {
  const urls = new Set<string>();

  for (const sitemap of [SPEC_CITY_SITEMAP, FACILITY_SPEC_CITY_SITEMAP]) {
    const xml = await politeGet(sitemap);
    if (!xml) {
      console.warn(`  ! could not read ${sitemap}`);
      continue;
    }
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = m[1].trim();
      // Anchored: excludes benito-juarez, oaxaca-de-juarez, naucalpan-de-juarez2, juarez (N.L.)
      if (url.endsWith(`/${CITY_SLUG}`)) urls.add(url);
    }
  }

  return [...urls].sort();
}

export function slugFromLandingPage(url: string): string {
  return url.replace(`${BASE}/`, '').replace(`/${CITY_SLUG}`, '');
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse the result cards on one listing page. Cards carry everything in data-* attrs. */
export function parseListingPage(html: string, slug: string): IndexEntry[] {
  const $ = cheerio.load(html);
  const entries: IndexEntry[] = [];

  $('[data-id="result-item"]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('data-result-id');
    const url = $el.attr('data-doctor-url');
    if (!id || !url) return;

    const specNames = ($el.attr('data-eec-specialization-name') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    entries.push({
      doctoraliaId: id,
      entityType: (($el.attr('data-test-entity-type') as EntityType) ?? 'doctor'),
      name: $el.attr('data-doctor-name') ?? $el.find('[itemprop="name"]').first().text().trim(),
      url,
      foundUnderSlugs: [slug],
      specializationNames: specNames,
      ratingFromListing: num($el.attr('data-eec-stars-rating')),
      reviewCountFromListing: num($el.attr('data-eec-opinions-count')),
      cities: ($el.attr('data-eec-address-cities') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      isOnlineOnly: $el.attr('data-is-online-only') === 'true',
      isPromoted: $el.attr('data-is-first-class') === '1',
      hasPhoto: $el.attr('data-eec-has-photo') !== undefined,
      hasCalendar: $el.attr('data-eec-has-calendar') !== undefined,
    });
  });

  return entries;
}

/**
 * Walk one landing page and its ?page=N siblings until a page returns no cards
 * or repeats what we already have (Doctoralia clamps out-of-range pages to the
 * last real page rather than 404ing, so a repeat means we're done).
 */
export async function crawlLandingPage(landingUrl: string, maxPages = 200): Promise<IndexEntry[]> {
  const slug = slugFromLandingPage(landingUrl);
  const collected: IndexEntry[] = [];
  const seenOnThisSlug = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? landingUrl : `${landingUrl}?page=${page}`;
    const html = await politeGet(url);
    if (!html) break;

    const entries = parseListingPage(html, slug);
    if (entries.length === 0) break;

    const fresh = entries.filter((e) => !seenOnThisSlug.has(e.doctoraliaId));
    if (fresh.length === 0) break; // page clamped back to a page we already read

    for (const e of fresh) {
      seenOnThisSlug.add(e.doctoraliaId);
      collected.push(e);
    }

    process.stdout.write(`\r    ${slug}: page ${page}, ${collected.length} entities`);
    if (entries.length < 20) break; // short page = last page
  }

  process.stdout.write(`\r    ${slug}: ${collected.length} entities${' '.repeat(20)}\n`);
  return collected;
}

/** Merge duplicates: the same doctor appears under every specialty they list. */
export function mergeIndex(all: IndexEntry[]): IndexEntry[] {
  const byId = new Map<string, IndexEntry>();

  for (const e of all) {
    const existing = byId.get(e.doctoraliaId);
    if (!existing) {
      byId.set(e.doctoraliaId, { ...e });
      continue;
    }
    existing.foundUnderSlugs = [...new Set([...existing.foundUnderSlugs, ...e.foundUnderSlugs])];
    existing.specializationNames = [...new Set([...existing.specializationNames, ...e.specializationNames])];
    existing.cities = [...new Set([...existing.cities, ...e.cities])];
    existing.isPromoted ||= e.isPromoted;
    existing.ratingFromListing ??= e.ratingFromListing;
    existing.reviewCountFromListing ??= e.reviewCountFromListing;
  }

  return [...byId.values()];
}
