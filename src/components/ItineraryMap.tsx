import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  day?: string;
}

function createDayIcon(dayNum: number) {
  return L.divIcon({
    className: "custom-day-marker",
    html: `<div style="
      background: hsl(24 70% 45%);
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${dayNum}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

function extractLocations(markdown: string): string[] {
  const locations: string[] = [];
  const lines = markdown.split("\n");

  // Strategy 1: Look for "Location/City:" lines in the itinerary
  for (const line of lines) {
    const locMatch = line.match(/\*?\*?Location\/City\*?\*?:\s*(.+)/i);
    if (locMatch) {
      const parts = locMatch[1].replace(/[*_]/g, "").split(/[/,&]/).map(s => s.trim()).filter(s => s.length > 1);
      for (const p of parts) {
        if (p.length < 60) locations.push(p);
      }
    }
  }

  // Strategy 2: Extract bold place names that look like real locations (capitalized, short)
  if (locations.length === 0) {
    const boldPlaces = markdown.match(/\*\*([A-Z][a-zA-Zà-ÿ\s,'-]+)\*\*/g);
    if (boldPlaces) {
      for (const bp of boldPlaces.slice(0, 15)) {
        const clean = bp.replace(/\*\*/g, "").trim();
        if (
          clean.length > 2 && clean.length < 40 &&
          !clean.match(/^(Day|Budget|Tips|Pack|Overview|Summary|Total|Note|Morning|Afternoon|Evening|Travel|Location|Traveler|Important|Practical|Why|Off)/i)
        ) {
          locations.push(clean);
        }
      }
    }
  }

  // Strategy 3: Day headers — extract just the place-like part
  if (locations.length === 0) {
    for (const line of lines) {
      const dayMatch = line.match(/^#{1,4}\s*\*?\*?Day\s+\d+[^a-zA-Z]*(.+)/i);
      if (dayMatch) {
        let loc = dayMatch[1].replace(/[*_#`]/g, "").replace(/^\s*[:\s–—-]+\s*/, "").trim();
        // Try to extract a known place name pattern (before &, comma, or parenthetical)
        const firstPart = loc.split(/[&,]/)[0].trim();
        if (firstPart.length > 2 && firstPart.length < 50) locations.push(firstPart);
      }
    }
  }

  // Deduplicate
  return [...new Set(locations)];
}

async function geocode(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`,
      { headers: { "User-Agent": "LovableTravelPlanner/1.0" } }
    );
    const data = await resp.json();
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon); // Nominatim uses "lon", not "lng"
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  } catch (e) {
    console.warn("Geocode failed for:", name, e);
  }
  return null;
}

interface ItineraryMapProps {
  content: string;
  isStreaming: boolean;
}

export default function ItineraryMap({ content, isStreaming }: ItineraryMapProps) {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const geocodedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isStreaming) return;

    const locations = extractLocations(content);
    console.log("[ItineraryMap] Extracted locations:", locations);
    if (locations.length === 0) return;

    const newLocations = locations.filter((l) => !geocodedRef.current.has(l));
    if (newLocations.length === 0) return;

    (async () => {
      const newPoints: GeoPoint[] = [];
      for (const loc of newLocations) {
        geocodedRef.current.add(loc);
        const coords = await geocode(loc);
        console.log("[ItineraryMap] Geocoded", loc, "→", coords);
        if (coords) {
          newPoints.push({ name: loc, ...coords, day: `Day ${locations.indexOf(loc) + 1}` });
        }
        // Respect Nominatim rate limit
        await new Promise((r) => setTimeout(r, 1100));
      }
      setPoints((prev) => [...prev, ...newPoints]);
    })();
  }, [content, isStreaming]);

  if (isStreaming || points.length === 0) return null;

  const polylinePositions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            🗺️ Trip Route
          </h3>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {points.length} locations plotted across your trip
          </p>
        </div>
        <div className="h-[400px] w-full">
          <MapContainer
            center={[points[0].lat, points[0].lng]}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((point, i) => (
              <Marker key={i} position={[point.lat, point.lng]} icon={createDayIcon(i + 1)}>
                <Popup>
                  <strong className="text-sm">{point.day}</strong>
                  <br />
                  <span className="text-xs">{point.name}</span>
                </Popup>
              </Marker>
            ))}
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: "hsl(24, 70%, 45%)",
                  weight: 3,
                  dashArray: "8, 8",
                  opacity: 0.7,
                }}
              />
            )}
            <FitBounds points={points} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
