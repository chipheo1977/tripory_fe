import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import type { Viewer } from "@tripory/identity";
import { createIdentityHooks } from "@tripory/identity/react";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { LoginForm } from "./login-form";

const h = vi.hoisted(() => ({
  search: "",
  login: vi.fn(),
  afterSignIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.search),
}));
vi.mock("./use-session-actions", () => ({
  useSessionActions: () => ({ afterSignIn: h.afterSignIn }),
}));
// Hook thật của @tripory/identity với gateway giả: kiểm đúng `meta` và đường mutateAsync, không cần MSW.
vi.mock("@/composition/identity.client", () => ({
  identity: createIdentityHooks({
    gateway: {
      login: (input) => h.login(input),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
    },
    profile: { me: vi.fn() },
  }),
}));

const viewer: Viewer = {
  id: "11111111-1111-1111-1111-111111111111" as Viewer["id"],
  email: "an@tripory.vn",
  fullName: "An Nguyen",
  handle: "an",
  avatarUrl: null,
};
const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const email = () => screen.getByLabelText("Email") as HTMLInputElement;
const password = () => screen.getByLabelText("Mật khẩu") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: /^Đăng nhập|Đang đăng nhập/ });

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <LoginForm />
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => {
  h.search = "";
  vi.clearAllMocks();
  h.login.mockResolvedValue(viewer);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders the empty form with locked copy and accessible structure", () => {
  setup();
  const heading = screen.getByRole("heading", { level: 1, name: "Đăng nhập" });
  const form = document.querySelector("form") as HTMLFormElement;
  expect(form.noValidate).toBe(true);
  expect(form.getAttribute("aria-labelledby")).toBe(heading.id);
  expect(screen.getByRole("link", { name: "Đăng ký" }).getAttribute("href")).toBe("/register");
  expect(screen.getByText(/Chưa có tài khoản\?/)).toBeTruthy();
  expect(submit().textContent).toBe("Đăng nhập");
  expect(document.querySelectorAll("[placeholder]").length).toBe(0);
  expect(document.activeElement).toBe(document.body);
});

it("sets the autocomplete, input mode, type and required attributes", () => {
  setup();
  expect(email().type).toBe("email");
  expect(email().getAttribute("autocomplete")).toBe("email");
  expect(email().getAttribute("inputmode")).toBe("email");
  expect(password().getAttribute("autocomplete")).toBe("current-password");
  expect(email().getAttribute("aria-required")).toBe("true");
  expect(password().getAttribute("aria-required")).toBe("true");
});

it("keeps a safe next on the register link", () => {
  h.search = "next=%2Fsettings%2Fpassword";
  setup();
  expect(screen.getByRole("link", { name: "Đăng ký" }).getAttribute("href")).toBe(
    "/register?next=%2Fsettings%2Fpassword",
  );
});

it("drops an unsafe next from the register link", () => {
  h.search = "next=//evil.com";
  setup();
  expect(screen.getByRole("link", { name: "Đăng ký" }).getAttribute("href")).toBe("/register");
});

it("shows an error only after blur", async () => {
  const user = setup();
  expect(screen.queryByText("Vui lòng nhập email.")).toBeNull();
  await user.click(email());
  await user.tab();
  expect(await screen.findByText("Vui lòng nhập email.")).toBeTruthy();
  expect(email().getAttribute("aria-invalid")).toBe("true");
});

