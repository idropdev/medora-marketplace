import type { Specialty } from '../../src/types/provider';

export type EntityType = 'doctor' | 'facility';

/** One row of a {specialty}/{city} listing page. Cheap, no profile fetch needed. */
export interface IndexEntry {
  doctoraliaId: string;
  entityType: EntityType;
  name: string;
  url: string;
  /** Doctoralia slugs this entity was found under, e.g. ['cardiologo']. */
  foundUnderSlugs: string[];
  specializationNames: string[];
  ratingFromListing: number | null;
  reviewCountFromListing: number | null;
  cities: string[];
  isOnlineOnly: boolean;
  isPromoted: boolean;
  hasPhoto: boolean;
  hasCalendar: boolean;
}

export interface DoctoraliaAddress {
  addressId: string | null;
  /** Clinic / hospital / "Consultorio" label Doctoralia shows for this location. */
  clinicName: string | null;
  street: string | null;
  district: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  /**
   * Doctoralia's own 24/7 booking-assistant number for this address
   * (always 656 738 xxxx here) — NOT the practice's direct line.
   * Kept for reference; never written to providers.phone.
   */
  doctoraliaPhone: string | null;
  /**
   * A real, directly-dialable number. Clinic (facility) pages publish one;
   * doctor pages do not. Safe to surface to patients.
   */
  phone: string | null;
  isOnlineOnly: boolean;
  /** Insurers accepted at this location, per the address's own modal. */
  insurances: string[];
  paymentMethods: string[];
  services: { name: string; price: string | null; slug: string | null }[];
}

export interface DoctoraliaReview {
  author: string | null;
  rating: number | null;
  publishedAt: string | null;
  body: string | null;
}

export interface DoctoraliaProfile {
  doctoraliaId: string;
  entityType: EntityType;
  url: string;
  slug: string;
  name: string;
  /** Professional-licence numbers (cédula profesional), as printed. */
  cedulas: string[];
  specializations: string[];
  foundUnderSlugs: string[];
  mappedSpecialties: Specialty[];
  about: string | null;
  imageUrl: string | null;
  /** The practice's own site. Facility pages publish one; doctor pages do not. */
  website: string | null;
  rating: number | null;
  reviewCount: number;
  /** Subset embedded in the page; reviewCount is the true total. */
  reviews: DoctoraliaReview[];
  insurances: string[];
  addresses: DoctoraliaAddress[];
  languages: string[];
  scrapedAt: string;
  /** Fields the page simply did not carry, for coverage reporting. */
  missing: string[];
}
