import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import { createIdentityHooks } from "@tripory/identity/react";
import { notify } from "@tripory/ui-web";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { ChangePasswordForm } from "./change-password-form";

const h = vi.hoisted(() => ({
  changePassword: vi.fn(),
  afterPasswordChanged: vi.fn(),
}));

vi.mock("./use-session-actions", () => ({
  useSessionActions: () => ({ afterPasswordChanged: h.afterPasswordChanged }),
}));
vi.mock("@/composition/identity.client", () => ({
  identity: createIdentityHooks({
    gateway: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: (input) => h.changePassword(input),
    },
    profile: { me: vi.fn() },
  }),
}));

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const current = () => screen.getByLabelText("Mật khẩu hiện tại") as HTMLInputElement;
const next = () => screen.getByLabelText("Mật khẩu mới") as HTMLInputElement;
const confirm = () => screen.getByLabelText("Nhập lại mật khẩu") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: /^Đổi mật khẩu|Đang lưu/ });
const items = () => screen.getAllByRole("listitem").map((item) => item.textContent);

function setup() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ChangePasswordForm />
    </QueryClientProvider>,
  );
  return user;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(current(), "OldPass1!");
  await user.type(next(), "NewPass1!");
  await user.type(confirm(), "NewPass1!");
}

beforeEach(() => {
  vi.clearAllMocks();
  h.changePassword.mockResolvedValue(undefined);
  h.afterPasswordChanged.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders locked copy, field order, autocomplete and the six unmet rules before any typing", () => {
  setup();
  expect(screen.getByRole("heading", { level: 1, name: "Đổi mật khẩu" })).toBeTruthy();
  const labels = Array.from(document.querySelectorAll("label")).map((label) => label.textContent);
  expect(labels).toEqual(["Mật khẩu hiện tại", "Mật khẩu mới", "Nhập lại mật khẩu"]);
  expect(current().getAttribute("autocomplete")).toBe("current-password");
  expect(next().getAttribute("autocomplete")).toBe("new-password");
  expect(confirm().getAttribute("autocomplete")).toBe("new-password");
  expect(items()).toEqual([
    "Chưa đạt: Ít nhất 8 ký tự",
    "Chưa đạt: Có chữ in hoa (A–Z)",
    "Chưa đạt: Có chữ thường (a–z)",
    "Chưa đạt: Có chữ số (0–9)",
    "Chưa đạt: Có một trong các ký tự ! ? * @ # $ % ^ & + =",
    "Chưa đạt: Khác mật khẩu hiện tại",
  ]);
  expect(submit().textContent).toBe("Đổi mật khẩu");
  const cancel = screen.getByRole("link", { name: "Hủy" });
  expect(cancel.getAttribute("href")).toBe("/itineraries/mine");
  const describedBy = (next().getAttribute("aria-describedby") ?? "").split(" ");
  expect(describedBy.some((id) => document.getElementById(id)?.querySelector("ul"))).toBe(true);
});

it("updates the checklist as the new password changes", async () => {
  const user = setup();
  await user.type(next(), "Abcdef1!");
  expect(items()).toEqual([
    "Đã đạt: Ít nhất 8 ký tự",
    "Đã đạt: Có chữ in hoa (A–Z)",
    "Đã đạt: Có chữ thường (a–z)",
    "Đã đạt: Có chữ số (0–9)",
    "Đã đạt: Có một trong các ký tự ! ? * @ # $ % ^ & + =",
    "Đã đạt: Khác mật khẩu hiện tại",
  ]);
  await user.type(current(), "Abcdef1!");
  expect(items()[5]).toBe("Chưa đạt: Khác mật khẩu hiện tại");
  await user.clear(next());
  await user.type(next(), "Abcdef1-");
  expect(items()[4]).toBe("Chưa đạt: Có một trong các ký tự ! ? * @ # $ % ^ & + =");
});

