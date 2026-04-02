import { motion, AnimatePresence } from "framer-motion";
import { Search, CalendarDays, MapPin, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export type AgentStage = "research" | "planning" | "detail" | "review" | "complete";

const AGENTS = [
  { id: "research" as const, label: "Research Agent", description: "Analyzing preferences & destinations", detail: "Scours travel data, reviews, and seasonal info to find the best options for your trip.", icon: Search },
  { id: "planning" as const, label: "Planning Agent", description: "Structuring day-by-day itinerary", detail: "Organizes your days with optimal routing, timing, and activity balance.", icon: CalendarDays },
  { id: "detail" as const, label: "Detail Agent", description: "Adding restaurants, trails & tips", detail: "Fills in restaurant picks, walking routes, hidden gems, and local insider tips.", icon: MapPin },
  { id: "review" as const, label: "Review Agent", description: "Optimizing logistics & budget", detail: "Final pass to tighten logistics, estimate costs, and ensure a smooth experience.", icon: CheckCircle2 },
];

const stageOrder: AgentStage[] = ["research", "planning", "detail", "review", "complete"];

interface AgentProgressProps {
  currentStage: AgentStage;
}

export default function AgentProgress({ currentStage }: AgentProgressProps) {
  const currentIdx = stageOrder.indexOf(currentStage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto my-8"
    >
      <div className="flex items-center justify-between gap-2">
        {AGENTS.map((agent, i) => {
          const isDone = currentIdx > i;
          const isActive = stageOrder[currentIdx] === agent.id;
          const Icon = agent.icon;

          return (
            <div key={agent.id} className="flex-1 flex flex-col items-center text-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${
                  isDone
                    ? "bg-accent text-accent-foreground"
                    : isActive
                    ? "gradient-warm text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-xs font-body font-medium ${isActive ? "text-primary" : isDone ? "text-accent" : "text-muted-foreground"}`}>
                {agent.label}
              </span>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-1 mt-0.5"
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot"
                      style={{ animationDelay: `${d * 0.3}s` }}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
