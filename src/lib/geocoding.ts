/**
 * Geocoding utility using AI-powered location extraction.
 * Uses a backend edge function (ai-locations) that combines
 * location extraction and coordinate resolution in one step.
 */

import { supabase } from "@/integrations/supabase/client";

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
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
      return data.locations
        .filter((loc: any) =>
          loc &&
          typeof loc.lat === "number" &&
          typeof loc.lng === "number" &&
          isFinite(loc.lat) &&
          isFinite(loc.lng) &&
          !(loc.lat === 0 && loc.lng === 0)
        )
        .map((loc: any) => ({
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
