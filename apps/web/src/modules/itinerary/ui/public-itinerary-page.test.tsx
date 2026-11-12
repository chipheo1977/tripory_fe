import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FX_OTHER_ID, FX_OWNER_ID, makeFxItinerary } from "@/test/domain-itinerary-fixtures";
import { PublicForbidden } from "./public-forbidden";
import { PublicHeader } from "./public-header";
import { PublicItineraryPage } from "./public-itinerary-page";
import { PublicItineraryView } from "./public-itinerary-view";
import { PublicRefreshError } from "./public-load-error";
import { PublicStatusFrame } from "./public-status-frame";

const h = vi.hoisted(() => ({ getPublicItinerary: vi.fn(), getViewer: vi.fn() }));

// `server-only` không import được dưới Vitest.
vi.mock("@/composition/itinerary.server", () => ({ getPublicItinerary: h.getPublicItinerary }));
vi.mock("@/composition/viewer.server", () => ({ getViewer: h.getViewer }));
vi.mock("@/components/account-slot", () => ({ AccountSlot: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f")!;
const recovery = <div data-testid="recovery" />;
const itinerary = makeFxItinerary({ title: "Chuyến bí mật" });

type AnyElement = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

const viewerOf = (id: string) => ({ id: parseUserId(id), email: "a@b.c", fullName: "A", handle: "a", avatarUrl: null });

beforeEach(() => {
  h.getPublicItinerary.mockReset();
  h.getViewer.mockReset().mockResolvedValue(null);
});

/** Duyệt cây element (không render) tìm phần tử có `type`. */
function findByType(node: ReactNode, type: unknown): AnyElement | null {
  if (!isValidElement(node)) return null;
  const element = node as AnyElement;
  if (element.type === type) return element;
  const children = element.props.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findByType(child as ReactNode, type);
    if (found !== null) return found;
  }
  return null;
}

const run = async (result: unknown) => {
  h.getPublicItinerary.mockResolvedValue(result);
  return (await PublicItineraryPage({ itineraryId: ID, recovery })) as AnyElement;
};

describe("ok result", () => {
  const resolveOk = async () => {
    const element = await run({ kind: "ok", itinerary });
    return (await (element.type as (props: unknown) => Promise<AnyElement>)(element.props)) as AnyElement;
  };

  it("gives the owner canEdit and passes the public itinerary down", async () => {
    h.getViewer.mockResolvedValue(viewerOf(FX_OWNER_ID));

    const view = await resolveOk();

    expect(view.type).toBe(PublicItineraryView);
    expect(view.props.canEdit).toBe(true);
    expect(view.props.itinerary).toBe(itinerary);
    expect(isValidElement(view.props.account)).toBe(true);
  });

  it.each([
    ["a guest", null],
    ["another user", viewerOf(FX_OTHER_ID)],
  ])("does not give %s canEdit", async (_name, viewer) => {
    h.getViewer.mockResolvedValue(viewer);

    const view = await resolveOk();

    expect(view.props.canEdit).toBe(false);
  });

  it("never hands a token to the client", async () => {
    h.getViewer.mockResolvedValue(viewerOf(FX_OWNER_ID));

    const view = await resolveOk();
    const serialized = JSON.stringify({ canEdit: view.props.canEdit, itinerary: view.props.itinerary });

    expect(serialized).not.toMatch(/accessToken|refreshToken|authorization/i);
    expect(Object.keys(view.props).sort()).toEqual(["account", "canEdit", "itinerary"]);
  });
});

describe("other results", () => {
  it("renders the logo-only 403 inside the status frame for forbidden", async () => {
    const tree = await run({ kind: "forbidden" });

    expect(tree.type).toBe(PublicStatusFrame);
    const header = tree.props.header as AnyElement;
    expect(header.type).toBe(PublicHeader);
    expect(header.props.account).toBeUndefined();
    expect(header.props.actions).toBeUndefined();
    expect(header.props.toggle).toBeUndefined();
    expect(findByType(tree, PublicForbidden)).not.toBeNull();
    expect(JSON.stringify(tree)).not.toContain("Chuyến bí mật");
  });

  it("throws notFound for not-found", async () => {
    h.getPublicItinerary.mockResolvedValue({ kind: "not-found" });

    await expect(PublicItineraryPage({ itineraryId: ID, recovery })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("hands over to session recovery for recover, returning the very node it was given", async () => {
    const tree = await run({ kind: "recover" });

    expect(tree).toBe(recovery);
  });

  it("renders a retryable error with the account slot for error", async () => {
    const tree = await run({ kind: "error" });

    expect(tree.type).toBe(PublicStatusFrame);
    const header = tree.props.header as AnyElement;
    expect(header.type).toBe(PublicHeader);
    expect(isValidElement(header.props.account)).toBe(true);
    expect(findByType(tree, PublicRefreshError)).not.toBeNull();
  });

  it("calls the loader exactly once per render", async () => {
    await run({ kind: "forbidden" });

    expect(h.getPublicItinerary).toHaveBeenCalledTimes(1);
    expect(h.getPublicItinerary).toHaveBeenCalledWith(ID);
  });
});
