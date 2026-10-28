// Spike A7 (04-RESEARCH.md §Pattern 12): dnd-kit 6.3.1 có chạy ổn dưới React 19 `<StrictMode>` không?
// Không có component sản phẩm: chỉ dựng một danh sách sắp xếp tối thiểu giống cách editor sẽ dùng
// (`useSortable` + tay cầm riêng + `KeyboardSensor`) và sắp lại bằng bàn phím trong jsdom.
//
// jsdom không có layout nên `getBoundingClientRect` trả toàn số 0 và `sortableKeyboardCoordinates` không
// biết ô nào nằm dưới ô nào. Mock rect của `li` theo vị trí trong DOM (mỗi ô cao 40, cách nhau 50).
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ITEM_HEIGHT = 40;
const ITEM_STRIDE = 50;

function Item({ id }: Readonly<{ id: string }>) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      data-testid={`item-${id}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
    >
      <span>{id}</span>
      <button ref={setActivatorNodeRef} type="button" aria-label={`Kéo để sắp xếp ${id}`} {...attributes} {...listeners} />
    </li>
  );
}

function SortableList({ initial }: Readonly<{ initial: readonly string[] }>) {
  const [ids, setIds] = useState<readonly string[]>(initial);
  const sensors = useSensors(useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setIds((current) => {
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      return from < 0 || to < 0 ? current : arrayMove([...current], from, to);
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        <ol>
          {ids.map((id) => (
            <Item key={id} id={id} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

/** Thứ tự các mục đang hiển thị, đọc từ DOM. */
const order = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("dnd-kit 6.3.1 trong StrictMode (spike A7)", () => {
  const original = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.tagName !== "LI") return original.call(this);
      const index = this.parentElement ? Array.from(this.parentElement.children).indexOf(this) : 0;
      const top = index * ITEM_STRIDE;
      return {
        x: 0,
        y: top,
        top,
        bottom: top + ITEM_HEIGHT,
        left: 0,
        right: 200,
        width: 200,
        height: ITEM_HEIGHT,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sắp lại bằng bàn phím: Space, ArrowDown, Space đổi A lên sau B", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <SortableList initial={["A", "B", "C"]} />
      </StrictMode>,
    );
    expect(order()).toEqual(["A", "B", "C"]);

    const handle = screen.getByRole("button", { name: "Kéo để sắp xếp A" });
    handle.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");

    await waitFor(() => expect(order()).toEqual(["B", "A", "C"]));
  });

  it("Escape giữa chừng hủy kéo: thứ tự không đổi", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <SortableList initial={["A", "B", "C"]} />
      </StrictMode>,
    );

    const handle = screen.getByRole("button", { name: "Kéo để sắp xếp A" });
    handle.focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");

    // Chờ một nhịp để chắc chắn không có onDragEnd muộn nào đổi thứ tự.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order()).toEqual(["A", "B", "C"]);
  });
});
