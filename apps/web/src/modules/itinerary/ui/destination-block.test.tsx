import type { Destination } from "@tripory/itinerary";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { DestinationBlock, type DestinationBlockHandle, type DestinationBlockProps } from "./destination-block";

const d = (slug: string, name: string, popularityRank: number | null, aliases: readonly string[] = []): Destination => ({
  slug,
  name,
  officialName: name,
  kind: "province",
  adminCode: slug,
  popularityRank,
  aliases,
  defaultCoverImageUrl: null,
});

const LIST: readonly Destination[] = [
  d("vn-a1", "Alpha", 1),
  d("vn-a2", "Bravo", 2),
  d("vn-a3", "Charlie", 3),
  d("vn-a4", "Delta", 4),
  d("vn-a5", "Echo", 5),
  d("vn-a6", "Foxtrot", 6),
  d("vn-a7", "Golf", 7),
  d("vn-a8", "Hotel", 8),
  d("vn-a9", "India", 9),
  d("vn-lam-dong", "Lâm Đồng", null, ["Đà Lạt", "Mũi Né"]),
  d("vn-hue", "Huế", null, ["Thừa Thiên Huế"]),
  d("vn-quang-tri", "Quảng Trị", null, ["Quảng Bình"]),
];

function setup(props: Partial<DestinationBlockProps> = {}) {
  const onValueChange = vi.fn();
  const onCommit = vi.fn();
  const view = render(
    <DestinationBlock
      destinations={LIST}
      disabled={false}
      onCommit={onCommit}
      onValueChange={onValueChange}
      value={null}
      {...props}
    />,
  );
  return { onValueChange, onCommit, user: userEvent.setup(), ...view };
}

const search = () => screen.getByRole("searchbox", { name: "Tìm điểm đến" });

