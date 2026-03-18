export type Country = 'MX' | 'US';
export type ProviderSource = 'google' | 'manual';

export type Specialty =
  | 'dentist'
  | 'orthodontist'
  | 'plastic_surgery'
  | 'aesthetician'
  | 'obgyn'
  | 'physical_therapy'
  | 'massage'
  | 'optometry'
  | 'general'
  | 'pediatrics'
  | 'cardiology'
  | 'urgent_care'
  | 'mental_health'
  | 'pharmacy'
  | 'telehealth';

export const SpecialtyLabels: Record<Specialty, string> = {
  dentist: 'Dentist',
  orthodontist: 'Orthodontist',
  plastic_surgery: 'Plastic Surgery',
  aesthetician: 'Aesthetician',
  obgyn: 'OB/GYN & Women\'s Health',
  physical_therapy: 'Physical Therapy',
  massage: 'Massage Therapy',
  optometry: 'Vision & Optometry',
  general: 'Primary & Family Care',
  pediatrics: 'Pediatrics',
  cardiology: 'Cardiology',
  urgent_care: 'Urgent Care',
  mental_health: 'Mental Health',
  pharmacy: 'Pharmacy',
  telehealth: 'Telehealth',
};

export interface Provider {
  id: string;
  name: string;
  specialty: Specialty[];
  country: Country;
  city: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  phone?: string;
  website?: string;
  languages: string[];
  promoted: boolean;
  verified: boolean;
  source: ProviderSource;
  clicks: number;
  googlePlaceId?: string;
  imageUrl?: string;
}

export interface ProviderFilters {
  search: string;
  specialty: Specialty | '';
  country: Country | '';
  minRating: number;
}
