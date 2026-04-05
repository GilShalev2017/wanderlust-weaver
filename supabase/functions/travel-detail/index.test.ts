import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("travel-detail: enriches skeleton plan with specifics", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-detail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      tripRequest: "3 days in Paris, interested in art and food",
      research: "Paris, France. Best areas: Marais, Montmartre. Budget: €100-150/day.",
      plan: "Day 1: Arrive, explore Marais. Day 2: Museums. Day 3: Montmartre, depart.",
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assert(data.result, "Should return a result field");
  assert(data.result.length > 100, "Detailed plan should be longer than skeleton");
});
