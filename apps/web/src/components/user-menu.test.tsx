import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Viewer } from "@tripory/identity";
import { beforeEach, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

const h = vi.hoisted(() => ({
  pathname: "/",
  profile: { data: undefined as { avatarUrl: string | null } | undefined },
  signOut: vi.fn(),
  useMyProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => h.pathname }));
vi.mock("@/composition/identity.client", () => ({ identity: { useMyProfile: h.useMyProfile } }));
vi.mock("@/modules/identity/ui/use-session-actions", () => ({
  useSessionActions: () => ({ signOut: h.signOut }),
}));

const viewer = (overrides: Partial<Viewer> = {}): Viewer => ({
  id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" as Viewer["id"],
  email: "anh@tripory.vn",
  fullName: "Nguyễn Văn Ánh",
  handle: "anh",
  avatarUrl: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.pathname = "/";
  h.profile = { data: undefined };
  h.useMyProfile.mockImplementation(() => h.profile);
});

const open = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Menu tài khoản/u }));
  await screen.findByRole("menu");
  return user;
};

it("labels the trigger with the full name and shows the name only from sm", () => {
  render(<UserMenu viewer={viewer()} />);

  const trigger = screen.getByRole("button", { name: "Menu tài khoản: Nguyễn Văn Ánh" });
  expect(trigger.className).toContain("min-h-touch");
  expect(trigger.className).toContain("min-w-touch");
  expect(within(trigger).getByRole("img")).toBeTruthy();

  const name = within(trigger).getByText("Nguyễn Văn Ánh");
  expect(name.className).toContain("hidden");
  expect(name.className).toContain("sm:inline");
  expect(name.className).toContain("truncate");
  expect(name.className).toContain("max-w-(--user-menu-name-max-width)");
});

it("falls back to the email when the full name is empty", () => {
  render(<UserMenu viewer={viewer({ fullName: "  " })} />);

  expect(screen.getByRole("button", { name: "Menu tài khoản: anh@tripory.vn" })).toBeTruthy();
});

it("shows initials until the profile avatar loads, then uses its src", () => {
  const { rerender } = render(<UserMenu viewer={viewer()} />);
  expect(screen.getByText("NV")).toBeTruthy();

  h.profile = { data: { avatarUrl: "https://cdn.test/a.png" } };
  rerender(<UserMenu viewer={viewer()} />);
  expect(document.querySelector("img")?.getAttribute("src")).toBe("https://cdn.test/a.png");
});

it("asks the profile only once the viewer is known", () => {
  render(<UserMenu viewer={viewer()} />);

  expect(h.useMyProfile).toHaveBeenCalledWith(true);
});

it("lists name, email and the items in the approved order", async () => {
  render(<UserMenu viewer={viewer()} />);
  await open();

  const menu = screen.getByRole("menu");
  expect(within(menu).getAllByText("Nguyễn Văn Ánh").length).toBeGreaterThan(0);
  expect(within(menu).getByText("anh@tripory.vn")).toBeTruthy();

  const items = within(menu).getAllByRole("menuitem");
  expect(items.map((item) => item.textContent?.replace(/Sắp có/u, "").trim())).toEqual([
    "Lịch trình của tôi",
    "Hồ sơ",
    "Tin nhắn",
    "Đổi mật khẩu",
    "Đăng xuất",
  ]);
  expect(within(menu).getByRole("menuitem", { name: "Lịch trình của tôi" }).getAttribute("href")).toBe("/itineraries/mine");
  expect(within(menu).getByRole("menuitem", { name: "Đổi mật khẩu" }).getAttribute("href")).toBe("/settings/password");
});

it.each(["Hồ sơ", "Tin nhắn"])("renders %s as a disabled, non-navigating item with a 'Sắp có' badge", async (label) => {
  render(<UserMenu viewer={viewer()} />);
  const user = await open();

  const item = screen.getByRole("menuitem", { name: new RegExp(label, "u") });
  expect(item.getAttribute("aria-disabled")).toBe("true");
  expect(item.tagName).not.toBe("A");
  expect(item.hasAttribute("href")).toBe(false);
  expect(item.textContent).toContain("Sắp có");

  await user.click(item);
  expect(h.signOut).not.toHaveBeenCalled();
  expect(screen.queryByRole("menu")).not.toBeNull();
});

it("reaches the disabled items with the arrow keys", async () => {
  render(<UserMenu viewer={viewer()} />);
  const user = await open();

  await user.keyboard("{ArrowDown}");
  const names: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    names.push(document.activeElement?.textContent ?? "");
    await user.keyboard("{ArrowDown}");
  }

  expect(names.some((text) => text.includes("Hồ sơ"))).toBe(true);
  expect(names.some((text) => text.includes("Tin nhắn"))).toBe(true);
});

it.each([
  ["/itineraries/mine", "Lịch trình của tôi"],
  ["/settings/password", "Đổi mật khẩu"],
])("marks the link for %s as the current page", async (pathname, label) => {
  h.pathname = pathname;
  render(<UserMenu viewer={viewer()} />);
  await open();

  expect(screen.getByRole("menuitem", { name: label }).getAttribute("aria-current")).toBe("page");
});

it("does not mark any link current elsewhere", async () => {
  render(<UserMenu viewer={viewer()} />);
  await open();

  expect(screen.getByRole("menuitem", { name: "Lịch trình của tôi" }).getAttribute("aria-current")).toBeNull();
  expect(screen.getByRole("menuitem", { name: "Đổi mật khẩu" }).getAttribute("aria-current")).toBeNull();
});

it("signs out once from the menu without a confirmation dialog", async () => {
  render(<UserMenu viewer={viewer()} />);
  const user = await open();

  await user.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));

  expect(h.signOut).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});
