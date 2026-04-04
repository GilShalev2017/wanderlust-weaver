import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { MapPin, RotateCcw, CalendarDays, DollarSign, Backpack, Lightbulb, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DayMap from "./DayMap";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ItineraryDisplayProps {
  content: string;
  isStreaming: boolean;
  onReset: () => void;
}

/** Split markdown into sections: overview, day cards, budget, tips, packing, etc. */
function parseSections(markdown: string) {
  const lines = markdown.split("\n");
  const sections: { type: string; title: string; content: string }[] = [];
  let current: { type: string; title: string; lines: string[] } | null = null;

  const flush = () => {
    if (current) {
      sections.push({ type: current.type, title: current.title, content: current.lines.join("\n").trim() });
    }
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    const h3Day = line.match(/^###\s*(.*Day\s+\d+.*)/i);

    if (h2) {
      flush();
      const title = h2[1].replace(/[*_]/g, "").trim();
      let type = "section";
      const lower = title.toLowerCase();
      if (lower.includes("budget") || lower.includes("cost")) type = "budget";
      else if (lower.includes("pack")) type = "packing";
      else if (lower.includes("tip") || lower.includes("logistic")) type = "tips";
      else if (lower.includes("overview") || lower.includes("summary")) type = "overview";
      else if (lower.includes("day-by-day") || lower.includes("itinerary")) type = "days-header";
      current = { type, title, lines: [] };
    } else if (h3Day && current?.type !== "budget" && current?.type !== "packing" && current?.type !== "tips") {
      flush();
      current = { type: "day", title: h3Day[1].replace(/[*_]/g, "").trim(), lines: [] };
    } else {
      if (!current) {
        current = { type: "header", title: "", lines: [line] };
      } else {
        current.lines.push(line);
      }
    }
  }
  flush();
  return sections;
}

const sectionIcons: Record<string, React.ReactNode> = {
  budget: <DollarSign className="h-5 w-5 text-accent" />,
  packing: <Backpack className="h-5 w-5 text-accent" />,
  tips: <Lightbulb className="h-5 w-5 text-accent" />,
  overview: <MapPin className="h-5 w-5 text-primary" />,
};

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-secondary/50" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-2 text-left font-semibold text-foreground border-b border-border" {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2 text-foreground/90 border-b border-border/50" {...props}>{children}</td>
  ),
};

function DayCard({ title, content, index, cityContext, country, countryCode }: {
  title: string; content: string; index: number;
  cityContext?: string; country?: string; countryCode?: string;
}) {
  const dayNum = title.match(/Day\s+(\d+)/i)?.[1] || String(index + 1);

  return (
    <motion.div
      data-pdf-section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 16px 48px -12px hsl(25 20% 15% / 0.15)" }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border shadow-soft overflow-hidden transition-colors hover:border-primary/30"
    >
      {/* Day header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-warm flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">{dayNum}</span>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground leading-tight">
            {title.replace(/^Day\s+\d+[:\s–—-]*/i, "").trim() || title}
          </h3>
          <span className="text-xs font-body text-muted-foreground">Day {dayNum}</span>
        </div>
      </div>
      {/* Day content */}
      <div className="px-5 py-4">
        <article className="prose prose-sm prose-stone max-w-none font-body prose-headings:font-display prose-h4:text-base prose-h4:text-primary prose-h4:mt-3 prose-h4:mb-1 prose-p:text-foreground/85 prose-p:leading-relaxed prose-li:text-foreground/85 prose-strong:text-foreground prose-a:text-primary prose-ul:my-1 prose-li:my-0.5">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </article>
      </div>
      {/* Per-day interactive map */}
      <DayMap
        dayContent={content}
        dayNumber={parseInt(dayNum)}
        cityContext={cityContext}
        country={country}
        countryCode={countryCode}
      />
    </motion.div>
  );
}

function SectionCard({ type, title, content }: { type: string; title: string; content: string }) {
  const icon = sectionIcons[type] || <CalendarDays className="h-5 w-5 text-primary" />;

  return (
    <motion.div
      data-pdf-section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35 }}
      className="bg-card rounded-xl border border-border shadow-soft overflow-hidden transition-colors hover:border-primary/30"
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-secondary/30">
        {icon}
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-4">
        <article className="prose prose-sm prose-stone max-w-none font-body prose-headings:font-display prose-p:text-foreground/85 prose-p:leading-relaxed prose-li:text-foreground/85 prose-strong:text-foreground prose-a:text-primary prose-ul:my-1">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </article>
      </div>
    </motion.div>
  );
}

