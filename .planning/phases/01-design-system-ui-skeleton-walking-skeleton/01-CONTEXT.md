# Phase 1: Design System, UI Skeleton & Walking Skeleton - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao bốn thứ:

1. Toolchain không chặn các phase sau: pnpm 10 và preset `uiPackage()` trong `boundaries.mjs`, có self-test.
2. Bộ design token mới trong `packages/design-tokens` và các atom/molecule trong `packages/ui-web`, mỗi component có test.
3. Các organism dùng chung AppShell, AppHeader và UserMenu (slot tĩnh) cho `(public)`/`(dashboard)`, kèm trạng thái loading/empty/error/404.
4. Bản deploy production đầu tiên trên Vercel.

Nằm ngoài phase: session thật, gọi BE, dữ liệu nghiệp vụ, toast cho thao tác ghi (FND-05 thuộc Phase 2), dark mode runtime, showcase.

Hợp đồng hình ảnh và tương tác đã được duyệt trong `01-UI-SPEC.md`. File này chỉ ghi các quyết định bổ sung hoặc điều chỉnh so với UI-SPEC.

</domain>

<decisions>
## Implementation Decisions

### Thư viện UI
- **D-01:** Giữ shadcn trên **Base UI** (`base-nova`), **không dùng Radix** dưới bất kỳ dạng nào (`radix-ui`, `@radix-ui/*`) và **không dùng `vaul`**. Người dùng đã cân nhắc shadcn + Radix và chọn giữ Base UI.
- **D-02:** Pin `@base-ui/react` **1.8.0**, đúng bản research đã kiểm. Không lên 1.9.0, bản vừa ra ngày 09/10.
- **D-03:** Dependency runtime của `ui-web` theo `research/STACK.md`: `@base-ui/react` 1.8.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0, `lucide-react` 1.54.0, `sonner` 2.0.8. shadcn CLI 4.21.4 chạy qua `pnpm dlx`, không phải dependency. Mọi version vào `catalog:`, pin cứng.
- **D-04:** Dependency test: `jsdom` 29.1.1 (không dùng 30.x vì máy local chạy Node 24.14.1), `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, và **thêm `@testing-library/user-event`** cho ma trận test bàn phím. Researcher chốt version tương thích React 19.3 và Testing Library 16.

### Sheet (molecule)
- **D-05:** `Sheet` bọc `Drawer` của Base UI (`@base-ui/react/drawer`), không tự viết gesture. Snap point dùng `snapPoints` của Drawer, ánh xạ sang ba token `--sheet-snap-peek` / `--sheet-snap-medium` / `--sheet-snap-expanded` của UI-SPEC.
- **D-06:** Có hai chế độ. **Modal** là mặc định: bẫy focus, khóa scroll, có scrim, Esc đóng. Tùy chọn **không modal** (`modal={false}`): không scrim, nội dung phía sau vẫn thao tác được, bấm ra ngoài không đóng. Phase 4 dùng chế độ này cho timeline nằm trên bản đồ. Cả hai chế độ đều có test.
- **D-07:** Phase 1 làm **ba vị trí: bottom (nhiều mức snap), phải, trái**, mỗi vị trí có test (focus trap, Esc, nút đóng, trả focus). Side sheet không có snap point và vuốt theo hướng của cạnh để đóng. Điều này mở rộng UI-SPEC, vốn chỉ ghi side là tùy chọn.
- **D-08:** Side sheet rộng `min(400px, 100vw - 48px)`, lưu ở component token `--sheet-side-width`, khai báo trong lớp component token của `design-tokens`.
- **D-09:** **Không dùng indent effect** (`Drawer.Provider`/`Drawer.Indent`). Khi modal chỉ có scrim `--color-overlay`.
- **D-10:** Vuốt nhanh được nhảy qua mức giữa (mặc định của Base UI, **không** bật `snapToSequentialPoints`).
- **D-11:** **Phase 1 chưa xử lý bàn phím ảo trong sheet.** Không dùng `Drawer.VirtualKeyboardProvider` và không viết adapter `visualViewport`. Dòng "action cuối không bị bàn phím che" trong mục Sheet Snap Points của UI-SPEC **được nghiệm thu ở Phase 4**, không tính vào tiêu chí của Phase 1.
- **D-12:** Vẫn giữ các nút cho người dùng bàn phím mà UI-SPEC yêu cầu: "Mở rộng bảng", "Thu gọn bảng", "Đóng bảng", cùng drag handle có vùng chạm 44px.

### Route và nội dung walking skeleton
- **D-13:** Trang `/` (public) **tối giản**: wordmark, một câu giá trị ("Lập và chia sẻ lịch trình du lịch") và dòng "Đang trong giai đoạn thử nghiệm". **Không có CTA.** Copy "Khám phá Tripory" trong UI-SPEC chưa dùng ở Phase 1.
- **D-14:** Route đầu tiên của `(dashboard)` là **`/itineraries/mine`**, cũng là route danh sách lịch trình mà Phase 4 sẽ dùng. Phase 1 hiển thị `EmptyState` với copy trung tính của UI-SPEC ("Chưa có nội dung" / "Nội dung sẽ xuất hiện tại đây khi sẵn sàng."). Trang không có CTA, **không có link trong AppHeader**, chỉ truy cập bằng URL trực tiếp để smoke. Phase 3 thêm auth gate, Phase 4 thay nội dung.
- **D-15:** Loading/error/404 chỉ dùng **file convention thật của Next**. Mỗi route group có `loading.tsx` (Skeleton theo layout kèm `role="status"` "Đang tải nội dung…"), `error.tsx` (`ErrorState`, "Thử lại" gọi `reset`) và `not-found.tsx`; thêm `global-error.tsx` ở gốc. Test render từng file và kiểm "Thử lại" gọi `reset` đúng một lần. **Không có trigger debug** (query param, route dev-only) trong bất kỳ bản build nào.
- **D-16:** Wordmark là chữ "Tripory", Inter semibold 20px, màu `--color-text`. Favicon là `apps/web/src/app/icon.svg`: chữ "T" trắng trên nền vuông coral `#C44728` bo 8px. **Xóa** `favicon.ico` mặc định và các SVG mẫu trong `apps/web/public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- **D-17:** `<html lang="vi">`, title "Tripory", meta description lấy đúng câu giá trị của D-13.

