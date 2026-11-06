import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditorTab } from "./use-editor-tab";
import { useMapCamera } from "./use-map-camera";
import { useMapSelection } from "./use-map-selection";

describe("useEditorTab", () => {
  it("giá trị đầu đúng và selectTab đổi tab", () => {
    const { result } = renderHook(() => useEditorTab("overview"));
    expect(result.current.tab).toBe("overview");

    act(() => result.current.selectTab(2));

    expect(result.current.tab).toBe(2);
  });
});

describe("useMapSelection", () => {
  it("chọn, rê ngày và bỏ chọn", () => {
    const { result } = renderHook(() => useMapSelection());
    expect(result.current).toMatchObject({ selectedWaypointId: null, hoveredDay: null });

    act(() => result.current.select("w1"));
    act(() => result.current.hoverDay(3));
    expect(result.current).toMatchObject({ selectedWaypointId: "w1", hoveredDay: 3 });

    act(() => result.current.clear());
    expect(result.current).toMatchObject({ selectedWaypointId: null, hoveredDay: null });
  });

  it("hoverDay(null) bỏ nhấn mạnh nhưng giữ điểm đang chọn", () => {
    const { result } = renderHook(() => useMapSelection());
    act(() => result.current.select("w1"));
    act(() => result.current.hoverDay(2));

    act(() => result.current.hoverDay(null));

    expect(result.current).toMatchObject({ selectedWaypointId: "w1", hoveredDay: null });
  });
});

describe("useMapCamera", () => {
  const INITIAL = { kind: "point", center: [108.2, 16.0] } as const;

  it("lệnh đầu là fit với seq 1", () => {
    const { result } = renderHook(() => useMapCamera(INITIAL));

    expect(result.current.command).toEqual({ seq: 1, kind: "fit", target: INITIAL });
  });

  it("mỗi lệnh tăng seq đúng 1 và đổi kind", () => {
    const { result } = renderHook(() => useMapCamera(INITIAL));

    act(() => result.current.focus([108.3, 16.1]));
    expect(result.current.command).toEqual({ seq: 2, kind: "focus", center: [108.3, 16.1] });

    act(() => result.current.reveal([108.4, 16.2]));
    expect(result.current.command).toEqual({ seq: 3, kind: "reveal", center: [108.4, 16.2] });

    const target = { kind: "bounds", bounds: [[108, 15], [109, 16]] } as const;
    act(() => result.current.fit(target));
    expect(result.current.command).toEqual({ seq: 4, kind: "fit", target });
  });

  it("gọi focus hai lần cùng tọa độ vẫn ra hai seq khác nhau", () => {
    const { result } = renderHook(() => useMapCamera(INITIAL));

    act(() => result.current.focus([108.3, 16.1]));
    const first = result.current.command.seq;
    act(() => result.current.focus([108.3, 16.1]));

    expect(result.current.command.seq).toBe(first + 1);
  });
});
