import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreditError, RateLimitError } from "../agents";

describe("Error classes", () => {
  it("CreditError has correct name", () => {
    const err = new CreditError("test");
    expect(err.name).toBe("CreditError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("RateLimitError has correct name", () => {
    const err = new RateLimitError("test");
    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("runTravelPipeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls all four agents in sequence", async () => {
    const callOrder: string[] = [];

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const fnName = url.split("/functions/v1/")[1];
      callOrder.push(fnName);

      if (fnName === "travel-review") {
        // Simulate streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return { ok: true, body: stream };
      }

      return {
        ok: true,
        json: async () => ({ result: `result-from-${fnName}` }),
      };
    }));

    const { runTravelPipeline } = await import("../agents");

    const stages: string[] = [];
    let streamContent = "";

    await runTravelPipeline("test trip", {
      onStageChange: (s) => stages.push(s),
      onStream: (c) => { streamContent += c; },
      onDone: () => {},
    });

    expect(callOrder).toEqual([
      "travel-research",
      "travel-plan",
      "travel-detail",
      "travel-review",
    ]);
    expect(stages).toEqual(["research", "planning", "detail", "review", "complete"]);
    expect(streamContent).toBe("Hello");

    vi.unstubAllGlobals();
  });

  it("throws CreditError on 402", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 402,
      text: async () => "Payment required",
    })));

    const { runTravelPipeline, CreditError } = await import("../agents");

    await expect(
      runTravelPipeline("test", {
        onStageChange: () => {},
        onStream: () => {},
        onDone: () => {},
      })
    ).rejects.toThrow(CreditError);

    vi.unstubAllGlobals();
  });
});
