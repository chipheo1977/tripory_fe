import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicItineraryPage } from "@/modules/itinerary/ui/public-itinerary-page";
import { SessionRecovery } from "@/modules/identity/ui/session-recovery";
import { makeFxItinerary } from "@/test/domain-itinerary-fixtures";
import { makePublicSocial } from "@/components/public-social";
import PublicItineraryRoute, { generateMetadata } from "./page";

const h = vi.hoisted(() => ({ getPublicItinerary: vi.fn() }));

// `server-only` không import được dưới Vitest.
vi.mock("@/composition/itinerary.server", () => ({ getPublicItinerary: h.getPublicItinerary }));
vi.mock("@/modules/itinerary/ui/public-itinerary-page", () => ({ PublicItineraryPage: () => null }));
vi.mock("@/modules/identity/ui/session-recovery", () => ({ SessionRecovery: () => null }));
// tránh nạp cây client của social; chỉ cần kiểm route truyền đúng hàm.
vi.mock("@/components/public-social", () => ({ makePublicSocial: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  h.getPublicItinerary.mockReset();
});

describe("generateMetadata", () => {
  it("is neutral and noindex for a malformed id, without touching the BE", async () => {
    const metadata = await generateMetadata(params("khong-phai-guid"));

    expect(metadata.title).toBe("Lịch trình");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata).not.toHaveProperty("openGraph");
    expect(h.getPublicItinerary).not.toHaveBeenCalled();
  });

  it("loads the itinerary once and builds the Open Graph metadata", async () => {
    h.getPublicItinerary.mockResolvedValue({ kind: "ok", itinerary: makeFxItinerary({ title: "Hội An 3 ngày" }) });

    const metadata = await generateMetadata(params(ID));

    expect(h.getPublicItinerary).toHaveBeenCalledTimes(1);
    expect(metadata.title).toBe("Hội An 3 ngày");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect((metadata.openGraph as { url: string }).url).toBe(`https://triporyv1.vercel.app/itineraries/${ID}`);
  });

  it("stays neutral when the visitor may not see the itinerary", async () => {
    h.getPublicItinerary.mockResolvedValue({ kind: "forbidden" });

    const metadata = await generateMetadata(params(ID));

    expect(metadata.title).toBe("Lịch trình");
    expect(metadata).not.toHaveProperty("openGraph");
  });
});

describe("the route", () => {
  it("throws notFound for a malformed id before loading anything", async () => {
    await expect(PublicItineraryRoute(params("khong-phai-guid"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.getPublicItinerary).not.toHaveBeenCalled();
  });

  it("renders the public page with the id and a session recovery that shows the skeleton", async () => {
    const element = (await PublicItineraryRoute(params(ID))) as ReactElement<{
      itineraryId: string;
      recovery: ReactElement<{ fallback: unknown }>;
    }>;

    expect(element.type).toBe(PublicItineraryPage);
    expect(element.props.itineraryId).toBe(ID);
    expect(element.props.recovery.type).toBe(SessionRecovery);
    expect(element.props.recovery.props.fallback).toBeTruthy();
  });

  it("passes the social factory to the public page (05.1)", async () => {
    const element = (await PublicItineraryRoute(params(ID))) as ReactElement<{ social: unknown }>;
    expect(element.props.social).toBe(makePublicSocial);
  });

  it("keeps like and comment counts out of the Open Graph description (D-24)", async () => {
    h.getPublicItinerary.mockResolvedValue({
      kind: "ok",
      itinerary: makeFxItinerary({ engagement: { likeCount: 4321, commentCount: 8765, likedByMe: false } }),
    });
    const metadata = await generateMetadata(params(ID));
    const description = String((metadata.openGraph as { description?: string }).description ?? "");
    expect(description).not.toMatch(/4321|4\.321|8765|8\.765|lượt thích|bình luận/);
  });
});
