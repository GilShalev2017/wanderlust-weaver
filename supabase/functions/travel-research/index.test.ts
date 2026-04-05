import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("travel-research: returns research brief for a trip request", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      tripRequest: "3 days in Paris, interested in art and food",
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assert(data.result, "Should return a result field");
  assert(data.result.length > 50, "Research brief should be substantial");
  assert(
    /paris|france/i.test(data.result),
    "Should mention Paris or France in the research"
  );
});

Deno.test("travel-research: handles empty request gracefully", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ tripRequest: "" }),
  });

  // Should still return 200 (AI will handle empty input)
  const data = await response.json();
  assertEquals(response.status, 200);
  assert(typeof data.result === "string");
  await response.body?.cancel();
});

Deno.test("travel-research: CORS preflight returns OK", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/travel-research`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assert(response.status < 400, "OPTIONS should succeed");
  await response.body?.cancel();
});