### Deploy Vercel
- **D-18:** Deploy bằng **Vercel CLI**, không dùng Git integration và không dùng GitHub Actions. Người dùng tự chạy `vercel login` và `vercel link` trên máy. Plan phải có một **checkpoint dừng chờ người dùng** trước bước deploy. Agent chạy lệnh deploy sau khi project đã được link. Thêm `.vercel/` vào `.gitignore`. Không có token Vercel nào nằm trong repo.
- **D-19:** **Build trên Vercel** (`vercel deploy`, không dùng `--prebuilt`) để chứng minh pnpm 10 và Node 24 chạy được trên môi trường build Linux thật.
- **D-20:** Deploy **production** (`vercel deploy --prod`) lên domain `<project>.vercel.app` cố định, **công khai**. Các lần deploy thử dùng preview và giữ Deployment Protection mặc định. Root Directory `apps/web`, Node 24.x.
- **D-21:** **Không chặn index** ở Phase 1: không thêm `robots.ts` hay `noindex` toàn site. SEO và `noindex` cho bản nháp do Phase 5 lo.

### CI và kiểm chứng
- **D-22:** Phase 1 **không có CI**: không tạo `.github/workflows`. Người dùng không muốn bàn sâu vùng này.
- **D-23:** Kiểm chứng giữ ở mức tối thiểu bắt buộc theo roadmap và UI-SPEC, không thêm gì. Gồm: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` chạy xanh trên máy; test component theo ma trận của UI-SPEC; smoke bằng tay ở bốn viewport (320×568, 390×844, 768×1024, 1440×900) trên URL Vercel. **Không có Playwright** ở Phase 1 (để Phase 8).

### Claude's Discretion
- Cấu hình chính xác cho Vercel CLI với monorepo: chạy `vercel link` ở gốc repo hay trong `apps/web`, Root Directory đặt trong settings hay trong `vercel.json`, cách khai báo Node 24 (`engines` hay settings). Researcher xác nhận theo docs Vercel hiện hành.
- Bản pnpm 10.x cụ thể và cách thay khối `allowBuilds` (key của pnpm 11) trong `pnpm-workspace.yaml` bằng cấu hình tương đương của pnpm 10 (`onlyBuiltDependencies`/`ignoredBuiltDependencies`).
- Cách thêm Vitest và jsdom vào `apps/web` để test AppHeader, AppShell, UserMenu và các file convention (D-15). App hiện chưa có script `test`.
- Có mount `QueryClientProvider` ngay ở Phase 1 hay không. Mặc định là không, vì Phase 1 không fetch; Phase 2/3 thêm khi cần.
- Cấu trúc `components.json` cho hai workspace (`apps/web`, `packages/ui-web`) theo shadcn monorepo, cùng `style`/`iconLibrary`/`baseColor`.

</decisions>

<canonical_refs>
## Canonical References

**Agent ở bước sau BẮT BUỘC đọc các tài liệu này trước khi plan hoặc triển khai.**

### Hợp đồng và phạm vi của phase
- `.planning/phases/01-design-system-ui-skeleton-walking-skeleton/01-UI-SPEC.md` — hợp đồng hình ảnh và tương tác đã duyệt: token, inventory, Sheet snap, AppShell/AppHeader, copy, ma trận test. Riêng D-07, D-08, D-11, D-13 của file này điều chỉnh UI-SPEC.
- `.planning/ROADMAP.md` §Phase 1 — goal, 5 success criteria, thứ tự chia plan (toolchain → tokens → atoms/molecules → organisms + AppShell → deploy).
- `.planning/REQUIREMENTS.md` — FND-01..04, FND-06, FND-07, DS-01..07. FND-05 thuộc Phase 2.
- `.planning/PROJECT.md` §Key Decisions — pnpm 10, `uiPackage()`, atomic design, token mới, không showcase.

### Kiến trúc và ranh giới
- `ai-memories/tripory-fe--ddd-architecture.md` — mục 4 (folder), 5 (luật import), 8 (cưỡng chế, cách thêm package), 9 (bẫy: named export qua ranh giới server/client, `allowBuilds` của pnpm 11).
- `packages/config/eslint/boundaries.mjs` — nơi thêm preset `uiPackage()`.
- `packages/config/test/boundaries.test.ts` — self-test phải mở rộng cho `ui-web` và `design-tokens`.
- `AGENTS.md`, `apps/web/AGENTS.md` — quy trình và yêu cầu đọc docs Next đúng phiên bản.
- `apps/web/node_modules/next/dist/docs/` — docs Next 16.4 (file convention `loading`/`error`/`not-found`/`global-error`, `icon.svg`, metadata, `next/font`). Docs này có thể trống: chạy `pnpm install --force` theo blocker trong STATE.md.

### Stack và rủi ro
- `.planning/research/STACK.md` — version thư viện, shadcn monorepo, jsdom 29.1.1, allowlist `uiPackage()` dự kiến.
- `.planning/research/SUMMARY.md` §Phase 0a — rủi ro pnpm/Vercel, Node 24, `@source` của Tailwind.
- `.planning/research/PITFALLS.md` — các pitfall P13, P15 được nhắc cho 0a.

### Thư viện bên ngoài
- https://base-ui.com/react/components/drawer — API của Drawer: `snapPoints`, `modal`, `swipeDirection`, biến CSS `--drawer-snap-point-offset`, `--drawer-swipe-movement-y`.
- https://ui.shadcn.com/docs/components/drawer — Drawer của shadcn bản Base UI (tham khảo khi sinh source).
- https://ui.shadcn.com/docs/monorepo — `components.json` cho monorepo.

### Tài liệu cũ đã bị thay một phần
- `.agents/tasks/tripory-fe-quick-proposal.md` §5 Phase 0a — **đã bị thay**: không port `lib/colors.ts` (token mới) và không tạo trang placeholder cho mọi route của FE cũ (chỉ có `/` và `/itineraries/mine`). Phần còn dùng được là bảng hiện trạng và API BE.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/config` — preset ESLint (`contextPackage`, `kernelPackage`, `httpPackage`, `app`), `tsconfig/library.json`, `vitest/preset.mjs` (environment `node`), self-test 58 test. `ui-web` và `design-tokens` mới tạo phải nối preset `uiPackage()` mới cho tầng này.
- `turbo.json` — task `build`/`lint`/`typecheck`/`test` nối với nhau qua `transit`; package mới chỉ cần có script cùng tên.
- `pnpm-workspace.yaml` — đã có `catalog:` cho next 16.4.0, react 19.3.0, tailwindcss 4.3.3, `@tailwindcss/turbopack`, vitest 4.1.11, typescript 5.9.3.

