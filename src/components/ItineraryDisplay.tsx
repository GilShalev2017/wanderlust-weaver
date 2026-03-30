import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ItineraryDisplayProps {
  content: string;
  isStreaming: boolean;
  onReset: () => void;
}

export default function ItineraryDisplay({ content, isStreaming, onReset }: ItineraryDisplayProps) {
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
          <Button
            onClick={onReset}
            variant="outline"
            className="font-body text-sm gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Plan Another Trip
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-card">
        <article className="prose prose-stone max-w-none font-body prose-headings:font-display prose-h1:text-3xl prose-h2:text-xl prose-h2:text-primary prose-h3:text-lg prose-h3:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-1 rounded-sm" />
        )}
      </div>
    </motion.div>
  );
}
