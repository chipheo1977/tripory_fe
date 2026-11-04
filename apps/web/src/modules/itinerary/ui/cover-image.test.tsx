import { fireEvent, render } from "@testing-library/react";
import { expect, it } from "vitest";
import { CoverImage } from "./cover-image";

const SRC = "https://images.example.com/a.jpg";

const image = (container: HTMLElement) => container.querySelector("img");

it("renders the fallback surface without an img when src is null", () => {
  const { container } = render(<CoverImage src={null} />);
  expect(image(container)).toBeNull();
  expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
  expect(container.querySelector("svg")).not.toBeNull();
});

it("renders a decorative lazy img with no referrer for an https url", () => {
  const { container } = render(<CoverImage src={SRC} />);
  const img = image(container);
  expect(img).not.toBeNull();
  expect(img?.getAttribute("src")).toBe(SRC);
  expect(img?.getAttribute("alt")).toBe("");
  expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(img?.getAttribute("loading")).toBe("lazy");
  expect(img?.getAttribute("decoding")).toBe("async");
});

it("passes through a custom alt", () => {
  const { container } = render(<CoverImage alt="Ảnh bìa" src={SRC} />);
  expect(image(container)?.getAttribute("alt")).toBe("Ảnh bìa");
});

it.each(["http://images.example.com/a.jpg", "javascript:alert(1)", "//images.example.com/a.jpg", ""])(
  "treats the non-https value %j as no image",
  (value) => {
    const { container } = render(<CoverImage src={value} />);
    expect(image(container)).toBeNull();
    expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
  },
);

it("falls back to the surface when the image fails to load", () => {
  const { container } = render(<CoverImage src={SRC} />);
  fireEvent.error(image(container) as HTMLImageElement);
  expect(image(container)).toBeNull();
  expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
});

it("resets the error state when src changes", () => {
  const { container, rerender } = render(<CoverImage src={SRC} />);
  fireEvent.error(image(container) as HTMLImageElement);
  expect(image(container)).toBeNull();
  rerender(<CoverImage src="https://images.example.com/b.jpg" />);
  expect(image(container)?.getAttribute("src")).toBe("https://images.example.com/b.jpg");
});

const FALLBACK = "https://images.example.com/default.jpg";

it("uses fallbackSrc when src is null", () => {
  const { container } = render(<CoverImage fallbackSrc={FALLBACK} src={null} />);
  expect(image(container)?.getAttribute("src")).toBe(FALLBACK);
});

it("prefers src over fallbackSrc", () => {
  const { container } = render(<CoverImage fallbackSrc={FALLBACK} src={SRC} />);
  expect(image(container)?.getAttribute("src")).toBe(SRC);
});

it("moves to fallbackSrc when src fails, then to the surface when fallbackSrc fails too", () => {
  const { container } = render(<CoverImage fallbackSrc={FALLBACK} src={SRC} />);
  fireEvent.error(image(container) as HTMLImageElement);
  expect(image(container)?.getAttribute("src")).toBe(FALLBACK);
  fireEvent.error(image(container) as HTMLImageElement);
  expect(image(container)).toBeNull();
  expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
});

it("ignores a non-https fallbackSrc", () => {
  const { container } = render(<CoverImage fallbackSrc="http://x" src={null} />);
  expect(image(container)).toBeNull();
});

it("retries a new src after an earlier failure", () => {
  const { container, rerender } = render(<CoverImage fallbackSrc={FALLBACK} src={SRC} />);
  fireEvent.error(image(container) as HTMLImageElement);
  rerender(<CoverImage fallbackSrc={FALLBACK} src="https://images.example.com/c.jpg" />);
  expect(image(container)?.getAttribute("src")).toBe("https://images.example.com/c.jpg");
});

it("renders the surface when both src and fallbackSrc are null", () => {
  const { container } = render(<CoverImage fallbackSrc={null} src={null} />);
  expect(image(container)).toBeNull();
  expect(container.querySelector(".bg-surface-muted")).not.toBeNull();
});
