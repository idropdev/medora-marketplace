import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Show this many before collapsing behind a "+N more" toggle. */
const VISIBLE = 6;

/**
 * Insurers a practice accepts, as published on their Doctoralia profile.
 *
 * Absence is genuinely ambiguous here — Doctoralia only lists insurers for
 * profiles that are bookable through them, so "no insurers listed" means we
 * don't know, not that the clinic is cash-only. The copy says so, because
 * implying otherwise could cost a patient a covered appointment.
 */
export function InsuranceList({ insurances }: { insurances: string[] }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    if (!insurances.length) return null;

    const shown = expanded ? insurances : insurances.slice(0, VISIBLE);
    const hidden = insurances.length - shown.length;

    return (
        <section>
            <h3
                style={{
                    fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--gray-500)',
                    margin: '0 0 0.65rem',
                }}
            >
                {t('drawer.insurance', { defaultValue: 'Insurance accepted' })}
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {shown.map((name) => (
                    <span
                        key={name}
                        style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            padding: '0.3rem 0.6rem', borderRadius: '99px',
                            border: '1px solid var(--border)', color: 'var(--text)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {name}
                    </span>
                ))}

                {hidden > 0 && (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="press"
                        style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            padding: '0.3rem 0.6rem', borderRadius: '99px',
                            border: '1px dashed var(--border)', background: 'transparent',
                            color: 'var(--gray-500)', cursor: 'pointer',
                        }}
                    >
                        {t('drawer.insuranceMore', { count: hidden, defaultValue: `+${hidden} more` })}
                    </button>
                )}
            </div>

            <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
                {t('drawer.insuranceDisclaimer', {
                    defaultValue: 'Coverage varies by service and location — confirm with the provider before your visit.',
                })}
            </p>
        </section>
    );
}
