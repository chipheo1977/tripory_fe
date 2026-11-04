import type { CoverGallery } from "@tripory/itinerary";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoverImageField } from "./cover-image-field";

const u = (n: number) => `https://img.example/${n}.jpg`;
const images = (count: number) => Array.from({ length: count }, (_, n) => u(n + 1));

type HarnessProps = {
  count: number;
  selected?: number | null;
  hasDefaultCover?: boolean;
  error?: string;
  disabled?: boolean;
  onChangeSpy?: (next: CoverGallery) => void;
};

function Harness({ count, selected, hasDefaultCover = false, error, disabled, onChangeSpy }: HarnessProps) {
  const [gallery, setGallery] = useState<CoverGallery>({
    images: images(count),
    selectedIndex: selected === undefined ? (count === 0 ? null : 0) : selected,
  });
  return (
    <CoverImageField
      disabled={disabled}
      error={error}
      hasDefaultCover={hasDefaultCover}
      images={gallery.images}
      onChange={(next) => {
        setGallery(next);
        onChangeSpy?.(next);
      }}
      selectedIndex={gallery.selectedIndex}
    />
  );
}

const group = () => screen.queryByRole("radiogroup", { name: "Ảnh bìa" });
const emptySlots = (container: HTMLElement) => container.querySelectorAll("[data-cover-empty]");

describe("CoverImageField: cấu trúc 5 ô", () => {
  it.each([0, 1, 2, 3, 4, 5])("n=%i: tổng 5 ô (ảnh + thêm + khung trống)", (count) => {
    const { container } = render(<Harness count={count} />);
    const add = screen.queryAllByRole("button", { name: "Thêm ảnh bìa" }).length;
    expect(count + add + emptySlots(container).length).toBe(5);
    expect(emptySlots(container).length).toBe(count >= 4 ? 0 : 4 - count);
  });

  it("radiogroup chỉ chứa radio, nút X và nút thêm là anh em đứng sau", () => {
    render(<Harness count={2} />);
    const radioGroup = group() as HTMLElement;
    expect(within(radioGroup).queryAllByRole("button")).toHaveLength(0);
    expect(within(radioGroup).getAllByRole("radio")).toHaveLength(2);
    const remove = screen.getByRole("button", { name: "Xóa ảnh bìa 1" });
    const add = screen.getByRole("button", { name: "Thêm ảnh bìa" });
    expect(radioGroup.contains(remove)).toBe(false);
    expect(radioGroup.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(radioGroup.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Thêm ảnh bìa" })).toHaveLength(1);
  });

  it("nhãn radio theo ảnh đang hiển thị", () => {
    render(<Harness count={3} selected={1} />);
    expect(screen.getByRole("radio", { name: "Ảnh bìa 2, đang hiển thị" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Chọn ảnh 1 làm ảnh bìa" }).getAttribute("aria-checked")).toBe("false");
  });

  it("mũi tên đổi ảnh chọn và báo onChange", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness count={3} onChangeSpy={onChangeSpy} />);
    screen.getByRole("radio", { name: "Ảnh bìa 1, đang hiển thị" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ selectedIndex: 1 }));
  });

  it("mỗi ảnh có referrerpolicy no-referrer và alt rỗng; ảnh hỏng hiện nền lỗi nhưng vẫn chọn/xóa được", () => {
    const { container } = render(<Harness count={2} />);
    const pics = container.querySelectorAll("img");
    expect(pics).toHaveLength(2);
    for (const pic of pics) {
      expect(pic.getAttribute("referrerpolicy")).toBe("no-referrer");
      expect(pic.getAttribute("alt")).toBe("");
    }
    fireEvent.error(pics[0] as HTMLImageElement);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Xóa ảnh bìa 1" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});

describe("CoverImageField: thứ tự Tab", () => {
  it("radio đang chọn → các nút X → Thêm ảnh bìa → Link ảnh → Hủy → Thêm", async () => {
    const user = userEvent.setup();
    render(<Harness count={2} />);
    const order: string[] = [];
    const record = () => order.push(document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "");
    await user.tab();
    record();
    await user.tab();
    record();
    await user.tab();
    record();
    await user.tab();
    record();
    expect(order).toEqual(["Ảnh bìa 1, đang hiển thị", "Xóa ảnh bìa 1", "Xóa ảnh bìa 2", "Thêm ảnh bìa"]);
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByLabelText("Link ảnh"));
    await user.tab();
    expect((document.activeElement as HTMLElement).textContent).toBe("Hủy");
    await user.tab();
    expect((document.activeElement as HTMLElement).textContent).toBe("Thêm");
  });
});

describe("CoverImageField: xóa", () => {
  it("bấm X xóa ảnh; xóa ảnh đang chọn thì ảnh đầu còn lại được chọn", async () => {
    const user = userEvent.setup();
    render(<Harness count={3} selected={1} />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 2" }));
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Ảnh bìa 1, đang hiển thị" })).toBeTruthy();
    expect(screen.getByText("Đã xóa ảnh bìa 2")).toBeTruthy();
  });

  it("xóa hết: không radio, không thêm ảnh mặc định, ghi chú theo hasDefaultCover", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness count={1} hasDefaultCover />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 1" }));
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText("Chưa có ảnh bìa. Lịch trình đang dùng ảnh mặc định.")).toBeTruthy();
    rerender(<Harness count={0} key="plain" />);
    expect(screen.getByText("Chưa có ảnh bìa.")).toBeTruthy();
  });

  it("focus sau xóa: cùng vị trí, liền trước, hoặc nút thêm", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness count={3} />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 2" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Xóa ảnh bìa 2" }));
    unmount();

    const second = render(<Harness count={3} />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 3" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Xóa ảnh bìa 2" }));
    second.unmount();

    render(<Harness count={1} />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 1" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
  });
});

