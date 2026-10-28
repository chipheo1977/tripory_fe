"use client";

// Chặn điều hướng trong app (D-35, RESEARCH Pattern 14). Next 16.4 không có API chặn điều hướng toàn cục, nên
// `Link` truyền `onNavigate` cho guard và guard gọi `preventDefault()` khi cần hỏi lại. Context đặt ở `components`
// để `UserMenu` (dùng chung header lẫn editor) đọc được mà không biết gì về itinerary; mặc định là no-op nên
// ngoài editor hành vi điều hướng không đổi.
import { createContext, createElement, useContext, type ReactNode } from "react";

export type NavigationGuard = Readonly<{
  onNavigate(event: { preventDefault(): void }, href: string): void;
}>;

const noopGuard: NavigationGuard = { onNavigate: () => undefined };

const NavigationGuardContext = createContext<NavigationGuard>(noopGuard);

export function NavigationGuardProvider({ value, children }: { value: NavigationGuard; children: ReactNode }) {
  return createElement(NavigationGuardContext.Provider, { value }, children);
}

export function useNavigationGuard(): NavigationGuard {
  return useContext(NavigationGuardContext);
}
