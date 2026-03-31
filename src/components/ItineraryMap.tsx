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

  for (const line of lines) {
    // Match any header containing "Day X" followed by location info
    const dayMatch = line.match(/^#{1,4}\s*[^\n]*Day\s+\d+[^a-zA-Z]*(.+)/i);
    if (dayMatch) {
      // Clean up the location part
      let loc = dayMatch[1]
        .replace(/[*_#`]/g, "")
        .replace(/^\s*[:\s–—-]+\s*/, "")
        .replace(/\(.*?\)/g, "")
        .trim();
      // Remove trailing punctuation
      loc = loc.replace(/[,;.!]+$/, "").trim();
      // Remove leading emoji
      loc = loc.replace(/^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}\s]+/u, "").trim();
      if (loc && loc.length > 1 && loc.length < 80) locations.push(loc);
    }
  }

  // Fallback: if no day-based locations found, try to find city/region names from bold text
  if (locations.length === 0) {
    const boldPlaces = markdown.match(/\*\*([A-Z][a-zA-Zà-ÿ\s,'-]+)\*\*/g);
    if (boldPlaces) {
      for (const bp of boldPlaces.slice(0, 12)) {
        const clean = bp.replace(/\*\*/g, "").trim();
        if (clean.length > 2 && clean.length < 50 && !clean.match(/^(Day|Budget|Tips|Pack|Overview|Summary|Total|Note)/i)) {
          locations.push(clean);
        }
      }
    }
  }

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
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lng) };
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
    if (locations.length === 0) return;

    const newLocations = locations.filter((l) => !geocodedRef.current.has(l));
    if (newLocations.length === 0) return;

    (async () => {
      const newPoints: GeoPoint[] = [];
      for (const loc of newLocations) {
        geocodedRef.current.add(loc);
        const coords = await geocode(loc);
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