describe("CoverImageField: thêm", () => {
  it("thêm qua khung: radio mới được focus nhưng không đổi ảnh chọn", async () => {
    const user = userEvent.setup();
    render(<Harness count={2} />);
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.type(screen.getByLabelText("Link ảnh"), `${u(9)}{Enter}`);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(document.activeElement).toBe(radios[2]);
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    expect(radios[2]?.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Đã thêm ảnh bìa 3")).toBeTruthy();
    expect(screen.queryByLabelText("Link ảnh")).toBeNull();
  });

  it("thêm vào danh sách rỗng thì ảnh mới được chọn", async () => {
    const user = userEvent.setup();
    render(<Harness count={0} />);
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.type(screen.getByLabelText("Link ảnh"), `${u(1)}{Enter}`);
    expect(screen.getByRole("radio", { name: "Ảnh bìa 1, đang hiển thị" }).getAttribute("aria-checked")).toBe("true");
  });

  it("đủ 5 ảnh: không còn nút Thêm ảnh bìa và hiện ghi chú", () => {
    render(<Harness count={5} />);
    expect(screen.queryByRole("button", { name: "Thêm ảnh bìa" })).toBeNull();
    expect(screen.getByText("Đã đủ 5 ảnh. Xóa một ảnh để thêm ảnh khác.")).toBeTruthy();
  });

  it("Hủy đóng khung và trả focus về nút Thêm ảnh bìa", async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByLabelText("Link ảnh")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
  });
});

describe("CoverImageField: khung trống, lỗi, disabled", () => {
  it("bấm khung trống mở khung Link ảnh và focus ô nhập", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness count={1} />);
    await user.click(emptySlots(container)[0] as HTMLElement);
    expect(document.activeElement).toBe(screen.getByLabelText("Link ảnh"));
  });

  it("khung đã mở sẵn: bấm khung trống khác đưa focus về ô Link ảnh và không đóng", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness count={1} />);
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    (document.activeElement as HTMLElement).blur();
    await user.click(emptySlots(container)[1] as HTMLElement);
    expect(screen.getByLabelText("Link ảnh")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Link ảnh"));
  });

  it("khung trống aria-hidden, không tabindex/role và không là điểm dừng Tab", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness count={1} />);
    for (const slot of emptySlots(container)) {
      expect(slot.getAttribute("aria-hidden")).toBe("true");
      expect(slot.hasAttribute("tabindex")).toBe(false);
      expect(slot.hasAttribute("role")).toBe(false);
    }
    const stops: Element[] = [];
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      if (document.activeElement !== null) stops.push(document.activeElement);
    }
    expect(stops.some((element) => element.hasAttribute("data-cover-empty"))).toBe(false);
  });

  it("error hiện role alert và nằm trong aria-describedby của radiogroup", () => {
    render(<Harness count={2} error="Tối đa 5 ảnh bìa." />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Tối đa 5 ảnh bìa.");
    expect((group() as HTMLElement).getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("disabled: nút không bấm được và khung trống không mở khung", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    const { container } = render(<Harness count={2} disabled onChangeSpy={onChangeSpy} />);
    await user.click(screen.getByRole("button", { name: "Xóa ảnh bìa 1" }));
    await user.click(screen.getByRole("button", { name: "Thêm ảnh bìa" }));
    await user.click(emptySlots(container)[0] as HTMLElement);
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Link ảnh")).toBeNull();
  });
});
