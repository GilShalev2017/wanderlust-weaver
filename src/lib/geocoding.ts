/**
 * Geocoding utility with in-memory + sessionStorage caching.
 * Uses a backend edge function that proxies OpenStreetMap Nominatim.
 */

import { supabase } from "@/integrations/supabase/client";

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
}

const CACHE_KEY = "geo_cache_v1";
const memoryCache = new Map<string, { lat: number; lng: number } | null>();

function loadDiskCache(): Record<string, { lat: number; lng: number }> {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDiskCache(cache: Record<string, { lat: number; lng: number }>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded — ignore
  }
}

/**
 * Normalize a location string: strip special chars, trim whitespace.
 */
function normalize(s?: string): string {
  return (s || "").replace(/[:\-–—]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Strip common LLM-generated trailing phrases from location strings.
 */
function cleanLLMNoise(s: string): string {
  return s
    .replace(/,?\s*(designed for|known for|famous for|popular for|perfect for|ideal for|great for|built for|located in the|especially around).*$/i, "")
    .replace(/:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function geocode(
  name: string,
  countryCode?: string,
): Promise<{ lat: number; lng: number } | null> {
  // Clean LLM noise before anything
  const cleanName = cleanLLMNoise(name);
  const cacheKey = `${cleanName}||${countryCode || ""}`;

  // 1. Memory cache
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  // 2. Session storage cache
  const disk = loadDiskCache();
  if (disk[cacheKey]) {
    memoryCache.set(cacheKey, disk[cacheKey]);
    return disk[cacheKey];
  }

  // 3. Parse place, city, country from the name (format: "Place, City, Country")
  const parts = cleanName.split(",").map((p) => p.trim());
  const place = normalize(parts[0]);
  const city = normalize(parts[1]);
  const rawCountry = normalize(parts[2]);
  // Guard: reject country values that look like LLM phrases or are too long
  const country = rawCountry.length > 20 || /^(designed|known|famous|popular|perfect|ideal|great|built|located)/i.test(rawCountry) ? "" : rawCountry;

  console.log("Geocode input:", { place, city, country, countryCode, raw: name });

  // 4. Call edge function
  try {
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { place, city, country, countryCode },
    });

    if (error) {
      console.warn("[geocode] Edge function error for:", name, error);
      memoryCache.set(cacheKey, null);
      return null;
    }

    if (data && data.lat != null && data.lng != null) {
      const result = { lat: data.lat, lng: data.lng };
      memoryCache.set(cacheKey, result);
      disk[cacheKey] = result;
      saveDiskCache(disk);
      if (data.fallback) {
        console.log("[geocode] Used fallback for:", name);
      }
      return result;
    }
  } catch (e) {
    console.warn("[geocode] Failed for:", name, e);
  }

  memoryCache.set(cacheKey, null);
  return null;
}

const INVALID_PLACES = [
  "flight", "arrival", "departure", "check-in", "check in",
  "breakfast", "lunch", "dinner", "hotel", "stay", "transport",
  "taxi", "train", "bus", "transfer", "accommodation", "n/a",
  "travel preparation", "souvenir", "shopping", "farewell",
  "packing", "checkout", "check out", "rest", "free time",
];

function isValidPlace(place: string): boolean {
  if (!place || place.length < 3) return false;
  const lower = place.toLowerCase();
  return !INVALID_PLACES.some((invalid) => lower.includes(invalid));
}

/**
 * Extract locations and geocode them using AI in a single step.
 * Uses Gemini 2.5 Flash to understand context and provide coordinates.
 */
export async function extractAndGeocodeLocations(
  dayContent: string,
  cityContext?: string,
  country?: string,
  countryCode?: string,
): Promise<GeoPoint[]> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-locations", {
      body: { dayContent, cityContext, country, countryCode },
    });

    if (error) {
      console.warn("[extractAndGeocodeLocations] Edge function error:", error);
      return [];
    }

    if (data && data.locations && Array.isArray(data.locations)) {
      return data.locations.map((loc: any) => ({
        name: loc.name || "Unknown Location",
        lat: loc.lat,
        lng: loc.lng,
      }));
    }

    return [];
  } catch (e) {
    console.warn("[extractAndGeocodeLocations] Failed:", e);
    return [];
  }
}

/**
 * Batch geocode with small delays between requests.
 * Edge function handles rate limiting to Nominatim.
 */
export async function batchGeocode(
  names: string[],
  countryCode?: string,
): Promise<GeoPoint[]> {
  const points: GeoPoint[] = [];

  for (let i = 0; i < names.length; i++) {
    const coords = await geocode(names[i], countryCode);
    if (coords) {
      points.push({
        name: names[i].split(",")[0].trim(),
        ...coords,
      });
    }
    // Small delay between uncached requests to be nice to the server
    if (i < names.length - 1 && !memoryCache.has(`${names[i + 1]}||${countryCode || ""}`)) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return points;
}
