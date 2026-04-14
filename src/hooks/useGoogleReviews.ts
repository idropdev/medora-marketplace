import { useState, useEffect } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';

export interface GoogleReview {
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
    profile_photo_url?: string;
}

/**
 * Fetches Google Place reviews for a given placeId using the Places Service.
 * Only returns reviews with rating >= 4 ("good reviews").
 * Automatically loads the Places library if not yet available.
 */
export function useGoogleReviews(placeId?: string) {
    const [reviews, setReviews] = useState<GoogleReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        if (!placeId) {
            setReviews([]);
            setStatus('no-place-id');
            return;
        }

        let cancelled = false;
        setLoading(true);
        setStatus('loading');

        async function fetchReviews() {
            try {
                // Ensure the places library is loaded (idempotent — safe to call multiple times)
                await importLibrary('places');

                if (cancelled) return;

                const dummyDiv = document.createElement('div');
                const service = new google.maps.places.PlacesService(dummyDiv);

                service.getDetails(
                    { placeId: placeId!, fields: ['reviews'] },
                    (place, apiStatus) => {
                        if (cancelled) return;

                        console.log(`[useGoogleReviews] placeId=${placeId} status=${apiStatus} reviews=${place?.reviews?.length ?? 0}`);
                        setStatus(apiStatus);

                        if (
                            apiStatus === google.maps.places.PlacesServiceStatus.OK &&
                            place?.reviews?.length
                        ) {
                            // Only keep "good" reviews (4+ stars), sort best first
                            const good = place.reviews
                                .filter((r) => (r.rating ?? 0) >= 4)
                                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                .map((r) => ({
                                    author_name: r.author_name ?? 'Anonymous',
                                    rating: r.rating ?? 5,
                                    text: r.text ?? '',
                                    relative_time_description:
                                        (r as any).relative_time_description ?? '',
                                    profile_photo_url:
                                        (r as any).profile_photo_url ?? undefined,
                                }));
                            setReviews(good);
                        } else {
                            setReviews([]);
                        }
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('[useGoogleReviews] Error:', err);
                if (!cancelled) {
                    setReviews([]);
                    setStatus('error');
                    setLoading(false);
                }
            }
        }

        fetchReviews();

        return () => { cancelled = true; };
    }, [placeId]);

    return { reviews, loading, status };
}
