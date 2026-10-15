import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BroadcastChannelLike } from "@/test/fake-broadcast-channel";
import { SessionEffects } from "./session-effects";

const h = vi.hoisted(() => ({
  pathname: "/",
  search: "",
  replace: vi.fn(),
  refresh: vi.fn(),
  info: vi.fn(),
  assign: vi.fn(),
  // Kênh của "tab khác", gán trong factory của vi.mock bên dưới.
  remote: null as unknown as BroadcastChannelLike,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
  useRouter: () => ({ replace: h.replace, refresh: h.refresh }),
}));

vi.mock("@tripory/ui-web", () => ({
  notify: { info: h.info, success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

// Dùng sessionEvents thật nối vào hub giả để phát `remote-*` bằng tin của một tab khác.
vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  const { makeFakeBroadcastChannelHub } = await import("@/test/fake-broadcast-channel");
  const hub = makeFakeBroadcastChannelHub();
  h.remote = hub.create("tripory-session");

  return {
    ...actual,
    sessionEvents: actual.makeSessionEvents({ createChannel: () => hub.create("tripory-session") }),
  };
});

import { sessionEvents } from "@/composition/session-events.client";

let queryClient: QueryClient;
let clearSpy: ReturnType<typeof vi.spyOn>;
const handler = vi.fn();
let unregister: () => void;

function mount() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionEffects />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.pathname = "/";
  h.search = "";
  vi.clearAllMocks();
  sessionEvents.rearmExpired();
  queryClient = new QueryClient();
  clearSpy = vi.spyOn(queryClient, "clear");
  unregister = sessionEvents.registerLogoutHandler(handler);
  vi.stubGlobal("location", { ...window.location, assign: h.assign });
});

afterEach(() => {
  unregister();
  vi.unstubAllGlobals();
});

it("expired on a dashboard path redirects to /login with an encoded next and toasts once", async () => {
  h.pathname = "/itineraries/mine";
  h.search = "tab=draft";
  mount();

  await act(async () => {
    sessionEvents.emitExpired();
    sessionEvents.emitExpired();
    sessionEvents.emitExpired();
  });

  await vi.waitFor(() => expect(h.info).toHaveBeenCalledTimes(1));
  expect(h.replace).toHaveBeenCalledTimes(1);
  expect(h.replace).toHaveBeenCalledWith("/login?next=%2Fitineraries%2Fmine%3Ftab%3Ddraft");
  expect(h.info).toHaveBeenCalledWith("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  expect(handler).toHaveBeenCalledTimes(1);
  expect(clearSpy).toHaveBeenCalled();
});

it.each(["/login", "/register"])("expired on %s neither navigates nor toasts", async (pathname) => {
  h.pathname = pathname;
  mount();

  await act(async () => {
    sessionEvents.emitExpired();
  });

  expect(h.replace).not.toHaveBeenCalled();
  expect(h.info).not.toHaveBeenCalled();
});

it("remote-logged-out hard-navigates home after running handlers, without a toast", async () => {
  h.pathname = "/itineraries/mine";
  mount();

  await act(async () => {
    h.remote.postMessage({ type: "logged-out" });
    await Promise.resolve();
  });

  await vi.waitFor(() => expect(h.assign).toHaveBeenCalledWith("/"));
  expect(handler).toHaveBeenCalledTimes(1);
  expect(h.info).not.toHaveBeenCalled();
  expect(h.replace).not.toHaveBeenCalled();
});

it.each([
  ["/login", "next=%2Fsettings%2Fpassword", "/settings/password"],
  ["/register", "", "/itineraries/mine"],
  ["/login", "next=//evil.com", "/itineraries/mine"],
  ["/login", "next=https%3A%2F%2Fevil.com", "/itineraries/mine"],
])("remote-logged-in on %s with %s goes to %s", async (pathname, search, expected) => {
  h.pathname = pathname;
  h.search = search;
  mount();

  await act(async () => {
    h.remote.postMessage({ type: "logged-in" });
  });

  expect(clearSpy).toHaveBeenCalled();
  expect(h.replace).toHaveBeenCalledWith(expected);
  expect(h.refresh).not.toHaveBeenCalled();
});

it("remote-logged-in elsewhere refreshes the current route to update the header", async () => {
  h.pathname = "/itineraries/mine";
  mount();

  await act(async () => {
    h.remote.postMessage({ type: "logged-in" });
  });

  expect(clearSpy).toHaveBeenCalled();
  expect(h.refresh).toHaveBeenCalledTimes(1);
  expect(h.replace).not.toHaveBeenCalled();
});

it("re-arms expired on /login so the next session loss can notify again", async () => {
  h.pathname = "/itineraries/mine";
  const first = mount();
  await act(async () => {
    sessionEvents.emitExpired();
  });
  await vi.waitFor(() => expect(h.info).toHaveBeenCalledTimes(1));
  first.unmount();

  // Người dùng đăng nhập lại: vào /login (rearm) rồi sang trang khác và hết phiên lần nữa.
  h.pathname = "/login";
  mount().unmount();

  h.pathname = "/itineraries/mine";
  mount();
  await act(async () => {
    sessionEvents.emitExpired();
  });

  await vi.waitFor(() => expect(h.info).toHaveBeenCalledTimes(2));
});

it("stops reacting after unmount", async () => {
  h.pathname = "/itineraries/mine";
  const view = mount();
  view.unmount();

  await act(async () => {
    sessionEvents.emitExpired();
    h.remote.postMessage({ type: "logged-in" });
    h.remote.postMessage({ type: "logged-out" });
  });

  expect(h.replace).not.toHaveBeenCalled();
  expect(h.refresh).not.toHaveBeenCalled();
  expect(h.assign).not.toHaveBeenCalled();
});