### Established Patterns
- Package export thẳng TypeScript qua `exports`, không có bước build; Turbopack tự transpile. Cấm import sâu `@tripory/*/src/**`.
- Mọi version khai báo trong `catalog:`, pin cứng.
- Quy tắc ESLint để mức `error`. Import bị chặn nghĩa là đặt sai tầng; chỉ nới allowlist khi có quyết định kiến trúc và kèm self-test.

### Integration Points và hiện trạng cần thay
- Root `package.json`: `packageManager: pnpm@11.6.0` cần đổi sang pnpm 10.
- `pnpm-workspace.yaml`: khối `allowBuilds` (`unrs-resolver: false`) là key của pnpm 11, cần chuyển sang cấu hình tương đương của pnpm 10.
- `apps/web/src/app/layout.tsx`, `page.tsx`, `globals.css`: scaffold create-next-app (font Geist, media query dark, palette hard-code), thay theo UI-SPEC. `globals.css` thành nơi ghép: import tailwind, CSS của `@tripory/design-tokens`, `@source` trỏ tới `packages/ui-web/src`.
- `apps/web/src/app/favicon.ico` và `apps/web/public/*.svg`: xóa (D-16).
- `apps/web/package.json`: chưa có Vitest hay script `test`; cần thêm để test organism và file convention.
- Chưa có `packages/ui-web`, `packages/design-tokens`, `components.json`, `.github/`, `.vercel/`.
- Git: remote `github.com/chipheo1977/tripory_fe`, nhánh hiện tại `develop`.

