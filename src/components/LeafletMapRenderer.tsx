import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/geocoding";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const MARKER_COLORS = [
  "hsl(24, 70%, 45%)",
  "hsl(200, 65%, 45%)",
  "hsl(150, 55%, 40%)",
  "hsl(280, 55%, 50%)",
  "hsl(350, 65%, 50%)",
  "hsl(45, 75%, 45%)",
];

function createNumberIcon(num: number, color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

/** Fetches a thumbnail from Wikimedia Commons using coordinate-based geo-search */
function CommonsGeoImage({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "none">("loading");

  useEffect(() => {
    let cancelled = false;

    const url = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&generator=geosearch&ggsprimary=all&ggsnamespace=6` +
      `&ggsradius=500&ggscoord=${lat}|${lng}&ggslimit=5` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=300` +
      `&format=json&origin=*`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const pages = data?.query?.pages;
        if (!pages) { setStatus("none"); return; }

        // Find first page with a usable thumbnail
        const pageList = Object.values(pages) as any[];
        for (const page of pageList) {
          const thumb = page?.imageinfo?.[0]?.thumburl;
          if (thumb) {
            setSrc(thumb);
            setStatus("done");
            return;
          }
        }
        setStatus("none");
      })
      .catch(() => { if (!cancelled) setStatus("none"); });

    return () => { cancelled = true; };
  }, [lat, lng, name]);

  if (status === "loading") return null; // silent loading, Wikipedia shows its own loader
  if (status === "none" || !src) return null;

  return (
    <img
      src={src}
      alt={name}
      className="w-full max-h-[100px] object-cover rounded mt-1"
      loading="lazy"
    />
  );
}

/** Fetches a thumbnail from Wikipedia for a given place name */
function WikiImage({ name }: { name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "none">("loading");

  useEffect(() => {
    let cancelled = false;
    const query = encodeURIComponent(name);

    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`,
      { headers: { "Api-User-Agent": "LovableTravelPlanner/1.0" } }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const thumb = data?.thumbnail?.source;
        if (thumb) {
          setSrc(thumb);
          setStatus("done");
        } else {
          // Fallback: try search endpoint
          return fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*&srlimit=1`
          )
            .then((r) => r.json())
            .then((sr) => {
              if (cancelled) return;
              const title = sr?.query?.search?.[0]?.title;
              if (!title) { setStatus("none"); return; }
              return fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
                { headers: { "Api-User-Agent": "LovableTravelPlanner/1.0" } }
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                  if (cancelled) return;
                  if (d?.thumbnail?.source) {
                    setSrc(d.thumbnail.source);
                    setStatus("done");
                  } else {
                    setStatus("none");
                  }
                });
            });
        }
      })
      .catch(() => { if (!cancelled) setStatus("none"); });

    return () => { cancelled = true; };
  }, [name]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-gray-400">
        Loading image…
      </div>
    );
  }
  if (status === "none" || !src) return null;

  return (
    <img
      src={src}
      alt={name}
      className="w-full max-h-[140px] object-cover rounded mt-1"
      loading="lazy"
    />
  );
}

interface LeafletMapRendererProps {
  points: GeoPoint[];
  dayNumber: number;
}

export default function LeafletMapRenderer({ points, dayNumber }: LeafletMapRendererProps) {
  if (points.length === 0) return null;

  const color = MARKER_COLORS[(dayNumber - 1) % MARKER_COLORS.length];
  const polylinePositions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="h-[300px] w-full">
      <MapContainer
        center={[points[0].lat, points[0].lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, i) => (
          <Marker key={i} position={[point.lat, point.lng]} icon={createNumberIcon(i + 1, color)}>
            <Popup minWidth={180} maxWidth={240}>
              <div className="text-center">
                <strong className="text-sm block">Stop {i + 1}</strong>
                <span className="text-xs text-gray-600 block mb-1">{point.name}</span>
                <WikiImage name={point.name} />
              </div>
            </Popup>
          </Marker>
        ))}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color,
              weight: 3,
              dashArray: "6, 8",
              opacity: 0.7,
            }}
          />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
