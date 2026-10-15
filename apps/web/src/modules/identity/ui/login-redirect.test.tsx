import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { LoginRedirect } from "./login-redirect";

const h = vi.hoisted(() => ({ pathname: "/", search: "", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
  useRouter: () => ({ replace: h.replace }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.search = "";
});

it("sends the current path and search to /login as an encoded next", () => {
  h.pathname = "/itineraries/mine";
  h.search = "tab=draft";

  const view = render(<LoginRedirect />);

  expect(h.replace).toHaveBeenCalledTimes(1);
  expect(h.replace).toHaveBeenCalledWith("/login?next=%2Fitineraries%2Fmine%3Ftab%3Ddraft");
  expect(view.container.innerHTML).toBe("");
});

it("drops next when the current path is not a safe destination", () => {
  h.pathname = "/login";

  render(<LoginRedirect />);

  expect(h.replace).toHaveBeenCalledWith("/login");
});

it("redirects only once under StrictMode", () => {
  h.pathname = "/settings/password";

  render(
    <StrictMode>
      <LoginRedirect />
    </StrictMode>,
  );

  expect(h.replace).toHaveBeenCalledTimes(1);
});
