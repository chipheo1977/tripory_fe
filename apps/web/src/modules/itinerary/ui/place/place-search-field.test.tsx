import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeApiError } from "@tripory/api-client";
import type { Place } from "@tripory/itinerary";
import { beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import { PlaceSearchField } from "./place-search-field";

const h = vi.hoisted(() => ({ search: vi.fn(), suggest: vi.fn(), reverse: vi.fn() }));

// Lookup giả thay BFF: test không bao giờ gọi Photon/Nominatim thật.
vi.mock("@/composition/places.client", async () => {
  const { createPlaceHooks } = await import("@tripory/itinerary/react");
  return {
    places: createPlaceHooks({
      search: (query) => h.search(query),
      suggest: (code) => h.suggest(code),
      reverse: (coordinate) => h.reverse(coordinate),
    }),
  };
});

const place = (id: string, name: string, category: Place["category"], address: string | null = null): Place => ({
  id,
  name,
  address,
  coordinate: { latitude: 11.9404, longitude: 108.4583 },
  category,
  countryCode: "VN",
});

const CRAZY_HOUSE = place("W1", "Crazy House", "attraction", "3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng");
const CAFE = place("N2", "Cà phê Tùng", "food");
const HO_XUAN_HUONG = place("W3", "Hồ Xuân Hương", "attraction");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(destination: Readonly<{ code: string | null; name: string | null }> = { code: "vn-lam-dong", name: "Lâm Đồng" }) {
  const user = userEvent.setup();
  const onPick = vi.fn();
  const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
  const onOuterKeyDown = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      {/* Vùng bọc giả lập dialog: Esc chưa tới bước đóng form thì không được nổi bọt tới đây. */}
      <div onKeyDown={(event) => onOuterKeyDown(event.key)}>
        <form onSubmit={onSubmit}>
          <PlaceSearchField destinationCode={destination.code} destinationName={destination.name} onPick={onPick} />
        </form>
      </div>
    </QueryClientProvider>,
  );
  return { user, onPick, onSubmit, onOuterKeyDown };
}

const combobox = () => screen.getByRole("combobox", { name: "Tìm địa điểm" }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  h.suggest.mockResolvedValue([CRAZY_HOUSE, CAFE]);
  h.search.mockResolvedValue([HO_XUAN_HUONG]);
  h.reverse.mockResolvedValue(null);
});

it("hiện gợi ý theo điểm đến khi mở, có nhãn danh mục và ghi công OSM", async () => {
  setup();
  const list = await screen.findByRole("listbox", { name: "Gợi ý ở Lâm Đồng" });
  const options = within(list).getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual([
    "Crazy HouseTham quan · 3 Huỳnh Thúc Kháng, Xuân Hương, Đà Lạt, Lâm Đồng",
    "Cà phê TùngĂn uống",
  ]);
  expect(h.suggest).toHaveBeenCalledTimes(1);
  expect(h.suggest).toHaveBeenCalledWith("vn-lam-dong");
  const link = screen.getByRole("link", { name: "© OpenStreetMap" });
  expect(link.getAttribute("href")).toBe("https://www.openstreetmap.org/copyright");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(screen.getByRole("status").textContent).toBe("2 kết quả");
});

it("có thuộc tính ARIA của combobox và aria-activedescendant đi theo ↓/↑", async () => {
  const { user } = setup();
  const list = await screen.findByRole("listbox");
  const input = combobox();
  expect(input.getAttribute("aria-autocomplete")).toBe("list");
  expect(input.getAttribute("aria-expanded")).toBe("true");
  expect(input.getAttribute("aria-controls")).toBe(list.id);
  expect(input.getAttribute("aria-activedescendant")).toBeNull();
  expect(input.getAttribute("placeholder")).toBe("Tìm tên địa điểm, ví dụ Hồ Xuân Hương");

  const [first, second] = within(list).getAllByRole("option");
  input.focus();
  await user.keyboard("{ArrowDown}");
  expect(input.getAttribute("aria-activedescendant")).toBe(first?.id);
  expect(first?.getAttribute("aria-selected")).toBe("true");
  await user.keyboard("{ArrowDown}");
  expect(input.getAttribute("aria-activedescendant")).toBe(second?.id);
  await user.keyboard("{ArrowDown}");
  expect(input.getAttribute("aria-activedescendant")).toBe(first?.id);
  await user.keyboard("{ArrowUp}");
  expect(input.getAttribute("aria-activedescendant")).toBe(second?.id);
});

