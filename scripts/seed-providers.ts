import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const GOOGLE_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!GOOGLE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables. Ensure VITE_GOOGLE_MAPS_API_KEY, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEARCH_QUERIES = [
  // El Paso Searches
  { query: 'primary care clinic in El Paso, TX', specialty: 'general' },
  { query: 'family medicine in El Paso, TX', specialty: 'general' },
  { query: 'urgent care center in El Paso, TX', specialty: 'urgent_care' },
  { query: 'community health clinic in El Paso, TX', specialty: 'general' },
  { query: 'low cost clinic in El Paso, TX', specialty: 'general' },
  { query: 'dental clinic in El Paso, TX', specialty: 'dentist' },
  { query: 'vision clinic in El Paso, TX', specialty: 'optometry' },
  { query: 'mental health provider in El Paso, TX', specialty: 'mental_health' },
  { query: 'womens health clinic in El Paso, TX', specialty: 'obgyn' },
  { query: 'pediatric clinic in El Paso, TX', specialty: 'pediatrics' },
  { query: 'specialty clinic in El Paso, TX', specialty: 'general' },
  { query: 'pharmacy in El Paso, TX', specialty: 'pharmacy' },
  { query: 'telehealth provider in El Paso, TX', specialty: 'telehealth' },

  // Ciudad Juarez Searches
  { query: 'clinica de medicina familiar en Ciudad Juarez, Mexico', specialty: 'general' },
  { query: 'atencion medica primaria en Ciudad Juarez, Mexico', specialty: 'general' },
  { query: 'urgencias medicas en Ciudad Juarez, Mexico', specialty: 'urgent_care' },
  { query: 'centro de salud comunitaria en Ciudad Juarez, Mexico', specialty: 'general' },
  { query: 'clinica dental en Ciudad Juarez, Mexico', specialty: 'dentist' },
  { query: 'clinica de la vista en Ciudad Juarez, Mexico', specialty: 'optometry' },
  { query: 'salud mental psicologo en Ciudad Juarez, Mexico', specialty: 'mental_health' },
  { query: 'ginecologia clinica de la mujer en Ciudad Juarez, Mexico', specialty: 'obgyn' },
  { query: 'pediatra en Ciudad Juarez, Mexico', specialty: 'pediatrics' },
  { query: 'farmacia en Ciudad Juarez, Mexico', specialty: 'pharmacy' },
  { query: 'telemedicina en Ciudad Juarez, Mexico', specialty: 'telehealth' }
];

async function fetchGooglePlaces(query: string) {
  // 1. Text Search to get a list of places
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (searchData.status !== 'OK') {
    console.warn(`[Google] Search failed for "${query}": ${searchData.status}`);
    return [];
  }

  return searchData.results;
}

async function fetchPlaceDetails(placeId: string) {
  const fields = 'name,formatted_address,geometry,international_phone_number,website,rating,user_ratings_total,address_components';
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`;
  
  const res = await fetch(detailsUrl);
  const data = await res.json();
  
  return data.status === 'OK' ? data.result : null;
}

function extractCityAndCountry(addressComponents: any[]) {
  let city = '';
  let countryCode = '';

  for (const component of addressComponents) {
    if (component.types.includes('locality')) {
      city = component.long_name;
    }
    if (component.types.includes('country')) {
      countryCode = component.short_name; // 'US' or 'MX' 
    }
  }

  return { city, countryCode };
}

async function runSeeder() {
  console.log('🚀 Starting Google Places Data Seeder...');

  let totalInserted = 0;

  for (const { query, specialty } of SEARCH_QUERIES) {
    console.log(`\n🔍 Searching for: "${query}"...`);
    const places = await fetchGooglePlaces(query);
    
    // Process all results (up to 20 from the first page of the Google Places API)
    const topPlaces = places; 

    for (const place of topPlaces) {
      if (!place.place_id) continue;
      
      try {
        const details = await fetchPlaceDetails(place.place_id);
        if (!details) continue;

        const { city, countryCode } = extractCityAndCountry(details.address_components || []);
        
        // Ensure country code maps strictly to 'US' or 'MX' per your Provider interface
        const country = countryCode === 'MX' ? 'MX' : 'US';

        const providerData = {
          // generate a random UUID for the new record
          id: crypto.randomUUID(), 
          name: details.name,
          specialty: [specialty], // store as JSON array or postgres string array
          country: country,
          city: city || (country === 'US' ? 'El Paso' : 'Ciudad Juarez'),
          address: details.formatted_address || place.formatted_address,
          lat: details.geometry?.location?.lat || place.geometry.location.lat,
          lng: details.geometry?.location?.lng || place.geometry.location.lng,
          rating: details.rating || 0,
          reviewCount: details.user_ratings_total || 0,
          phone: details.international_phone_number || null,
          website: details.website || null,
          languages: country === 'MX' ? ['es', 'en'] : ['en', 'es'], // guess languages based on country
          promoted: false,
          verified: false,
          source: 'google',
          clicks: 0,
          googlePlaceId: place.place_id,
        };

        // Check if exists
        const { data: existing } = await supabase
          .from('providers')
          .select('id')
          .eq('googlePlaceId', place.place_id)
          .maybeSingle();

        if (existing) {
          console.log(`⏩ Skipped (already exists): ${providerData.name}`);
          continue;
        }

        // Insert into Supabase
        const { error } = await supabase
          .from('providers')
          .insert(providerData);

        if (error) {
          // Usually means the table isn't set up yet, or RLS policies blocked anonymous INSERTS
          console.error(`❌ Failed to insert ${providerData.name}:`, error.message);
        } else {
          console.log(`✅ Inserted: ${providerData.name}`);
          totalInserted++;
        }

      } catch (err: any) {
        console.error(`❌ Error processing ${place.name}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Seeding complete! Total records added: ${totalInserted}`);
}

runSeeder().catch(console.error);
