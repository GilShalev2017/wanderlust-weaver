import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tripRequest, research, plan } = await req.json();
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
            content: `You are a Travel Detail Agent. You take a skeleton itinerary and enrich it with specific, actionable details.

For each day and activity slot, add:
- **Specific venue/spot names** (real restaurants, trails, temples, markets)
- **Why it's recommended** (1 sentence connecting to traveler's interests)
- **Practical tips** (opening hours, reservation needed, cost estimate)
- **Food recommendations** (specific dishes to try, local specialties)
- **Off-the-beaten-path alternatives** when relevant
- **Walking/transit directions** between spots

Be specific and opinionated — give real names and real advice. The traveler should be able to follow this plan directly.`,
          },
          {
            role: "user",
            content: `Trip request: ${tripRequest}\n\nResearch:\n${research}\n\nSkeleton plan:\n${plan}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${t}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Detail agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
