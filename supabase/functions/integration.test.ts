import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function callAgent(name: string, body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  assertEquals(resp.status, 200, `${name} should return 200`);
  const data = await resp.json();
  assert(data.result, `${name} should return a result`);
  return data.result;
}

Deno.test("Full pipeline integration: research → plan → detail → review", async () => {
  const tripRequest = "2 days in Rome, interested in history and pasta";

  // Step 1: Research
  console.log("Step 1: Research agent...");
  const research = await callAgent("travel-research", { tripRequest });
  assert(research.length > 50, "Research should be substantial");
  console.log(`  ✓ Research returned ${research.length} chars`);

  // Step 2: Plan
  console.log("Step 2: Planning agent...");
  const plan = await callAgent("travel-plan", { tripRequest, research });
  assert(plan.length > 50, "Plan should be substantial");
  assert(/day\s*\d/i.test(plan), "Plan should contain day numbering");
  console.log(`  ✓ Plan returned ${plan.length} chars`);

  // Step 3: Detail
  console.log("Step 3: Detail agent...");
  const detailed = await callAgent("travel-detail", { tripRequest, research, plan });
  assert(detailed.length > plan.length, "Detailed should be longer than plan");
  console.log(`  ✓ Detail returned ${detailed.length} chars`);

  // Step 4: Review (streaming)
  console.log("Step 4: Review agent (streaming)...");
  const reviewResp = await fetch(`${SUPABASE_URL}/functions/v1/travel-review`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tripRequest, research, plan, detailed }),
  });
  assertEquals(reviewResp.status, 200);

  const reader = reviewResp.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    chunkCount++;

    // Parse SSE data lines
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) fullContent += content;
      } catch { /* partial chunk */ }
    }
  }

  assert(chunkCount > 1, "Should receive multiple stream chunks");
  assert(fullContent.length > 100, "Final itinerary should be substantial");
  assert(/day\s*\d/i.test(fullContent), "Final itinerary should have day structure");
  console.log(`  ✓ Review streamed ${chunkCount} chunks, ${fullContent.length} chars total`);
  console.log("\n✅ Full pipeline completed successfully!");
});
