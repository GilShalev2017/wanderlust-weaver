import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TripInput from "../TripInput";

describe("TripInput", () => {
  it("renders textarea and submit button", () => {
    render(<TripInput onSubmit={() => {}} isLoading={false} />);
    expect(screen.getByPlaceholderText("Describe your dream trip...")).toBeInTheDocument();
    expect(screen.getByText("Plan My Trip")).toBeInTheDocument();
  });

  it("submit button is disabled when textarea is empty", () => {
    render(<TripInput onSubmit={() => {}} isLoading={false} />);
    const button = screen.getByText("Plan My Trip").closest("button");
    expect(button).toBeDisabled();
  });

  it("calls onSubmit with trimmed text", () => {
    const onSubmit = vi.fn();
    render(<TripInput onSubmit={onSubmit} isLoading={false} />);

    const textarea = screen.getByPlaceholderText("Describe your dream trip...");
    fireEvent.change(textarea, { target: { value: "  3 days in Paris  " } });

    const form = textarea.closest("form")!;
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledWith("3 days in Paris");
  });

  it("shows loading state", () => {
    render(<TripInput onSubmit={() => {}} isLoading={true} />);
    expect(screen.getByText("Agents are planning your trip…")).toBeInTheDocument();
  });

  it("renders sample trip buttons", () => {
    render(<TripInput onSubmit={() => {}} isLoading={false} />);
    const sampleButtons = screen.getAllByText(/^"/);
    expect(sampleButtons.length).toBe(3);
  });

  it("clicking sample trip fills textarea", () => {
    render(<TripInput onSubmit={() => {}} isLoading={false} />);
    const sampleButton = screen.getAllByText(/^"/)[0];
    fireEvent.click(sampleButton);

    const textarea = screen.getByPlaceholderText("Describe your dream trip...") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Japan");
  });
});
