const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeQuery(place?: string, city?: string, country?: string): string {
  return [place, city, country]
    .map((s) => s?.replace(/[:\-–—]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { place, city, country, countryCode } = await req.json();

    let query = normalizeQuery(place, city, country);
    console.log("Geocode input:", { place, city, country, countryCode, query });

    if (!query) {
      return new Response(JSON.stringify({ error: "No query provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cc = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : "";
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1${cc}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "LovableTravelPlanner/1.0 (server-side geocoding)" },
    });
    const data = await resp.json();

    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        return new Response(JSON.stringify({ lat, lng }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: try city or country alone
    const fallbackQuery = city?.replace(/[:\-–—]/g, "").trim() || country?.replace(/[:\-–—]/g, "").trim();
    if (fallbackQuery && fallbackQuery !== query) {
      console.log("Geocode fallback query:", fallbackQuery);
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1${cc}`;
      const fallbackResp = await fetch(fallbackUrl, {
        headers: { "User-Agent": "LovableTravelPlanner/1.0 (server-side geocoding)" },
      });
      const fallbackData = await fallbackResp.json();

      if (fallbackData.length > 0) {
        const lat = parseFloat(fallbackData[0].lat);
        const lng = parseFloat(fallbackData[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return new Response(JSON.stringify({ lat, lng, fallback: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ lat: null, lng: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Geocode error:", err);
    return new Response(JSON.stringify({ error: "Geocoding failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
