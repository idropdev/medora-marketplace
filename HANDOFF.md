# HANDOFF.md

## 1. Purpose

MedSociety is a bilingual (EN/ES) healthcare-provider directory and lead-generation marketplace for the El Paso, TX / Ciudad Juárez, Mexico border region. Patients search and filter a map + list of medical providers (dentists, OB/GYN, urgent care, mental health, pharmacy, telehealth, etc.) by specialty, country, and rating, then click through to a provider's profile (phone/website/address). A `/sales` landing page pitches the product to clinics/providers who would pay to be listed or "promoted" (see the `promoted`/`verified` flags on `Provider`). Provider data is scraped from Google Places and seeded into Supabase; there is no user-facing account system or payment flow in the code yet.

## 2. Status

- **Active.** Last commit: `2026-08-15 13:39:43 -0600` by Carlos Gonzalez — "add sales page" (current branch: `main`).
- Working tree has uncommitted local changes at time of writing: `src/types/provider.ts` (added `email?: string` to `Provider`) and `scripts/seed-providers.ts` (in progress — presumably to write that new field).

## 3. Stack

From `package.json` (exact versions as pinned, `^` = minor/patch float allowed by npm):

- React `^19.2.4` + React DOM `^19.2.4`, React Router `^7.13.1`
- Vite `^8.0.0` + `@vitejs/plugin-react` `^6.0.0`, TypeScript `~5.9.3`
- Supabase JS client `@supabase/supabase-js` `^2.99.2` (Postgres backend + auth-capable, but auth is unused here)
- `@googlemaps/js-api-loader` `^2.0.2` + `@types/google.maps` `^3.58.1` (Google Maps JS API, Places, Geocoding)
- `@tanstack/react-virtual` `^3.13.23` (virtualized provider list)
- `i18next` `^26.0.4`, `react-i18next` `^17.0.2`, `i18next-browser-languagedetector` `^8.2.1` (EN/ES localization)
- `lucide-react` `^0.577.0` (icons)
- Lint: ESLint `^9.39.4` flat config + `typescript-eslint` `^8.56.1`, `eslint-plugin-react-hooks` `^7.0.1`, `eslint-plugin-react-refresh` `^0.5.2`
- No test framework is present in dependencies.
- No `.nvmrc` and no `engines` field in `package.json` — Node version is UNKNOWN (checked both, neither exists).
- Deployed on Vercel (`vercel.json` present with an SPA rewrite rule).

## 4. Setup & Commands

```bash
npm install
cp .env.example .env.local   # then fill in the values (see section 8)
npm run dev                  # vite dev server, fixed port 5174 (vite.config.ts)
npm run build                # tsc -b && vite build
npm run lint                 # eslint .
npm run preview              # serve the production build locally
```

- **No test script defined** — `package.json` has no `test` entry and no test framework is installed.
- Provider data scripts (run with `tsx`/`node` directly, not wired into `npm run`):
  - `scripts/seed-providers.ts` — scrapes Google Places, seeds/upserts into Supabase `providers` table, caches raw API responses in `scripts/.cache/` (gitignored).
  - `scripts/list-providers.js`, `scripts/find-clinic.js`, `scripts/find-dentist.js`, `scripts/check-null-ids.js` — ad hoc query/debug utilities against the Supabase `providers` table. Each hand-parses `.env.local` itself (no dotenv dependency).

## 5. Architecture Map

