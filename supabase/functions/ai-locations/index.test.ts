import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("ai-locations: extracts locations with coordinates", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      dayContent: "Morning: Visit the Eiffel Tower. Afternoon: Explore the Louvre Museum. Evening: Dinner near Notre-Dame Cathedral.",
      cityContext: "Paris",
      country: "France",
      countryCode: "FR",
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assert(Array.isArray(data.locations), "Should return locations array");
  assert(data.locations.length >= 2, "Should extract at least 2 locations from well-known landmarks");

  for (const loc of data.locations) {
    assert(typeof loc.name === "string", "Location should have a name");
    assert(typeof loc.lat === "number", "Location should have numeric lat");
    assert(typeof loc.lng === "number", "Location should have numeric lng");
    assert(loc.lat !== 0 || loc.lng !== 0, "Coordinates should not be 0,0");
    // Paris is roughly lat 48.8, lng 2.3
    assert(loc.lat > 48 && loc.lat < 49.5, `Lat ${loc.lat} should be in Paris range`);
    assert(loc.lng > 1.5 && loc.lng < 3.5, `Lng ${loc.lng} should be in Paris range`);
  }
});

Deno.test("ai-locations: handles empty content", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      dayContent: "",
      cityContext: "Paris",
      country: "France",
      countryCode: "FR",
    }),
  });

  const data = await response.json();
  assert(Array.isArray(data.locations), "Should return locations array even for empty content");
});
