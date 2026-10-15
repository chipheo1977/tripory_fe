import type { Viewer } from "@tripory/identity";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountSlot } from "./account-slot";
import { UserMenu } from "./user-menu";
import { GuestLoginButton } from "@/modules/identity/ui/guest-login-button";

const h = vi.hoisted(() => ({ getViewer: vi.fn() }));

// viewer.server có `import "server-only"` nên không import được dưới Vitest.
vi.mock("@/composition/viewer.server", () => ({ getViewer: h.getViewer }));
vi.mock("./user-menu", () => ({ UserMenu: () => null }));
vi.mock("@/modules/identity/ui/guest-login-button", () => ({ GuestLoginButton: () => null }));

const viewer: Viewer = {
  id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" as Viewer["id"],
  email: "anh@tripory.vn",
  fullName: "Nguyễn Văn Ánh",
  handle: "anh",
  avatarUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("renders UserMenu with only the viewer when a session exists", async () => {
  h.getViewer.mockResolvedValue(viewer);

  const element = await AccountSlot();

  expect(element.type).toBe(UserMenu);
  expect(element.props).toEqual({ viewer });
});

it("renders the guest login button when there is no session", async () => {
  h.getViewer.mockResolvedValue(null);

  const element = await AccountSlot();

  expect(element.type).toBe(GuestLoginButton);
  expect(element.props).toEqual({});
});
