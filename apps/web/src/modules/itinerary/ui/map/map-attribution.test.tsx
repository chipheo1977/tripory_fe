import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MapAttribution } from "./map-attribution";

it("có phần đọc cho trình đọc màn hình và đúng ba link theo thứ tự", () => {
  render(<MapAttribution />);

  const paragraph = screen.getByText("Nguồn bản đồ:", { exact: false }).closest("p");
  expect(paragraph?.querySelector(".sr-only")?.textContent).toBe("Nguồn bản đồ: ");
  const links = screen.getAllByRole("link");
  expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
    ["© OpenStreetMap", "https://www.openstreetmap.org/copyright"],
    ["OpenFreeMap", "https://openfreemap.org"],
    ["OpenMapTiles", "https://www.openmaptiles.org"],
  ]);
});

it("mọi link mở tab mới với rel an toàn", () => {
  render(<MapAttribution />);

  for (const link of screen.getAllByRole("link")) {
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  }
});

it("visible=false không render gì", () => {
  const { container } = render(<MapAttribution visible={false} />);

  expect(container.firstChild).toBeNull();
});

it("truyền tiếp className và style", () => {
  render(<MapAttribution className="extra" style={{ bottom: 8 }} />);

  const paragraph = screen.getAllByRole("link")[0]?.closest("p");
  expect(paragraph?.className.split(/\s+/)).toContain("extra");
  expect(paragraph?.style.bottom).toBe("8px");
});
