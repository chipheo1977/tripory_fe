"use client";

// Trạng thái của khối "Vị trí" trong một lần mở form: chế độ (tìm/thủ công) và địa điểm vừa chọn. Mở lại form (hoặc
// đổi sang form khác) thì về chế độ mặc định theo giá trị lúc mở (D-150); đang đóng thì giữ nguyên để nội dung không
// nhảy trong lúc hiệu ứng đóng chạy. Dùng mẫu "điều chỉnh state theo prop" của React, không effect.
import type { Place } from "@tripory/itinerary";
import { useCallback, useState } from "react";
import { initialLocationMode, type LocationMode } from "./location-mode";

type Session = Readonly<{ open: boolean; formKey: string; mode: LocationMode; picked: Place | null }>;

export type LocationSession = Readonly<{
  mode: LocationMode;
  picked: Place | null;
  setMode(mode: LocationMode): void;
  setPicked(place: Place | null): void;
}>;

const freshSession = (open: boolean, formKey: string, openedLocation: string): Session => ({
  open,
  formKey,
  mode: initialLocationMode(openedLocation),
  picked: null,
});

export function useLocationSession(open: boolean, formKey: string, openedLocation: string): LocationSession {
  const [session, setSession] = useState<Session>(() => freshSession(open, formKey, openedLocation));
  if (session.open !== open || session.formKey !== formKey) {
    setSession(open ? freshSession(open, formKey, openedLocation) : { ...session, open, formKey });
  }
  const setMode = useCallback((mode: LocationMode) => setSession((current) => ({ ...current, mode })), []);
  const setPicked = useCallback((picked: Place | null) => setSession((current) => ({ ...current, picked })), []);
  return { mode: session.mode, picked: session.picked, setMode, setPicked };
}
