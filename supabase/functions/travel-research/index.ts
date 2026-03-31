import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // New Version: 1.0.4-FORCE-ANCHOR
  const DEPLOY_VERSION = "1.0.4-FORCE-ANCHOR"; 

  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { tripRequest } = await req.json();
    console.log(`[${DEPLOY_VERSION}] Processing:`, tripRequest);

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
              content: "You are a professional travel researcher. You provide data in two parts: a one-line location header, followed by a JSON block.",
            },
            { 
              role: "user", 
              content: `Research this trip: "${tripRequest}"
              
              STRICT OUTPUT FORMAT RULES:
              1. Your response MUST begin with a single line: "ANCHOR: City, Country, ISO"
              2. Immediately after that line, provide a code block containing the research JSON.
              3. DO NOT include any introductory text like "Sure, here is your research".
              
              Example start:
              ANCHOR: Tokyo, Japan, JP
              \`\`\`json
              { ... }
              \`\`\`` 
            },
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