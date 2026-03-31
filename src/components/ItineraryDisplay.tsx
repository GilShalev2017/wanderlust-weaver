import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { MapPin, RotateCcw, CalendarDays, DollarSign, Backpack, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItineraryMap from "./ItineraryMap";

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
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
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
      transition={{ duration: 0.35 }}
      className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
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

export default function ItineraryDisplay({ content, isStreaming, onReset }: ItineraryDisplayProps) {
  const sections = useMemo(() => (isStreaming ? [] : parseSections(content)), [content, isStreaming]);

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
          <Button onClick={onReset} variant="outline" className="font-body text-sm gap-2">
            <RotateCcw className="h-4 w-4" />
            Plan Another Trip
          </Button>
        )}
      </div>

      {/* Map */}
      <ItineraryMap content={content} isStreaming={isStreaming} />

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
        <div className="flex flex-col gap-5">
          {sections.map((section, i) => {
            if (section.type === "header") {
              return (
                <article key={i} className="prose prose-stone max-w-none font-body prose-headings:font-display prose-h1:text-3xl prose-h1:text-foreground prose-p:text-foreground/90 text-center">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </article>
              );
            }
            if (section.type === "day") {
              return <DayCard key={i} title={section.title} content={section.content} index={i} />;
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
          })}
        </div>
      )}
    </motion.div>
  );
}
