"use client";

// Chọn thân của cột timeline theo tab: Tổng quan hay một ngày. Early return, không rẽ nhánh JSX.
import type { EditorTab } from "@tripory/itinerary";
import type { ReactNode } from "react";

export type EditorTimelineBodyProps = Readonly<{
  tab: EditorTab;
  overview: ReactNode;
  day: ReactNode;
}>;

export function EditorTimelineBody({ tab, overview, day }: EditorTimelineBodyProps) {
  if (tab === "overview") return overview;
  return day;
}
