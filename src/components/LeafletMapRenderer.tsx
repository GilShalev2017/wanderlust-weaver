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
import MarkerPopup from "./MarkerPopup";

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

interface LeafletMapRendererProps {
  points: GeoPoint[];
  dayNumber: number;
  cityContext?: string;
  country?: string;
}

export default function LeafletMapRenderer({ points, dayNumber, cityContext, country }: LeafletMapRendererProps) {
  if (points.length === 0) return null;

  const color = MARKER_COLORS[(dayNumber - 1) % MARKER_COLORS.length];
  const polylinePositions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="h-[400px] w-full">
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
            <Popup minWidth={200} maxWidth={280}>
              <MarkerPopup
                point={point}
                stopNumber={i + 1}
                cityContext={cityContext}
                country={country}
              />
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
