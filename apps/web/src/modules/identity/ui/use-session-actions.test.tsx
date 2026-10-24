import type { Viewer } from "@tripory/identity";
import { identityKeys } from "@tripory/identity/react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { useSessionActions } from "./use-session-actions";

const h = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    calls,
    replace: vi.fn((to: string) => void calls.push(`replace:${to}`)),
    refresh: vi.fn(() => void calls.push("refresh")),
    rearmExpired: vi.fn(() => void calls.push("rearmExpired")),
    announce: vi.fn((kind: string) => void calls.push(`announce:${kind}`)),
    runLogoutHandlers: vi.fn(async () => void calls.push("runLogoutHandlers")),
    success: vi.fn((message: string) => void calls.push(`toast:${message}`)),
    info: vi.fn(),
    logout: vi.fn<() => Promise<void>>(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: h.replace, refresh: h.refresh }),
}));

vi.mock("@tripory/ui-web", () => ({
  notify: { success: h.success, info: h.info, error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/composition/session-events.client", () => ({
  sessionEvents: {
    rearmExpired: h.rearmExpired,
    announce: h.announce,
    runLogoutHandlers: h.runLogoutHandlers,
  },
}));

// Dùng useMutation thật để kiểm đúng cách hook truyền `onSuccess`; chỉ thay mutationFn.
vi.mock("@/composition/identity.client", () => ({
  identity: {
    useLogout: (options?: Parameters<typeof useMutation>[0]) =>
      useMutation({ ...options, mutationFn: () => h.logout() }),
  },
}));

const viewer: Viewer = {
  id: "11111111-1111-1111-1111-111111111111" as Viewer["id"],
  email: "an@tripory.vn",
  fullName: "An",
  handle: "an",
  avatarUrl: null,
};

let queryClient: QueryClient;

function setup() {
  const clearSpy = vi.spyOn(queryClient, "clear").mockImplementation(() => void h.calls.push("clear"));
  const setSpy = vi.spyOn(queryClient, "setQueryData").mockImplementation((...args) => {
    h.calls.push(`seed:${JSON.stringify(args[0])}`);
    return undefined as never;
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useSessionActions(), { wrapper });
  return { ...view, clearSpy, setSpy };
}

beforeEach(() => {
  h.calls.length = 0;
  vi.clearAllMocks();
  h.logout.mockResolvedValue(undefined);
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

it("afterSignIn runs clear → seed → announce → replace → refresh → toast in that order", () => {
  const { result } = setup();

  act(() => result.current.afterSignIn({ viewer, next: "/settings/password", toast: "Chào mừng, An" }));

  expect(h.calls).toEqual([
    "clear",
    `seed:${JSON.stringify(identityKeys.me)}`,
    "rearmExpired",
    "announce:logged-in",
    "replace:/settings/password",
    "refresh",
    "toast:Chào mừng, An",
  ]);
});

it("afterSignIn seeds the viewer under identityKeys.me", () => {
  const { result, setSpy } = setup();

  act(() => result.current.afterSignIn({ viewer, next: null, toast: "ok" }));

  expect(setSpy).toHaveBeenCalledWith(identityKeys.me, viewer);
});

it.each([["//evil.com"], ["https://evil.com"], ["javascript:alert(1)"], ["/login"], [null], [undefined]])(
  "afterSignIn sends unsafe next %s to /itineraries/mine",
  (next) => {
    const { result } = setup();

    act(() => result.current.afterSignIn({ viewer, next, toast: "ok" }));

    expect(h.replace).toHaveBeenCalledWith("/itineraries/mine");
  },
);

it("signOut logs out, runs handlers, announces, clears, goes home and never toasts", async () => {
  const { result } = setup();

  await act(async () => {
    result.current.signOut();
  });

  await vi.waitFor(() => expect(h.replace).toHaveBeenCalledWith("/"));
  expect(h.calls).toEqual(["runLogoutHandlers", "announce:logged-out", "clear", "replace:/", "refresh"]);
  expect(h.success).not.toHaveBeenCalled();
  expect(h.info).not.toHaveBeenCalled();
});

it("signOut failure stays on the page without handlers or navigation", async () => {
  h.logout.mockRejectedValue(new Error("boom"));
  const { result } = setup();

  await act(async () => {
    result.current.signOut();
  });
  await vi.waitFor(() => expect(h.logout).toHaveBeenCalled());
  await act(async () => {
    await Promise.resolve();
  });

  expect(h.runLogoutHandlers).not.toHaveBeenCalled();
  expect(h.announce).not.toHaveBeenCalled();
  expect(h.replace).not.toHaveBeenCalled();
  expect(h.refresh).not.toHaveBeenCalled();
});

it("afterPasswordChanged behaves like a sign-out to /login, then toasts, without calling logout", async () => {
  const { result } = setup();

  await act(async () => {
    await result.current.afterPasswordChanged();
  });

  expect(h.calls).toEqual([
    "runLogoutHandlers",
    "announce:logged-out",
    "clear",
    "rearmExpired",
    "replace:/login",
    "toast:Đã đổi mật khẩu, vui lòng đăng nhập lại",
  ]);
  expect(h.logout).not.toHaveBeenCalled();
});
