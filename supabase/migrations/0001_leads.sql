-- Provider sign-up submissions from the "Get listed free" CTAs on /providers.
-- Written by src/lib/leads.ts via the anon key; read only by the service role.
-- Run in: Supabase dashboard → SQL editor.

create table if not exists public.leads (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    clinic      text not null check (char_length(clinic)  between 1 and 200),
    contact     text not null check (char_length(contact) between 1 and 200),
    email       text not null check (char_length(email)   between 3 and 320
                                     and email like '%_@_%'),
    phone       text check (char_length(phone)     <= 40),
    specialty   text check (char_length(specialty) <= 60),
    city        text check (char_length(city)      <= 120),
    message     text check (char_length(message)   <= 2000),
    locale      text check (char_length(locale)    <= 10),
    plan        text check (char_length(plan)      <= 40),
    -- Ops columns: the pipeline lives here, not in a spreadsheet.
    status      text not null default 'new'
                check (status in ('new', 'contacted', 'listed', 'rejected')),
    notes       text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

alter table public.leads enable row level security;

-- Anonymous visitors may submit, but may never read the pipeline back.
-- No select/update/delete policy exists, so the anon key cannot see other leads.
drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
    on public.leads for insert to anon with check (true);
