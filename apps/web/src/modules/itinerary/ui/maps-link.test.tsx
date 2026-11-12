import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MapsLink } from "./maps-link";

it("opens Google Maps at the coordinate in a new tab, safely, named after the waypoint", () => {
  render(<MapsLink latitude={10.77} longitude={106.69} name="Chợ Bến Thành" />);

  const link = screen.getByRole("link", { name: "Mở Chợ Bến Thành trong Google Maps (mở tab mới)" });
  expect(link.getAttribute("href")).toBe("https://www.google.com/maps/search/?api=1&query=10.77,106.69");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.textContent).toBe("Mở trong Google Maps");
  expect(link.className).toContain("min-h-touch");
});
