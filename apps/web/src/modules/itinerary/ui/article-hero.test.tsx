import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleHero, type ArticleHeroProps } from "./article-hero";

const base: ArticleHeroProps = {
  title: "Sài Gòn 3 ngày",
  description: null,
  coverImageUrl: null,
  fallbackCoverUrl: null,
  metaLine: "Khởi hành 12/10/2026 · 3 ngày · 3 điểm · 12,4 km",
  author: null,
};

const setup = (overrides: Partial<ArticleHeroProps> = {}) => render(<ArticleHero {...base} {...overrides} />);

describe("ArticleHero", () => {
  it("renders the title as the page h1", () => {
    setup();

    const heading = screen.getByRole("heading", { level: 1, name: "Sài Gòn 3 ngày" });
    expect(heading.className).toContain("text-display");
    expect(heading.className).toContain("break-words");
  });

  it("renders the meta line as given", () => {
    setup();

    expect(screen.getByText("Khởi hành 12/10/2026 · 3 ngày · 3 điểm · 12,4 km")).toBeTruthy();
  });

  it("loads an https cover eagerly with no referrer and an empty alt", () => {
    const { container } = setup({ coverImageUrl: "https://images.example.com/a.jpg" });

    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("falls back to the surface without an img when there is no cover", () => {
    const { container } = setup();

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
  });

  it("renders the description in a pre-line paragraph", () => {
    setup({ description: "Dòng một\nDòng hai" });

    const paragraph = screen.getByText(/Dòng một/);
    expect(paragraph.className).toContain("whitespace-pre-line");
  });

  it.each([null, "", "   "])("renders no description element when it is %j", (description) => {
    const { container } = setup({ description });

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("shows a description with markup as plain text", () => {
    const { container } = setup({ description: "<b>x</b>" });

    expect(container.textContent).toContain("<b>x</b>");
    expect(container.querySelector("b")).toBeNull();
  });

  it("renders the author slot", () => {
    setup({ author: <div data-testid="author-slot">Tác giả</div> });

    expect(screen.getByTestId("author-slot")).toBeTruthy();
  });
});

describe("ArticleHero social slot (05.1 D-19)", () => {
  it("không truyền social thì không có phần tử thêm", () => {
    const { container } = setup({ description: "Mô tả" });
    const block = container.querySelector("h1")?.parentElement;
    // h1, dòng meta, mô tả (author null không render gì)
    expect(block?.children).toHaveLength(3);
  });

  it("slot nằm sau dòng meta và trước mô tả, trong cùng khối chữ", () => {
    const { container } = setup({ description: "Mô tả", social: <div data-testid="hero-social" /> });
    const slot = screen.getByTestId("hero-social");
    const block = container.querySelector("h1")?.parentElement;
    expect(slot.parentElement).toBe(block);
    expect(slot.previousElementSibling?.textContent).toBe(base.metaLine);
    expect(slot.nextElementSibling?.textContent).toBe("Mô tả");
  });
});
