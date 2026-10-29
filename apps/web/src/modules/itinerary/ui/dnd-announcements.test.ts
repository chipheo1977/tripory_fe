import { describe, expect, it } from "vitest";
import { VI_DRAG_INSTRUCTIONS, viAnnouncements } from "./dnd-announcements";

const NAMES: Record<string, string> = { a: "Chợ", b: "Dinh", c: "Bến" };
const make = () =>
  viAnnouncements(
    () => ["a", "b", "c"],
    (id) => NAMES[id] ?? id,
  );

// Các callback nhận cả `activatorEvent`, `collisions`... mà thông báo không dùng; ép kiểu gọn cho test.
const event = (activeId: string, overId?: string | null) =>
  ({ active: { id: activeId }, over: overId === undefined || overId === null ? null : { id: overId } }) as never;

describe("viAnnouncements", () => {
  it("báo nhấc điểm với vị trí hiện tại", () => {
    expect(make().onDragStart?.({ active: { id: "b" } } as never)).toBe("Đã nhấc Dinh, đang ở vị trí 2 trên 3.");
  });

  it("báo vị trí khi di chuyển qua một thẻ", () => {
    expect(make().onDragOver?.(event("b", "c"))).toBe("Dinh đang ở vị trí 3 trên 3.");
  });

  it("báo vị trí khi thả", () => {
    expect(make().onDragEnd?.(event("b", "a"))).toBe("Đã thả Dinh ở vị trí 1 trên 3.");
  });

  it("báo hủy và trả về vị trí cũ", () => {
    expect(make().onDragCancel?.(event("b"))).toBe("Đã hủy. Dinh trở lại vị trí 2 trên 3.");
  });

  it("không đọc gì khi không ở trên thẻ nào", () => {
    expect(make().onDragOver?.(event("b", null))).toBeUndefined();
    expect(make().onDragEnd?.(event("b", null))).toBeUndefined();
  });

  it("đọc danh sách mới nhất mỗi lần gọi", () => {
    let ids = ["a", "b", "c"];
    const announcements = viAnnouncements(
      () => ids,
      (id) => NAMES[id] ?? id,
    );
    ids = ["b", "a", "c"];
    expect(announcements.onDragStart?.({ active: { id: "b" } } as never)).toBe("Đã nhấc Dinh, đang ở vị trí 1 trên 3.");
  });
});

describe("VI_DRAG_INSTRUCTIONS", () => {
  it("giữ nguyên văn hướng dẫn bàn phím", () => {
    expect(VI_DRAG_INSTRUCTIONS).toBe(
      "Nhấn Space để nhấc điểm đến. Dùng phím mũi tên lên, xuống để di chuyển, nhấn Space để thả hoặc Esc để hủy.",
    );
  });
});