async function exportToPDF(elementId: string, filename: string = "itinerary.pdf") {
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 12;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
  const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
  const SECTION_GAP_MM = 4;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      alert("Could not find the itinerary content to export.");
      return;
    }

    // Gather all sections marked for PDF
    const sections = Array.from(
      element.querySelectorAll("[data-pdf-section]")
    ) as HTMLElement[];

    if (sections.length === 0) {
      alert("No content sections found to export.");
      return;
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let currentY = MARGIN_MM;
    let isFirstSection = true;

    for (const section of sections) {
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
      const heightMM = (canvas.height / 2) * scaleFactor;
      const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

      // If section won't fit, start a new page
      if (heightMM > remainingSpace && !isFirstSection) {
        pdf.addPage();
        currentY = MARGIN_MM;
      }

      // If a single section is taller than one page, split it across pages
      const imgData = canvas.toDataURL("image/png");
      if (heightMM > CONTENT_HEIGHT_MM) {
        // Render tall section across multiple pages
        let remainingHeight = heightMM;
        let srcY = 0;
        while (remainingHeight > 0) {
          const sliceHeight = Math.min(CONTENT_HEIGHT_MM - (currentY - MARGIN_MM), remainingHeight);
          const sliceRatio = sliceHeight / heightMM;
          const srcSliceHeight = canvas.height * sliceRatio;

          // Create a slice canvas
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = srcSliceHeight;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceHeight, 0, 0, canvas.width, srcSliceHeight);
            const sliceData = sliceCanvas.toDataURL("image/png");
            pdf.addImage(sliceData, "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sliceHeight);
          }

          srcY += srcSliceHeight;
          remainingHeight -= sliceHeight;
          if (remainingHeight > 0) {
            pdf.addPage();
            currentY = MARGIN_MM;
          } else {
            currentY += sliceHeight + SECTION_GAP_MM;
          }
        }
      } else {
        pdf.addImage(imgData, "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
        currentY += heightMM + SECTION_GAP_MM;
      }

      isFirstSection = false;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
}

export default function ItineraryDisplay({ content, isStreaming, onReset }: ItineraryDisplayProps) {
  const sections = useMemo(() => (isStreaming ? [] : parseSections(content)), [content, isStreaming]);
  const itineraryRef = useRef<HTMLDivElement>(null);

  // Extract city/country context from itinerary header for geocoding
  const locationContext = useMemo(() => {
    if (!content) return {};
    const header = content.slice(0, 1000);
    // Match "City, Country" or "City (Region), Country" patterns
    // Avoid capturing LLM phrases by requiring country to be ≤20 chars and start with uppercase
    const match = header.match(/(?:to|in|for|exploring|weekend in)\s+([A-Z][a-zà-ü]+(?:\s[A-Z][a-zà-ü]+)*),?\s*([A-Z][a-zà-ü]+(?:\s[A-Z][a-zà-ü]+){0,2})/i);
    if (match) {
      const city = match[1].trim();
      const country = match[2].trim();
      // Guard: reject country if it looks like an LLM phrase
      const invalidCountry = /^(designed|known|famous|popular|perfect|ideal|great|built|located)/i.test(country) || country.length > 20;
      return { city, country: invalidCountry ? undefined : country };
    }
    return {};
  }, [content]);

  const handleExportPDF = () => {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `travel-itinerary-${timestamp}.pdf`;
    exportToPDF("itinerary-content", filename);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-semibold text-foreground">Your Itinerary</h2>
        </div>
        {!isStreaming && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExportPDF} 
              variant="outline" 
              className="font-body text-sm gap-2"
              data-pdf-export="itinerary-content"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={onReset} variant="outline" className="font-body text-sm gap-2">
              <RotateCcw className="h-4 w-4" />
              Plan Another Trip
            </Button>
          </div>
        )}
      </div>


      {/* Streaming: show raw markdown */}
      {isStreaming && (
        <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-card">
          <article className="prose prose-stone max-w-none font-body prose-headings:font-display prose-h1:text-3xl prose-h2:text-xl prose-h2:text-primary prose-h3:text-lg prose-h3:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
          <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-1 rounded-sm" />
        </div>
      )}

      {/* Finished: show parsed cards */}
      {!isStreaming && sections.length > 0 && (
        <div id="itinerary-content" className="flex flex-col gap-5">
          {(() => {
            let dayCounter = 0;
            return sections.map((section, i) => {
              if (section.type === "header") {
                return (
                  <article key={i} data-pdf-section className="prose prose-stone max-w-none font-body prose-headings:font-display prose-h1:text-3xl prose-h1:text-foreground prose-p:text-foreground/90 text-center">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </article>
                );
              }
              if (section.type === "day") {
                dayCounter++;
                return <DayCard key={i} title={section.title} content={section.content} index={dayCounter - 1} cityContext={locationContext.city} country={locationContext.country} />;
              }
              if (section.type === "days-header") {
                return (
                  <div key={i} data-pdf-section className="flex items-center gap-2 mt-4 mb-1">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-semibold text-foreground">{section.title}</h2>
                  </div>
                );
              }
              if (section.content) {
                return <SectionCard key={i} type={section.type} title={section.title} content={section.content} />;
              }
              return null;
            });
          })()}
        </div>
      )}
    </motion.div>
  );
}