it("shows every error on submit and focuses the first invalid field", async () => {
  const user = setup();
  await user.click(submit());
  expect(await screen.findByText("Vui lòng nhập mật khẩu hiện tại.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeTruthy();
  expect(screen.getByText("Vui lòng nhập lại mật khẩu.")).toBeTruthy();
  expect(document.activeElement).toBe(current());
  expect(h.changePassword).not.toHaveBeenCalled();
});

it("rechecks the new password when the current one changes to the same value", async () => {
  const user = setup();
  await user.type(next(), "Abcdef1!");
  await user.tab();
  await user.type(current(), "Abcdef1!");
  expect(await screen.findByText("Mật khẩu chưa đạt đủ yêu cầu.")).toBeTruthy();
});

it("sends only currentPassword and newPassword, resets the form and runs afterPasswordChanged once", async () => {
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  await waitFor(() => expect(h.afterPasswordChanged).toHaveBeenCalledTimes(1));
  expect(h.changePassword).toHaveBeenCalledTimes(1);
  const sent = h.changePassword.mock.calls[0]?.[0] as Record<string, unknown>;
  expect(sent).toEqual({ currentPassword: "OldPass1!", newPassword: "NewPass1!" });
  expect("confirmPassword" in sent).toBe(false);
  expect(current().value).toBe("");
  expect(next().value).toBe("");
});

it("attaches InvalidCurrentPassword to the current field, focuses it and keeps the other values", async () => {
  const errorToast = vi.spyOn(notify, "error");
  h.changePassword.mockRejectedValue(http(400, "Auth.InvalidCurrentPassword", "Wrong password"));
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  expect(await screen.findByText("Mật khẩu hiện tại không đúng.")).toBeTruthy();
  expect(current().getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(current());
  expect(current().value).toBe("OldPass1!");
  expect(next().value).toBe("NewPass1!");
  expect(confirm().value).toBe("NewPass1!");
  expect(h.afterPasswordChanged).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
});

it("attaches NotEqualValidator to the new password field with the BE message", async () => {
  h.changePassword.mockRejectedValue(http(400, "NotEqualValidator", "Mật khẩu mới phải khác mật khẩu cũ."));
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  expect(await screen.findByText("Mật khẩu mới phải khác mật khẩu cũ.")).toBeTruthy();
  expect(next().getAttribute("aria-invalid")).toBe("true");
  expect(document.activeElement).toBe(next());
});

it("shows an alert for an ambiguous validator code and keeps focus on the submit button", async () => {
  h.changePassword.mockRejectedValue(http(400, "NotEmptyValidator", "'Password' must not be empty."));
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(document.activeElement).toBe(submit());
  expect(current().value).toBe("OldPass1!");
});

it("stays silent when the session expired", async () => {
  h.changePassword.mockRejectedValue(sessionExpiredError());
  const user = setup();
  await fillValid(user);
  await user.click(submit());
  await waitFor(() => expect(h.changePassword).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(submit().getAttribute("aria-busy")).toBeNull());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelectorAll('[aria-invalid="true"]').length).toBe(0);
});

it("locks the form while pending: readOnly inputs, disabled toggles, inert cancel link, no second submit", async () => {
  let resolve: () => void = () => undefined;
  h.changePassword.mockReturnValue(new Promise<void>((r) => (resolve = r)));
  const user = setup();
  await fillValid(user);
  vi.useFakeTimers();
  const form = document.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
  await act(() => vi.advanceTimersByTimeAsync(0));

  const busy = screen.getByRole("button", { name: /Đang lưu/ });
  expect(busy.getAttribute("aria-busy")).toBe("true");
  expect(busy.textContent).toBe("Đang lưu…");
  for (const control of [current(), next(), confirm()]) expect(control.readOnly).toBe(true);
  const toggles = screen.getAllByRole("button", { name: "Hiện mật khẩu" }) as HTMLButtonElement[];
  expect(toggles).toHaveLength(3);
  for (const toggle of toggles) expect(toggle.disabled).toBe(true);

  const cancel = screen.getByRole("link", { name: "Hủy" });
  expect(cancel.getAttribute("aria-disabled")).toBe("true");
  // fireEvent.click trả false khi handler gọi preventDefault, tức là không điều hướng.
  expect(fireEvent.click(cancel)).toBe(false);

  fireEvent.submit(form);
  fireEvent.click(busy);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(h.changePassword).toHaveBeenCalledTimes(1);

  expect(screen.queryByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(5_000));
  expect(screen.getByText("Máy chủ đang khởi động, có thể mất tới 30 giây…")).toBeTruthy();

  await act(async () => resolve());
  expect(h.afterPasswordChanged).toHaveBeenCalledTimes(1);
});

it("lets the cancel link navigate when idle", () => {
  setup();
  const cancel = screen.getByRole("link", { name: "Hủy" });
  expect(cancel.getAttribute("aria-disabled")).toBeNull();
  expect(cancel.hasAttribute("data-disabled")).toBe(false);
});
