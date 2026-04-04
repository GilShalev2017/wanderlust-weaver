import { useEffect, useState, lazy, Suspense } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractAndGeocodeLocations, type GeoPoint } from "@/lib/geocoding";

// Lazy-load the heavy Leaflet map renderer
const LeafletMap = lazy(() => import("./LeafletMapRenderer"));

interface DayMapProps {
  dayContent: string;
  dayNumber: number;
  cityContext?: string;
  country?: string;
  countryCode?: string;
}

export default function DayMap({ dayContent, dayNumber, cityContext, country, countryCode }: DayMapProps) {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [geocoded, setGeocoded] = useState(false);

  // Only geocode when user expands the map
  useEffect(() => {
    if (!expanded || geocoded || loading) return;

    setLoading(true);
    extractAndGeocodeLocations(dayContent, cityContext, country, countryCode).then((pts) => {
      setPoints(pts);
      setGeocoded(true);
      setLoading(false);
    });
  }, [expanded, geocoded, loading, dayContent, cityContext, country, countryCode]);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-body text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {expanded ? "Hide Map" : "Show Day Map"}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Locating places on map…
              </div>
            )}

            {!loading && geocoded && points.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No mappable locations found for this day.
              </div>
            )}

            {!loading && points.length > 0 && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading map…
                  </div>
                }
              >
                <LeafletMap points={points} dayNumber={dayNumber} />
              </Suspense>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
