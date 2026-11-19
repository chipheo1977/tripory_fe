import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentComposer, type ComposerOutcome } from "./comment-composer";

type Deferred = { promise: Promise<ComposerOutcome>; resolve(value: ComposerOutcome): void };
function deferred(): Deferred {
  let resolve!: (value: ComposerOutcome) => void;
  const promise = new Promise<ComposerOutcome>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const setup = (onSubmit = vi.fn(async (): Promise<ComposerOutcome> => ({ kind: "sent" }))) => {
  const view = render(<CommentComposer onSubmit={onSubmit} visible />);
  const textarea = screen.getByLabelText("Viết bình luận") as HTMLTextAreaElement;
  const button = () => screen.getByRole("button") as HTMLButtonElement;
  return { ...view, onSubmit, textarea, button, user: userEvent.setup() };
};
const counter = () => screen.getByText(/^\d+\/500$/);

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).platform;
});

describe("CommentComposer: ô nhập", () => {
  it("nhãn, placeholder, phím tắt và bộ đếm ban đầu", () => {
    const { textarea } = setup();
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.placeholder).toBe("Chia sẻ cảm nhận của bạn về lịch trình này…");
    expect(textarea.getAttribute("aria-keyshortcuts")).toBe("Control+Enter Meta+Enter");
    expect(counter().textContent).toBe("0/500");
    expect(textarea.hasAttribute("maxLength")).toBe(false);
  });

  it("đếm sau trim và bật nút", async () => {
    const { textarea, button, user } = setup();
    // "Chào" dựng sẵn (NFC) dài 4 đơn vị UTF-16; plan ghi "5/500" là nhầm.
    await user.type(textarea, "  Chào  ");
    expect(counter().textContent).toBe("4/500");
    expect(button().disabled).toBe(false);
  });

  it("rỗng hoặc toàn khoảng trắng thì khóa, không hiện lỗi", async () => {
    const { textarea, button, user } = setup();
    expect(button().disabled).toBe(true);
    await user.type(textarea, "   {Enter}  ");
    expect(button().disabled).toBe(true);
    expect(screen.queryByText("Vui lòng nhập nội dung bình luận.")).toBeNull();
    expect(screen.queryByText("Bình luận tối đa 500 ký tự.")).toBeNull();
  });

  it("500 ký tự hợp lệ", () => {
    const { textarea, button } = setup();
    fireEvent.change(textarea, { target: { value: "a".repeat(500) } });
    expect(button().disabled).toBe(false);
  });

  it("501 ký tự thì khóa, bộ đếm đỏ, có lỗi và aria-invalid", () => {
    const { textarea, button } = setup();
    fireEvent.change(textarea, { target: { value: "a".repeat(501) } });
    expect(button().disabled).toBe(true);
    expect(counter().className).toContain("text-danger");
    expect(screen.getByText("Bình luận tối đa 500 ký tự.")).toBeTruthy();
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
  });

  it("visible false không render gì", () => {
    const { container } = render(<CommentComposer onSubmit={vi.fn()} visible={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CommentComposer: gửi", () => {
  it("bấm nút gọi onSubmit với chuỗi đang gõ", async () => {
    const { textarea, button, onSubmit, user } = setup();
    await user.type(textarea, "  Đẹp  ");
    await user.click(button());
    expect(onSubmit).toHaveBeenCalledWith("  Đẹp  ");
  });

  it.each([
    ["Ctrl", "{Control>}{Enter}{/Control}"],
    ["Meta", "{Meta>}{Enter}{/Meta}"],
  ])("%s+Enter gửi một lần khi nút bật", async (_name, keys) => {
    const { textarea, onSubmit, user } = setup();
    await user.type(textarea, "Xin chào");
    await user.keyboard(keys);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Enter không gửi khi nút khóa", async () => {
    const { textarea, onSubmit, user } = setup();
    await user.click(textarea);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter trơn xuống dòng, không gửi", async () => {
    const { textarea, onSubmit, user } = setup();
    await user.type(textarea, "a{Enter}b");
    expect(textarea.value).toBe("a\nb");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("đang ghép dấu thì không gửi", async () => {
    const { textarea, onSubmit, user } = setup();
    await user.type(textarea, "Xin chào");
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true, isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("đang gửi: nút Đang gửi…, aria-busy, ô readOnly, không gửi lần hai", async () => {
    const reply = deferred();
    const onSubmit = vi.fn(() => reply.promise);
    const { textarea, button, user } = setup(onSubmit);
    await user.type(textarea, "Xin chào");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(button().textContent).toContain("Đang gửi…");
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(textarea.readOnly).toBe(true);
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => reply.resolve({ kind: "sent" }));
  });

  it("sent: xóa ô, bộ đếm về 0, focus ở ô, đọc Đã gửi bình luận", async () => {
    const { textarea, button, user, container } = setup();
    await user.type(textarea, "Xin chào");
    await user.click(button());
    await waitFor(() => expect(textarea.value).toBe(""));
    expect(counter().textContent).toBe("0/500");
    expect(document.activeElement).toBe(textarea);
    const live = container.querySelector('[aria-live="polite"].sr-only');
    expect(live?.textContent).toBe("Đã gửi bình luận");
  });

  it("field-error: câu dưới ô, giữ chữ, focus, aria-invalid", async () => {
    const onSubmit = vi.fn(async (): Promise<ComposerOutcome> => ({
      kind: "field-error",
      message: "Vui lòng nhập nội dung bình luận.",
    }));
    const { textarea, button, user } = setup(onSubmit);
    await user.type(textarea, "x");
    await user.click(button());
    await waitFor(() => expect(screen.getByText("Vui lòng nhập nội dung bình luận.")).toBeTruthy());
    expect(textarea.value).toBe("x");
    expect(document.activeElement).toBe(textarea);
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
  });

  it("failed: giữ chữ, không câu lỗi, focus về ô", async () => {
    const onSubmit = vi.fn(async (): Promise<ComposerOutcome> => ({ kind: "failed" }));
    const { textarea, button, user } = setup(onSubmit);
    await user.type(textarea, "x");
    await user.click(button());
    await waitFor(() => expect(button().textContent).not.toContain("Đang gửi…"));
    expect(textarea.value).toBe("x");
    expect(textarea.getAttribute("aria-invalid")).toBeNull();
    expect(document.activeElement).toBe(textarea);
  });

  it("onSubmit reject thì coi như failed, không treo", async () => {
    const onSubmit = vi.fn(async (): Promise<ComposerOutcome> => {
      throw new Error("bất ngờ");
    });
    const { textarea, button, user } = setup(onSubmit);
    await user.type(textarea, "x");
    await user.click(button());
    await waitFor(() => expect(textarea.readOnly).toBe(false));
    expect(textarea.value).toBe("x");
    expect(button().disabled).toBe(false);
  });
});

describe("CommentComposer: gợi ý phím tắt", () => {
  it("không phải Apple hiện Ctrl, ẩn dưới md, nằm trong aria-describedby", () => {
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    const { textarea } = setup();
    const hint = screen.getByText("Ctrl + Enter để gửi nhanh");
    expect(hint.className).toContain("hidden");
    expect(hint.className).toContain("md:block");
    const describedBy = textarea.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toEqual(expect.arrayContaining([hint.id, counter().id]));
  });

  it("Apple hiện ⌘", () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    setup();
    expect(screen.getByText("⌘ + Enter để gửi nhanh")).toBeTruthy();
  });
});
