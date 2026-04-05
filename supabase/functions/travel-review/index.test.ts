import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("travel-review: returns streaming response", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      tripRequest: "3 days in Paris",
      research: "Paris, France. Spring. Budget traveler.",
      plan: "Day 1: Marais. Day 2: Museums. Day 3: Montmartre.",
      detailed: "Day 1: Walk through Le Marais, visit Place des Vosges. Lunch at L'As du Fallafel. Day 2: Louvre morning, Orsay afternoon. Day 3: Sacré-Cœur, artists' quarter.",
    }),
  });

  assertEquals(response.status, 200);
  const contentType = response.headers.get("content-type");
  assert(contentType?.includes("text/event-stream"), "Should return SSE stream");

  // Read some of the stream to verify it works
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let collected = "";
  let chunks = 0;

  while (chunks < 5) {
    const { done, value } = await reader.read();
    if (done) break;
    collected += decoder.decode(value, { stream: true });
    chunks++;
  }

  reader.cancel();
  assert(collected.length > 0, "Should have received stream data");
  assert(collected.includes("data:"), "Should contain SSE data lines");
});
