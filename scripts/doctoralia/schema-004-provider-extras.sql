-- Insurers accepted and the Doctoralia booking link, surfaced on providers.
--
-- Both come from our own Doctoralia scrape, so unlike Google Places content
-- they carry no storage restriction — Google's terms allow only place_id to be
-- stored indefinitely, which is why photos and reviews stay client-side.

alter table public.providers
  -- Insurers accepted at this practice, verbatim as published
  -- ('GNP Seguros', 'AXA Seguros', 'MetLife México'…).
  add column if not exists insurances text[] not null default '{}',

  -- Doctoralia profile URL, set only where that profile actually has a
  -- bookable calendar. Null means "no online booking", not "unknown".
  add column if not exists "bookingUrl" text;

-- Lets the UI filter to "accepts my insurance" without a table scan.
create index if not exists providers_insurances_idx
  on public.providers using gin (insurances);
