# Phase 1: Design System, UI Skeleton & Walking Skeleton - Discussion Log

> **Chỉ dùng làm nhật ký kiểm tra.** Không đưa file này làm input cho agent planning, research hay execution.
> Các quyết định nằm trong CONTEXT.md; file này giữ lại những phương án đã được cân nhắc.

**Date:** 2026-10-10
**Phase:** 01-design-system-ui-skeleton-walking-skeleton
**Areas discussed:** Bottom Sheet + thư viện UI, Route và nội dung walking skeleton, Deploy Vercel, CI và kiểm chứng (bỏ qua)

---

## Bottom Sheet nhiều mức + thư viện UI

Người dùng hỏi Phase 1 dùng những thư viện UI nào. Câu trả lời lấy theo STACK.md và UI-SPEC: Base UI, cva/clsx/tailwind-merge, tw-animate-css, lucide-react, sonner, shadcn CLI; phần test gồm jsdom 29.1.1 và Testing Library. Base UI 1.8.0 đã có `./drawer` với snap point (đã kiểm npm và docs).

| Option | Description | Selected |
|--------|-------------|----------|
| Base UI Drawer | Bọc thành `Sheet`, không thêm dependency, có snap point | ✓ |
| Tự viết trên Dialog | Tự xử lý gesture, velocity, bàn phím ảo | |
| vaul | Không còn bảo trì, chạy trên Radix | |

Người dùng hỏi tiếp: repo đã dùng Radix chưa? Trả lời: chưa, không `package.json` nào khai báo và lockfile cũng không có. Hỏi thêm: dùng shadcn + Radix thì được gì? Trả lời: Radix có hệ sinh thái block/ví dụ rộng hơn và đã chạy production lâu hơn. Nhưng Radix không có Drawer (phải dùng vaul, không còn bảo trì), có ít primitive hơn, và UI-SPEC đã chốt `base-nova`. **Người dùng chọn: giữ Base UI.**

| Câu hỏi | Các phương án | Người dùng chọn |
|---------|---------------|-----------------|
| Chế độ không modal? | Cả hai / Chỉ modal | Cả hai (modal mặc định + `modal={false}`) |
| Vị trí sheet trên desktop | Chỉ bottom / Bottom + side | Bottom + side trái/phải ngay ở Phase 1 |
| Indent effect | Không / Có cho bottom modal mobile | Không |
| Vuốt nhanh | Nhảy theo tốc độ / Tuần tự | Nhảy theo tốc độ |
| Bàn phím ảo | VirtualKeyboardProvider / Adapter visualViewport / Hoãn | Hoãn sang Phase 4 |
| Độ rộng side sheet | Một size 400 / sm 400 + md 560 | `min(400px, 100vw - 48px)` |
| Pin Base UI | 1.9.0 nếu changelog ổn / 1.8.0 | 1.8.0 |

**Ghi chú:** Thêm `@testing-library/user-event`; người dùng không phản đối.

---

## Route và nội dung walking skeleton

| Câu hỏi | Các phương án | Người dùng chọn |
|---------|---------------|-----------------|
| Trang `/` | Landing ngắn có CTA / Tối giản / Chỉ EmptyState | Tối giản, không có CTA |
| Route của dashboard | `/itineraries/mine` / `/dashboard` / Chỉ layout | `/itineraries/mine` với EmptyState, không có link trong header |
| Lộ loading/error | File convention + test / Thêm trigger dev-only | File convention + test, không có trigger |
| Wordmark/favicon | Chữ + favicon T coral / Chữ + icon lucide / Giữ favicon Next | Chữ + favicon T coral, xóa asset mẫu |

---

## Deploy Vercel

| Câu hỏi | Các phương án | Người dùng chọn |
|---------|---------------|-----------------|
| Cách tạo project và deploy | Git integration / Vercel CLI / GitHub Actions + token | Vercel CLI |
| Build ở đâu | Trên Vercel / Prebuilt trên máy | Trên Vercel |
| Môi trường | Production công khai / Chỉ preview có bảo vệ | Production `.vercel.app` công khai |
| Chặn index | Chặn toàn site / Không chặn | Không chặn |

---

## CI và kiểm chứng

Câu hỏi đầu tiên: có thêm GitHub Actions không (khuyến nghị: có, không cần secret). Người dùng trả lời: "bỏ qua CI và kiểm chứng ở phase này". Cách hiểu đã ghi: không có CI, không bàn thêm. Kiểm chứng giữ ở mức tối thiểu bắt buộc theo success criteria (lệnh chạy trên máy, test component, smoke bằng tay); không có Playwright.

## Claude's Discretion

- Chi tiết cấu hình Vercel CLI cho monorepo, bản pnpm 10.x cụ thể và cách thay `allowBuilds`, cách thêm Vitest vào `apps/web`, có `QueryClientProvider` hay không, cấu trúc `components.json`.

## Deferred Ideas

- Bàn phím ảo trong Sheet → Phase 4
- GitHub Actions CI → chưa gắn phase
- Playwright → Phase 8
- robots/noindex/SEO → Phase 5
- Landing đầy đủ và CTA "Khám phá Tripory" → khi có đích thật
