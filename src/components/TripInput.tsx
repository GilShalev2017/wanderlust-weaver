import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_TRIPS = [
  "10 days in Japan in May. I love food, hiking, and getting off the beaten path.",
  "Two weeks in South America, flexible on country. Solo, budget traveler, mix of cities and nature.",
  "Long weekend city break somewhere in Europe I haven't been. I'm based in Tel Aviv, I like architecture and contemporary art.",
];

interface TripInputProps {
  onSubmit: (request: string) => void;
  isLoading: boolean;
}

export default function TripInput({ onSubmit, isLoading }: TripInputProps) {
  const [request, setRequest] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (request.trim() && !isLoading) onSubmit(request.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Describe your dream trip..."
            rows={4}
            disabled={isLoading}
            className="w-full rounded-lg border border-border bg-card p-4 pr-12 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none shadow-soft transition-shadow focus:shadow-card disabled:opacity-50"
          />
        </div>

        <Button
          type="submit"
          disabled={!request.trim() || isLoading}
          className="w-full gradient-warm text-primary-foreground font-body font-medium text-base py-6 rounded-lg shadow-soft hover:shadow-card transition-all"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Agents are planning your trip…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Plan My Trip
            </span>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Try a sample request</p>
        <div className="flex flex-col gap-2">
          {SAMPLE_TRIPS.map((trip, i) => (
            <button
              key={i}
              onClick={() => setRequest(trip)}
              disabled={isLoading}
              className="text-left text-sm font-body text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              "{trip}"
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
