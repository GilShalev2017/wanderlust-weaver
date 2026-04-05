import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { extractAndGeocodeLocations } from "../geocoding";
import { supabase } from "@/integrations/supabase/client";

describe("extractAndGeocodeLocations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed locations from edge function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        locations: [
          { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 },
          { name: "Louvre Museum", lat: 48.8606, lng: 2.3376 },
        ],
      },
      error: null,
    });

    const result = await extractAndGeocodeLocations("Visit Eiffel Tower and Louvre", "Paris", "France", "FR");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Eiffel Tower");
    expect(result[0].lat).toBe(48.8584);
  });

  it("filters out invalid coordinates (0,0)", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        locations: [
          { name: "Valid", lat: 48.8, lng: 2.3 },
          { name: "Invalid", lat: 0, lng: 0 },
        ],
      },
      error: null,
    });

    const result = await extractAndGeocodeLocations("test");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Valid");
  });

  it("filters out non-finite coordinates", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        locations: [
          { name: "NaN", lat: NaN, lng: 2.3 },
          { name: "Infinity", lat: 48.8, lng: Infinity },
          { name: "Good", lat: 35.6, lng: 139.7 },
        ],
      },
      error: null,
    });

    const result = await extractAndGeocodeLocations("test");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Good");
  });

  it("returns empty array on error", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error("Network error"),
    });

    const result = await extractAndGeocodeLocations("test");
    expect(result).toEqual([]);
  });

  it("returns empty array when no locations in response", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { locations: [] },
      error: null,
    });

    const result = await extractAndGeocodeLocations("test");
    expect(result).toEqual([]);
  });
});
