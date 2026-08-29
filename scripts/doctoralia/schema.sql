-- Doctoralia staging tables + the link back to `providers`.
-- Run once in the Supabase SQL editor (or `psql`) before `load.ts`.
--
-- Design: the scrape lands in its own normalised tables and is NEVER destructive
-- to `providers`. `load.ts` then projects a curated subset into `providers` and
-- records the link in `doctoralia_doctors.provider_id`, so a re-scrape can
-- refresh the raw data without touching the marketplace rows you have curated.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Entities (doctors and clinics)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.doctoralia_doctors (
  doctoralia_id        text primary key,
  entity_type          text not null default 'doctor' check (entity_type in ('doctor', 'facility')),
  name                 text not null,
  slug                 text,
  url                  text not null,

  -- Professional licence numbers (cédula profesional). Verifiable against
  -- cedulaprofesional.sep.gob.mx — the main thing Google Places cannot give you.
  cedulas              text[] not null default '{}',

  specializations      text[] not null default '{}',  -- raw Spanish labels from Doctoralia
  found_under_slugs    text[] not null default '{}',  -- listing pages the entity appeared on
  mapped_specialties   text[] not null default '{}',  -- projected onto our Specialty union

  about                text,
  image_url            text,
  rating               numeric(2,1),
  review_count         integer not null default 0,
  insurances           text[] not null default '{}',
  languages            text[] not null default '{}',
  is_promoted          boolean not null default false,

  scraped_at           timestamptz not null,
  raw                  jsonb not null,                -- full scraped record, for re-projection

  -- Link into the marketplace. Null = not (yet) surfaced in `providers`.
  provider_id          uuid references public.providers(id) on delete set null,
  match_method         text,                          -- how it was deduped: exact_name_geo | phone | cedula | manual | new
  match_confidence     numeric(3,2),
  review_status        text not null default 'pending'
                       check (review_status in ('pending', 'approved', 'rejected', 'duplicate')),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists doctoralia_doctors_provider_idx  on public.doctoralia_doctors (provider_id);
create index if not exists doctoralia_doctors_status_idx    on public.doctoralia_doctors (review_status);
create index if not exists doctoralia_doctors_specialty_idx on public.doctoralia_doctors using gin (mapped_specialties);
create index if not exists doctoralia_doctors_cedula_idx    on public.doctoralia_doctors using gin (cedulas);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Practice locations (a doctor commonly has 2-4)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.doctoralia_addresses (
  id                  uuid primary key default gen_random_uuid(),
  doctoralia_id       text not null references public.doctoralia_doctors(doctoralia_id) on delete cascade,
  address_id          text,                            -- Doctoralia's own address id
  clinic_name         text,
  street              text,
  district            text,
  postal_code         text,
  city                text,
  province            text,
  country_code        text,
  lat                 double precision,
  lng                 double precision,

  -- Doctoralia's 24/7 booking-assistant line for this address (656 738 xxxx).
  -- It is a Doctoralia-owned routing number, NOT the practice's direct line.
  -- Deliberately kept out of providers.phone.
  doctoralia_phone    text,

  -- A real, directly-dialable number. Clinic pages publish one (masked only
  -- visually, in data-phone-number); doctor pages never do. Safe to surface.
  phone               text,

  is_online_only      boolean not null default false,
  insurances          text[] not null default '{}',
  payment_methods     text[] not null default '{}',

  created_at          timestamptz not null default now(),
  unique (doctoralia_id, address_id)
);

create index if not exists doctoralia_addresses_doctor_idx on public.doctoralia_addresses (doctoralia_id);
create index if not exists doctoralia_addresses_geo_idx    on public.doctoralia_addresses (lat, lng);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Services and their published prices
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.doctoralia_services (
  id             uuid primary key default gen_random_uuid(),
  address_id     uuid not null references public.doctoralia_addresses(id) on delete cascade,
  doctoralia_id  text not null references public.doctoralia_doctors(doctoralia_id) on delete cascade,
  name           text not null,
  slug           text,
  price_text     text,           -- verbatim: '$1,500', 'Desde $1,000', 'Servicio gratuito'
  price_mxn      numeric(10,2),  -- parsed lower bound, null when unpriced
  price_is_from  boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists doctoralia_services_doctor_idx on public.doctoralia_services (doctoralia_id);
create index if not exists doctoralia_services_slug_idx   on public.doctoralia_services (slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Reviews embedded in the profile page
--    (a subset — doctoralia_doctors.review_count holds the true total)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.doctoralia_reviews (
  id             uuid primary key default gen_random_uuid(),
  doctoralia_id  text not null references public.doctoralia_doctors(doctoralia_id) on delete cascade,
  author         text,           -- as displayed: a first name or initials, never a full identity
  rating         numeric(2,1),
  published_at   timestamptz,
  body           text,
  created_at     timestamptz not null default now(),
  unique (doctoralia_id, author, published_at)
);

create index if not exists doctoralia_reviews_doctor_idx on public.doctoralia_reviews (doctoralia_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. providers: track the second source alongside googlePlaceId
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.providers add column if not exists "doctoraliaId" text;
create unique index if not exists providers_doctoralia_id_key
  on public.providers ("doctoraliaId") where "doctoraliaId" is not null;

-- `source` may be constrained to ('google','manual'); widen it if so.
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'providers' and column_name = 'source'
  ) then
    begin
      alter table public.providers drop constraint if exists providers_source_check;
      alter table public.providers add constraint providers_source_check
        check (source in ('google', 'manual', 'doctoralia'));
    exception when others then
      raise notice 'providers.source constraint left as-is: %', sqlerrm;
    end;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — staging tables are service-role only. The public site reads
--    `providers`, never these. Add a read policy explicitly if that changes.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.doctoralia_doctors   enable row level security;
alter table public.doctoralia_addresses enable row level security;
alter table public.doctoralia_services  enable row level security;
alter table public.doctoralia_reviews   enable row level security;
