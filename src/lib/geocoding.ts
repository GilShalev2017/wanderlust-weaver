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
