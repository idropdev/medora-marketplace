/**
 * Supabase Database Webhook receiver → email notification via Resend.
 *
 * Fires on every INSERT into `public.leads` (see supabase/migrations/0001_leads.sql)
 * so a "Get listed free" submission reaches a human within seconds instead of
 * waiting for someone to open the Supabase table editor.
 *
 * Deployed as a Vercel Serverless Function at POST /api/lead-notify.
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 * 1. Vercel → Project → Settings → Environment Variables (all server-side, no
 *    VITE_ prefix, so they never enter the browser bundle):
 *       RESEND_API_KEY      re_...            (resend.com/api-keys)
 *       LEAD_NOTIFY_SECRET  <random string>   (openssl rand -hex 32)
 *       LEAD_NOTIFY_TO      hello@medsociety.one    (comma-separated for several)
 *       LEAD_NOTIFY_FROM    "MedSociety <leads@medsociety.one>"
 *    LEAD_NOTIFY_FROM must be on a domain verified in Resend, or sends 403.
 *
 * 2. Supabase → Database → Webhooks → Create a new hook:
 *       Table       public.leads
 *       Events      Insert
 *       Type        HTTP Request → POST
 *       URL         https://<your-domain>/api/lead-notify
 *       HTTP Header x-webhook-secret: <same value as LEAD_NOTIFY_SECRET>
 *
 * The secret header is what authenticates the caller — this endpoint is public,
 * so without it anyone could POST a fake lead email. Never log its value.
 */
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** The Vercel Node runtime pre-parses JSON bodies onto `req.body`. */
type Req = IncomingMessage & { body?: unknown };
type Res = ServerResponse & {
    status: (code: number) => Res;
    json: (body: unknown) => void;
};

/** Columns we render; mirrors the `leads` table. */
interface LeadRecord {
    id?: string;
    created_at?: string;
    clinic?: string;
    contact?: string;
    email?: string;
    phone?: string | null;
    specialty?: string | null;
    city?: string | null;
    message?: string | null;
    locale?: string | null;
    plan?: string | null;
}

interface WebhookPayload {
    type?: string;
    table?: string;
    record?: LeadRecord;
}

/** Constant-time compare that tolerates unequal lengths without throwing. */
function secretMatches(provided: string | undefined, expected: string): boolean {
    if (!provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/** Falls back to reading the stream when the runtime did not parse a body. */
async function readBody(req: Req): Promise<WebhookPayload> {
    if (req.body && typeof req.body === 'object') return req.body as WebhookPayload;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};

    try {
        return JSON.parse(raw) as WebhookPayload;
    } catch {
        return {};
    }
}

/** Escapes interpolated lead text so a submission can't inject HTML. */
function esc(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderEmail(lead: LeadRecord): { subject: string; html: string; text: string } {
    const rows: [string, string | null | undefined][] = [
        ['Clinic', lead.clinic],
        ['Contact', lead.contact],
        ['Email', lead.email],
        ['Phone', lead.phone],
        ['Specialty', lead.specialty],
        ['City', lead.city],
        ['Plan clicked', lead.plan],
        ['Language', lead.locale],
    ];
    const present = rows.filter(([, v]) => v);

    const subject = `New listing request: ${lead.clinic ?? 'unknown clinic'}`;

    const html =
        `<h2 style="margin:0 0 16px;font:600 18px system-ui,sans-serif">${esc(subject)}</h2>` +
        '<table style="border-collapse:collapse;font:14px system-ui,sans-serif">' +
        present
            .map(
                ([label, value]) =>
                    `<tr><td style="padding:4px 16px 4px 0;color:#666">${esc(label)}</td>` +
                    `<td style="padding:4px 0"><strong>${esc(value)}</strong></td></tr>`
            )
            .join('') +
        '</table>' +
        (lead.message
            ? `<p style="margin:16px 0 0;font:14px system-ui,sans-serif;white-space:pre-wrap">${esc(lead.message)}</p>`
            : '') +
        (lead.email
            ? `<p style="margin:24px 0 0"><a href="mailto:${esc(lead.email)}" ` +
              `style="font:14px system-ui,sans-serif">Reply to ${esc(lead.contact ?? lead.email)}</a></p>`
            : '');

    const text =
        present.map(([label, value]) => `${label}: ${value}`).join('\n') +
        (lead.message ? `\n\n${lead.message}` : '');

    return { subject, html, text };
}

export default async function handler(req: Req, res: Res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = process.env.LEAD_NOTIFY_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    const to = (process.env.LEAD_NOTIFY_TO ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    const from = process.env.LEAD_NOTIFY_FROM;

    if (!secret || !apiKey || !from || to.length === 0) {
        console.error('[lead-notify] misconfigured: missing env vars');
        return res.status(500).json({ error: 'Notification not configured' });
    }

    const header = req.headers['x-webhook-secret'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!secretMatches(provided, secret)) {
        // Deliberately vague — don't help a prober distinguish missing from wrong.
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = await readBody(req);
    const lead = payload.record;
    if (!lead || typeof lead !== 'object') {
        return res.status(400).json({ error: 'No record in payload' });
    }

    const { subject, html, text } = renderEmail(lead);

    const resend = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to,
            subject,
            html,
            text,
            // Hitting reply in the inbox reaches the clinic, not us.
            ...(lead.email ? { reply_to: lead.email } : {}),
        }),
    });

    if (!resend.ok) {
        const detail = await resend.text();
        // Surface a 5xx so Supabase records the failed delivery in the webhook log —
        // the lead row itself is already safely stored either way.
        console.error('[lead-notify] resend failed:', resend.status, detail);
        return res.status(502).json({ error: 'Email delivery failed' });
    }

    return res.status(200).json({ ok: true });
}