describe("DestinationBlock: nhóm và tìm kiếm", () => {
  it("chưa tìm: nhóm Phổ biến (8 mục) và Tất cả, không có Kết quả tìm kiếm", () => {
    setup();
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    const all = screen.getByRole("radiogroup", { name: "Tất cả" });
    expect(within(popular).getAllByRole("radio")).toHaveLength(8);
    expect(within(all).getAllByRole("radio")).toHaveLength(LIST.length);
    expect(screen.queryByRole("radiogroup", { name: "Kết quả tìm kiếm" })).toBeNull();
  });

  it.each(["da lat", "Đà Lạt", "DA LAT"])("gõ %s ra Lâm Đồng kèm dòng gồm Đà Lạt", async (text) => {
    const { user } = setup();
    await user.type(search(), text);
    const results = screen.getByRole("radiogroup", { name: "Kết quả tìm kiếm" });
    const options = within(results).getAllByRole("radio");
    expect(options).toHaveLength(1);
    expect(options[0]?.getAttribute("aria-label")).toBe("Lâm Đồng, gồm Đà Lạt");
    expect(results.textContent).toContain("gồm Đà Lạt");
    expect(screen.queryByRole("radiogroup", { name: "Phổ biến" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Tất cả" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1 kết quả");
  });

  it("khớp qua tên thì không có dòng gồm", async () => {
    const { user } = setup();
    await user.type(search(), "hue");
    const results = screen.getByRole("radiogroup", { name: "Kết quả tìm kiếm" });
    expect(results.textContent).not.toContain("gồm");
  });

  it("không có kết quả hiện empty state và thông báo", async () => {
    const { user } = setup();
    await user.type(search(), "xyz");
    expect(screen.getByRole("heading", { name: 'Không tìm thấy "xyz"' })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Không có kết quả");
  });
});

describe("DestinationBlock: chọn và chuyển khối", () => {
  it("bấm một dòng gọi onCommit đúng một lần", async () => {
    const { user, onCommit } = setup();
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    await user.click(within(popular).getByRole("radio", { name: "Bravo" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("vn-a2");
  });

  it("Space và Enter trên dòng đang focus gọi onCommit", async () => {
    const { user, onCommit } = setup();
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    const option = within(popular).getByRole("radio", { name: "Charlie" });
    option.focus();
    await user.keyboard(" ");
    expect(onCommit).toHaveBeenCalledWith("vn-a3");
    onCommit.mockClear();
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledWith("vn-a3");
  });

  it("mũi tên đổi lựa chọn nhưng không chuyển khối", async () => {
    const { user, onCommit, onValueChange } = setup({ value: "vn-a1" });
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    within(popular).getByRole("radio", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenCalledWith("vn-a2");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("Enter trong ô tìm chọn kết quả đầu và không gửi form", async () => {
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <DestinationBlock destinations={LIST} disabled={false} onCommit={onCommit} onValueChange={vi.fn()} value={null} />
        <button type="submit">Gửi</button>
      </form>,
    );
    await user.type(search(), "da lat{Enter}");
    expect(onCommit).toHaveBeenCalledWith("vn-lam-dong");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter khi không có kết quả không làm gì", async () => {
    const { user, onCommit } = setup();
    await user.type(search(), "xyz{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("DestinationBlock: Esc trong ô tìm", () => {
  it("có chữ thì xóa chữ, không nổi bọt ra document và có data-escape-scope", async () => {
    const { user, container } = setup();
    const leaked = vi.fn();
    document.addEventListener("keydown", leaked);
    await user.type(search(), "da");
    expect(container.querySelector("[data-escape-scope]")).not.toBeNull();
    leaked.mockClear();
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", leaked);
    expect((search() as HTMLInputElement).value).toBe("");
    expect(leaked).not.toHaveBeenCalled();
    expect(container.querySelector("[data-escape-scope]")).toBeNull();
  });

  it("ô trống thì Esc nổi bọt như thường", async () => {
    const { user } = setup();
    const leaked = vi.fn();
    document.addEventListener("keydown", leaked);
    search().focus();
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", leaked);
    expect(leaked).toHaveBeenCalled();
  });
});

describe("DestinationBlock: lỗi, giá trị, handle, disabled", () => {
  it("error hiện role alert và gắn aria vào nhóm", () => {
    setup({ error: "Vui lòng chọn điểm đến." });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Vui lòng chọn điểm đến.");
    const group = screen.getByRole("radiogroup", { name: "Phổ biến" });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("value đang chọn có aria-checked ở cả hai nhóm", () => {
    setup({ value: "vn-a2" });
    for (const name of ["Phổ biến", "Tất cả"]) {
      const group = screen.getByRole("radiogroup", { name });
      expect(within(group).getByRole("radio", { name: "Bravo" }).getAttribute("aria-checked")).toBe("true");
    }
  });

  it("focusFirstOption xóa từ khóa và focus radio đầu của nhóm Phổ biến", async () => {
    const handleRef = createRef<DestinationBlockHandle>();
    const { user } = setup({ handleRef });
    await user.type(search(), "da");
    handleRef.current?.focusFirstOption();
    expect((search() as HTMLInputElement).value).toBe("");
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    expect(document.activeElement).toBe(within(popular).getAllByRole("radio")[0]);
  });

  it("getSearchElement và focusSearch dùng ô tìm, giữ nguyên từ khóa", async () => {
    const handleRef = createRef<DestinationBlockHandle>();
    const { user } = setup({ handleRef });
    await user.type(search(), "da");
    (document.activeElement as HTMLElement).blur();
    expect(handleRef.current?.getSearchElement()).toBe(search());
    handleRef.current?.focusSearch();
    expect(document.activeElement).toBe(search());
    expect((search() as HTMLInputElement).value).toBe("da");
  });

  it("disabled vô hiệu ô tìm", () => {
    setup({ disabled: true });
    expect((search() as HTMLInputElement).disabled).toBe(true);
  });

  it("mỗi nhóm là một điểm dừng Tab", async () => {
    const { user } = setup({ value: "vn-a1" });
    await user.tab();
    expect(document.activeElement).toBe(search());
    await user.tab();
    const popular = screen.getByRole("radiogroup", { name: "Phổ biến" });
    expect(popular.contains(document.activeElement)).toBe(true);
    await user.tab();
    const all = screen.getByRole("radiogroup", { name: "Tất cả" });
    expect(all.contains(document.activeElement)).toBe(true);
  });
});
