import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { MapAttribution } from "./map-attribution";

const button = () => screen.getByRole("button", { name: "Ghi công bản đồ" });

function setup() {
  const view = render(
    <div>
      <button type="button">Ngoài</button>
      <MapAttribution />
    </div>,
  );
  return { ...view, user: userEvent.setup() };
}

it("mặc định thu gọn: chỉ có nút, aria-expanded=false, chưa có link", () => {
  setup();

  expect(button().getAttribute("aria-expanded")).toBe("false");
  expect(button().getAttribute("title")).toBe("Ghi công bản đồ");
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  expect(screen.queryByText("Nguồn bản đồ:", { exact: false })).toBeNull();
});

it("bấm nút mở: aria-expanded=true, aria-controls trỏ tới vùng chữ có đúng ba link theo thứ tự", async () => {
  const { user } = setup();

  await user.click(button());

  expect(button().getAttribute("aria-expanded")).toBe("true");
  const links = screen.getAllByRole("link");
  expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
    ["© OpenStreetMap", "https://www.openstreetmap.org/copyright"],
    ["OpenFreeMap", "https://openfreemap.org"],
    ["OpenMapTiles", "https://www.openmaptiles.org"],
  ]);
  const panel = document.getElementById(button().getAttribute("aria-controls") ?? "");
  expect(panel).not.toBeNull();
  expect(panel?.contains(links[0] ?? null)).toBe(true);
  expect(panel?.querySelector(".sr-only")?.textContent).toBe("Nguồn bản đồ: ");
});

it("mọi link mở tab mới với rel an toàn", async () => {
  const { user } = setup();

  await user.click(button());

  for (const link of screen.getAllByRole("link")) {
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  }
});

it("bấm nút lần nữa thì đóng", async () => {
  const { user } = setup();

  await user.click(button());
  await user.click(button());

  expect(button().getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});

it("bàn phím: Enter và Space mở/đóng, Tab đi từ nút tới các link theo thứ tự", async () => {
  const { user } = setup();

  await user.tab();
  await user.tab();
  expect(document.activeElement).toBe(button());
  await user.keyboard("{Enter}");
  expect(button().getAttribute("aria-expanded")).toBe("true");
  await user.keyboard(" ");
  expect(button().getAttribute("aria-expanded")).toBe("false");
  await user.keyboard("{Enter}");

  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "© OpenStreetMap" }));
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "OpenFreeMap" }));
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "OpenMapTiles" }));
});

it("Esc khi focus ở link: đóng và trả focus về nút", async () => {
  const { user } = setup();
  await user.click(button());
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "© OpenStreetMap" }));

  await user.keyboard("{Escape}");

  expect(button().getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  expect(document.activeElement).toBe(button());
});

it("Esc khi focus ở nơi khác: đóng nhưng không kéo focus về nút", async () => {
  const { user } = setup();
  await user.click(button());
  screen.getByRole("button", { name: "Ngoài" }).focus();

  await user.keyboard("{Escape}");

  expect(button().getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ngoài" }));
});

it("bấm ra ngoài thì đóng, bấm trong vùng chữ thì không đóng", async () => {
  const { user } = setup();
  await user.click(button());

  await user.click(screen.getByText("Nguồn bản đồ:", { exact: false }));
  expect(button().getAttribute("aria-expanded")).toBe("true");

  await user.click(screen.getByRole("button", { name: "Ngoài" }));
  expect(button().getAttribute("aria-expanded")).toBe("false");
});

it("Esc khi đang mở chỉ đóng ghi công, không lan tới trình nghe khác (sheet, canvas); khi đóng thì lan bình thường", async () => {
  const { user } = setup();
  const seen: string[] = [];
  const listener = (event: KeyboardEvent) => seen.push(event.key);
  document.addEventListener("keydown", listener);

  await user.click(button());
  await user.keyboard("{Escape}");
  expect(seen).toEqual([]);

  await user.keyboard("{Escape}");
  expect(seen).toEqual(["Escape"]);
  document.removeEventListener("keydown", listener);
});

it("Esc khi đang đóng không làm gì", async () => {
  const { user } = setup();

  await user.keyboard("{Escape}");

  expect(button().getAttribute("aria-expanded")).toBe("false");
});

it("visible=false không render gì", () => {
  const { container } = render(<MapAttribution visible={false} />);

  expect(container.firstChild).toBeNull();
});

it("truyền tiếp className và style lên vùng gốc", () => {
  render(<MapAttribution className="extra" style={{ bottom: 8 }} />);

  const root = button().parentElement;
  expect(root?.className.split(/\s+/)).toContain("extra");
  expect(root?.style.bottom).toBe("8px");
});
