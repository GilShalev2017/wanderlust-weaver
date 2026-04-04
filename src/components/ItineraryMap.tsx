// import { useEffect, useState, useRef } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline,
//   useMap,
// } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Fix default marker icons
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
//   iconUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
//   shadowUrl:
//     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
// });

// interface GeoPoint {
//   name: string;
//   lat: number;
//   lng: number;
//   day?: string;
// }

// interface LocationContext {
//   primary_city: string;
//   country: string;
//   country_code: string;
// }

// interface ItineraryMapProps {
//   content: string;
//   isStreaming: boolean;
//   locationContext?: LocationContext;
// }

// function createDayIcon(dayNum: number) {
//   return L.divIcon({
//     className: "custom-day-marker",
//     html: `<div style="
//       background: hsl(24 70% 45%);
//       color: white;
//       border-radius: 50%;
//       width: 32px;
//       height: 32px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-weight: 700;
//       font-size: 14px;
//       font-family: 'Inter', sans-serif;
//       box-shadow: 0 2px 8px rgba(0,0,0,0.3);
//       border: 2px solid white;
//     ">${dayNum}</div>`,
//     iconSize: [32, 32],
//     iconAnchor: [16, 16],
//   });
// }

// function FitBounds({ points }: { points: GeoPoint[] }) {
//   const map = useMap();
//   useEffect(() => {
//     if (points.length > 0) {
//       const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
//       map.fitBounds(bounds, { padding: [40, 40] });
//     }
//   }, [points, map]);
//   return null;
// }

// /**
//  * Extracts location names and qualifies them with geographic context
//  */
// function extractLocations(
//   markdown: string,
//   context?: LocationContext,
// ): string[] {
//   const locations: string[] = [];
//   const lines = markdown.split("\n");

//   for (const line of lines) {
//     // Priority 1: Look for the specific "Location/City:" line inside cards
//     const locMatch = line.match(/\*?\*?Location\/City\*?\*?:\s*(.+)/i);
//     if (locMatch) {
//       const clean = locMatch[1]
//         .replace(/[*_]/g, "") // Remove markdown bold/italic
//         .split(/[/,&–—-]/)[0] // Take the first part before a separator
//         .trim();

//       if (clean.length > 2 && clean.length < 50) {
//         locations.push(clean);
//       }
//       continue; // If we found a Location/City line, skip the header check for this line
//     }

//     // Priority 2: Only use Day Headers if they contain a clear landmark (after the dash)
//     const dayMatch = line.match(/^#{1,4}\s*\*?\*?Day\s+\d+[:\s–—-]+\s*(.+)/i);
//     if (dayMatch) {
//       const headerTitle = dayMatch[1].replace(/[*_#`]/g, "").trim();
//       // If the title is just "Arrival" or "Departure", skip it
//       if (
//         !headerTitle.match(/^(Arrival|Departure|Overview|Summary|Intro|Day)/i)
//       ) {
//         // Take the first part of the title before any commas
//         const firstPart = headerTitle.split(",")[0].trim();
//         if (firstPart.length > 2 && firstPart.length < 40) {
//           locations.push(firstPart);
//         }
//       }
//     }
//   }

//   // Deduplicate results
//   const uniqueLocations = [...new Set(locations)];

//   // Apply the Geographic Anchor (The Context)
//   if (context && context.primary_city) {
//     return uniqueLocations.map((loc) => {
//       const lowerLoc = loc.toLowerCase();
//       const lowerCity = context.primary_city.toLowerCase();

//       // If the location already mentions the city, just return it
//       if (lowerLoc.includes(lowerCity)) return loc;

//       // Otherwise, append the anchor: "Miznon" -> "Miznon, Tel Aviv, Israel"
//       return `${loc}, ${context.primary_city}, ${context.country}`;
//     });
//   }

//   return uniqueLocations;
// }
// /**
//  * Geocodes a location name with optional country constraints
//  */
// async function geocode(
//   name: string,
//   context?: LocationContext,
// ): Promise<{ lat: number; lng: number } | null> {
//   try {
//     const countryFilter = context?.country_code
//       ? `&countrycodes=${context.country_code.toLowerCase()}`
//       : "";

//     const resp = await fetch(
//       `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1${countryFilter}`,
//       { headers: { "User-Agent": "LovableTravelPlanner/1.0" } },
//     );
//     const data = await resp.json();
//     if (data.length > 0) {
//       const lat = parseFloat(data[0].lat);
//       const lng = parseFloat(data[0].lon);
//       if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
//     }
//   } catch (e) {
//     console.warn("Geocode failed for:", name, e);
//   }
//   return null;
// }

// export default function ItineraryMap({
//   content,
//   isStreaming,
//   locationContext,
// }: ItineraryMapProps) {
//   const [points, setPoints] = useState<GeoPoint[]>([]);
//   const geocodedRef = useRef<Set<string>>(new Set());

//   useEffect(() => {
//     if (isStreaming || !content) return;

//     const locations = extractLocations(content, locationContext);

//     console.log("[ItineraryMap] Extracted locations:", locations);

//     const newLocations = locations.filter((l) => !geocodedRef.current.has(l));

//     if (newLocations.length === 0) return;

//     (async () => {
//       const newPoints: GeoPoint[] = [];
//       for (const loc of newLocations) {
//         geocodedRef.current.add(loc);

//         console.log("[ItineraryMap] Geocoding:", loc);

//         const coords = await geocode(loc, locationContext);

//         if (coords) {
//           console.log("[ItineraryMap] Success!", loc, coords);

//           newPoints.push({
//             name: loc.split(",")[0], // Use short name for the popup
//             ...coords,
//             day: `Day ${locations.indexOf(loc) + 1}`,
//           });
//         }
//         // Nominatim rate limit
//         await new Promise((r) => setTimeout(r, 1100));
//       }
//       setPoints((prev) => [...prev, ...newPoints]);
//     })();
//   }, [content, isStreaming, locationContext]);

//   if (isStreaming || points.length === 0) return null;

//   const polylinePositions = points.map(
//     (p) => [p.lat, p.lng] as [number, number],
//   );

//   return (
//     <div className="w-full max-w-3xl mx-auto mb-8">
//       <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
//         <div className="p-4 border-b border-border">
//           <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
//             🗺️ Trip Route
//           </h3>
//           <p className="text-sm text-muted-foreground font-body mt-1">
//             {points.length} locations plotted across your trip
//           </p>
//         </div>
//         <div className="h-[400px] w-full">
//           <MapContainer
//             center={[points[0].lat, points[0].lng]}
//             zoom={13}
//             style={{ height: "100%", width: "100%" }}
//             scrollWheelZoom={false}
//           >
//             <TileLayer
//               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
//             {points.map((point, i) => (
//               <Marker
//                 key={i}
//                 position={[point.lat, point.lng]}
//                 icon={createDayIcon(i + 1)}
//               >
//                 <Popup>
//                   <strong className="text-sm">{point.day}</strong>
//                   <br />
//                   <span className="text-xs">{point.name}</span>
//                 </Popup>
//               </Marker>
//             ))}
//             {polylinePositions.length > 1 && (
//               <Polyline
//                 positions={polylinePositions}
//                 pathOptions={{
//                   color: "hsl(24, 70%, 45%)",
//                   weight: 3,
//                   dashArray: "8, 8",
//                   opacity: 0.7,
//                 }}
//               />
//             )}
//             <FitBounds points={points} />
//           </MapContainer>
//         </div>
//       </div>
//     </div>
//   );
// }
