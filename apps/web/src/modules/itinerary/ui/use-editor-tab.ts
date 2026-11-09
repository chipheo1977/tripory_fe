"use client";

// Tab đang chọn của editor: Tổng quan hoặc Ngày N (D-131). Chỉ giữ state; quy tắc đi kèm khi đổi tab (bỏ chọn điểm,
// canh khung) do nơi ghép quyết định.
import type { EditorTab } from "@tripory/itinerary";
import { useCallback, useState } from "react";

export function useEditorTab(initial: EditorTab): Readonly<{ tab: EditorTab; selectTab(tab: EditorTab): void }> {
  const [tab, setTab] = useState<EditorTab>(initial);
  const selectTab = useCallback((next: EditorTab) => setTab(next), []);
  return { tab, selectTab };
}
