import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { CACHE_DIR, JITTER_MS, MAX_RETRIES, MIN_DELAY_MS, TIMEOUT_MS, USER_AGENT } from './config';

export const stats = { fetched: 0, cached: 0, retries: 0, notFound: 0, failed: 0, cacheWriteFailures: 0 };

let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cachePath(url: string) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  // Shard by first byte so no single directory holds tens of thousands of files.
  const dir = path.join(CACHE_DIR, hash.slice(0, 2));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${hash}.gz`);
}

function readCache(url: string): string | null {
  const file = cachePath(url);
  if (!fs.existsSync(file)) return null;
  try {
    return zlib.gunzipSync(fs.readFileSync(file)).toString('utf-8');
  } catch {
    return null; // truncated write from an interrupted run — refetch
  }
}

function writeCache(url: string, body: string) {
  const file = cachePath(url);
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, zlib.gzipSync(Buffer.from(body, 'utf-8')));
    fs.renameSync(tmp, file); // atomic: a killed run never leaves a half-written entry
  } catch (err) {
    // The cache is an optimisation, never a correctness requirement. On Windows
    // an on-access AV scanner can hold or remove the .tmp between write and
    // rename; letting that throw would bubble into politeGet's retry loop and
    // burn a second request on a page we already have in memory.
    stats.cacheWriteFailures++;
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // nothing more we can do about a stray temp file
    }
  }
}

async function throttle() {
  const wait = lastRequestAt + MIN_DELAY_MS + Math.random() * JITTER_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/**
 * Single-threaded, cached, backing-off GET. Returns null on a hard 404/410
 * (the profile was deleted) so callers can record the gap instead of dying.
 */
export async function politeGet(url: string, opts: { useCache?: boolean } = {}): Promise<string | null> {
  const useCache = opts.useCache !== false;

  if (useCache) {
    const hit = readCache(url);
    if (hit !== null) {
      stats.cached++;
      return hit;
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      if (res.status === 404 || res.status === 410) {
        stats.notFound++;
        return null;
      }

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(60_000, 5_000 * 2 ** attempt);
        stats.retries++;
        console.warn(`  ↻ ${res.status} on ${url} — backing off ${Math.round(backoff / 1000)}s`);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        stats.failed++;
        console.warn(`  ✖ ${res.status} on ${url} — giving up on this URL`);
        return null;
      }

      const body = await res.text();
      stats.fetched++;
      if (useCache) writeCache(url, body);
      return body;
    } catch (err) {
      stats.retries++;
      const backoff = Math.min(60_000, 3_000 * 2 ** attempt);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ↻ network error on ${url} (${msg}) — retrying in ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }

  stats.failed++;
  console.error(`  ✖ exhausted retries on ${url}`);
  return null;
}
