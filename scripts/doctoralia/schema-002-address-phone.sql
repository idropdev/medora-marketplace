-- Migration for databases where schema.sql was already run.
-- Adds the real (non-Doctoralia) phone number captured from clinic pages.
-- Safe to re-run.

alter table public.doctoralia_addresses
  add column if not exists phone text;

comment on column public.doctoralia_addresses.phone is
  'Directly-dialable number published on clinic profiles. Distinct from doctoralia_phone, which is Doctoralia''s own booking-assistant line.';