it("shows every error on submit, focuses the first invalid field and does not call the gateway", async () => {
  const user = setup();
  await user.click(submit());
  expect(await screen.findByText("Vui lòng nhập email.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeTruthy();
  expect(document.activeElement).toBe(email());
  expect(h.login).not.toHaveBeenCalled();
});

it("sends the trimmed email and untouched password, then runs afterSignIn once with the raw next", async () => {
  h.search = "next=%2Fsettings%2Fpassword";
  const user = setup();
  await user.type(email(), "  an@tripory.vn ");
  await user.type(password(), " secret ");
  await user.click(submit());
  await waitFor(() => expect(h.afterSignIn).toHaveBeenCalledTimes(1));
  expect(h.login).toHaveBeenCalledWith({ email: "an@tripory.vn", password: " secret " });
  expect(h.afterSignIn).toHaveBeenCalledWith({
    viewer,
    next: "/settings/password",
    toast: "Chào mừng, An Nguyen",
  });
});

it("locks the form while pending, blocks a second Enter and shows the cold start line after 5 seconds", async () => {
  let resolve: (value: Viewer) => void = () => undefined;
  h.login.mockReturnValue(new Promise<Viewer>((r) => (resolve = r)));
  const user = setup();
  // Gõ bằng timer thật; chỉ bật timer giả ngay trước khi gửi để đếm đúng mốc 5 giây của SubmitStatus.
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "secret");
  vi.useFakeTimers();
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
  // RTL `waitFor` không đẩy fake timers của Vitest, nên tự xả microtask/timer.
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.login).toHaveBeenCalledTimes(1);
  const busy = screen.getByRole("button", { name: /Đang đăng nhập/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang đăng nhập…");
  expect(email().readOnly).toBe(true);
  expect(password().readOnly).toBe(true);
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
  fireEvent.click(busy);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.login).toHaveBeenCalledTimes(1);

  expect(screen.queryByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();

  await act(async () => resolve(viewer));
  expect(h.afterSignIn).toHaveBeenCalledTimes(1);
});

it("shows an alert on wrong credentials, keeps the email, clears the password and focuses it", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.login.mockRejectedValue(http(401, "Auth.InvalidCredentials", "Invalid credentials"));
  const user = setup();
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "wrong-pass");
  await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
  expect(password().type).toBe("text");
  await user.click(submit());

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe("Email hoặc mật khẩu không đúng.");
  expect(email().value).toBe("an@tripory.vn");
  expect(password().value).toBe("");
  expect(password().type).toBe("password");
  expect(screen.getByRole("button", { name: "Hiện mật khẩu" })).toBeTruthy();
  expect(document.activeElement).toBe(password());
  expect(errorToast).not.toHaveBeenCalled();
  expect(h.afterSignIn).not.toHaveBeenCalled();
});

it("clears the previous alert as soon as the next request starts", async () => {
  h.login.mockRejectedValueOnce(http(401, "Auth.InvalidCredentials", null));
  const user = setup();
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "wrong-pass");
  await user.click(submit());
  await screen.findByRole("alert");

  let resolve: (value: Viewer) => void = () => undefined;
  h.login.mockReturnValueOnce(new Promise<Viewer>((r) => (resolve = r)));
  await user.type(password(), "right-pass");
  await user.click(submit());
  await waitFor(() => expect(h.login).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("alert")).toBeNull();
  await act(async () => resolve(viewer));
});

it("stays silent when the session expired", async () => {
  h.login.mockRejectedValue(sessionExpiredError());
  const user = setup();
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "secret");
  await user.click(submit());
  await waitFor(() => expect(h.login).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(submit().getAttribute("aria-busy")).toBeNull());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelectorAll('[aria-invalid="true"]').length).toBe(0);
});

it("shows the generic alert for a timeout", async () => {
  h.login.mockRejectedValue(makeApiError({ kind: "timeout", status: null, code: null, message: null }));
  const user = setup();
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "secret");
  await user.click(submit());
  expect((await screen.findByRole("alert")).textContent).toBe("Đã có lỗi xảy ra, vui lòng thử lại");
});

it("does not submit on a bare form event while already submitting", async () => {
  const user = setup();
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "secret");
  let resolve: (value: Viewer) => void = () => undefined;
  h.login.mockReturnValue(new Promise<Viewer>((r) => (resolve = r)));
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(h.login).toHaveBeenCalledTimes(1));
  await act(async () => resolve(viewer));
});
