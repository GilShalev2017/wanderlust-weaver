import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tripRequest, research, plan, detailed } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Travel Review Agent. You receive the full output from the previous agents and produce the FINAL polished itinerary.

Your responsibilities:
1. **Validate & Optimize**: Check for logical issues (backtracking, overpacked days, missing rest days)
2. **Add Budget Summary**: Approximate daily and total budget breakdown
3. **Packing List**: Short, trip-specific packing suggestions
4. **Emergency Info**: Local emergency numbers, nearest embassy, insurance tips
5. **Final Polish**: Format as a beautiful, readable markdown document with clear sections

Output format (markdown):
# 🗾 [Trip Title]

## Trip Overview
Brief summary, dates, key themes

## Day-by-Day Itinerary
### Day 1: [Title]
Full details with morning/afternoon/evening...

(repeat for each day)

## Budget Estimate
| Category | Estimate |
|----------|----------|

## Packing Essentials
- Item 1
- Item 2

## Travel Tips & Logistics
Key practical advice

Make it feel like a premium travel guide. Use emoji sparingly for visual appeal.`,
          },
          {
            role: "user",
            content: `Original request: ${tripRequest}\n\nResearch:\n${research}\n\nPlan structure:\n${plan}\n\nDetailed itinerary:\n${detailed}`,
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${t}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Review agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