it("gọi tìm đúng một lần sau 300 ms cho 'ho xuan', không gọi cho 1 ký tự", async () => {
  const { user } = setup();
  await screen.findByRole("listbox", { name: "Gợi ý ở Lâm Đồng" });
  await user.type(combobox(), "h");
  await sleep(400);
  expect(h.search).not.toHaveBeenCalled();

  await user.type(combobox(), "o xuan");
  expect(await screen.findByRole("listbox", { name: "Kết quả tìm kiếm" })).toBeTruthy();
  expect(h.search).toHaveBeenCalledTimes(1);
  expect(h.search).toHaveBeenCalledWith({ text: "ho xuan", destinationCode: "vn-lam-dong" });
  expect(screen.getByRole("option").textContent).toContain("Hồ Xuân Hương");
});

it("↓ rồi Enter chọn địa điểm và không gửi form bao quanh", async () => {
  const { user, onPick, onSubmit } = setup();
  await screen.findByRole("listbox");
  combobox().focus();
  await user.keyboard("{ArrowDown}{Enter}");
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith(CRAZY_HOUSE);
  expect(onSubmit).not.toHaveBeenCalled();
});

it("Enter khi chưa có lựa chọn không chọn gì và không gửi form", async () => {
  const { user, onPick, onSubmit } = setup();
  await screen.findByRole("listbox");
  combobox().focus();
  await user.keyboard("{Enter}");
  expect(onPick).not.toHaveBeenCalled();
  expect(onSubmit).not.toHaveBeenCalled();
});

it("bấm chuột vào một dòng là chọn", async () => {
  const { user, onPick } = setup();
  await user.click(await screen.findByRole("option", { name: /Cà phê Tùng/ }));
  expect(onPick).toHaveBeenCalledWith(CAFE);
});

it("Esc: bỏ lựa chọn, rồi xóa chữ, không nổi bọt tới dialog; ô trống thì Esc đi tiếp", async () => {
  const { user, onOuterKeyDown } = setup();
  await screen.findByRole("listbox");
  await user.type(combobox(), "ho xuan");
  await screen.findByRole("listbox", { name: "Kết quả tìm kiếm" });
  await user.keyboard("{ArrowDown}");
  expect(combobox().getAttribute("aria-activedescendant")).not.toBeNull();
  expect(combobox().closest("[data-escape-scope]")).not.toBeNull();

  await user.keyboard("{Escape}");
  expect(combobox().getAttribute("aria-activedescendant")).toBeNull();
  expect(combobox().value).toBe("ho xuan");
  await user.keyboard("{Escape}");
  expect(combobox().value).toBe("");
  expect(onOuterKeyDown).not.toHaveBeenCalledWith("Escape");

  await user.keyboard("{Escape}");
  expect(onOuterKeyDown).toHaveBeenCalledWith("Escape");
});

it("không tìm thấy: báo đúng câu kèm từ khóa", async () => {
  h.search.mockResolvedValue([]);
  const { user } = setup();
  await user.type(combobox(), "xyz");
  expect(
    await screen.findByText('Không tìm thấy "xyz". Thử tên khác hoặc nhập tọa độ thủ công.'),
  ).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("Không có kết quả");
  expect(combobox().getAttribute("aria-expanded")).toBe("false");
});

it("gợi ý lỗi: hiện câu lỗi và 'Thử lại' tải lại", async () => {
  h.suggest.mockRejectedValueOnce(makeApiError({ kind: "http", status: 502, code: "Places.Unavailable", message: null }));
  const { user } = setup();
  expect(
    await screen.findByText("Chưa tìm được địa điểm lúc này. Thử lại hoặc nhập tọa độ thủ công.", { selector: "p:not([role])" }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByRole("listbox", { name: "Gợi ý ở Lâm Đồng" })).toBeTruthy();
  expect(h.suggest).toHaveBeenCalledTimes(2);
});

it("bị giới hạn: hiện câu 'Bạn tìm hơi nhanh'", async () => {
  h.search.mockRejectedValue(makeApiError({ kind: "http", status: 429, code: "Places.RateLimited", message: null }));
  const { user } = setup();
  await user.type(combobox(), "ho xuan");
  expect(
    await screen.findByText("Bạn tìm hơi nhanh. Đợi vài giây rồi thử lại.", { selector: "p:not([role])" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
});

it("lịch trình không có điểm đến: chỉ nhắc gõ để tìm, không gọi gợi ý", async () => {
  setup({ code: null, name: null });
  expect(screen.getByText("Gõ tên địa điểm để tìm.")).toBeTruthy();
  await sleep(50);
  expect(h.suggest).not.toHaveBeenCalled();
  expect(screen.queryByRole("listbox")).toBeNull();
});
