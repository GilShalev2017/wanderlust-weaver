import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("travel-plan: creates skeleton itinerary from research", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      tripRequest: "3 days in Paris, interested in art and food",
      research: "Paris is the capital of France. Best areas: Marais, Montmartre. Spring weather averages 15°C. Must-see: Louvre, Orsay. Budget: €100-150/day.",
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assert(data.result, "Should return a result field");
  assert(data.result.length > 50, "Plan should be substantial");
  assert(/day\s*\d/i.test(data.result), "Should contain day numbering");
});