```
src/
  App.tsx                 Router root: "/" -> MapPage, "/sales" -> SalesPage
  main.tsx                Entry point; initializes i18n before render
  index.css, App.css       Global styles (plain CSS, CSS custom properties, no CSS framework)
  types/provider.ts        Provider, Specialty, ProviderFilters types + SpecialtyLabels (source of truth for domain model)
  lib/supabase.ts          Browser Supabase client (anon key only) + dev-time safety check against accidentally using the service-role key
  data/providers.ts        mockProviders — fallback dataset used when Supabase is unreachable/unconfigured or empty
  hooks/useProviders.ts    Fetches + normalizes providers from Supabase (camelCase<->lowercase column fixup), applies search/specialty/country/rating filters, sorts promoted-first
  hooks/useGoogleReviews.ts Loads Google Places reviews for a provider (falls back to mockGoogleReviews)
  pages/MapPage.tsx        Main directory UI: sidebar (search+filters+virtualized list) + map, mobile map/list toggle
  pages/SalesPage.tsx      Marketing/pitch landing page for prospective paying clinics
  components/map/MapView.tsx           Google Maps wrapper (light/dark map styles, markers)
  components/provider/ProviderCard.tsx  List row for a provider
  components/provider/ProviderDrawer.tsx Detail panel/drawer for a selected provider
  components/provider/ReviewCarousel.tsx Renders GoogleReview[] from useGoogleReviews
  components/search/SearchBar.tsx, FilterBar.tsx  Search input + specialty/country/rating filter controls
  components/layout/Navbar.tsx          Top nav (route links, language switch presumably)
  utils/analytics.ts        trackProviderClick() — currently a console.log stub, not yet wired to Supabase (see section 9)
  i18n/index.ts, i18n/locales/{en,es}.json  i18next setup + translation strings
scripts/
  seed-providers.ts         Google Places -> Supabase seeder (server-only service-role key)
  list-providers.js, find-clinic.js, find-dentist.js, check-null-ids.js  One-off Supabase query/debug scripts
clinics_export.csv          Tracked in git; a flat export of provider/clinic rows (name, specialty, phone, address, rating, etc.) — public business directory data, not sensitive
public/                     Static assets served as-is (favicon/logo etc.)
dist/                       Build output (gitignored territory; present locally from a prior `npm run build`)
```

## 6. Entry Points — Read These First

1. `src/types/provider.ts` — the `Provider` shape is the "god node" of the app (10 graph edges); every component and hook depends on it.
2. `src/hooks/useProviders.ts` — where data actually comes from (Supabase vs. mock fallback), plus all filtering/sorting logic.
3. `src/pages/MapPage.tsx` — composes the whole primary user-facing screen; shows how the components fit together.
4. `src/lib/supabase.ts` — explains the anon-key/service-role-key security model; read before touching any DB code.
5. `scripts/seed-providers.ts` — how provider data is populated; needed context before changing the `Provider` schema (a change is in progress here, see section 2).
6. `src/pages/SalesPage.tsx` — the business/monetization pitch; useful for understanding "promoted"/"verified" provider fields.

## 7. Conventions & Gotchas

- **Postgres lowercases unquoted column names.** `useProviders.ts` has to manually re-map `googleplaceid` → `googlePlaceId`, `reviewcount` → `reviewCount`, `imageurl` → `imageUrl` when reading rows back from Supabase. If you add new camelCase fields to `Provider` (as the in-progress `email` field does), check whether `normalizeProvider()` needs a matching fallback.
- **Two key tiers, don't mix them:** `VITE_*`-prefixed vars are bundled into client JS by Vite and are intentionally public (protected by Google Maps referrer restrictions and Supabase Row Level Security). `SUPABASE_SERVICE_ROLE_KEY` has no `VITE_` prefix on purpose — it bypasses RLS and must only be read via `process.env` in Node scripts, never in browser code. `src/lib/supabase.ts` has a dev-time runtime check that throws if the anon key JWT actually decodes to a `service_role` payload.
- **Silent fallback to mock data:** if Supabase env vars are missing, the query errors, or the table is empty, `useProviders.ts` silently falls back to `mockProviders` from `src/data/providers.ts` (with a console warning only). A developer debugging "why don't my seeded providers show up" should check the browser console first, not assume the UI reflects the DB.
- **`trackProviderClick()` is a no-op stub** (`src/utils/analytics.ts`) — it only `console.log`s in dev; it does not persist click counts to Supabase despite `Provider.clicks` existing as a field. Don't assume click analytics are live.
- Inline styles (JS objects), not Tailwind/CSS-in-JS library, are used throughout `SalesPage.tsx`/`MapPage.tsx` — CSS custom properties (`var(--navy)`, `var(--gold)`, etc.) defined presumably in `index.css`/`App.css` drive the theme.
- Product/brand name is **"MedSociety"** (see `index.html` `<title>`, `hello@medsociety.one` contact email in `SalesPage.tsx`) while the npm package is named `medsociety-marketplace` and the repository folder is `medora-marketplace` — three different names for the same product; don't assume they're different projects.
- `index.html` embeds third-party analytics scripts directly (Contentsquare and Microsoft Clarity tags) — not environment-gated, they load in every environment including local dev.

