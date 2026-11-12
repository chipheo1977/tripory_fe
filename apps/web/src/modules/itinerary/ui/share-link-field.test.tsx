import { notify } from "@tripory/ui-web";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackOf, ShareLinkField } from "./share-link-field";

const URL_A = "https://site.test/itineraries/abc";
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");

let chosenClipboard: unknown;

function define(name: "clipboard" | "share", value: unknown) {
  if (name === "clipboard") chosenClipboard = value;
  Object.defineProperty(navigator, name, { value, configurable: true });
}

function restore(name: "clipboard" | "share", descriptor: PropertyDescriptor | undefined) {
  if (descriptor === undefined) Reflect.deleteProperty(navigator, name);
  else Object.defineProperty(navigator, name, descriptor);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(notify, "success").mockImplementation(() => "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  restore("clipboard", originalClipboard);
  restore("share", originalShare);
});

const setup = () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  // `userEvent.setup()` thay `navigator.clipboard` bằng bản giả của nó; đặt lại bản của test sau đó.
  Object.defineProperty(navigator, "clipboard", { value: chosenClipboard, configurable: true });
  render(<ShareLinkField copyButtonRef={null} title="Hội An 3 ngày" url={URL_A} />);
  return { user };
};

const liveLine = () => document.querySelector("[aria-live=polite]") as HTMLElement;

describe("feedbackOf", () => {
  it("maps each state to its line", () => {
    expect(feedbackOf("copied", false)).toEqual({ tone: "info", text: "Đã sao chép link" });
    expect(feedbackOf("failed", false)).toEqual({ tone: "danger", text: "Không sao chép được, hãy chép thủ công" });
    expect(feedbackOf("idle", true)).toEqual({
      tone: "danger",
      text: "Không mở được ứng dụng chia sẻ. Hãy dùng Sao chép link.",
    });
    expect(feedbackOf("idle", false)).toBeNull();
  });
});

describe("ShareLinkField link input", () => {
  it("shows the url in a labelled read-only input and selects it all on focus", async () => {
    define("clipboard", { writeText: vi.fn() });
    const { user } = setup();

    const input = screen.getByLabelText("Link lịch trình") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe(URL_A);
    await user.click(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(URL_A.length);
  });

  it("always keeps the polite live region in the DOM, empty at first", () => {
    define("clipboard", { writeText: vi.fn() });
    setup();

    expect(liveLine()).not.toBeNull();
    expect(liveLine().textContent).toBe("");
  });
});

describe("ShareLinkField copy", () => {
  it("copies, confirms in the label and the live line without a toast, then reverts after 2000ms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    define("clipboard", { writeText });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Sao chép link" }));

    expect(writeText).toHaveBeenCalledWith(URL_A);
    expect(screen.getByRole("button", { name: "Đã sao chép link" })).toBeTruthy();
    expect(liveLine().textContent).toBe("Đã sao chép link");
    expect(notify.success).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Sao chép link" })).toBeTruthy();
    expect(liveLine().textContent).toBe("");
  });

  it("on clipboard failure selects the text, focuses the input and tells the user to copy by hand", async () => {
    define("clipboard", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Sao chép link" }));

    const input = screen.getByLabelText("Link lịch trình") as HTMLInputElement;
    expect(liveLine().textContent).toBe("Không sao chép được, hãy chép thủ công");
    expect(liveLine().className).toContain("text-danger");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(URL_A.length);
  });
});

describe("ShareLinkField native share", () => {
  it("hides the share button when the browser has no Web Share", () => {
    define("clipboard", { writeText: vi.fn() });
    define("share", undefined);
    setup();

    expect(screen.queryByRole("button", { name: "Chia sẻ qua ứng dụng" })).toBeNull();
  });

  it("shares title and url when supported", async () => {
    define("clipboard", { writeText: vi.fn() });
    const share = vi.fn().mockResolvedValue(undefined);
    define("share", share);
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Chia sẻ qua ứng dụng" }));

    expect(share).toHaveBeenCalledWith({ title: "Hội An 3 ngày", url: URL_A });
    expect(liveLine().textContent).toBe("");
  });

  it("stays silent when the user dismisses the share sheet", async () => {
    define("clipboard", { writeText: vi.fn() });
    define("share", vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")));
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Chia sẻ qua ứng dụng" }));

    expect(liveLine().textContent).toBe("");
  });

  it("reports other share errors and points to copying", async () => {
    define("clipboard", { writeText: vi.fn() });
    define("share", vi.fn().mockRejectedValue(new Error("boom")));
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Chia sẻ qua ứng dụng" }));

    expect(liveLine().textContent).toBe("Không mở được ứng dụng chia sẻ. Hãy dùng Sao chép link.");
    expect(liveLine().className).toContain("text-danger");
  });
});
