import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Version tracker to verify deployment
  const DEPLOY_VERSION = "1.0.3-ANCHOR-FIX"; 

  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { tripRequest } = await req.json();
    console.log(`[${DEPLOY_VERSION}] Processing request:`, tripRequest);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
              content: `You are a Travel Research Assistant. 

CRITICAL: YOU MUST START YOUR RESPONSE WITH THIS EXACT LINE. DO NOT USE MARKDOWN.
ANCHOR: City Name, Country Name, ISO-Code

Example:
ANCHOR: Tel Aviv, Israel, IL

After that line, provide a detailed research brief in JSON format.`,
            },
            { role: "user", content: tripRequest },
          ],
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${t}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    // We return the version in the response headers/body for easy debugging
    return new Response(JSON.stringify({ result, debug_version: DEPLOY_VERSION }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[${DEPLOY_VERSION}] Error:`, e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
        debug_version: DEPLOY_VERSION
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});