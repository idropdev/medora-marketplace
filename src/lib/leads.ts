import { supabase } from './supabase';

/**
 * Provider sign-up submissions from the "For Providers" page.
 *
 * Requires a `leads` table. Run this once in the Supabase SQL editor:
 *
 *   create table public.leads (
 *     id          uuid primary key default gen_random_uuid(),
 *     created_at  timestamptz not null default now(),
 *     clinic      text not null,
 *     contact     text not null,
 *     email       text not null,
 *     phone       text,
 *     specialty   text,
 *     city        text,
 *     message     text,
 *     locale      text,
 *     plan        text
 *   );
 *
 *   alter table public.leads enable row level security;
 *
 *   -- Anonymous visitors may submit, but may never read the pipeline back.
 *   create policy "anon can submit leads"
 *     on public.leads for insert to anon with check (true);
 *
 * Until that table exists, submitInquiry falls back to a prefilled email so
 * the page is never a dead end.
 */

export const CONTACT_EMAIL = 'hello@medsociety.one';

export interface ProviderInquiry {
    clinic: string;
    contact: string;
    email: string;
    phone?: string;
    specialty?: string;
    city?: string;
    message?: string;
    locale?: string;
    /** Which plan the visitor was looking at when they submitted. */
    plan?: string;
}

export type InquiryResult =
    | { status: 'saved' }
    | { status: 'email'; mailto: string }
    | { status: 'error'; message: string };

/** Builds a prefilled mailto so a failed insert still reaches a human. */
export function inquiryMailto(inquiry: ProviderInquiry): string {
    const lines = [
        `Clinic: ${inquiry.clinic}`,
        `Contact: ${inquiry.contact}`,
        `Email: ${inquiry.email}`,
        inquiry.phone ? `Phone: ${inquiry.phone}` : null,
        inquiry.specialty ? `Specialty: ${inquiry.specialty}` : null,
        inquiry.city ? `City: ${inquiry.city}` : null,
        inquiry.plan ? `Plan: ${inquiry.plan}` : null,
        '',
        inquiry.message ?? '',
    ].filter((l): l is string => l !== null);

    const subject = `MedSociety listing request: ${inquiry.clinic}`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export async function submitInquiry(inquiry: ProviderInquiry): Promise<InquiryResult> {
    if (!supabase) {
        return { status: 'email', mailto: inquiryMailto(inquiry) };
    }

    try {
        const { error } = await supabase.from('leads').insert({
            clinic: inquiry.clinic,
            contact: inquiry.contact,
            email: inquiry.email,
            phone: inquiry.phone ?? null,
            specialty: inquiry.specialty ?? null,
            city: inquiry.city ?? null,
            message: inquiry.message ?? null,
            locale: inquiry.locale ?? null,
            plan: inquiry.plan ?? null,
        });

        if (error) {
            // Most likely the table or policy is not set up yet — don't lose the lead.
            console.warn('[leads] insert failed, falling back to email:', error.message);
            return { status: 'email', mailto: inquiryMailto(inquiry) };
        }

        return { status: 'saved' };
    } catch (err) {
        console.error('[leads] unexpected failure:', err);
        return { status: 'email', mailto: inquiryMailto(inquiry) };
    }
}
