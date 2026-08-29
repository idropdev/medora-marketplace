import { useTranslation } from 'react-i18next';
import { useGooglePhotos } from '../../hooks/useGooglePhotos';

/**
 * Photos of the practice, pulled live from the provider's Google listing.
 *
 * Not stored in our database on purpose: Google's Places policies permit only
 * `place_id` to be retained indefinitely, and the photo URLs are signed and
 * expire. Fetching on open (and caching for the session) keeps us inside the
 * terms and avoids serving broken images.
 */
export function ClinicPhotos({ placeId }: { placeId?: string }) {
    const { t } = useTranslation();
    const { photos, loading } = useGooglePhotos(placeId);

    // Nothing to show and nothing pending — render no heading at all rather
    // than an empty section.
    if (!placeId || (!loading && photos.length === 0)) return null;

    return (
        <section>
            <h3
                style={{
                    fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--gray-500)',
                    margin: '0 0 0.65rem',
                }}
            >
                {t('drawer.photos', { defaultValue: 'Photos' })}
            </h3>

            {loading ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 148, height: 104, flexShrink: 0,
                                borderRadius: 'var(--radius)',
                                background: 'var(--gray-100, rgba(128,128,128,0.12))',
                            }}
                        />
                    ))}
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: 'flex', gap: '0.5rem', overflowX: 'auto',
                            paddingBottom: '0.35rem', scrollSnapType: 'x mandatory',
                        }}
                    >
                        {photos.map((photo, i) => (
                            <img
                                key={photo.url}
                                src={photo.url}
                                alt={t('drawer.photoAlt', { defaultValue: 'Clinic photo' }) + ` ${i + 1}`}
                                loading="lazy"
                                style={{
                                    width: 148, height: 104, flexShrink: 0,
                                    objectFit: 'cover', borderRadius: 'var(--radius)',
                                    scrollSnapAlign: 'start',
                                    background: 'var(--gray-100, rgba(128,128,128,0.12))',
                                }}
                            />
                        ))}
                    </div>

                    {/*
                      Google requires the photographer attribution it supplies to
                      be shown with the photo. It arrives as pre-built anchor
                      markup from the Places SDK, not user input.
                    */}
                    {photos.some((p) => p.attributionHtml) && (
                        <p
                            style={{
                                margin: '0.45rem 0 0', fontSize: '0.7rem',
                                color: 'var(--gray-500)', lineHeight: 1.5,
                            }}
                            dangerouslySetInnerHTML={{
                                __html: [...new Set(photos.map((p) => p.attributionHtml).filter(Boolean))].join(' · '),
                            }}
                        />
                    )}
                </>
            )}
        </section>
    );
}
