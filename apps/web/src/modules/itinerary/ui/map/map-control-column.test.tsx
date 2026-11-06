import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MapControlColumn } from "./map-control-column";

it("xếp con theo cột dọc ở góc phải trên, cách mép 16px, theo thứ tự truyền vào", () => {
  render(
    <MapControlColumn visible>
      <button type="button">Trên</button>
      <button type="button">Dưới</button>
    </MapControlColumn>,
  );

  const column = screen.getByRole("button", { name: "Trên" }).parentElement as HTMLElement;
  expect(column.className.split(/\s+/)).toEqual(
    expect.arrayContaining(["absolute", "right-stack-md", "top-stack-md", "flex", "flex-col", "gap-inline-xs"]),
  );
  expect([...column.children].map((child) => child.textContent)).toEqual(["Trên", "Dưới"]);
});

it("visible=false không render gì", () => {
  const { container } = render(
    <MapControlColumn visible={false}>
      <button type="button">Trên</button>
    </MapControlColumn>,
  );

  expect(container.firstChild).toBeNull();
});
