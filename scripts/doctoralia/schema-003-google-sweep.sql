-- Raw Google Places sweep results for Ciudad Juárez.
--
-- A broad sweep ("all dentists in Juárez") is roughly 15x cheaper per provider
-- found than asking about each doctor individually. Everything it returns is
-- kept here, whether or not it corresponds to a Doctoralia row — the leftovers
-- are Google-only providers worth adding to the directory in their own right.

create table if not exists public.google_places_juarez (
  place_id        text primary key,
  name            text not null,
  formatted_address text,
  lat             double precision,
  lng             double precision,
  phone           text,
  website         text,
  rating          numeric(2,1),
  review_count    integer,
  types           text[] not null default '{}',
  business_status text,

  -- Which sweep query surfaced it (kept for coverage debugging).
  found_via       text[] not null default '{}',

  -- Filled by the local link step; no API cost.
  doctoralia_id   text references public.doctoralia_doctors(doctoralia_id) on delete set null,
  link_score      numeric(3,2),
  link_distance_m integer,

  fetched_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists google_places_juarez_geo_idx        on public.google_places_juarez (lat, lng);
create index if not exists google_places_juarez_doctoralia_idx on public.google_places_juarez (doctoralia_id);
create index if not exists google_places_juarez_phone_idx      on public.google_places_juarez (phone)
  where phone is not null;

alter table public.google_places_juarez enable row level security;
