import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tripRequest } = await req.json();
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
            content: `You are a Travel Research Agent. Your job is to analyze a trip request and produce structured research output.

Given a trip request, output a JSON-like research brief covering:
1. **Destinations**: Best regions/cities to visit given the traveler's interests and timeframe
2. **Season & Weather**: What to expect for the travel dates
3. **Traveler Profile**: Key interests, pace preference, budget level
4. **Cultural Notes**: Important customs, tips, or considerations
5. **Hidden Gems**: Off-the-beaten-path spots matching their interests
6. **Logistics**: Visa needs, transport options, currency tips

Be thorough but concise. Focus on actionable insights the planning agent can use.`,
          },
          { role: "user", content: tripRequest },
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
    console.error("Research agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
