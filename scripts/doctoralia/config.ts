import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BASE = 'https://www.doctoralia.com.mx';

/** Sitemap that lists every {specialty}/{city} landing page Doctoralia publishes. */
export const SPEC_CITY_SITEMAP = `${BASE}/sitemaps/monolith/sitemap.specialization_city.xml`;
export const FACILITY_SPEC_CITY_SITEMAP = `${BASE}/sitemaps/monolith/sitemap.facility_specialization_city.xml`;

/**
 * Doctoralia's slug for Ciudad Juárez. Deliberately anchored: `benito-juarez`,
 * `oaxaca-de-juarez`, `naucalpan-de-juarez2` and plain `juarez` (Juárez, N.L.)
 * are different municipalities and must not be swept in.
 */
export const CITY_SLUG = 'ciudad-juarez';
export const CITY_LABEL = 'Ciudad Juárez';

/**
 * Politeness budget. robots.txt sets no Crawl-delay for the default agent, so
 * this is our own ceiling: ~1 request every 2.5-4s, single-threaded, no proxies.
 * Raising the rate is the fastest way to get this IP blocked — don't.
 */
export const MIN_DELAY_MS = 2500;
export const JITTER_MS = 1500;
export const MAX_RETRIES = 5;
export const TIMEOUT_MS = 45_000;

/**
 * Listing pages are served fine to a normal browser UA and we make no attempt
 * to defeat bot detection (there is none in front of these paths). We stay off
 * every path robots.txt disallows: /buscar?, /api/, /ajax/.
 */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const CACHE_DIR = path.join(__dirname, '.cache');
export const OUT_DIR = path.join(__dirname, 'out');

export const INDEX_FILE = path.join(OUT_DIR, 'index.jsonl');
export const PROFILES_FILE = path.join(OUT_DIR, 'profiles.jsonl');
export const REPORT_FILE = path.join(OUT_DIR, 'report.json');
