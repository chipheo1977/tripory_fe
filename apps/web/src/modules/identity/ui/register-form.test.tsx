import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import type { Viewer } from "@tripory/identity";
import { createIdentityHooks } from "@tripory/identity/react";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { RegisterForm } from "./register-form";

const h = vi.hoisted(() => ({
  search: "",
  register: vi.fn(),
  afterSignIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.search),
}));
vi.mock("./use-session-actions", () => ({
  useSessionActions: () => ({ afterSignIn: h.afterSignIn }),
}));
vi.mock("@/composition/identity.client", () => ({
  identity: createIdentityHooks({
    gateway: {
      login: vi.fn(),
      register: (input) => h.register(input),
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

const fullName = () => screen.getByLabelText("Họ và tên") as HTMLInputElement;
const email = () => screen.getByLabelText("Email") as HTMLInputElement;
const password = () => screen.getByLabelText("Mật khẩu") as HTMLInputElement;
const confirm = () => screen.getByLabelText("Nhập lại mật khẩu") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: /^Đăng ký|Đang tạo tài khoản/ });

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <RegisterForm />
    </QueryClientProvider>,
  );
  return user;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(fullName(), "An Nguyen");
  await user.type(email(), "an@tripory.vn");
  await user.type(password(), "12345678");
  await user.type(confirm(), "12345678");
}

beforeEach(() => {
  h.search = "";
  vi.clearAllMocks();
  h.register.mockResolvedValue(viewer);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders locked copy, field order and the checklist before any typing", () => {
  setup();
  expect(screen.getByRole("heading", { level: 1, name: "Tạo tài khoản" })).toBeTruthy();
  const labels = Array.from(document.querySelectorAll("label")).map((label) => label.textContent);
  expect(labels).toEqual(["Họ và tên", "Email", "Mật khẩu", "Nhập lại mật khẩu"]);
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(1);
  expect(items[0]?.textContent).toBe("Chưa đạt: Ít nhất 8 ký tự");
  expect(submit().textContent).toBe("Đăng ký");
  expect(screen.getByText(/Đã có tài khoản\?/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login");
  expect(document.querySelectorAll("[placeholder]").length).toBe(0);
});

it("sets autocomplete and required attributes and ties the checklist to the password field", () => {
  setup();
  expect(fullName().getAttribute("autocomplete")).toBe("name");
  expect(email().getAttribute("autocomplete")).toBe("email");
  expect(password().getAttribute("autocomplete")).toBe("new-password");
  expect(confirm().getAttribute("autocomplete")).toBe("new-password");
  for (const control of [fullName(), email(), password(), confirm()]) {
    expect(control.getAttribute("aria-required")).toBe("true");
  }
  const describedBy = (password().getAttribute("aria-describedby") ?? "").split(" ");
  const container = describedBy.map((id) => document.getElementById(id)).find((node) => node?.querySelector("ul"));
  expect(container).toBeTruthy();
  expect(container?.contains(screen.getByRole("listitem"))).toBe(true);
});

it("keeps a safe next on the login link and drops an unsafe one", () => {
  h.search = "next=%2Fsettings%2Fpassword";
  const first = render(
    <QueryClientProvider client={makeQueryClient()}>
      <RegisterForm />
    </QueryClientProvider>,
  );
  expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login?next=%2Fsettings%2Fpassword");
  first.unmount();
  h.search = "next=//evil.com";
  setup();
  expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/login");
});

it("flips the checklist item as the password reaches 8 characters", async () => {
  const user = setup();
  await user.type(password(), "1234567");
  expect(screen.getByRole("listitem").textContent).toBe("Chưa đạt: Ít nhất 8 ký tự");
  await user.type(password(), "8");
  expect(screen.getByRole("listitem").textContent).toBe("Đã đạt: Ít nhất 8 ký tự");
});

it("reports a confirm mismatch on blur and rechecks it when the password changes", async () => {
  const user = setup();
  await user.type(password(), "12345678");
  await user.type(confirm(), "1234567");
  await user.tab();
  expect(await screen.findByText("Mật khẩu nhập lại không khớp.")).toBeTruthy();
  await user.type(password(), "9");
  await user.type(confirm(), "89");
  // confirm = 123456789 khớp password sau khi gõ thêm, lỗi phải biến mất.
  await waitFor(() => expect(screen.queryByText("Mật khẩu nhập lại không khớp.")).toBeNull());
  await user.type(password(), "0");
  expect(await screen.findByText("Mật khẩu nhập lại không khớp.")).toBeTruthy();
});

it("shows every error on submit and focuses the first invalid field", async () => {
  const user = setup();
  await user.click(submit());
  expect(await screen.findByText("Vui lòng nhập họ và tên.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập email.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập lại mật khẩu.")).toBeTruthy();
  expect(document.activeElement).toBe(fullName());
  expect(h.register).not.toHaveBeenCalled();
});

it("sends fullName, email and password without confirmPassword, then runs afterSignIn once", async () => {
  h.search = "next=%2Fsettings%2Fpassword";
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  await waitFor(() => expect(h.afterSignIn).toHaveBeenCalledTimes(1));
  expect(h.register).toHaveBeenCalledTimes(1);
  const sent = h.register.mock.calls[0]?.[0] as Record<string, unknown>;
  expect(sent).toEqual({ email: "an@tripory.vn", password: "12345678", fullName: "An Nguyen" });
  expect("confirmPassword" in sent).toBe(false);
  expect(h.afterSignIn).toHaveBeenCalledWith({
    viewer,
    next: "/settings/password",
    toast: "Tạo tài khoản thành công",
  });
});

it("locks the form while pending, blocks a second submit and shows the cold start line", async () => {
  let resolve: (value: Viewer) => void = () => undefined;
  h.register.mockReturnValue(new Promise<Viewer>((r) => (resolve = r)));
  const user = setup();
  await fillValid(user);
  vi.useFakeTimers();
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
  await act(() => vi.advanceTimersByTimeAsync(0));
  const busy = screen.getByRole("button", { name: /Đang tạo tài khoản/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang tạo tài khoản…");
  for (const control of [fullName(), email(), password(), confirm()]) expect(control.readOnly).toBe(true);
  fireEvent.submit(form);
  fireEvent.click(busy);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.register).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();
  await act(async () => resolve(viewer));
  expect(h.afterSignIn).toHaveBeenCalledTimes(1);
});

it("attaches EmailAlreadyExists to the email field, focuses it and keeps every value", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.register.mockRejectedValue(http(409, "User.EmailAlreadyExists", "Email exists"));
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  expect(await screen.findByText("Email này đã được đăng ký.")).toBeTruthy();
  expect(email().getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(email());
  expect(fullName().value).toBe("An Nguyen");
  expect(email().value).toBe("an@tripory.vn");
  expect(password().value).toBe("12345678");
  expect(confirm().value).toBe("12345678");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(errorToast).not.toHaveBeenCalled();
});

it("shows an alert for an ambiguous validator code and keeps focus on the submit button", async () => {
  h.register.mockRejectedValue(http(400, "NotEmptyValidator", "'Email' must not be empty."));
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(document.activeElement).toBe(submit());
  expect(password().value).toBe("12345678");
});

it("stays silent when the session expired", async () => {
  h.register.mockRejectedValue(sessionExpiredError());
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  await waitFor(() => expect(h.register).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(submit().getAttribute("aria-busy")).toBeNull());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelectorAll('[aria-invalid="true"]').length).toBe(0);
});
