import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentItem, type CommentItemProps } from "./comment-item";

const NOW = new Date(2026, 10, 20, 12, 0).getTime();
const CREATED = new Date(NOW - 5 * 60_000).toISOString();

const base: CommentItemProps = {
  domId: "binh-luan-c1",
  authorName: "Trần Lan",
  avatarUrl: null,
  createdAt: CREATED,
  now: NOW,
  content: "Đẹp quá",
  canDelete: false,
  onDelete: () => undefined,
};
const setup = (overrides: Partial<CommentItemProps> = {}) => render(<CommentItem {...base} {...overrides} />);

describe("CommentItem", () => {
  it("hiện tên, thời gian tương đối trong time và nội dung", () => {
    const { container } = setup();
    expect(screen.getByText("Trần Lan").className).toContain("font-semibold");
    const time = container.querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe(CREATED);
    expect(time?.textContent).toBe("5 phút trước");
    expect(time?.getAttribute("title")).toMatch(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
    expect(screen.getByText("Đẹp quá")).toBeTruthy();
  });

  it("now null thì hiện ngày tuyệt đối", () => {
    const { container } = setup({ now: null });
    expect(container.querySelector("time")?.textContent).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("nội dung giữ xuống dòng và ngắt từ dài", () => {
    setup({ content: "Dòng 1\nDòng 2" });
    const paragraph = screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Dòng 1\nDòng 2");
    expect(paragraph.className).toContain("whitespace-pre-line");
    expect(paragraph.className).toContain("break-words");
  });

  it("HTML và URL hiện nguyên văn, không thẻ, không link", () => {
    const { container } = setup({ content: "<b>x</b> https://a.vn" });
    expect(screen.getByText("<b>x</b> https://a.vn")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it.each([
    ["Trần Lan", "TL"],
    // `Avatar` của ui-web lấy chữ đầu của hai từ đầu tiên, nên "Người dùng Tripory" ra "ND" (plan ghi "NT").
    ["Người dùng Tripory", "ND"],
  ])("avatar null hiện chữ cái đầu của %s", (authorName, letters) => {
    const { container } = setup({ authorName });
    const hidden = container.querySelector('span[aria-hidden="true"]');
    expect(hidden?.textContent).toBe(letters);
  });

  it("không có quyền thì không có nút nào", () => {
    setup();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("có quyền thì đúng một nút xóa có tên, bấm gọi onDelete một lần", async () => {
    const onDelete = vi.fn();
    setup({ canDelete: true, onDelete });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("aria-label")).toBe("Xóa bình luận của Trần Lan");
    await userEvent.setup().click(buttons[0] as HTMLElement);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("article có id, tabIndex -1 và aria-labelledby vào tên", () => {
    setup();
    const article = screen.getByRole("article", { name: "Trần Lan" });
    expect(article.id).toBe("binh-luan-c1");
    expect(article.getAttribute("tabindex")).toBe("-1");
    expect(document.getElementById(article.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Trần Lan");
  });

  it("tên và nội dung dài có break-words, cột chữ có min-w-0", () => {
    const long = "a".repeat(500);
    const { container } = setup({ authorName: long, content: long });
    const name = within(container).getAllByText(long)[0] as HTMLElement;
    expect(name.className).toContain("break-words");
    expect(container.querySelector(".min-w-0")).not.toBeNull();
  });

  it("DOM không có email hay handle", () => {
    const { container } = setup({ canDelete: true });
    expect(container.innerHTML).not.toMatch(/@|email|handle/i);
  });
});
