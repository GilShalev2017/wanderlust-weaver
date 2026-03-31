// import type { AgentStage } from "@/components/AgentProgress";

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// async function callAgent(
//   functionName: string,
//   body: Record<string, unknown>
// ): Promise<string> {
//   const resp = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${SUPABASE_KEY}`,
//     },
//     body: JSON.stringify(body),
//   });

//   if (!resp.ok) {
//     const text = await resp.text();
//     throw new Error(`Agent ${functionName} failed (${resp.status}): ${text}`);
//   }

//   const data = await resp.json();
//   return data.result;
// }

// export interface PipelineCallbacks {
//   onStageChange: (stage: AgentStage) => void;
//   onStream: (chunk: string) => void;
//   onDone: () => void;
// }

// export async function runTravelPipeline(
//   tripRequest: string,
//   callbacks: PipelineCallbacks
// ) {
//   // Stage 1: Research
//   callbacks.onStageChange("research");
//   const research = await callAgent("travel-research", { tripRequest });

//   // Stage 2: Planning
//   callbacks.onStageChange("planning");
//   const plan = await callAgent("travel-plan", { tripRequest, research });

//   // Stage 3: Detail
//   callbacks.onStageChange("detail");
//   const detailed = await callAgent("travel-detail", { tripRequest, research, plan });

//   // Stage 4: Review & stream final output
//   callbacks.onStageChange("review");

//   const resp = await fetch(`${SUPABASE_URL}/functions/v1/travel-review`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${SUPABASE_KEY}`,
//     },
//     body: JSON.stringify({ tripRequest, research, plan, detailed }),
//   });

//   if (!resp.ok || !resp.body) throw new Error("Review agent failed");

//   const reader = resp.body.getReader();
//   const decoder = new TextDecoder();
//   let buffer = "";

//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;
//     buffer += decoder.decode(value, { stream: true });

//     let newlineIdx: number;
//     while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
//       let line = buffer.slice(0, newlineIdx);
//       buffer = buffer.slice(newlineIdx + 1);
//       if (line.endsWith("\r")) line = line.slice(0, -1);
//       if (!line.startsWith("data: ")) continue;
//       const json = line.slice(6).trim();
//       if (json === "[DONE]") break;
//       try {
//         const parsed = JSON.parse(json);
//         const content = parsed.choices?.[0]?.delta?.content;
//         if (content) callbacks.onStream(content);
//       } catch {
//         buffer = line + "\n" + buffer;
//         break;
//       }
//     }
//   }

//   callbacks.onStageChange("complete");
//   callbacks.onDone();
// }

import type { AgentStage } from "@/components/AgentProgress";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callAgent(
  functionName: string,
  body: Record<string, unknown>,
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
    throw new Error(`Agent ${functionName} failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return data.result;
}

export interface PipelineCallbacks {
  onStageChange: (stage: AgentStage) => void;
  onStream: (chunk: string) => void;
  // Updated to pass context to the UI
  onDone: (fullContent: string, context?: any) => void;
}

export async function runTravelPipeline(
  tripRequest: string,
  callbacks: PipelineCallbacks,
) {
  // Stage 1: Research
  callbacks.onStageChange("research");
  let research = await callAgent("travel-research", { tripRequest });

  console.log("[Agents] Raw Research Result:", research);

  // --- NEW: EXTRACT METADATA ---
  // let locationContext = undefined;
  // const metadataMatch = research.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);

  // if (metadataMatch) {
  //   try {
  //     locationContext = JSON.parse(metadataMatch[1].trim());
    
  //     console.log("[Agents] Metadata successfully parsed:", locationContext); // LOG SUCCESS

  //     // Clean the research text so the metadata block isn't passed to other agents or UI
  //     research = research
  //       .replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/, "")
  //       .trim();
  //   } catch (e) {
  //     console.error("Failed to parse metadata", e);
  //   }
  // }

  // Stage 2: Planning
  callbacks.onStageChange("planning");
  const plan = await callAgent("travel-plan", { tripRequest, research });

  // Stage 3: Detail
  callbacks.onStageChange("detail");
  const detailed = await callAgent("travel-detail", {
    tripRequest,
    research,
    plan,
  });

  // Stage 4: Review
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
  let fullFinalContent = "";

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
        if (content) {
          fullFinalContent += content;
          callbacks.onStream(content);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  //console.log("[Agents] Pipeline complete. Sending context to onDone:", locationContext);
  
  callbacks.onStageChange("complete");
  // Pass the extracted location context back to the UI to update the map
  callbacks.onDone(fullFinalContent);//, locationContext);
}
