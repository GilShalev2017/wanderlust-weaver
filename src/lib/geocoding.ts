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

export async function geocode(
  name: string,
  countryCode?: string,
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${name}||${countryCode || ""}`;

  // 1. Memory cache
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  // 2. Session storage cache
  const disk = loadDiskCache();
  if (disk[cacheKey]) {
    memoryCache.set(cacheKey, disk[cacheKey]);
    return disk[cacheKey];
  }

  // 3. Parse place, city, country from the name (format: "Place, City, Country")
  const parts = name.split(",").map((p) => p.trim());
  const place = normalize(parts[0]);
  const city = normalize(parts[1]);
  const country = normalize(parts[2]);

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

/**
 * Extracts location names from a day's markdown content.
 * Looks for Location/City tags, bold place names, and contextual headers.
 */
export function extractDayLocations(
  dayContent: string,
  cityContext?: string,
  country?: string,
): string[] {
  const locations: string[] = [];
  const lines = dayContent.split("\n");

  for (const line of lines) {
    // "Location/City: ..." or "**Location:** ..."
    const locMatch = line.match(/\*?\*?(?:Location(?:\/City)?|Place|Venue)\*?\*?:\s*(.+)/i);
    if (locMatch) {
      const clean = locMatch[1].replace(/[*_`]/g, "").split(/[/,&–—-]/)[0].trim();
      if (clean.length > 2 && clean.length < 60) locations.push(clean);
      continue;
    }

    // Bold place names like **Carmel Market** or **Jaffa Old City**
    const boldMatches = line.matchAll(/\*\*([^*]{3,40})\*\*/g);
    for (const m of boldMatches) {
      const n = m[1].trim();
      if (/^(morning|afternoon|evening|lunch|dinner|breakfast|tip|note|option|day|budget|cost)/i.test(n)) continue;
      if (/^\d{1,2}:\d{2}/.test(n)) continue;
      locations.push(n);
    }
  }

  // Deduplicate
  const unique = [...new Set(locations)];

  // Qualify with city context
  if (cityContext) {
    return unique.map((loc) => {
      if (loc.toLowerCase().includes(cityContext.toLowerCase())) return loc;
      const suffix = country ? `, ${cityContext}, ${country}` : `, ${cityContext}`;
      return `${loc}${suffix}`;
    });
  }

  return unique;
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
