import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommentSectionFrame } from "./comment-section-frame";

describe("CommentSectionFrame", () => {
  it("section có nhãn từ h2, class cuộn và vùng live", () => {
    const { container } = render(
      <CommentSectionFrame announcement="Đã xóa bình luận" heading="Bình luận (3)" visible>
        <div data-testid="child" />
      </CommentSectionFrame>,
    );
    const section = container.querySelector("section#binh-luan") as HTMLElement;
    expect(section.getAttribute("aria-labelledby")).toBe("binh-luan-tieu-de");
    expect(section.className).toContain("scroll-mt-(--article-scroll-margin)");
    expect(section.className).toContain("border-t");
    expect(section.className).toContain("pt-section");
    const heading = screen.getByRole("heading", { level: 2, name: "Bình luận (3)" });
    expect(heading.id).toBe("binh-luan-tieu-de");
    expect(heading.getAttribute("tabindex")).toBe("-1");
    const live = section.querySelector('p[aria-live="polite"]');
    expect(live?.className).toContain("sr-only");
    expect(live?.textContent).toBe("Đã xóa bình luận");
    const child = screen.getByTestId("child");
    expect(section.contains(child)).toBe(true);
    expect(heading.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("vùng live có mặt kể cả khi rỗng", () => {
    const { container } = render(
      <CommentSectionFrame announcement="" heading="Bình luận (0)" visible>
        {null}
      </CommentSectionFrame>,
    );
    expect(container.querySelector('p[aria-live="polite"]')).not.toBeNull();
  });

  it("visible false không render gì", () => {
    const { container } = render(
      <CommentSectionFrame announcement="" heading="x" visible={false}>
        {null}
      </CommentSectionFrame>,
    );
    expect(container.innerHTML).toBe("");
  });
});
