/**
 * Geocoding utility with in-memory + sessionStorage caching.
 * Uses OpenStreetMap Nominatim (free, no API key).
 */

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

  // 3. Fetch from Nominatim
  try {
    const cc = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : "";
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1${cc}`,
      { headers: { "User-Agent": "LovableTravelPlanner/1.0" } },
    );
    const data = await resp.json();
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        const result = { lat, lng };
        memoryCache.set(cacheKey, result);
        disk[cacheKey] = result;
        saveDiskCache(disk);
        return result;
      }
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
      const name = m[1].trim();
      // Skip generic words
      if (/^(morning|afternoon|evening|lunch|dinner|breakfast|tip|note|option|day|budget|cost)/i.test(name)) continue;
      // Skip if it looks like a time range
      if (/^\d{1,2}:\d{2}/.test(name)) continue;
      locations.push(name);
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
 * Batch geocode with rate limiting (Nominatim: 1 req/sec).
 * Returns resolved points in order.
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
        name: names[i].split(",")[0].trim(), // short display name
        ...coords,
      });
    }
    // Nominatim rate limit: 1 req/sec (skip delay for cached results)
    if (i < names.length - 1 && !memoryCache.has(`${names[i + 1]}||${countryCode || ""}`)) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return points;
}