</code_context>

<specifics>
## Specific Ideas

- Người dùng muốn bộ thư viện UI gọn và thống nhất: một nền primitive (Base UI) cho mọi thứ, kể cả Sheet, không trộn Radix hay `vaul`.
- Trang chủ Phase 1 chỉ là "có mặt", không quảng bá: không CTA, không hứa hẹn.
- Sheet không modal là để chuẩn bị cho editor mobile ở Phase 4, nơi timeline nằm trên bản đồ SVG kiểu Google Maps.

</specifics>

<deferred>
## Deferred Ideas

- Xử lý bàn phím ảo trong Sheet (`Drawer.VirtualKeyboardProvider` hoặc adapter `visualViewport`) → Phase 4, khi sheet có form waypoint.
- CI bằng GitHub Actions (lint/typecheck/test/build trên Linux) → chưa gắn phase; cân nhắc trước Phase 8.
- Playwright smoke → Phase 8 (DEPL-03).
- `robots`/`noindex` và chiến lược SEO → Phase 5.
- Landing page có nội dung giới thiệu đầy đủ hơn và dùng CTA "Khám phá Tripory" → khi có đích thật để CTA trỏ tới.

### Reviewed Todos (not folded)
Không có todo nào khớp với Phase 1.

</deferred>

---

*Phase: 01-design-system-ui-skeleton-walking-skeleton*
*Context gathered: 2026-10-10*
