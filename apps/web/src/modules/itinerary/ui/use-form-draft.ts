"use client";

// Lưu giá trị form vào `draftStorage` khi phiên HẾT HẠN thật (D-36). Chỉ sự kiện `expired` (route refresh trả 401),
// không phải đăng xuất chủ động: đăng xuất là ý định của người dùng, không cần cứu nội dung.
// Khóa có `viewerId` nên tài khoản khác cùng tab không đọc được bản nháp này (Pitfall 4).
import { useEffect, useRef } from "react";
import { sessionEvents } from "@/composition/session-events.client";
import { draftStorage } from "./draft-storage";

export function useFormDraft(input: { key: string; getValues: () => unknown; enabled: boolean }): void {
  const { key, enabled } = input;
  // Đọc `getValues` qua ref để đăng ký listener đúng một lần cho mỗi (key, enabled), không gắn/gỡ lại mỗi lần render.
  const getValuesRef = useRef(input.getValues);
  useEffect(() => {
    getValuesRef.current = input.getValues;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    return sessionEvents.on("expired", () => {
      draftStorage.save(key, getValuesRef.current());
    });
  }, [key, enabled]);
}
