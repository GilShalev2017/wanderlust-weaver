import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { MapPin, RotateCcw, CalendarDays, DollarSign, Backpack, Lightbulb, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItineraryMap from "./ItineraryMap";
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

function DayCard({ title, content, index }: { title: string; content: string; index: number }) {
  // Extract day number from title
  const dayNum = title.match(/Day\s+(\d+)/i)?.[1] || String(index + 1);

  return (
    <motion.div
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
    </motion.div>
  );
}

function SectionCard({ type, title, content }: { type: string; title: string; content: string }) {
  const icon = sectionIcons[type] || <CalendarDays className="h-5 w-5 text-primary" />;

  return (
    <motion.div
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
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error("Element not found for PDF export");
      alert("Could not find the itinerary content to export.");
      return;
    }

    // Show loading state
    const originalButton = document.querySelector(`[data-pdf-export="${elementId}"]`) as HTMLButtonElement;
    if (originalButton) {
      originalButton.disabled = true;
      originalButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Generating...';
    }

    // Temporarily remove animations and transitions for cleaner PDF
    const originalStyles: { [key: string]: string } = {};
    const animatedElements = element.querySelectorAll('[class*="motion-"], [class*="animate-"]');
    
    animatedElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      originalStyles[el.toString()] = htmlEl.style.cssText;
      htmlEl.style.transition = 'none';
      htmlEl.style.animation = 'none';
    });

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure white background in cloned document
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
        }
      }
    });

    // Restore animations
    animatedElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.cssText = originalStyles[Object.keys(originalStyles)[index]] || '';
    });

    // Get canvas dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate PDF dimensions (A4 size: 210mm x 297mm)
    const pdfWidth = 210;
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
      unit: "mm",
      format: "a4",
    });

    // Add image to PDF
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Save the PDF
    pdf.save(filename);

    // Restore button state
    if (originalButton) {
      originalButton.disabled = false;
      originalButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export PDF';
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // Restore button state on error
    const originalButton = document.querySelector(`[data-pdf-export="${elementId}"]`) as HTMLButtonElement;
    if (originalButton) {
      originalButton.disabled = false;
      originalButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export PDF';
    }
    
    // Show error message
    alert("Failed to generate PDF. Please try again or check your browser console for details.");
  }
}

export default function ItineraryDisplay({ content, isStreaming, onReset }: ItineraryDisplayProps) {
  const sections = useMemo(() => (isStreaming ? [] : parseSections(content)), [content, isStreaming]);
  const itineraryRef = useRef<HTMLDivElement>(null);

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

      {/* Map */}
      {/* <ItineraryMap content={content} isStreaming={isStreaming} /> */}

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
                  <article key={i} className="prose prose-stone max-w-none font-body prose-headings:font-display prose-h1:text-3xl prose-h1:text-foreground prose-p:text-foreground/90 text-center">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </article>
                );
              }
              if (section.type === "day") {
                dayCounter++;
                return <DayCard key={i} title={section.title} content={section.content} index={dayCounter - 1} />;
              }
              if (section.type === "days-header") {
                return (
                  <div key={i} className="flex items-center gap-2 mt-4 mb-1">
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
