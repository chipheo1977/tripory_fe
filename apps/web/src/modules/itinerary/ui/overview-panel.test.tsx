import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DaySummary } from "@tripory/itinerary";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DayOverviewRow, type DayRowEmphasis } from "./day-overview-row";
import type { OverviewSummaryData } from "./overview-format";
import { OverviewPanel } from "./overview-panel";
import { OverviewSummary } from "./overview-summary";

const COVER = "https://images.example.com/a.jpg";

const summary = (overrides: Partial<OverviewSummaryData> = {}): OverviewSummaryData => ({
  title: "Đà Nẵng 3 ngày",
  description: "Dòng một\nDòng hai",
  startDateLabel: "Khởi hành 05/11/2026",
  isPublic: false,
  coverImageUrl: COVER,
  fallbackCoverUrl: null,
  metaLine: "3 ngày · 5 điểm · 42,5 km",
  ...overrides,
});

const day = (overrides: Partial<DaySummary> = {}): DaySummary => ({
  dayNumber: 2,
  subtitle: "Phố cổ Hội An",
  waypointCount: 3,
  distanceKm: 12.4,
  ...overrides,
});

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

describe("OverviewSummary", () => {
  it("là section 'Thông tin chuyến đi' với trạng thái, ngày khởi hành, tiêu đề, mô tả, dòng meta và nút sửa", () => {
    render(<OverviewSummary data={summary()} onEdit={() => undefined} variant="wide" />);

    const section = screen.getByRole("region", { name: "Thông tin chuyến đi" });
    expect(within(section).getByText("Nháp")).toBeTruthy();
    expect(within(section).getByText("Khởi hành 05/11/2026")).toBeTruthy();
    expect(within(section).getByText("Đà Nẵng 3 ngày").tagName).toBe("P");
    expect(within(section).getByText("3 ngày · 5 điểm · 42,5 km")).toBeTruthy();
    expect(within(section).getByRole("button", { name: "Sửa thông tin" })).toBeTruthy();
    expect(section.querySelector("h1, h2")).toBeNull();
  });

  it("đã xuất bản thì hiện 'Đã xuất bản'; thiếu ngày khởi hành và mô tả thì không render phần đó", () => {
    render(<OverviewSummary data={summary({ isPublic: true, startDateLabel: null, description: null })} onEdit={() => undefined} variant="wide" />);

    expect(screen.getByText("Đã xuất bản")).toBeTruthy();
    expect(screen.queryByText(/Khởi hành/u)).toBeNull();
    expect(screen.queryByText("Dòng một", { exact: false })).toBeNull();
  });

  it("nút 'Sửa thông tin' và bấm vùng nền đều gọi onEdit; bấm nút không gọi hai lần", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<OverviewSummary data={summary()} onEdit={onEdit} variant="wide" />);

    await user.click(screen.getByRole("button", { name: "Sửa thông tin" }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("3 ngày · 5 điểm · 42,5 km"));
    expect(onEdit).toHaveBeenCalledTimes(2);
  });

  it("không hiện điểm đến hay sở thích", () => {
    render(<OverviewSummary data={summary()} onEdit={() => undefined} variant="wide" />);

    expect(screen.queryByText("Đà Nẵng")).toBeNull();
    expect(screen.queryByText(/Ẩm thực/u)).toBeNull();
  });

  it("wide: ảnh full width, tiêu đề cỡ heading, mô tả tối đa 4 dòng", () => {
    const { container } = render(<OverviewSummary data={summary()} onEdit={() => undefined} variant="wide" />);

    expect(classesOf(container.querySelector("[class*='aspect-(--itinerary-cover-ratio)']"))).toContain("w-full");
    expect(classesOf(screen.getByText("Đà Nẵng 3 ngày"))).toContain("text-heading");
    expect(classesOf(screen.getByText("Dòng một", { exact: false }))).toContain("line-clamp-4");
  });

  it("compact: ảnh thu nhỏ, tiêu đề và mô tả tối đa 2 dòng", () => {
    const { container } = render(<OverviewSummary data={summary()} onEdit={() => undefined} variant="compact" />);

    expect(classesOf(container.querySelector("[class*='aspect-(--itinerary-cover-ratio)']"))).toContain("w-(--overview-cover-thumb-width)");
    expect(classesOf(screen.getByText("Đà Nẵng 3 ngày"))).toContain("line-clamp-2");
    expect(classesOf(screen.getByText("Dòng một", { exact: false }))).toContain("line-clamp-2");
  });

  it("không có ảnh nào: wide có nút 'Thêm ảnh bìa', compact không có", () => {
    const noCover = summary({ coverImageUrl: null, fallbackCoverUrl: null });
    const { unmount } = render(<OverviewSummary data={noCover} onEdit={() => undefined} variant="wide" />);
    expect(screen.getByRole("button", { name: "Thêm ảnh bìa" })).toBeTruthy();
    unmount();

    render(<OverviewSummary data={noCover} onEdit={() => undefined} variant="compact" />);
    expect(screen.queryByRole("button", { name: "Thêm ảnh bìa" })).toBeNull();
  });

  it("tiêu đề là text node, không phải HTML", () => {
    render(<OverviewSummary data={summary({ title: "<img src=x onerror=alert(1)>" })} onEdit={() => undefined} variant="wide" />);

    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});

describe("DayOverviewRow", () => {
  function setup(emphasis: DayRowEmphasis = "none", input: Partial<DaySummary> = {}) {
    const onSelectDay = vi.fn();
    const onEmphasizeDay = vi.fn();
    render(
      <ol>
        <DayOverviewRow day={day(input)} emphasis={emphasis} onEmphasizeDay={onEmphasizeDay} onSelectDay={onSelectDay} />
      </ol>,
    );
    return { onSelectDay, onEmphasizeDay, user: userEvent.setup() };
  }

  it("là button có tên truy cập đầy đủ và hai dòng chữ", () => {
    setup();

    const button = screen.getByRole("button", { name: "Xem Ngày 2: Phố cổ Hội An, 3 điểm, 12,4 km" });
    expect(within(button).getByText("Ngày 2 · Phố cổ Hội An")).toBeTruthy();
    expect(within(button).getByText("3 điểm · 12,4 km")).toBeTruthy();
  });

  it("ngày không có điểm", () => {
    setup("none", { subtitle: null, waypointCount: 0 });

    const button = screen.getByRole("button", { name: "Xem Ngày 2, chưa có điểm" });
    expect(within(button).getByText("Chưa có điểm")).toBeTruthy();
  });

  it("chuột, Enter và Space đều chọn ngày", async () => {
    const { user, onSelectDay } = setup();
    const button = screen.getByRole("button");

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onSelectDay).toHaveBeenCalledTimes(3);
    expect(onSelectDay).toHaveBeenCalledWith(2);
  });

  it("rê/focus báo ngày, rời/blur báo null", async () => {
    const { user, onEmphasizeDay } = setup();
    const button = screen.getByRole("button");

    await user.hover(button);
    expect(onEmphasizeDay).toHaveBeenLastCalledWith(2);
    await user.unhover(button);
    expect(onEmphasizeDay).toHaveBeenLastCalledWith(null);

    await user.tab();
    expect(onEmphasizeDay).toHaveBeenLastCalledWith(2);
    await user.tab();
    expect(onEmphasizeDay).toHaveBeenLastCalledWith(null);
  });

  it.each([
    ["selected", ["ring-2", "ring-inset", "ring-text"]],
    ["recent", ["bg-primary-subtle", "border-primary-border"]],
  ] as const)("trạng thái %s có class đúng", (emphasis, expected) => {
    setup(emphasis);

    expect(classesOf(screen.getByRole("button"))).toEqual(expect.arrayContaining([...expected]));
  });

  it("chấm màu aria-hidden theo màu ngày", () => {
    setup("none", { dayNumber: 9 });

    const dot = screen.getByRole("button").querySelector("[aria-hidden='true'].bg-map-day-1");
    expect(dot).not.toBeNull();
  });
});

