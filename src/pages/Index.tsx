import { useState } from "react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-japan.jpg";
import TripInput from "@/components/TripInput";
import AgentProgress, { type AgentStage } from "@/components/AgentProgress";
import ItineraryDisplay from "@/components/ItineraryDisplay";
import { runTravelPipeline, CreditError, RateLimitError } from "@/lib/agents";
import { toast } from "sonner";

type AppState = "input" | "processing" | "done";

export default function Index() {
  const [state, setState] = useState<AppState>("input");
  const [stage, setStage] = useState<AgentStage>("research");
  const [itinerary, setItinerary] = useState("");

  const handleSubmit = async (request: string) => {
    setState("processing");
    setItinerary("");
    setStage("research");

    try {
      await runTravelPipeline(request, {
        onStageChange: setStage,
        onStream: (chunk) => setItinerary((prev) => prev + chunk),
        onDone: () => setState("done"),
      });
    } catch (err) {
      console.error(err);
      if (err instanceof CreditError) {
        toast.error("AI credits exhausted", {
          description: "Please add funds in Settings → Cloud & AI balance to continue.",
          duration: 10000,
        });
      } else if (err instanceof RateLimitError) {
        toast.error("Rate limited", {
          description: "Too many requests. Please wait a moment and try again.",
          duration: 6000,
        });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setState("input");
    }
  };

  const handleReset = () => {
    setState("input");
    setItinerary("");
    setStage("research");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Travel landscape"
            className="w-full h-full object-cover opacity-30"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 pt-8 pb-6 md:pt-12 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 text-primary font-body text-sm font-medium tracking-wider uppercase mb-4">
              <span className="w-8 h-px bg-primary" />
              AI-Powered Multi-Agent
              <span className="w-8 h-px bg-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-4">
              Travel Planner
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Four specialized AI agents collaborate to craft your perfect itinerary — from research to final review.
            </p>
          </motion.div>

          {state === "input" && <TripInput onSubmit={handleSubmit} isLoading={false} />}
          {state === "processing" && (
            <>
              <TripInput onSubmit={() => {}} isLoading={true} />
            </>
          )}
        </div>
      </header>

      {/* Agent Progress + Itinerary */}
      <main className="container mx-auto px-4 pb-6">
        {(state === "processing" || state === "done") && (
          <>
            <AgentProgress currentStage={stage} />
            {itinerary && (
              <ItineraryDisplay
                content={itinerary}
                isStreaming={state === "processing"}
                onReset={handleReset}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-body text-muted-foreground">
            Built with a multi-agent pipeline: Research → Planning → Detail → Review
          </p>
        </div>
      </footer>
    </div>
  );
}
