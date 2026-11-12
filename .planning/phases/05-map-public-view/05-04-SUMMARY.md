---
phase: 05-map-public-view
plan: 04
subsystem: routing
tags: [route-groups, app-shell, tests, wave-1]
provides:
  - "Route công khai cũ (layout, trang chủ, login, register, error, loading) nằm dưới `app/(public)/(site)/`"
  - "Chỗ trống cho `(public)/(viewer)` toàn màn hình (plan 05-18)"
key-files:
  modified:
    - "apps/web/src/app/(public)/(site)/* (11 file đổi tên bằng git mv)"
    - apps/web/src/app/route-layouts.test.tsx
    - apps/web/src/proxy-coverage.test.ts
requirements-completed: [PUB-01, PUB-02]
completed: 2026-11-11
---
# Phase 5 Plan 04: Tách `(site)` khỏi `(public)` Summary

**Chỉ di chuyển file và cập nhật test; URL và hành vi không đổi.**

## Accomplishments
- 11 file chuyển bằng `git mv` (git ghi nhận rename). `error.tsx` và `loading.tsx` đi cùng `layout.tsx`. Thư mục `(public)` chỉ còn `(site)`.
- `route-layouts.test.tsx` import `./(public)/(site)/layout`, thêm test khóa: `(site)/layout.tsx` có `AppShell` và không còn `(public)/layout.tsx`.
- `proxy-coverage.test.ts` khẳng định danh sách trang công khai chứa `/`, `/login`, `/register` (kiểm vòng duyệt thư mục lồng nhau). Không đổi `proxy.ts`.

## Verification
Gate gốc: lint (0 lỗi, 1 cảnh báo cũ), typecheck, test (web 2166, tăng 1) xanh.

## Deviations
Typecheck lần đầu đỏ vì `apps/web/.next/dev/types/validator.ts` (artifact sinh ra bởi `next dev`, bị git bỏ qua) còn trỏ tới đường dẫn cũ `(public)/...`. Đã xóa thư mục `.next/dev/types` (tự sinh lại khi chạy `next dev`) rồi typecheck xanh. Không có thay đổi nào trong repo theo dõi bởi git.
