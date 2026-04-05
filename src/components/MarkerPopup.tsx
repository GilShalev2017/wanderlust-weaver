import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GeoPoint } from "@/lib/geocoding";

interface ImageEntry {
  src: string;
  source: "Wikipedia" | "Commons";
}

/** Fetch thumbnail from Wikipedia REST API with city/country context */
function useWikiImage(name: string, cityContext?: string, country?: string) {
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const contextual = [name, cityContext, country].filter(Boolean).join(" ");
    const query = encodeURIComponent(contextual);
    const headers = { "Api-User-Agent": "LovableTravelPlanner/1.0" };

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.thumbnail?.source) {
          setResult(data.thumbnail.source);
          setDone(true);
          return;
        }
        // Fallback: search with context
        return fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*&srlimit=1`
        )
          .then((r) => r.json())
          .then((sr) => {
            if (cancelled) return;
            const title = sr?.query?.search?.[0]?.title;
            if (!title) { setDone(true); return; }
            return fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
              { headers }
            )
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (cancelled) return;
                if (d?.thumbnail?.source) setResult(d.thumbnail.source);
                setDone(true);
              });
          });
      })
      .catch(() => { if (!cancelled) setDone(true); });

    return () => { cancelled = true; };
  }, [name, cityContext, country]);

  return { src: result, done };
}

/** Fetch thumbnail from Wikimedia Commons using geo-search */
function useCommonsGeoImage(lat: number, lng: number) {
  const [result, setResult] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const url =
      `https://commons.wikimedia.org/w/api.php?` +
      `action=query&generator=geosearch&ggsprimary=all&ggsnamespace=6` +
      `&ggsradius=500&ggscoord=${lat}|${lng}&ggslimit=5` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=300` +
      `&format=json&origin=*`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const pages = data?.query?.pages;
        if (!pages) { setDone(true); return; }
        const pageList = Object.values(pages) as any[];
        for (const page of pageList) {
          const thumb = page?.imageinfo?.[0]?.thumburl;
          if (thumb) { setResult(thumb); setDone(true); return; }
        }
        setDone(true);
      })
      .catch(() => { if (!cancelled) setDone(true); });

    return () => { cancelled = true; };
  }, [lat, lng]);

  return { src: result, done };
}

interface MarkerPopupProps {
  point: GeoPoint;
  stopNumber: number;
  cityContext?: string;
  country?: string;
}

export default function MarkerPopup({ point, stopNumber, cityContext, country }: MarkerPopupProps) {
  const wiki = useWikiImage(point.name, cityContext, country);
  const commons = useCommonsGeoImage(point.lat, point.lng);
  const [index, setIndex] = useState(0);

  // Build image list once both sources finish
  const images: ImageEntry[] = [];
  if (wiki.src) images.push({ src: wiki.src, source: "Wikipedia" });
  if (commons.src) images.push({ src: commons.src, source: "Commons" });

  const loading = !wiki.done || !commons.done;
  const safeIndex = images.length > 0 ? index % images.length : 0;

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  return (
    <div className="text-center min-w-[180px]">
      <strong className="text-sm block">Stop {stopNumber}</strong>
      <span className="text-xs text-muted-foreground block mb-1">{point.name}</span>

      {loading && (
        <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          Loading images…
        </div>
      )}

      {!loading && images.length === 0 && (
        <div className="text-xs text-muted-foreground py-1">No image available</div>
      )}

      {!loading && images.length > 0 && (
        <div className="relative mt-1">
          <img
            src={images[safeIndex].src}
            alt={point.name}
            className="w-full max-h-[140px] object-cover rounded"
            loading="lazy"
          />

          {/* Source badge */}
          <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            {images[safeIndex].source}
          </span>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <button
                onClick={prev}
                className="p-0.5 rounded-full hover:bg-secondary/50 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-muted-foreground">
                {safeIndex + 1} / {images.length}
              </span>
              <button
                onClick={next}
                className="p-0.5 rounded-full hover:bg-secondary/50 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
