import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2, Mic, MicOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { toast } from "sonner";

const SAMPLE_TRIPS = [
  "10 days in Japan in May. I love food, hiking, and getting off the beaten path.",
  "Two weeks in South America, flexible on country. Solo, budget traveler, mix of cities and nature.",
  "Long weekend city break somewhere in Europe I haven't been. I'm based in Tel Aviv, I like architecture and contemporary art.",
];

type SpeechLang = "en-US" | "he-IL";

interface TripInputProps {
  onSubmit: (request: string) => void;
  isLoading: boolean;
}

export default function TripInput({ onSubmit, isLoading }: TripInputProps) {
  const [request, setRequest] = useState("");
  const [lang, setLang] = useState<SpeechLang>("en-US");

  const { isListening, interimText, isSupported, error, toggle } =
    useSpeechRecognition({
      lang,
      onTranscript: (text) => setRequest((prev) => (prev ? prev + " " + text : text)),
    });

  // Show error toast for mic permission issues
  if (error) {
    toast.error(error, { id: "speech-error" });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (request.trim() && !isLoading) onSubmit(request.trim());
  };

  const toggleLang = () => setLang((l) => (l === "en-US" ? "he-IL" : "en-US"));

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
            value={isListening ? request + (interimText ? (request ? " " : "") + interimText : "") : request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Describe your dream trip..."
            rows={3}
            disabled={isLoading}
            dir={lang === "he-IL" ? "rtl" : "ltr"}
            className="w-full rounded-lg border border-border bg-card p-4 pr-24 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none shadow-soft transition-shadow focus:shadow-card disabled:opacity-50"
          />
          {/* Voice controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {isSupported && (
              <>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={isLoading}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isListening
                      ? "bg-destructive text-destructive-foreground animate-pulse shadow-md"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  } disabled:opacity-50`}
                  title={isListening ? "Stop recording" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleLang}
                  disabled={isLoading || isListening}
                  className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200 disabled:opacity-50 text-[10px] font-bold font-body leading-none flex items-center justify-center"
                  title={`Language: ${lang === "en-US" ? "English" : "עברית"}`}
                >
                  {lang === "en-US" ? "EN" : "HE"}
                </button>
              </>
            )}
          </div>
          {/* Recording indicator */}
          {isListening && (
            <div className="absolute bottom-3 left-4 flex items-center gap-2 text-xs font-body text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              Listening…
            </div>
          )}
        </div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={!request.trim() || isLoading}
            className="w-full gradient-warm text-primary-foreground font-body font-medium text-base py-6 rounded-lg shadow-soft hover:shadow-elevated hover:brightness-110 transition-all duration-300"
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
        </motion.div>
      </form>

      <div className="mt-3 space-y-1.5">
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Try a sample request</p>
        <div className="flex flex-col gap-2">
          {SAMPLE_TRIPS.map((trip, i) => (
            <button
              key={i}
              onClick={() => setRequest(trip)}
              disabled={isLoading}
              className="text-left text-sm font-body text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-secondary/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              "{trip}"
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
