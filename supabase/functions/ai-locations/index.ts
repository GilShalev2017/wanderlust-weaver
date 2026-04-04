import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dayContent, cityContext, country, countryCode } = await req.json();
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
            content: `You are a location extraction and geocoding assistant. Extract real, mappable locations from travel itinerary content and provide their coordinates.

Context:
- City: ${cityContext || "Unknown"}
- Country: ${country || "Unknown"}
- Country Code: ${countryCode || "Unknown"}

Rules:
1. Only extract actual physical places that can be mapped (restaurants, museums, parks, landmarks, streets, neighborhoods)
2. EXCLUDE: activities, meal times, hotel names (unless they're well-known landmarks), transportation, generic terms like "morning", "afternoon", "check-in", "shopping"
3. For each location, provide the name and approximate coordinates
4. Focus on places mentioned in Location/City lines, bold text, or clear landmark references
5. Return coordinates as decimal degrees (lat, lng)
6. If uncertain about exact coordinates, provide the best estimate based on the city context

Return JSON format:
{
  "locations": [
    {
      "name": "Place Name",
      "lat": 40.7128,
      "lng": -74.0060
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Extract locations from this travel day content:\n\n${dayContent}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI gateway error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const aiResponse = JSON.parse(result.choices[0].message.content);

    return new Response(JSON.stringify({
      locations: aiResponse.locations || [],
      extracted: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("AI Locations error:", err);
    return new Response(JSON.stringify({ 
      error: "Failed to extract locations",
      locations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
