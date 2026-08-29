-- Google Places enrichment columns. Run after schema.sql, before enrich.ts.
--
-- Doctoralia publishes almost no contact details (1% of entities have a direct
-- phone, 0.4% a website). This adds a place to record what Google Places knows
-- about the same practice, kept separate from the scraped fields so you can
-- always tell which source a number came from.

alter table public.doctoralia_doctors
  add column if not exists google_place_id      text,
  add column if not exists google_name          text,
  add column if not exists google_phone         text,
  add column if not exists google_website       text,
  add column if not exists google_address       text,
  add column if not exists google_rating        numeric(2,1),
  add column if not exists google_review_count  integer,

  -- 'entity' = Google returned the provider/clinic itself.
  -- 'venue'  = only the building matched (e.g. "Hospital Ángeles"), so the
  --            phone is the venue switchboard, NOT this doctor's line.
  -- 'none'   = searched, nothing passed the distance + name thresholds.
  add column if not exists google_match_type    text
    check (google_match_type in ('entity', 'venue', 'none')),
  add column if not exists google_match_score   numeric(3,2),
  add column if not exists google_distance_m    integer,
  add column if not exists enriched_at          timestamptz;

create index if not exists doctoralia_doctors_google_place_idx
  on public.doctoralia_doctors (google_place_id);
create index if not exists doctoralia_doctors_match_type_idx
  on public.doctoralia_doctors (google_match_type);
