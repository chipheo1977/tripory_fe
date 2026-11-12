import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { modulesPath, QrCode } from "./qr-code";
import { qrMatrix } from "./qr-matrix";

const URL_A = "https://site.test/itineraries/abc";

describe("QrCode", () => {
  it("renders one labelled svg sized by the share token", () => {
    const { container } = render(<QrCode url={URL_A} />);

    const svg = screen.getByRole("img", { name: "Mã QR của link lịch trình" });
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    const size = qrMatrix(URL_A).size;
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${size} ${size}`);
    expect(svg.getAttribute("class")).toContain("size-(--share-qr-size)");
  });

  it("draws only a background rect and a modules path (no foreignObject, no image)", () => {
    const { container } = render(<QrCode url={URL_A} />);

    const svg = container.querySelector("svg") as SVGElement;
    expect([...svg.children].map((child) => child.tagName.toLowerCase())).toEqual(["rect", "path"]);
    expect(svg.querySelector("foreignObject, image")).toBeNull();
    expect(svg.querySelector("path")?.getAttribute("d")).not.toBe("");
  });

  it("uses token fills, never raw colours", () => {
    const { container } = render(<QrCode url={URL_A} />);

    expect(container.querySelector("rect")?.getAttribute("class")).toBe("fill-surface");
    expect(container.querySelector("path")?.getAttribute("class")).toBe("fill-text");
  });

  it("produces different geometry for a different url", () => {
    const a = render(<QrCode url={URL_A} />).container.querySelector("path")?.getAttribute("d");
    const b = render(<QrCode url="https://site.test/itineraries/xyz" />).container
      .querySelectorAll("path")[0]
      ?.getAttribute("d");

    expect(a).not.toBe(b);
  });

  it("never injects markup", () => {
    const { container } = render(<QrCode url={'https://site.test/"><script>alert(1)</script>'} />);

    expect(container.innerHTML).not.toContain("<script");
  });
});

describe("modulesPath", () => {
  it("merges adjacent dark modules of a row into one run", () => {
    const path = modulesPath({ size: 5, rows: [[true, true, false, true, true]] });

    expect(path).toBe("M0 0h2v1h-2zM3 0h2v1h-2z");
  });

  it("closes a run that reaches the end of the row", () => {
    expect(modulesPath({ size: 3, rows: [[false, true, true]] })).toBe("M1 0h2v1h-2z");
  });

  it("is empty for an all-light matrix", () => {
    expect(modulesPath({ size: 2, rows: [[false, false], [false, false]] })).toBe("");
  });
});