describe("OverviewPanel", () => {
  const days: readonly DaySummary[] = [
    { dayNumber: 1, subtitle: null, waypointCount: 2, distanceKm: 12.4 },
    { dayNumber: 2, subtitle: "Phố cổ", waypointCount: 0, distanceKm: null },
    { dayNumber: 3, subtitle: null, waypointCount: 1, distanceKm: null },
  ];

  function setup(overrides: { days?: readonly DaySummary[]; rowEmphasis?: (dayNumber: number) => DayRowEmphasis } = {}) {
    const actions = { onEdit: vi.fn(), onAdd: vi.fn(), addButtonRef: createRef<HTMLButtonElement>() };
    const onSelectDay = vi.fn();
    render(
      <OverviewPanel
        actions={actions}
        days={overrides.days ?? days}
        onEmphasizeDay={() => undefined}
        onSelectDay={onSelectDay}
        rowEmphasis={overrides.rowEmphasis ?? (() => "none")}
        summary={summary()}
        variant="wide"
      />,
    );
    return { actions, onSelectDay, user: userEvent.setup() };
  }

  it("có tiêu đề 'Các ngày' và danh sách đủ Ngày 1..N", () => {
    setup();

    expect(screen.getByRole("heading", { level: 3, name: "Các ngày" })).toBeTruthy();
    const list = screen.getByRole("list", { name: "Tóm tắt các ngày" });
    expect(within(list).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Xem Ngày 1, 2 điểm, 12,4 km",
      "Xem Ngày 2: Phố cổ, chưa có điểm",
      "Xem Ngày 3, 1 điểm",
    ]);
  });

  it("chỉ xem: không có phụ đề, danh sách điểm, sửa, xóa hay kéo thả", () => {
    setup();

    expect(screen.queryByRole("button", { name: /Thêm phụ đề/u })).toBeNull();
    expect(screen.queryByText(/Kéo để sắp xếp/u)).toBeNull();
    expect(screen.queryByRole("list", { name: /^Điểm đến Ngày/u })).toBeNull();
    expect(screen.queryByRole("button", { name: /Xóa|Sửa điểm/u })).toBeNull();
  });

  it("nút 'Thêm điểm đến' luôn có (kể cả không có điểm), gọi onAdd và nhận addButtonRef", async () => {
    const empty: readonly DaySummary[] = [{ dayNumber: 1, subtitle: null, waypointCount: 0, distanceKm: null }];
    const { actions, user } = setup({ days: empty });

    const add = screen.getByRole("button", { name: "Thêm điểm đến" });
    expect(actions.addButtonRef.current).toBe(add);
    await user.click(add);

    expect(actions.onAdd).toHaveBeenCalledTimes(1);
  });

  it("bấm dòng ngày gọi onSelectDay; emphasis lấy từ rowEmphasis", async () => {
    const { user, onSelectDay } = setup({ rowEmphasis: (dayNumber) => (dayNumber === 3 ? "selected" : "none") });

    await user.click(screen.getByRole("button", { name: "Xem Ngày 1, 2 điểm, 12,4 km" }));

    expect(onSelectDay).toHaveBeenCalledWith(1);
    expect(classesOf(screen.getByRole("button", { name: "Xem Ngày 3, 1 điểm" }))).toContain("ring-text");
  });

  it("'Sửa thông tin' trong phần thông tin chung gọi onEdit", async () => {
    const { actions, user } = setup();

    await user.click(screen.getByRole("button", { name: "Sửa thông tin" }));

    expect(actions.onEdit).toHaveBeenCalledTimes(1);
  });
});

describe("DayOverviewRow scroll", () => {
  const scrollIntoView = vi.fn();

  function Row({ emphasis }: { emphasis: DayRowEmphasis }) {
    return (
      <ol>
        <DayOverviewRow day={day()} emphasis={emphasis} onEmphasizeDay={() => undefined} onSelectDay={() => undefined} />
      </ol>
    );
  }

  it("scrolls into view when it becomes 'selected', once", () => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    const { rerender } = render(<Row emphasis="none" />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<Row emphasis="selected" />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });

    rerender(<Row emphasis="selected" />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("does not scroll for 'recent'", () => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    const { rerender } = render(<Row emphasis="none" />);

    rerender(<Row emphasis="recent" />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("uses behavior 'auto' when the user prefers reduced motion", () => {
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({ matches: query.includes("prefers-reduced-motion"), media: query }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const { rerender } = render(<Row emphasis="none" />);
      rerender(<Row emphasis="selected" />);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
    } finally {
      window.matchMedia = original;
    }
  });
});