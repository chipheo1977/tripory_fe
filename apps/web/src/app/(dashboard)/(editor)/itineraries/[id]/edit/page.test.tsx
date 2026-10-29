import { readFileSync } from "node:fs";
import path from "node:path";
import type { Viewer } from "@tripory/identity";
import { parseUserId } from "@tripory/shared-kernel";
import type { ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import EditItineraryPage, { metadata } from "./page";

const h = vi.hoisted(() => ({ getViewer: vi.fn() }));

vi.mock("@/composition/viewer.server", () => ({ getViewer: () => h.getViewer() }));
vi.mock("@/modules/itinerary/ui/itinerary-editor", () => ({ ItineraryEditor: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  },
}));

const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
if (OWNER === null) throw new Error("id mẫu phải hợp lệ");
const viewer: Viewer = { id: OWNER, email: "anh@tripory.vn", fullName: "Anh", handle: "anh", avatarUrl: null };

const GUID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
const render = (id: string) => EditItineraryPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  h.getViewer.mockReset().mockResolvedValue(viewer);
});

it("sets the page title", () => {
  expect(metadata.title).toBe("Sửa lịch trình");
});

it("calls notFound for an id that is not a GUID, before reading the viewer", async () => {
  await expect(render("not-a-guid")).rejects.toThrow("NEXT_NOT_FOUND");
  expect(h.getViewer).not.toHaveBeenCalled();
});

it("hands the editor a lowercase id, the viewer and a key per viewer", async () => {
  const element = (await render(GUID.toUpperCase())) as ReactElement<{ itineraryId: string; viewer: Viewer }>;
  expect(element.props.itineraryId).toBe(GUID);
  expect(element.props.viewer).toBe(viewer);
  expect(element.key).toBe(viewer.id);
});

it("sends a visitor without any viewer to login with the edit page as next", async () => {
  h.getViewer.mockResolvedValue(null);
  await expect(render(GUID)).rejects.toThrow(`NEXT_REDIRECT:/login?next=${encodeURIComponent(`/itineraries/${GUID}/edit`)}`);
});

it("never calls the BE from the server component", () => {
  const source = readFileSync(path.join(__dirname, "page.tsx"), "utf8");
  expect(source).not.toContain("@tripory/itinerary/http");
  expect(source).not.toMatch(/\bfetch\(/);
});
