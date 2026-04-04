import type { AgentStage } from "@/components/AgentProgress";

export class CreditError extends Error {
  constructor(message: string) { super(message); this.name = "CreditError"; }
}
export class RateLimitError extends Error {
  constructor(message: string) { super(message); this.name = "RateLimitError"; }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callAgent(
  functionName: string,
  body: Record<string, unknown>
): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 402) {
      throw new CreditError("AI credits exhausted. Please add funds in Settings → Cloud & AI balance.");
    }
    if (resp.status === 429) {
      throw new RateLimitError("Too many requests. Please wait a moment and try again.");
    }
    throw new Error(`Agent ${functionName} failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  if (data.error && typeof data.error === "string" && data.error.includes("402")) {
    throw new CreditError("AI credits exhausted. Please add funds in Settings → Cloud & AI balance.");
  }
  return data.result;
}

export interface PipelineCallbacks {
  onStageChange: (stage: AgentStage) => void;
  onStream: (chunk: string) => void;
  onDone: () => void;
}

export async function runTravelPipeline(
  tripRequest: string,
  callbacks: PipelineCallbacks
) {
  // Stage 1: Research
  callbacks.onStageChange("research");
  const research = await callAgent("travel-research", { tripRequest });

  // Stage 2: Planning
  callbacks.onStageChange("planning");
  const plan = await callAgent("travel-plan", { tripRequest, research });

  // Stage 3: Detail
  callbacks.onStageChange("detail");
  const detailed = await callAgent("travel-detail", { tripRequest, research, plan });

  // Stage 4: Review & stream final output
  callbacks.onStageChange("review");

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/travel-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ tripRequest, research, plan, detailed }),
  });

  if (!resp.ok || !resp.body) throw new Error("Review agent failed");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) callbacks.onStream(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  callbacks.onStageChange("complete");
  callbacks.onDone();
}
