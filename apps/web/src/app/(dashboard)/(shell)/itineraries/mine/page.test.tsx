import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MyItinerariesPage, { metadata } from "./page";

vi.mock("@/modules/itinerary/ui/my-itineraries-view", () => ({
  MyItinerariesView: () => <div data-testid="my-itineraries-view" />,
  MyItinerariesSkeleton: () => <div data-testid="my-itineraries-skeleton" />,
}));

it("sets the document title to the page name (root template appends · Tripory)", () => {
  expect(metadata.title).toBe("Lịch trình của tôi");
});

it("renders the list view inside the page", () => {
  render(<MyItinerariesPage />);
  expect(screen.getByTestId("my-itineraries-view")).toBeTruthy();
});
