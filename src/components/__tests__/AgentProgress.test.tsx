import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentProgress from "../AgentProgress";

describe("AgentProgress", () => {
  it("renders all four agent labels", () => {
    render(<AgentProgress currentStage="research" />);
    expect(screen.getByText("Research Agent")).toBeInTheDocument();
    expect(screen.getByText("Planning Agent")).toBeInTheDocument();
    expect(screen.getByText("Detail Agent")).toBeInTheDocument();
    expect(screen.getByText("Review Agent")).toBeInTheDocument();
  });

  it("shows pulsing dots for active agent", () => {
    const { container } = render(<AgentProgress currentStage="planning" />);
    // The active agent should have the pulse dots
    const pulseDots = container.querySelectorAll(".animate-pulse-dot");
    expect(pulseDots.length).toBe(3); // 3 dots for the active stage
  });

  it("shows complete state without pulse dots", () => {
    const { container } = render(<AgentProgress currentStage="complete" />);
    const pulseDots = container.querySelectorAll(".animate-pulse-dot");
    expect(pulseDots.length).toBe(0);
  });
});