## 8. External Dependencies & Environment

- **Supabase** (Postgres + client SDK) — the `providers` table is the primary data store.
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — browser-side, RLS-protected.
  - `SUPABASE_SERVICE_ROLE_KEY` — server/script-only, bypasses RLS, used by `scripts/seed-providers.ts` and the debug scripts.
- **Google Maps Platform** (Maps JavaScript API, Places API, Geocoding API — all must be enabled in Google Cloud Console).
  - `VITE_GOOGLE_MAPS_API_KEY` — browser-side; intended to be locked down with HTTP referrer restrictions per the comment in `.env.example`.
  - Also reused server-side by `scripts/seed-providers.ts` (as `process.env.VITE_GOOGLE_MAPS_API_KEY`) to call the Places Text Search / Place Details REST APIs directly.
- **Contentsquare** and **Microsoft Clarity** — third-party session-analytics scripts hardcoded in `index.html` with embedded tracking IDs (not env vars).
- **Vercel** — deployment target; `vercel.json` only configures SPA fallback routing, no other Vercel-specific config found.
- All four env var names above are documented with setup instructions in `.env.example`. `.env.local` exists locally and is correctly gitignored (verified not tracked by git); do not commit it.

## 9. Lead Capture Pipeline

The "Get listed free" CTAs on `/providers` all open `src/components/sales/InquiryModal.tsx`
(a plain HTML form, no third-party embed). Flow:

```
InquiryModal  →  src/lib/leads.ts  →  Supabase public.leads  →  Database Webhook
                        │                                              │
                        └─ on any insert error: mailto: fallback       └─ POST /api/lead-notify
                           to hello@medsociety.one                        → Resend email
```

- Schema + RLS: `supabase/migrations/0001_leads.sql`. Anon may INSERT only — there is no
  select policy, so the public key cannot read the pipeline back.
- Read the pipeline locally: `npx tsx --env-file=.env.local scripts/list-leads.ts [status]`
  (needs `SUPABASE_SERVICE_ROLE_KEY`; the anon key is deliberately blind here).
- Notification: `api/lead-notify.ts` — its header comment carries the full Vercel + Supabase
  webhook setup. Authenticated by an `x-webhook-secret` header, not a signature.
- **Gotcha:** `submitInquiry()` falls back to `mailto:` on *any* insert failure and only
  `console.warn`s. A broken table or policy therefore looks like a working site while
  quietly costing leads — after touching RLS, submit a test lead and confirm a row appears
  rather than a mail client opening.

## 10. Known Issues & TODOs

- `src/utils/analytics.ts` contains an explicit `// TODO: swap with Supabase increment when live` — click tracking is a stub only, not persisted.
- Uncommitted in-progress change: `email?: string` was just added to the `Provider` type but `useProviders.ts`'s `normalizeProvider()` has not been updated with a lowercase-fallback mapping for it (unlike `googlePlaceId`/`reviewCount`/`imageUrl`) — worth checking whether that's needed before/after the `seed-providers.ts` change lands.
- `README.md` is still the unmodified default Vite/React template README — it documents template boilerplate (ESLint config expansion advice), not this project.
- No automated tests exist for any part of the app.

## 11. Fast Orientation for a New Agent

```bash
export PATH="$HOME/.local/bin:$PATH"
graphify query "How does provider data flow from Google Places to the map UI?"
graphify god-nodes --top 15
cat graphify-out/GRAPH_REPORT.md
```

The graph (`graphify-out/GRAPH_REPORT.md`, built from commit `9ff2245e`) shows `Provider` as the top domain god-node (10 edges) and `trackProviderClick()`/`scrapeEmailFromWebsite()`/`runSeeder()` as the next most-connected — confirming the data pipeline (scrape → seed → Supabase → `useProviders` → UI) is the core of this codebase. Run `git rev-parse HEAD` and compare to `9ff2245e` to check graph freshness before trusting it deeply; run `graphify update .` if stale.

**Best first question to ask the graph:** *"What does `Provider` connect to, and which components would break if I changed its shape?"* — since `Provider` is the single highest-degree node and nearly every component/hook/page in `src/` depends on its exact fields (see the `normalizeProvider()` gotcha in section 7), this is the question most likely to prevent a regression before editing.
