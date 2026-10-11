# Phase 1: Design System, UI Skeleton & Walking Skeleton - Research

**Researched:** 2026-10-11
**Domain:** Toolchain monorepo (pnpm 10, Turborepo, ESLint boundaries) · Tailwind 4.3 design tokens · component library trên Base UI 1.8 · Next.js 16.4 App Router file conventions · Vitest + jsdom · deploy Vercel CLI
**Confidence:** HIGH cho version, API Base UI/Next/pnpm/Vercel (tra registry + docs chính chủ ngày 2026-10-11); MEDIUM cho phần cấu hình Tailwind compile test, jsdom stub và luồng Vercel CLI cho monorepo

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Thư viện UI
- **D-01:** Giữ shadcn trên **Base UI** (`base-nova`), **không dùng Radix** dưới bất kỳ dạng nào (`radix-ui`, `@radix-ui/*`) và **không dùng `vaul`**. Người dùng đã cân nhắc shadcn + Radix và chọn giữ Base UI.
- **D-02:** Pin `@base-ui/react` **1.8.0**, đúng bản research đã kiểm. Không lên 1.9.0, bản vừa ra ngày 09/10.
- **D-03:** Dependency runtime của `ui-web` theo `research/STACK.md`: `@base-ui/react` 1.8.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0, `lucide-react` 1.54.0, `sonner` 2.0.8. shadcn CLI 4.21.4 chạy qua `pnpm dlx`, không phải dependency. Mọi version vào `catalog:`, pin cứng.
- **D-04:** Dependency test: `jsdom` 29.1.1 (không dùng 30.x vì máy local chạy Node 24.14.1), `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, và **thêm `@testing-library/user-event`** cho ma trận test bàn phím. Researcher chốt version tương thích React 19.3 và Testing Library 16.

#### Sheet (molecule)
- **D-05:** `Sheet` bọc `Drawer` của Base UI (`@base-ui/react/drawer`), không tự viết gesture. Snap point dùng `snapPoints` của Drawer, ánh xạ sang ba token `--sheet-snap-peek` / `--sheet-snap-medium` / `--sheet-snap-expanded` của UI-SPEC.
- **D-06:** Có hai chế độ. **Modal** là mặc định: bẫy focus, khóa scroll, có scrim, Esc đóng. Tùy chọn **không modal** (`modal={false}`): không scrim, nội dung phía sau vẫn thao tác được, bấm ra ngoài không đóng. Phase 4 dùng chế độ này cho timeline nằm trên bản đồ. Cả hai chế độ đều có test.
- **D-07:** Phase 1 làm **ba vị trí: bottom (nhiều mức snap), phải, trái**, mỗi vị trí có test (focus trap, Esc, nút đóng, trả focus). Side sheet không có snap point và vuốt theo hướng của cạnh để đóng. Điều này mở rộng UI-SPEC, vốn chỉ ghi side là tùy chọn.
- **D-08:** Side sheet rộng `min(400px, 100vw - 48px)`, lưu ở component token `--sheet-side-width`, khai báo trong lớp component token của `design-tokens`.
- **D-09:** **Không dùng indent effect** (`Drawer.Provider`/`Drawer.Indent`). Khi modal chỉ có scrim `--color-overlay`.
- **D-10:** Vuốt nhanh được nhảy qua mức giữa (mặc định của Base UI, **không** bật `snapToSequentialPoints`).
- **D-11:** **Phase 1 chưa xử lý bàn phím ảo trong sheet.** Không dùng `Drawer.VirtualKeyboardProvider` và không viết adapter `visualViewport`. Dòng "action cuối không bị bàn phím che" trong mục Sheet Snap Points của UI-SPEC **được nghiệm thu ở Phase 4**, không tính vào tiêu chí của Phase 1.
- **D-12:** Vẫn giữ các nút cho người dùng bàn phím mà UI-SPEC yêu cầu: "Mở rộng bảng", "Thu gọn bảng", "Đóng bảng", cùng drag handle có vùng chạm 44px.

#### Route và nội dung walking skeleton
- **D-13:** Trang `/` (public) **tối giản**: wordmark, một câu giá trị ("Lập và chia sẻ lịch trình du lịch") và dòng "Đang trong giai đoạn thử nghiệm". **Không có CTA.** Copy "Khám phá Tripory" trong UI-SPEC chưa dùng ở Phase 1.
- **D-14:** Route đầu tiên của `(dashboard)` là **`/itineraries/mine`**, cũng là route danh sách lịch trình mà Phase 4 sẽ dùng. Phase 1 hiển thị `EmptyState` với copy trung tính của UI-SPEC ("Chưa có nội dung" / "Nội dung sẽ xuất hiện tại đây khi sẵn sàng."). Trang không có CTA, **không có link trong AppHeader**, chỉ truy cập bằng URL trực tiếp để smoke. Phase 3 thêm auth gate, Phase 4 thay nội dung.
- **D-15:** Loading/error/404 chỉ dùng **file convention thật của Next**. Mỗi route group có `loading.tsx` (Skeleton theo layout kèm `role="status"` "Đang tải nội dung…"), `error.tsx` (`ErrorState`, "Thử lại" gọi `reset`) và `not-found.tsx`; thêm `global-error.tsx` ở gốc. Test render từng file và kiểm "Thử lại" gọi `reset` đúng một lần. **Không có trigger debug** (query param, route dev-only) trong bất kỳ bản build nào.
- **D-16:** Wordmark là chữ "Tripory", Inter semibold 20px, màu `--color-text`. Favicon là `apps/web/src/app/icon.svg`: chữ "T" trắng trên nền vuông coral `#C44728` bo 8px. **Xóa** `favicon.ico` mặc định và các SVG mẫu trong `apps/web/public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- **D-17:** `<html lang="vi">`, title "Tripory", meta description lấy đúng câu giá trị của D-13.

#### Deploy Vercel
- **D-18:** Deploy bằng **Vercel CLI**, không dùng Git integration và không dùng GitHub Actions. Người dùng tự chạy `vercel login` và `vercel link` trên máy. Plan phải có một **checkpoint dừng chờ người dùng** trước bước deploy. Agent chạy lệnh deploy sau khi project đã được link. Thêm `.vercel/` vào `.gitignore`. Không có token Vercel nào nằm trong repo.
- **D-19:** **Build trên Vercel** (`vercel deploy`, không dùng `--prebuilt`) để chứng minh pnpm 10 và Node 24 chạy được trên môi trường build Linux thật.
- **D-20:** Deploy **production** (`vercel deploy --prod`) lên domain `<project>.vercel.app` cố định, **công khai**. Các lần deploy thử dùng preview và giữ Deployment Protection mặc định. Root Directory `apps/web`, Node 24.x.
- **D-21:** **Không chặn index** ở Phase 1: không thêm `robots.ts` hay `noindex` toàn site. SEO và `noindex` cho bản nháp do Phase 5 lo.

#### CI và kiểm chứng
- **D-22:** Phase 1 **không có CI**: không tạo `.github/workflows`. Người dùng không muốn bàn sâu vùng này.
- **D-23:** Kiểm chứng giữ ở mức tối thiểu bắt buộc theo roadmap và UI-SPEC, không thêm gì. Gồm: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` chạy xanh trên máy; test component theo ma trận của UI-SPEC; smoke bằng tay ở bốn viewport (320×568, 390×844, 768×1024, 1440×900) trên URL Vercel. **Không có Playwright** ở Phase 1 (để Phase 8).

### Claude's Discretion
- Cấu hình chính xác cho Vercel CLI với monorepo: chạy `vercel link` ở gốc repo hay trong `apps/web`, Root Directory đặt trong settings hay trong `vercel.json`, cách khai báo Node 24 (`engines` hay settings). Researcher xác nhận theo docs Vercel hiện hành.
- Bản pnpm 10.x cụ thể và cách thay khối `allowBuilds` (key của pnpm 11) trong `pnpm-workspace.yaml` bằng cấu hình tương đương của pnpm 10 (`onlyBuiltDependencies`/`ignoredBuiltDependencies`).
- Cách thêm Vitest và jsdom vào `apps/web` để test AppHeader, AppShell, UserMenu và các file convention (D-15). App hiện chưa có script `test`.
- Có mount `QueryClientProvider` ngay ở Phase 1 hay không. Mặc định là không, vì Phase 1 không fetch; Phase 2/3 thêm khi cần.
- Cấu trúc `components.json` cho hai workspace (`apps/web`, `packages/ui-web`) theo shadcn monorepo, cùng `style`/`iconLibrary`/`baseColor`.

### Deferred Ideas (OUT OF SCOPE)
- Xử lý bàn phím ảo trong Sheet (`Drawer.VirtualKeyboardProvider` hoặc adapter `visualViewport`) → Phase 4, khi sheet có form waypoint.
- CI bằng GitHub Actions (lint/typecheck/test/build trên Linux) → chưa gắn phase; cân nhắc trước Phase 8.
- Playwright smoke → Phase 8 (DEPL-03).
- `robots`/`noindex` và chiến lược SEO → Phase 5.
- Landing page có nội dung giới thiệu đầy đủ hơn và dùng CTA "Khám phá Tripory" → khi có đích thật để CTA trỏ tới.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Build/cài đặt bằng pnpm 10; `lint`/`typecheck`/`test`/`build` xanh | §Toolchain: pnpm **10.34.6**, giữ nguyên khối `allowBuilds` (pnpm ≥10.26 hiểu key này); cài lại sạch vì `node_modules` hiện hỏng; thêm `transit` cho `build` trong `turbo.json` |
| FND-02 | Preset `uiPackage()` cho `ui-web` + `design-tokens`, self-test, cập nhật tài liệu kiến trúc | §Pattern 1: thiết kế preset (allowlist, tầng atoms→molecules, cho DOM global, test allowlist), danh sách ca bad/ok mới cho `boundaries.test.ts` |
| FND-03 | Responsive mobile-first (`dvh`, safe-area, ≥44px), header, layout `(public)`/`(dashboard)`, nav chỉ route thật | §Pattern 5: cây route, AppShell/AppHeader, skip link; §Pitfall 7 (`app/page.tsx` trùng `/`) |
| FND-04 | Loading/empty/error kèm "Thử lại"; route sai → 404 | §Pattern 6: `loading.tsx`/`error.tsx`/`not-found.tsx`/`global-error.tsx` của Next 16.4; root `app/not-found.tsx` là nơi DUY NHẤT bắt URL sai; `retry` vs `reset` (Open Question 1) |
| FND-06 | Dialog/form dùng được bằng bàn phím | §Standard Stack: Base UI Dialog/Drawer/Field; §Validation: ma trận test user-event |
| FND-07 | Walking skeleton trên Vercel (Root Directory `apps/web`, Node 24) | §Pattern 7: `vercel link` ở gốc repo, Root Directory trong dashboard, `engines.node: "24.x"`, smoke trên domain production (không phải URL deployment) |
| DS-01 | Token mới: semantic color, typography, spacing, radius, shadow, z-index, motion, breakpoint; `@theme` + CSS vars; dark slot | §Pattern 2: file layout, `@theme inline` với tên nội bộ `--semantic-*`, reset namespace mặc định của Tailwind |
| DS-02 | Quy ước atomic design, cưỡng chế bằng thư mục | §Pattern 1 (layer rule atoms ↛ molecules) + cập nhật mục 4/5/8 của tài liệu kiến trúc |
| DS-03 | 13 atoms | §Standard Stack: primitive Base UI cho từng atom |
| DS-04 | 12 molecules gồm Sheet nhiều mức, ErrorState | §Pattern 4 (Sheet trên `Drawer`), primitive Base UI cho Select/Tabs/Menu/Tooltip/Dialog, sonner cho Toast |
| DS-05 | AppHeader, UserMenu (slot tĩnh), AppShell | §Pattern 5 |
| DS-06 | Chỉ dùng token; named export cho phần con | §Pattern 2 (namespace reset) + §Pattern 3 (guard test quét class) + named export |
| DS-07 | Test mỗi base component; không showcase | §Validation Architecture: Vitest 4.1.11 + jsdom 29.1.1 + RTL 16.3.3 + user-event 14.6.7, file setup bắt buộc |
</phase_requirements>

## Summary

Phase 1 là phase "nền": phần lớn rủi ro nằm ở toolchain và ở chỗ ghép các thư viện, không ở logic. Có bốn phát hiện thay đổi cách plan:

1. **`node_modules` trên máy đang hỏng, không riêng docs Next.** `apps/web/node_modules/next/dist` chỉ có 459/8.688 file của tarball, `@tailwindcss/turbopack` có 0/7 file, không package nào có `node_modules/.bin`, và `pnpm build` trong `apps/web` hiện báo `'next' is not recognized`. Task đầu tiên của phase phải là cài lại sạch bằng pnpm 10 rồi xác nhận `apps/web/node_modules/next/dist/docs` có file. [VERIFIED: đếm file + chạy `pnpm build` ngày 2026-10-11]
2. **pnpm 10 hiểu `allowBuilds`.** Key này được thêm ở pnpm **v10.26.0** và thay thế `onlyBuiltDependencies`/`ignoredBuiltDependencies` (cả hai đã deprecated). Chọn pnpm **10.34.6** (bản 10.x mới nhất, 2026-09-28) thì giữ nguyên khối `allowBuilds: { unrs-resolver: false }`. Giả định trong CONTEXT ("`allowBuilds` là key của pnpm 11, phải đổi") không đúng với 10.34.6. [VERIFIED: pnpm.io/10.x/settings, npm registry]
3. **Base UI `snapPoints` không nhận CSS.** Giá trị chỉ là số (0–1 là tỉ lệ viewport, >1 là px) hoặc chuỗi `px`/`rem`. Không nhận `dvh`, `clamp()`, `env()` hay `var(--…)`. Vì vậy D-05 ("ánh xạ sang ba token") phải đi qua một hằng TS trong `design-tokens`, không truyền thẳng CSS variable. [VERIFIED: base-ui.com/react/components/drawer.md]
4. **Next 16.4: `error.tsx` nhận `retry` (stable từ 16.3) và docs khuyên dùng `retry` thay `reset`.** D-15 ghi `reset`. Cả hai prop vẫn tồn tại; cần người dùng xác nhận (Open Question 1). Ngoài ra chỉ **root `app/not-found.tsx`** bắt URL không khớp; `not-found.tsx` trong route group chỉ chạy khi gọi `notFound()`. [VERIFIED: nextjs.org docs 16.4.0, lastUpdated 2026-10-06]

Các phần còn lại là ghép theo mẫu đã có: thêm preset `uiPackage()` kiểu default-deny giống các preset hiện tại; token ba lớp với `@theme inline` trỏ sang tên nội bộ `--semantic-*` (tránh tự tham chiếu); component lấy source từ registry shadcn `base-nova` bằng `shadcn view`, rồi viết lại class theo token (source gốc đầy giá trị tùy ý như `duration-450`, `bg-black/10`, `z-50`); Vitest 4.1.11 + jsdom 29.1.1 với file setup gồm `cleanup`, stub `matchMedia` (sonner gọi `window.matchMedia` không kiểm tra) và cờ `BASE_UI_ANIMATIONS_DISABLED`.

**Primary recommendation:** Chia plan theo đúng thứ tự roadmap. Wave 0 đổi sang pnpm 10.34.6, cài lại sạch, thêm `uiPackage()` + self-test và Vitest preset cho UI. Sau đó: tokens (kèm compile test) → atoms → molecules (Sheet riêng một plan) → organisms + route conventions → checkpoint người dùng `vercel login/link` → `vercel deploy --prod`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens (primitive/semantic/component, dark slot) | CDN / Static (CSS biên dịch lúc build) | — | CSS variables + `@theme` do Tailwind biên dịch trong `next build`; không runtime JS |
| Hằng snap point Sheet | Browser / Client | Static (TS constant trong `design-tokens`) | Base UI tính offset trên client từ số/px |
| Atoms/molecules (`ui-web`) | Browser / Client | Frontend Server (SSR HTML) | Base UI primitives là client component; phần trình bày tĩnh (Badge, Skeleton, Card, EmptyState) render được từ Server Component |
| AppShell/AppHeader/UserMenu | Frontend Server (RSC) | Browser (phần active-route dùng `usePathname`) | Layout là Server Component; chỉ phần cần hook mới là client |
| Loading/error/404 | Frontend Server (file convention Next) | Browser (`error.tsx`/`global-error.tsx` bắt buộc là Client Component) | Next ghép Suspense/Error boundary theo segment |
| Favicon, metadata, font | Frontend Server / Static | — | `icon.svg`, `metadata`, `next/font` xử lý lúc build |
| Deploy, Node runtime, install | Hạ tầng Vercel (build Linux) | — | D-19: build trên Vercel |
| Ranh giới import | Toolchain (ESLint + TS + pnpm isolated) | — | Cưỡng chế lúc `pnpm lint`/`typecheck`, không runtime |

## Project Constraints (from AGENTS.md và tài liệu kiến trúc)

Repo không có `.kiro/steering/` hay `CLAUDE.md`; không có `.claude/skills/` hay `.agents/skills/` (chỉ có `.claude/agents/kfc`, `.agents/tasks`). Ràng buộc lấy từ `AGENTS.md`, `apps/web/AGENTS.md`, `ai-memories/tripory-fe--ddd-architecture.md`:

- Đọc `ai-memories/tripory-fe--ddd-architecture.md` trước khi thêm code; cập nhật mục 3/4/5/8/9 khi thêm `ui-web`, `design-tokens`, `uiPackage()` (FND-02 yêu cầu).
- Trước khi viết code Next, đọc docs đúng phiên bản trong `apps/web/node_modules/next/dist/docs/` (hiện trống, xem Pitfall 1). Nếu sau khi cài lại vẫn trống, dùng nextjs.org với header `Accept: text/markdown` (trả về đúng `version: 16.4.0`).
- pnpm workspace; mọi version khai báo một lần trong `catalog:` của `pnpm-workspace.yaml`, pin cứng.
- Chạy từ gốc: `pnpm lint`, `pnpm typecheck`, `pnpm test` trước khi báo xong; cộng `pnpm build` cho phase này.
- Import bị ESLint chặn nghĩa là đặt sai tầng; chỉ sửa allowlist khi có quyết định kiến trúc **và** kèm self-test. Quy tắc để mức `error`.
- Package export thẳng TypeScript qua `exports`, không có bước build; cấm import sâu `@tripory/*/src/**`; cấm `import()` động trong package.
- `react`/`react-dom` là `peerDependencies` (+ `devDependencies`) của package, không phải `dependencies`.
- Component dùng được từ Server Component thì export phần con bằng **named export** (không `Tabs.Panel`).
- Không truyền function từ Server sang Client Component (trừ Server Function).
- Git: nhánh hiện tại `develop`; `commit_docs: true`.

## Hiện trạng repo (đã kiểm ngày 2026-10-11)

| Thứ | Hiện tại | Phase 1 cần |
|---|---|---|
| Node (local) | 24.14.1 | ≥24.0 (jsdom 29.1.1: `^20.19 \|\| ^22.13 \|\| >=24.0`) ✓ |
| pnpm (global) | 11.6.0; `packageManager: pnpm@11.6.0` | `packageManager: pnpm@10.34.6`. pnpm 11 cài sẵn sẽ tự tải và chạy 10.34.6 (`pmOnFail` mặc định `download`) |
| Lockfile | `lockfileVersion: '9.0'`, settings `autoInstallPeers: true` | Giữ format 9.0; sinh lại bằng pnpm 10 |
| `pnpm-workspace.yaml` | `allowBuilds: { unrs-resolver: false }` + catalog (next 16.4.0, react 19.3.0, tailwindcss 4.3.3, `@tailwindcss/turbopack` 4.3.3, vitest 4.1.11, typescript 5.9.3, eslint 9.39.5, typescript-eslint 8.71.1, `@types/node` 20.19.43) | Giữ `allowBuilds`; thêm catalog cho deps UI/test |
| turbo | 2.11.7 (= latest) | `build` thêm `transit` (Pitfall 9) |
| `node_modules` | **Hỏng**: next 459/8688 file, `@tailwindcss/turbopack` 0/7 file, không có `.bin` trong package nào; `pnpm build` lỗi `'next' is not recognized` | Xóa và cài lại |
| `apps/web` | Scaffold create-next-app: Geist, `prefers-color-scheme`, palette hard-code, `app/page.tsx`, `favicon.ico`, 5 SVG trong `public/`; `next.config.ts` bật `cacheComponents`, `partialPrefetching`, loader `@tailwindcss/turbopack` cho `*.css`; chưa có script `test` | Thay theo UI-SPEC/D-13..D-17; thêm Vitest |
| `packages/` | `config`, `shared-kernel`, `api-client`, `itinerary` | Thêm `design-tokens`, `ui-web` |
| `.gitignore` | Đã có `.vercel` và `.env*` | D-18 đã thỏa, không cần sửa |
| Vercel CLI | Chưa cài | `pnpm dlx vercel@63.1.2` hoặc cài global |

## Standard Stack

### Core (đã chốt, version tra npm ngày 2026-10-11)

| Library | Version | Purpose | Ghi chú |
|---------|---------|---------|---------|
| pnpm | **10.34.6** (latest-10, 2026-09-28) | Package manager | `engines.node >=18.12`. Có `allowBuilds` (≥10.26) [VERIFIED: npm + pnpm.io/10.x/settings] |
| next | 16.4.0 | App Router | Đã trong catalog |
| react / react-dom | 19.3.0 | UI | Đã trong catalog |
| tailwindcss / `@tailwindcss/turbopack` | 4.3.3 | Styling, `@theme` | Đã trong catalog |
| `@base-ui/react` | **1.8.0** (D-02; 1.9.0 ra 2026-10-09) | Primitive headless | Peer `react ^17\|\|^18\|\|^19`. Có subpath `./drawer`, `./dialog`, `./select`, `./tabs`, `./menu`, `./tooltip`, `./field`, `./checkbox`, `./switch`, `./avatar`, `./separator`, `./button`, `./input`. Tarball có sẵn docs ở `node_modules/@base-ui/react/docs/react/**` (đọc offline được) [VERIFIED: npm pack] |
| class-variance-authority | 0.7.1 | Variant | = latest |
| clsx | 2.1.1 | `cn()` | = latest |
| tailwind-merge | 3.7.0 | `cn()` | = latest |
| tw-animate-css | 1.4.0 | Animation CSS | = latest |
| lucide-react | 1.54.0 (D-03; latest 1.55.0) | Icon | Peer `react ^16.5.1…^19` |
| sonner | 2.0.8 | Toast | Peer `react ^18 \|\| ^19` |

### Test

| Library | Version | Purpose | Ghi chú |
|---------|---------|---------|---------|
| vitest | 4.1.11 (catalog; latest 5.0.3) | Runner | Giữ nhánh 4 vì `@types/node` 20 (tài liệu kiến trúc mục 9). Peer `jsdom: *`, `vite ^6\|\|^7\|\|^8`; máy đang có vite 8.3.3 (rolldown + oxc) |
| jsdom | **29.1.1** | DOM | `engines.node ^20.19 \|\| ^22.13 \|\| >=24.0.0`; 30.1.2 đòi `^24.15` |
| `@testing-library/react` | 16.3.3 | Render | Peer `react ^18\|\|^19`, `react-dom`, `@types/react(-dom)`, `@testing-library/dom ^10` |
| `@testing-library/dom` | 10.4.2 | Query | Peer bắt buộc của RTL 16 |
| `@testing-library/user-event` | **14.6.7** (latest) | Bàn phím/pointer | Peer `@testing-library/dom >=7.21.4` ✓ |
| `@tailwindcss/node` | 4.3.3 (mới, cho `design-tokens` test) | Compile CSS trong test | Export `compile(css, { base, onDependency })` [VERIFIED: `dist/index.d.mts`] |

**Không cần thêm:** `@vitejs/plugin-react` và `vite-tsconfig-paths` (guide Vitest của Next có dùng hai gói này). Vite 8 tự phát hiện `tsconfig.json` theo từng file nên áp dụng `jsx: "react-jsx"`, và có sẵn `resolve.tsconfigPaths: true` cho alias `@/*` [CITED: vite.dev/config/shared-options]. Nếu JSX không transform được thì thêm `@vitejs/plugin-react` 6.1.2 (peer `vite ^8`).

**Tùy chọn, cần người dùng gật:** `@testing-library/jest-dom` 7.0.1 (engines `node >=22`, peer `@testing-library/dom >=10 <11`, `vitest` optional). Có nó thì assertion a11y gọn hơn (`toHaveAccessibleName`, `toHaveAttribute`). D-04 không liệt kê; nếu không thêm thì dùng DOM API thuần (`getAttribute`, `document.activeElement`).

### Công cụ chạy ngoài dependency

| Tool | Version | Cách chạy |
|---|---|---|
| shadcn CLI | 4.21.4 (= latest) | `pnpm dlx shadcn@4.21.4 view <item>` để đọc source; **không** chạy `init`/`add` ghi file (Pitfall 5) |
| Vercel CLI | 63.1.2 (latest, `node >= 20`) | `pnpm dlx vercel@63.1.2 …` hoặc `npm i -g vercel@63.1.2` |

### Primitive cho từng component

| Component | Nền | Ghi chú |
|---|---|---|
| Button | `@base-ui/react/button` hoặc `<button>` | Loading: giữ focus, `aria-busy`, chặn double action. `focusableWhenDisabled` của Base UI Button khớp yêu cầu "loading vẫn nhận focus" [ASSUMED: tên prop, kiểm docs local] |
| IconButton, Spinner, Skeleton, Badge, Icon, Label, Textarea | HTML + cva | Không cần primitive |
| Input | `@base-ui/react/input` hoặc `<input>` | Nối với Field |
| Checkbox / Switch | `@base-ui/react/checkbox`, `/switch` | role `checkbox`/`switch`, Space toggle có sẵn |
| Avatar | `@base-ui/react/avatar` | Image + fallback |
| Separator | `@base-ui/react/separator` | |
| FormField | `@base-ui/react/field` | Tự nối `id`/`aria-describedby`, không tự viết [ASSUMED: hành vi `Field.Error` khi có `invalid`, kiểm docs local] |
| SearchInput | `<input type="search">` + IconButton xóa | role `searchbox` có sẵn từ `type="search"` |
| Select, Tabs, DropdownMenu, Tooltip, Dialog | `/select`, `/tabs`, `/menu`, `/tooltip`, `/dialog` | Roving focus, Esc, trả focus có sẵn |
| Sheet | `/drawer` | §Pattern 4 |
| Toast | `sonner` (D-03), **không** dùng `@base-ui/react/toast` | |
| Card, EmptyState, ErrorState | HTML + cva | EmptyState/Card tĩnh để render được từ Server Component |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Giữ `allowBuilds` | `onlyBuiltDependencies`/`ignoredBuiltDependencies` | Hai key cũ đã deprecated từ 10.26; chỉ cần nếu môi trường nào đó chạy pnpm <10.26 mà không tự chuyển version |
| Vitest UI preset trong `@tripory/config` | Mỗi package tự viết config | Preset chung giữ một chỗ cho `environment: 'jsdom'`; còn file setup phải nằm trong từng package vì pnpm isolated (Pitfall 10) |
| Guard test quét class | `eslint-plugin-tailwindcss` | Plugin chưa hỗ trợ Tailwind 4 đầy đủ [ASSUMED]; regex test đơn giản, xác định được |

**Installation (thêm vào catalog rồi `"catalog:"` ở package):**

```yaml
# pnpm-workspace.yaml (thêm)
catalog:
  "@base-ui/react": 1.8.0
  class-variance-authority: 0.7.1
  clsx: 2.1.1
  tailwind-merge: 3.7.0
  tw-animate-css: 1.4.0
  lucide-react: 1.54.0
  sonner: 2.0.8
  jsdom: 29.1.1
  "@testing-library/react": 16.3.3
  "@testing-library/dom": 10.4.2
  "@testing-library/user-event": 14.6.7
  "@tailwindcss/node": 4.3.3
```

```json
// package.json (gốc)
{ "packageManager": "pnpm@10.34.6" }
```


## Architecture Patterns

### System Architecture Diagram

```text
                 (build time)                                          (request time)
 packages/design-tokens/src                                    Browser ──GET /, /itineraries/mine, /sai──▶ Vercel (Node 24)
   primitives.css ─▶ semantic.css ─▶ theme.css (@theme inline)                                     │
          │                 │               │                                                      ▼
          │                 └─ dark.css (slot, không import)                          Next 16.4 App Router (cacheComponents)
          ▼                                                                                        │
 apps/web/src/app/globals.css ◀─ @import "tailwindcss"                                 khớp route? ──không──▶ app/not-found.tsx
   @import "@tripory/design-tokens"                                                         │ có                  (tự bọc AppShell public)
   @import "@tripory/ui-web/styles.css" (tw-animate-css)                                    ▼
   @source "../../../../packages/ui-web/src"                                       app/layout.tsx (html lang=vi, Inter, globals.css)
          │                                                                                 │
          ▼  @tailwindcss/turbopack loader                                    ┌─────────────┴──────────────┐
 CSS tĩnh: :root{--primitive-*, --semantic-*}                         (public)/layout.tsx           (dashboard)/layout.tsx
           .bg-primary{background-color:var(--color-primary)}          AppShell variant=public       AppShell variant=dashboard
                                                                       ├ AppHeader + UserMenu slot   ├ AppHeader + UserMenu slot
 packages/ui-web/src (atoms → molecules) ───── import ─────────────▶   ├ error.tsx  (ErrorState → retry/reset)
   Base UI primitives, cva, cn()                                       ├ loading.tsx (Skeleton + role=status)
   Sheet ◀── sheetSnapPoints (TS const của design-tokens)              └ page.tsx  ( / : wordmark ; /itineraries/mine : EmptyState )
                                                                    lỗi ở root layout ──▶ app/global-error.tsx (tự có <html><body>)
```

### Recommended Project Structure

```text
packages/
├── config/
│   ├── eslint/boundaries.mjs         # + uiPackage()
│   ├── vitest/preset.mjs             # giữ node
│   ├── vitest/ui-preset.mjs          # MỚI: environment jsdom, include src/**/*.test.{ts,tsx}
│   └── test/boundaries.test.ts       # + ca bad/ok cho ui-web, design-tokens
├── design-tokens/
│   ├── package.json                  # exports ".": {style: ./src/index.css}, "./tokens": ./src/index.ts
│   ├── eslint.config.mjs             # uiPackage({ role: 'tokens' })
│   └── src/
│       ├── primitives.css  semantic.css  components.css  dark.css  theme.css  index.css
│       ├── index.ts                  # sheetSnapPoints, sheetPeekMinPx (hằng TS duy nhất)
│       └── tokens.test.ts            # compile Tailwind + đối chiếu CSS↔TS
└── ui-web/
    ├── package.json                  # exports ".": ./src/index.ts, "./styles.css": ./src/styles.css
    ├── components.json               # base-nova, lucide, cùng baseColor với apps/web
    ├── eslint.config.mjs             # uiPackage()
    ├── vitest.config.ts              # mergeConfig(uiPreset, { test: { setupFiles: ['./src/test/setup.ts'] } })
    └── src/
        ├── atoms/<component>.tsx + <component>.test.tsx
        ├── molecules/<component>.tsx + <component>.test.tsx
        ├── lib/cn.ts
        ├── test/setup.ts             # cleanup, matchMedia stub, BASE_UI_ANIMATIONS_DISABLED
        ├── token-guard.test.ts       # quét class cấm (DS-06)
        ├── styles.css                # @import "tw-animate-css";
        └── index.ts                  # barrel named export (KHÔNG có 'use client')
apps/web/src/
├── app/
│   ├── layout.tsx  global-error.tsx  not-found.tsx  icon.svg  globals.css
│   ├── (public)/layout.tsx  page.tsx  loading.tsx  error.tsx  not-found.tsx
│   └── (dashboard)/layout.tsx  loading.tsx  error.tsx  not-found.tsx  itineraries/mine/page.tsx
├── components/app-shell.tsx  app-header.tsx  user-menu.tsx  (+ *.test.tsx)
└── test/setup.ts
```

### Pattern 1: preset `uiPackage()` (FND-02, DS-02)

**What:** Thêm preset thứ năm vào `boundaries.mjs`, cùng kiểu default-deny (`allowOnly`) với các preset hiện có. Khác hai điểm: cho dùng DOM global (`ui-web` chỉ chạy trên web) và allowlist file test rộng hơn. Có thể làm một preset có tham số (`role`) để phủ cả `design-tokens`, đúng chữ của FND-02 "preset `uiPackage()` cho `ui-web` và `design-tokens`".

**Allowlist đề xuất** (không có trong danh sách = chặn, nên `radix-ui`, `@radix-ui/*`, `vaul`, `next/*`, `@tripory/<context>` bị chặn sẵn, khớp D-01):

| Vùng | Module ngoài được import | Tầng bị cấm |
|---|---|---|
| `ui-web` `src/lib/**` | `clsx`, `tailwind-merge` | `atoms`, `molecules` |
| `ui-web` `src/atoms/**` | `react`, `react-dom`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@tripory/design-tokens` | `molecules` |
| `ui-web` `src/molecules/**` | như atoms + `sonner` | — |
| `ui-web` `src/index.ts` | như molecules | — |
| `ui-web` file test | allowlist của vùng + `vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `node:fs`, `node:path`, `node:url` | như vùng |
| `design-tokens` `src/**/*.ts` | (không gì) | — |
| `design-tokens` file test | `vitest`, `@tailwindcss/node`, `node:fs`, `node:path`, `node:url` | — |

Giữ `noDeepImport` và luật cấm `ImportExpression` ở mọi vùng. Không áp `pure` (đồng hồ/ngẫu nhiên): component UI có thể cần `useId`, timer.

**Sửa nhỏ cần thiết trong code hiện tại:** `zone()` đang gắn cứng `'vitest'` cho test và `rulesFor()` luôn chặn `BROWSER_GLOBALS`. Thêm tham số `testAllowed` và `browser: true` (mặc định giữ hành vi cũ để 58 test hiện tại không đổi).

```js
// packages/config/eslint/boundaries.mjs (phác thảo, không phải code cuối)
const UI_RUNTIME = ['react', 'react-dom', '@base-ui/react', 'class-variance-authority', 'clsx', 'tailwind-merge', 'lucide-react'];
const UI_TEST = ['vitest', '@testing-library/react', '@testing-library/dom', '@testing-library/user-event', 'node:fs', 'node:path', 'node:url'];
const TOKENS = '@tripory/design-tokens';

/** @param {{ role?: 'components' | 'tokens' }} [options] */
export const uiPackage = ({ role = 'components' } = {}) =>
  role === 'tokens'
    ? [...base, ...zone('src', { allowed: [], browser: true, testAllowed: ['vitest', '@tailwindcss/node', 'node:fs', 'node:path', 'node:url'] })]
    : [
        ...base,
        // Vùng chung src/** đứng ĐẦU: block sau ghi đè no-restricted-imports của block trước,
        // nên các tầng con (chặt hơn) phải đứng sau để thắng. Áp cho index.ts, token-guard.test.ts, test/setup.ts.
        ...zone('src', { allowed: [...UI_RUNTIME, 'sonner', TOKENS], browser: true, testAllowed: UI_TEST }),
        ...zone('src/lib', { allowed: ['clsx', 'tailwind-merge'], layers: ['atoms', 'molecules'], browser: true, testAllowed: UI_TEST }),
        ...zone('src/atoms', { allowed: [...UI_RUNTIME, TOKENS], layers: ['molecules'], browser: true, testAllowed: UI_TEST }),
        ...zone('src/molecules', { allowed: [...UI_RUNTIME, 'sonner', TOKENS], browser: true, testAllowed: UI_TEST }),
      ];
```

Lưu ý thứ tự block (flat config ghi đè `no-restricted-imports` hoàn toàn, tài liệu kiến trúc mục 8). Block `src/**` phải đứng **trước** các block tầng con, hoặc dùng `ignores` để không đè luật của `src/atoms/**`. Self-test sẽ phát hiện nếu sai (ca "atoms import molecules" phải đỏ). Một bẫy khác: `zone()` sinh pattern `files` kiểu `src/**/*.{ts,tsx}` và `ignores` cho `*.test.*`; với `src`, block test cũng khớp mọi test của tầng con, nên block test của tầng con đứng sau cũng phải tự liệt kê đủ allowlist test.

**Ca self-test mới** (thêm vào mảng `bad`/`ok` của `boundaries.test.ts`; test "mọi package đều nối preset" tự quét thư mục mới):

| Loại | Ca |
|---|---|
| bad | ui-web atoms: `import { Dialog } from 'radix-ui'` · `import x from '@radix-ui/react-dialog'` · `import { Drawer } from 'vaul'` · `import Link from 'next/link'` · `import '../molecules/dialog'` (tầng) · `import i from '@tripory/itinerary'` · `import t from '@tripory/design-tokens/src/index'` (deep) · `import('react')` (động) · file test import `lodash` |
| bad | design-tokens: `import React from 'react'` trong `src/index.ts` |
| ok | ui-web molecule: `@base-ui/react/dialog` + `../atoms/button` + `@tripory/design-tokens` + `lucide-react` + `sonner` · atoms dùng `document.body` (không báo browser global) · file test import `@testing-library/user-event`, `vitest`, `node:fs` |
| ok | design-tokens test: `@tailwindcss/node` + `node:fs` |

Tùy chọn (khuyến nghị, nhỏ): thêm pattern chặn `radix-ui`, `@radix-ui/*`, `vaul` vào `app()` để D-01 phủ cả `apps/web`; kèm một ca bad.

### Pattern 2: token ba lớp trên Tailwind 4.3 (DS-01, DS-06)

**What:** Primitive và semantic là CSS variables thường trên `:root`. `theme.css` chỉ phơi semantic sang namespace Tailwind bằng `@theme inline`, dùng **tên nội bộ khác** (`--semantic-*`) để không tự tham chiếu (UI-SPEC cho phép cách này). Reset namespace mặc định để `text-zinc-600`, `shadow-lg`, `rounded-md` không còn sinh CSS.

**Vì sao `inline` + tên khác:** với `@theme inline`, utility nhận trực tiếp giá trị `var(--semantic-color-primary)`, nên đổi biến đó ở `:root` (hoặc `[data-theme="dark"]` sau này) thì mọi utility đổi theo. Viết `--color-primary: var(--color-primary)` trong `@theme inline` là vòng tự tham chiếu [CITED: tailwindcss.com/docs/theme "Referencing other variables"]. shadcn dùng cùng mẫu (`--color-background: var(--background)`).

```css
/* packages/design-tokens/src/semantic.css (trích) */
:root {
  --semantic-color-background: var(--primitive-neutral-50);
  --semantic-color-primary: var(--primitive-coral-600);
  --semantic-color-primary-hover: var(--primitive-coral-700);
  --semantic-color-overlay: rgb(12 10 9 / 48%);
  --semantic-radius-control: 8px;
  --semantic-space-stack-md: 16px;
  --semantic-size-touch-min: 44px;
  --z-sticky: 20;                 /* z-index: Tailwind không có namespace → dùng z-(--z-sticky) */
  --motion-duration-fast: 120ms;
  --font-family-sans: var(--font-inter), system-ui, sans-serif; /* --font-inter do next/font gắn lên <html> */
}

/* packages/design-tokens/src/theme.css (trích) */
@theme inline {
  --color-*: initial;             /* bỏ palette mặc định: text-zinc-600 không còn sinh CSS */
  --radius-*: initial;
  --shadow-*: initial;
  --font-*: initial;
  --text-*: initial;
  --font-weight-*: initial;
  --breakpoint-*: initial;

  --color-background: var(--semantic-color-background);
  --color-primary: var(--semantic-color-primary);
  --color-primary-hover: var(--semantic-color-primary-hover);
  --color-overlay: var(--semantic-color-overlay);
  --radius-control: var(--semantic-radius-control);
  --spacing-stack-md: var(--semantic-space-stack-md);   /* → p-stack-md, gap-stack-md */
  --spacing-touch: var(--semantic-size-touch-min);      /* → min-h-touch, min-w-touch */
  --font-sans: var(--font-family-sans);
  --text-body: 16px;  --text-body--line-height: 1.5;
  --font-weight-regular: 400;  --font-weight-semibold: 600;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* breakpoint phải là literal: media query không đọc được var() */
  --breakpoint-sm: 640px; --breakpoint-md: 768px; --breakpoint-lg: 1024px; --breakpoint-xl: 1280px;
}

/* packages/design-tokens/src/components.css */
:root {
  --sheet-side-width: min(400px, 100vw - 48px);          /* D-08 */
  --sheet-snap-peek: max(160px, 25dvh);
  --sheet-snap-medium: 60dvh;
  --sheet-snap-expanded: calc(92dvh - env(safe-area-inset-top));
}

/* packages/design-tokens/src/index.css: entry public */
@import "./primitives.css";
@import "./semantic.css";
@import "./components.css";
@import "./theme.css";
/* dark.css KHÔNG import ở Phase 1 */
```

```css
/* apps/web/src/app/globals.css: chỉ ghép, không định nghĩa brand token */
@import "tailwindcss";
@import "@tripory/design-tokens";
@import "@tripory/ui-web/styles.css";
@source "../../../../packages/ui-web/src";
```

**Không reset `--spacing`.** Bỏ multiplier `--spacing` thì các utility số như `inset-0`, `top-0` cũng mất [ASSUMED]. Việc chặn `p-4`/`gap-2` giao cho guard test (Pattern 3).

**Resolve `@import` từ package:** `tailwindcss` tự export điều kiện `"style": "./index.css"`, và loader Tailwind resolve `@import` theo điều kiện này. `design-tokens` nên khai báo `"exports": { ".": { "style": "./src/index.css", "types": "./src/index.ts", "default": "./src/index.ts" } }`, hoặc tách subpath `"./css"` nếu điều kiện `style` không được nhận [ASSUMED: kiểm bằng `pnpm build` và xem CSS sinh ra có `--semantic-color-primary`]. CSS `@import` resolve theo vị trí file chứa nó. Với pnpm isolated, `@import "tw-animate-css"` phải nằm trong `ui-web/src/styles.css` (nơi khai báo dependency), không đặt ở `apps/web` (Pitfall 10).

### Pattern 3: guard và test cho token (tiêu chí 2, DS-06)

- **`design-tokens/src/tokens.test.ts`** (Vitest env node): dùng `compile()` của `@tailwindcss/node` biên dịch `@import "tailwindcss"; @import "./index.css";` với `base` là thư mục `src`. Gọi `build(['bg-primary','text-zinc-600','rounded-control','p-stack-md'])` rồi kiểm: `.bg-primary` chứa `var(--semantic-color-primary)`; `.text-zinc-600` không xuất hiện; `:root` có `--semantic-color-primary: var(--primitive-coral-600)`. Đây là bằng chứng tự động cho "đổi một token thì mọi component đổi theo" [MEDIUM: API `compile` là API công khai của `@tailwindcss/node` nhưng ít tài liệu; fallback: kiểm chuỗi trong `theme.css`].
- Cùng file: đọc `components.css` để đối chiếu với `sheetSnapPoints` trong `index.ts` (0.25/0.6/0.92, min 160px), vì giá trị buộc phải tồn tại ở hai nơi (Pattern 4).
- **`ui-web/src/token-guard.test.ts`**: quét mọi `*.tsx` (bỏ `*.test.tsx`) trong `atoms/`, `molecules/` và cả `apps/web/src/components/` (đường dẫn tương đối), rồi fail nếu gặp: mã hex `#[0-9a-fA-F]{3,8}`, `rgb(`/`hsl(`/`oklch(`, `--primitive-`, giá trị tùy ý có đơn vị `-\[[\d.]+(px|rem|ms)\]`, palette mặc định `(zinc|slate|gray|neutral|stone|red|orange|amber|…)-\d{2,3}`, spacing số `\b(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mb|ml|gap|gap-x|gap-y|space-x|space-y|h|w|size|min-h|min-w)-\d+\b` (trừ `-0`), `z-\d+`, `duration-\d+`, `dark:`. Cho phép cú pháp biến `-(--token)`.

### Pattern 4: `Sheet` trên Base UI `Drawer` (D-05..D-12)

**API đã kiểm** [VERIFIED: base-ui.com/react/components/drawer.md]:
- `Drawer.Root`: `snapPoints`, `snapPoint` + `onSnapPointChange` (điều khiển được), `defaultSnapPoint`, `modal: boolean | 'trap-focus'` (mặc định `true`: bẫy focus, khóa scroll, chặn pointer ngoài), `disablePointerDismissal`, `swipeDirection: 'up'|'down'|'left'|'right'` (mặc định `'down'`), `snapToSequentialPoints` (mặc định `false`, khớp D-10), `actionsRef` (`close()`).
- Kiểu snap point: `number | string`; 0–1 là tỉ lệ chiều cao viewport, >1 là px, chuỗi chỉ nhận `px`/`rem`.
- `Drawer.Popup`: `initialFocus`, `finalFocus`; data attr `data-expanded`, `data-swiping`, `data-swipe-direction`, `data-starting-style`, `data-ending-style`; CSS var `--drawer-snap-point-offset`, `--drawer-swipe-movement-x/y`, `--drawer-height`.
- Bottom sheet cần `transform: translateY(calc(var(--drawer-snap-point-offset) + var(--drawer-swipe-movement-y)))`.
- Không modal kiểu D-06: `modal={false}` **cộng** `disablePointerDismissal` (docs ghi rõ cặp này: bấm ra ngoài không đóng, focus ra ngoài cũng không đóng).
- Lý do đóng có `'escape-key'`, `'close-press'`, `'swipe'`, `'outside-press'`, nên test kiểm được Esc.

**Ánh xạ token (D-05):** Base UI không nhận `25dvh`/`clamp()`/`env()`. Đề xuất:

```ts
// packages/design-tokens/src/index.ts
export const sheetSnapPoints = { peek: 0.25, medium: 0.6, expanded: 0.92 } as const;
export const sheetPeekMinPx = 160;
```

`Sheet` (client) tính `peek = Math.max(sheetPeekMinPx, sheetSnapPoints.peek * window.innerHeight)` thành chuỗi `'<n>px'`. `medium` và `expanded` truyền thẳng dạng tỉ lệ. Safe-area top cho `expanded` dùng padding `env(safe-area-inset-top)` trong popup. Mặc định mở ở `medium` (`defaultSnapPoint` hoặc state điều khiển). Biến CSS trong `components.css` giữ làm hợp đồng tài liệu và dùng cho chiều cao/max-height; test đối chiếu hai nơi.

**Nút cho bàn phím (D-12):** điều khiển `snapPoint` bằng state: "Mở rộng bảng" lên mức kế tiếp (ẩn hoặc `disabled` khi đã `expanded`), "Thu gọn bảng" xuống mức trước, "Đóng bảng" là `Drawer.Close`. Drag handle là phần tử `aria-hidden` cao 44px (`min-h-touch`); gesture do Base UI xử lý trên popup.

**Side sheet (D-07, D-08):** `swipeDirection="right"` cho sheet phải, `"left"` cho sheet trái, không `snapPoints`, rộng `w-(--sheet-side-width)`. Không dùng `Drawer.Provider`/`Drawer.Indent` (D-09) và không dùng `Drawer.VirtualKeyboardProvider` (D-11).

**Nguồn source:** `pnpm dlx shadcn@4.21.4 view drawer` (style `base-nova`) trả về wrapper dùng `@base-ui/react/drawer` với registry dependency `cn`. Source này có nhiều giá trị tùy ý (`bg-black/10`, `z-50`, `duration-450`, `ease-[cubic-bezier(...)]`, `backdrop-blur-xs`), nên phải viết lại theo token (scrim `bg-overlay`, `z-(--z-overlay)`/`z-(--z-modal)`, `duration-(--motion-duration-slow)`, `ease-standard`) [VERIFIED: ui.shadcn.com/r/styles/base-nova/drawer.json].

**Test drag (UI-SPEC):** không mô phỏng pointer theo pixel. Tách hàm thuần, ví dụ `nextSnapPoint(points, current, 'expand'|'collapse')` và `resolvePeekPx(viewportHeight)`, rồi unit test chúng. Gesture để Base UI lo.

### Pattern 5: route, AppShell, AppHeader (FND-03, DS-05)

- Cây route: `app/(public)/page.tsx` cho `/` và `app/(dashboard)/itineraries/mine/page.tsx`. **Xóa `app/page.tsx`**: giữ cả hai file thì cùng resolve `/` và gây lỗi [CITED: nextjs.org route-groups "Conflicting paths"].
- Một root layout duy nhất `app/layout.tsx` (html/body, Inter, `globals.css`, metadata D-17). Hai layout nhóm bọc `AppShell variant="public"|"dashboard"`. Không tạo nhiều root layout, vì điều hướng giữa các root layout gây full page reload.
- `AppHeader`: wordmark là link `/` (`aria-current="page"` khi đang ở `/`). Phase 1 **không có `<nav>`** vì không có destination thứ hai được phép link (D-14), và không có hamburger. Phần active route cần `usePathname`, nên tách thành client component nhỏ. Header dùng `sticky top-0 z-(--z-sticky) h-(--size-header)` cùng padding `env(safe-area-inset-top)`.
- `UserMenu` slot tĩnh: Avatar fallback trung tính + nhãn "Tài khoản". Vì không có action nào (UI-SPEC: "không chứa action giả"), khuyến nghị **không** render thành `button`/menu trigger ở Phase 1 để không tạo affordance giả. Đây là chi tiết planner chốt; test khẳng định không có tên/email giả.
- `AppShell`: `min-h-dvh` (fallback `min-h-screen`), skip link "Bỏ qua đến nội dung chính" (`href="#main-content"`), `<main id="main-content" tabIndex={-1}>`, inner `max-w-(--size-content-lg)` với gutter 16/24/32 theo breakpoint, `min-w-0` để không tràn ở 320px.
- `QueryClientProvider`: không mount ở Phase 1 (mặc định của CONTEXT, Phase 1 không fetch).

### Pattern 6: file convention Next 16.4 (FND-04, D-15)

[VERIFIED: nextjs.org docs, `version: 16.4.0`]

| File | Hành vi cần biết |
|---|---|
| `app/not-found.tsx` | **Root** `not-found` bắt mọi URL không khớp và render bên trong root layout, nên phải tự bọc `AppShell variant="public"`. Hỗ trợ export `metadata` (title rõ). Next tự chèn `<meta name="robots" content="noindex">` cho 404. Không cần `global-not-found.js` (experimental, chỉ cần khi có nhiều root layout) |
| `(group)/not-found.tsx` | Chỉ render khi segment gọi `notFound()`. Phase 1 không gọi, nên file này tồn tại theo D-15 và được test render, nhưng **không** phải nơi phục vụ URL sai |
| `(group)/error.tsx` | Bắt buộc `'use client'`. Props `{ error: Error & { digest?: string }, retry: () => void, reset: () => void }`. Docs 16.4 khuyên `retry()` (fetch + render lại, stable từ 16.3); `reset()` chỉ xóa state lỗi. Không bọc `layout.tsx` cùng segment |
| `(group)/loading.tsx` | Bọc `page` trong Suspense, nằm trong layout cùng segment nên AppShell giữ nguyên. Với `cacheComponents`, trang tĩnh có thể không bao giờ hiện fallback; test bằng render trực tiếp |
| `app/global-error.tsx` | `'use client'`; phải tự có `<html lang="vi"><body>`; tự import `globals.css` và font; không export `metadata`, dùng `<title>` của React |
| `app/icon.svg` | Next sinh `<link rel="icon" sizes="any">`. Xóa `favicon.ico` để không có hai favicon |

`error.tsx` truyền function `retry` xuống `ErrorState`. Cả hai đều là client nên hợp lệ. `EmptyState` dùng trong `page.tsx` (Server Component) không được nhận function prop và nên là component tĩnh (không `'use client'`).

### Pattern 7: deploy Vercel CLI cho monorepo (FND-07, D-18..D-21)

[CITED: vercel.com/docs/monorepos, /docs/builds/configure-a-build, /docs/functions/runtimes/node-js/node-js-versions, /docs/package-managers, /docs/deployment-protection]

1. **Chạy CLI ở gốc repo**, không trong `apps/web`. Docs monorepo ghi rõ CLI không nên gọi từ thư mục con; và khi đã đặt Root Directory trong settings thì chỉ cần chạy `vercel` thay cho `vercel <dir>`. `.vercel/` tạo ở gốc và đã nằm trong `.gitignore`.
2. **Không dùng `vercel link --repo`**: lựa chọn này đòi project dùng Git integration (trái D-18).
3. **Root Directory = `apps/web`** đặt trong Project Settings → Build and Deployment. `vercel.json` không có trường root directory. Giữ bật "Include source files outside of the Root Directory" (mặc định cho project mới) để build thấy `packages/*`. Có thể trả lời đường dẫn `apps/web` khi CLI hỏi lúc tạo project [ASSUMED: prompt CLI], nhưng checkpoint vẫn phải xác nhận trong dashboard.
4. **Node 24:** thêm `"engines": { "node": "24.x" }` vào `apps/web/package.json` (Vercel đọc `package.json` trong Root Directory và giá trị này ghi đè Project Settings; 24.x cũng là mặc định). Có version trong git tốt hơn chỉ đặt trong UI.
5. **pnpm:** Vercel suy ra pnpm 9/10 từ `lockfileVersion: 9.0` ("project mới ưu tiên 10"). pnpm 10 trên Vercel đọc `packageManager: pnpm@10.34.6` và tự chuyển sang đúng bản nhờ `managePackageManagerVersions` (mặc định `true`). Nếu log build cho thấy sai bản, đặt env `ENABLE_EXPERIMENTAL_COREPACK=1` cho project. Không override Install Command thành `pnpm install` trần: Vercel sẽ dùng bản pnpm **cũ nhất** có trong image.
6. **Build trên Vercel** (D-19): `vercel deploy` (preview, giữ protection) rồi `vercel deploy --prod`. Build command mặc định là script `build` của `apps/web` (`next build`), không cần turbo.
7. **Smoke trên domain production `<project>.vercel.app`, không trên URL deployment CLI in ra.** Standard Protection (mặc định) bảo vệ mọi URL trừ production domain; URL deployment dạng `<project>-<hash>.vercel.app`, kể cả của bản production, cũng bị chặn.
8. **Checkpoint người dùng** (D-18): `vercel login` → `vercel link` ở gốc (tạo project mới) → vào dashboard đặt Root Directory `apps/web`, xác nhận Node 24.x → báo agent. Không token nào vào repo.

### Anti-Patterns to Avoid

- **Chạy `shadcn init`/`shadcn add` ở chế độ ghi:** CLI tự `pnpm add` bản latest (`@base-ui/react@1.9.0`, vi phạm D-02 và `catalog:`), ghi CSS variables oklch của shadcn vào file CSS, và đặt file vào `components/` thay vì `atoms/`/`molecules/`. Chỉ dùng `view`, hoặc `add --dry-run --view`/`--path`.
- **Barrel `ui-web/src/index.ts` có `'use client'`:** biến mọi export (kể cả EmptyState tĩnh) thành client reference. Đặt `'use client'` ở từng file component cần hook/Base UI.
- **Static property cho compound** (`Dialog.Title`): vỡ qua ranh giới Server/Client. Dùng `DialogTitle` named export.
- **`not-found.tsx` trong group làm 404 chính:** URL sai không đi vào đó.
- **Dùng `prefers-color-scheme` hoặc `dark:`** trong component: trái UI-SPEC (chỉ có slot `[data-theme="dark"]`).
- **`z-50`, `duration-200`, `rounded-md`, `text-sm` copy từ shadcn:** guard test sẽ đỏ; đổi sang token.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap, scroll lock, Esc, restore focus cho Dialog/Sheet | Tự viết focus trap | `@base-ui/react/dialog`, `/drawer` | Nested portal, inert, iOS scroll lock, trả focus về trigger |
| Gesture vuốt + snap + velocity | Tự tính pointer | `Drawer` `snapPoints` | D-05; Base UI đã xử lý velocity skip, nested drawer |
| Roving focus Tabs/Menu/Select, typeahead | Tự quản `tabIndex` | Base UI Tabs/Menu/Select | Pattern ARIA đầy đủ (Home/End/Arrow) |
| Nối `id` label/description/error | `useId` thủ công khắp nơi | `@base-ui/react/field` | Một chỗ, đúng `aria-describedby`/`aria-invalid` |
| Toast queue, pause on hover/focus, live region | Tự viết | `sonner` (`visibleToasts={3}`, `duration`) | Có sẵn hàng đợi, giới hạn, a11y |
| Gộp class Tailwind có xung đột | Nối chuỗi | `cn()` = `clsx` + `tailwind-merge` | Override variant đúng thứ tự |
| Favicon/metadata | `<link>` thủ công | `app/icon.svg`, `export const metadata` | Convention của Next |
| Biên dịch CSS trong test | Regex trên CSS sinh ra bằng tay | `compile()` của `@tailwindcss/node` | Đúng engine Tailwind thật |

**Key insight:** độ khó của phase nằm ở accessibility của overlay và ở việc ghép toolchain. Cả hai đã có lời giải chuẩn (Base UI, convention Next/Vercel); viết tay chỉ thêm lỗi khó test trong jsdom.

## Common Pitfalls

### Pitfall 1: `node_modules` hỏng che mất lỗi thật
**What goes wrong:** `pnpm build` báo `'next' is not recognized`; docs Next trống; loader Tailwind rỗng.
**Why it happens:** Bản cài hiện tại thiếu file (next 459/8688, `@tailwindcss/turbopack` 0/7) và không có `.bin` [VERIFIED].
**How to avoid:** Task đầu: đổi `packageManager` → `pnpm@10.34.6`, xóa `node_modules` ở gốc, `apps/*`, `packages/*` (lệnh PowerShell `Remove-Item -Recurse -Force`), `pnpm install`, commit lockfile mới. Sau đó kiểm `(Get-ChildItem -Recurse -File apps/web/node_modules/next/dist/docs).Count -gt 0` và `pnpm --filter @tripory/web build` chạy được trên scaffold **trước** khi sửa UI.
**Warning signs:** lệnh nào cũng lỗi "not recognized"; `pnpm install` báo "Ignored build scripts".

### Pitfall 2: Hiểu sai `allowBuilds` khi hạ pnpm
**What goes wrong:** Đổi sang `onlyBuiltDependencies` theo giả định cũ, hoặc chọn pnpm 10.x < 10.26 rồi `allowBuilds` bị bỏ qua.
**How to avoid:** Pin 10.34.6, giữ khối `allowBuilds`. Đọc cảnh báo "Ignored build scripts" của lần cài đầu và quyết từng package trong cùng khối (pnpm 10 mặc định chỉ cảnh báo, `strictDepBuilds: false`; pnpm 11 mặc định lỗi). Các native binding (`@tailwindcss/oxide-*`, `lightningcss-*`, `@next/swc-*`, `@img/sharp-*`) đến từ optionalDependencies, không cần script [ASSUMED: kiểm `pnpm build` xanh sau khi cài].

### Pitfall 3: Truyền CSS token vào `snapPoints`
**What goes wrong:** `snapPoints={['var(--sheet-snap-peek)']}` hoặc `'25dvh'` không hoạt động (chỉ nhận số, `px`, `rem`).
**How to avoid:** Hằng TS trong `design-tokens` (Pattern 4) và test đối chiếu với CSS.

### Pitfall 4: `matchMedia` không có trong jsdom
**What goes wrong:** Render `<Toaster>` của sonner trong test ném `window.matchMedia is not a function`. Trong `useEffect`, sonner 2.0.8 gọi `window.matchMedia('(prefers-color-scheme: dark)')` mà không kiểm tra hàm có tồn tại [VERIFIED: `sonner/dist/index.mjs` dòng ~1071].
**How to avoid:** Stub `matchMedia` trong file setup của `ui-web` và `apps/web`. Truyền `theme="light"` cho Toaster.

### Pitfall 5: shadcn CLI ghi đè quyết định
**What goes wrong:** `shadcn add dialog` cài `@base-ui/react@latest` = 1.9.0 (trái D-02), thêm version ngoài `catalog:`, chèn biến oklch vào CSS, tạo `components/ui/*`. Bản 4.x còn có thể kéo package `shadcn` làm dependency để import `shadcn/tailwind.css` (CLI có lệnh `eject` để gỡ thứ này) [ASSUMED: base-nova init thêm dependency `shadcn`].
**How to avoid:** Viết tay `components.json` cho hai workspace; lấy source bằng `pnpm dlx shadcn@4.21.4 view <item>` rồi port vào `atoms/`/`molecules/`. Sau mỗi bước, chạy `git diff -- package.json pnpm-workspace.yaml` để chắc không có dependency lạ.

### Pitfall 6: `@theme inline` tự tham chiếu
**What goes wrong:** `--color-primary: var(--color-primary)` tạo vòng, màu rỗng.
**How to avoid:** Dùng tên `--semantic-*` cho lớp semantic (Pattern 2). Compile test bắt lỗi này.

### Pitfall 7: Trùng route `/`
**What goes wrong:** Giữ `app/page.tsx` và thêm `app/(public)/page.tsx` thì build lỗi vì hai route cùng resolve `/`.
**How to avoid:** Xóa (hoặc di chuyển) `app/page.tsx` trong cùng task.

### Pitfall 8: Smoke nhầm URL bị bảo vệ
**What goes wrong:** Mở URL CLI in ra sau `--prod` (`<project>-<hash>.vercel.app`) và thấy trang đăng nhập Vercel.
**How to avoid:** Smoke trên `<project>.vercel.app`. Ghi URL này vào SUMMARY.

### Pitfall 9: Turbo cache `build` cũ khi sửa `ui-web`
**What goes wrong:** `ui-web`/`design-tokens` không có script `build`, nên `dependsOn: ["^build"]` không đưa source của chúng vào hash của `@tripory/web#build`. Sửa component xong, `pnpm build` vẫn có thể trả cache cũ [ASSUMED: theo cơ chế `transit` mà repo đã dùng cho lint/typecheck/test].
**How to avoid:** Đổi `"build": { "dependsOn": ["^build", "transit"], … }`. Kiểm: sửa một class trong `ui-web` rồi chạy `pnpm build`, task web phải là cache miss.

### Pitfall 10: pnpm isolated và resolve từ sai package
**What goes wrong:** `@import "tw-animate-css"` đặt trong `apps/web/globals.css` lỗi resolve; `environment: 'jsdom'` lỗi "Cannot find package jsdom" khi chỉ `@tripory/config` biết vitest.
**How to avoid:** Mỗi package dùng jsdom tự khai báo `jsdom`, `vitest`, RTL trong `devDependencies`. CSS của thư viện import từ package khai báo nó. File setup đặt trong từng package, không đặt trong `packages/config`.

### Pitfall 11: RTL không tự cleanup trong Vitest
**What goes wrong:** Vitest mặc định không bật `globals`, nên RTL không đăng ký `afterEach(cleanup)`. DOM của test trước còn lại, query trả nhiều phần tử, test focus trap sai [CITED: testing-library docs về auto cleanup].
**How to avoid:** `afterEach(cleanup)` trong `src/test/setup.ts`.

### Pitfall 12: `error.tsx` dùng `reset` khi docs đã chuyển sang `retry`
**What goes wrong:** Trên trang có dữ liệu ở các phase sau, `reset()` chỉ render lại mà không fetch lại, nên "Thử lại" không phục hồi được lỗi tạm thời.
**How to avoid:** Xem Open Question 1. Viết `ErrorState` nhận `onRetry` để chỗ nối (`retry` hay `reset`) chỉ nằm ở `error.tsx`.

### Pitfall 13: Breakpoint, z-index, duration bằng `var()`
**What goes wrong:** `--breakpoint-md: var(--x)` không chạy (media query không đọc được custom property); z-index không có namespace trong theme.
**How to avoid:** Breakpoint viết literal trong `theme.css`. Z-index/duration/size dùng cú pháp biến `z-(--z-sticky)`, `duration-(--motion-duration-fast)`.

### Pitfall 14: Font biến của `next/font` không tới `:root`
**What goes wrong:** `--font-family-sans: var(--font-inter)` rỗng nếu class biến của Inter không gắn trên `<html>`.
**How to avoid:** `<html lang="vi" className={inter.variable}>`. `global-error.tsx` phải tự gắn lại vì nó thay root layout.


## Code Examples

### Vitest preset UI + setup của package

```js
// packages/config/vitest/ui-preset.mjs (MỚI; export "./vitest/ui" trong package.json của config)
import { defineConfig } from 'vitest/config';
/** Preset cho package/app có DOM: jsdom. Mỗi package tự khai báo jsdom + Testing Library (pnpm isolated). */
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } }, // phòng hờ nếu tsconfig không được đọc
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
```

```ts
// packages/ui-web/vitest.config.ts
import { mergeConfig } from 'vitest/config';
import uiPreset from '@tripory/config/vitest/ui';
export default mergeConfig(uiPreset, { test: { setupFiles: ['./src/test/setup.ts'] } });
```

```ts
// packages/ui-web/src/test/setup.ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup()); // Vitest không bật globals, RTL không tự cleanup

// Base UI chờ getAnimations() khi đóng/mở; cờ này tắt chờ animation trong test
(globalThis as { BASE_UI_ANIMATIONS_DISABLED?: boolean }).BASE_UI_ANIMATIONS_DISABLED = true;

// jsdom không có matchMedia; sonner gọi nó trong effect mà không kiểm tra
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList;
}
```

`apps/web/vitest.config.ts` dùng cùng preset, thêm `resolve: { tsconfigPaths: true }` cho alias `@/*` [CITED: vite.dev `resolve.tsconfigPaths`] và `setupFiles: ['./src/test/setup.ts']`. Thêm script `"test": "vitest run"` vào `apps/web/package.json` và `"test": "vitest run"` (bỏ `--passWithNoTests` khi đã có test) ở hai package mới.

### Test bàn phím Dialog (mẫu)

```tsx
// packages/ui-web/src/molecules/dialog.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from './dialog';

it('mở bằng Enter, giữ focus trong dialog, Esc đóng và trả focus về trigger', async () => {
  const user = userEvent.setup();
  render(
    <Dialog>
      <DialogTrigger>Mở</DialogTrigger>
      <DialogContent>
        <DialogTitle>Tiêu đề</DialogTitle>
        <button type="button">Một</button>
        <DialogClose>Đóng</DialogClose>
      </DialogContent>
    </Dialog>,
  );
  const trigger = screen.getByRole('button', { name: 'Mở' });
  trigger.focus();
  await user.keyboard('{Enter}');
  const dialog = await screen.findByRole('dialog', { name: 'Tiêu đề' });
  for (let i = 0; i < 4; i += 1) await user.tab();
  expect(dialog.contains(document.activeElement)).toBe(true); // focus trap
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);              // restore focus
});
```

### `error.tsx` của route group

```tsx
// apps/web/src/app/(public)/error.tsx
'use client';
import { ErrorState } from '@tripory/ui-web';

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void; reset: () => void }) {
  // Open Question 1: D-15 ghi reset; docs Next 16.4 khuyên retry. Chỉ dòng dưới đổi theo quyết định.
  return <ErrorState variant="page" onRetry={() => retry()} />;
}
```

```tsx
// apps/web/src/app/(public)/error.test.tsx (env jsdom)
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ErrorPage from './error';

it('"Thử lại" gọi retry đúng một lần', async () => {
  const retry = vi.fn();
  render(<ErrorPage error={new Error('x')} retry={retry} reset={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
```

### Test organism cần `usePathname`

```tsx
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// next/link render được trong jsdom (guide Vitest của Next render Link trực tiếp)
```

### Root not-found tự bọc AppShell

```tsx
// apps/web/src/app/not-found.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = { title: 'Không tìm thấy trang · Tripory' };

export default function NotFound() {
  return (
    <AppShell variant="public">
      <h1>Không tìm thấy trang</h1>
      <p>Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
      <Link href="/">Về trang chủ</Link>
    </AppShell>
  );
}
```

### Sheet: chuyển mức snap thuần (unit test được)

```ts
// packages/ui-web/src/molecules/sheet-snap.ts
import { sheetPeekMinPx, sheetSnapPoints } from '@tripory/design-tokens';

export const resolveSnapPoints = (viewportHeight: number) =>
  [`${Math.max(sheetPeekMinPx, sheetSnapPoints.peek * viewportHeight)}px`, sheetSnapPoints.medium, sheetSnapPoints.expanded] as const;

export const stepSnapPoint = <T>(points: readonly T[], current: T, dir: 'expand' | 'collapse'): T => {
  const i = Math.max(0, points.indexOf(current));
  return points[dir === 'expand' ? Math.min(points.length - 1, i + 1) : Math.max(0, i - 1)]!;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `onlyBuiltDependencies` / `ignoredBuiltDependencies` | `allowBuilds` (map `pkg: true/false`) | pnpm 10.26.0 | Giữ khối hiện có khi hạ về 10.34.6 |
| `managePackageManagerVersions`, `packageManagerStrict*` | `pmOnFail: download\|error\|warn\|ignore` | pnpm 11.0 | pnpm 11 global trên máy tự tải 10.34.6 |
| `error.tsx` chỉ có `reset` | `retry` (stable 16.3, `unstable_retry` 16.2) + `reset` | Next 16.3 | Docs khuyên `retry` |
| `middleware.ts` | `proxy.ts` | Next 16 | Không dùng ở Phase 1 |
| `tailwind.config.js` + `content` | `@theme` CSS-first + `@source` | Tailwind 4 | `components.json` để `tailwind.config` rỗng |
| shadcn mặc định Radix | mặc định Base UI (`base-nova`) | shadcn 07/2026 | Khớp D-01; `asChild` → `render` |
| vaul cho Drawer | Base UI `Drawer` có snap point | Base UI 1.x | Khớp D-05 |
| Vite esbuild transform | Vite 8 oxc + rolldown (option `esbuild` deprecated) | Vite 8 | Cấu hình JSX qua `oxc.jsx` nếu cần |

**Deprecated/outdated:** shadcn `toast` cũ và `tailwindcss-animate` (thay bằng `sonner`, `tw-animate-css`); `global-not-found.js` vẫn là experimental, chưa cần.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Loader Tailwind resolve `@import "@tripory/design-tokens"` qua điều kiện `style` trong `exports` | Pattern 2 | Build lỗi resolve → dùng subpath `./css` trỏ thẳng file `.css` |
| A2 | Không reset `--spacing` thì vẫn chặn được spacing số qua guard test; reset sẽ làm mất `inset-0`/`top-0` | Pattern 2 | Nếu reset an toàn thì có thể cưỡng chế mạnh hơn bằng Tailwind |
| A3 | Vite 8 đọc `jsx: "react-jsx"` từ tsconfig gần nhất; `oxc.jsx.runtime: 'automatic'` là phương án dự phòng | Code Examples | Test TSX lỗi `React is not defined` → thêm `@vitejs/plugin-react` 6.1.2 |
| A4 | Turbo không đưa source của package không có task `build` vào hash `@tripory/web#build` | Pitfall 9 | Nếu sai, thêm `transit` chỉ thừa chứ không hại |
| A5 | `vercel link` lúc tạo project hỏi thư mục code (đặt được `apps/web`) | Pattern 7 | Không ảnh hưởng: checkpoint vẫn đặt Root Directory trong dashboard |
| A6 | pnpm 10 trên image Vercel tự chuyển sang 10.34.6 theo `packageManager` | Pattern 7 | Log build hiện bản khác → bật `ENABLE_EXPERIMENTAL_COREPACK=1` |
| A7 | Native binding (oxide, lightningcss, swc, sharp) không cần install script dưới pnpm 10 | Pitfall 2 | Build lỗi thiếu binding → thêm package đó vào `allowBuilds: true` |
| A8 | `@base-ui/react/field` tự nối `aria-describedby`/`aria-invalid`; `Button` có `focusableWhenDisabled` | Standard Stack | Tự nối bằng `useId` (vẫn đơn giản); đọc `node_modules/@base-ui/react/docs` để xác nhận |
| A9 | `compile()` của `@tailwindcss/node` chạy được trong Vitest node để kiểm CSS sinh ra | Pattern 3 | Fallback: test chuỗi trên `theme.css`/`semantic.css` |
| A10 | `shadcn init` base-nova có thể thêm dependency `shadcn` (`shadcn/tailwind.css`) | Pitfall 5 | Chỉ ảnh hưởng nếu chạy init; khuyến nghị đã là không chạy |
| A11 | `eslint-plugin-tailwindcss` chưa hỗ trợ Tailwind 4 đủ dùng | Alternatives | Có thể thay guard test bằng plugin, không đổi kết quả |
| A12 | Inter của Google Fonts có subset `vietnamese` (typecheck của `next/font` sẽ báo nếu sai) | Project Structure | Typecheck đỏ → chọn font khác (quyết định UI, hỏi người dùng) |

## Open Questions

1. **`retry` hay `reset` cho "Thử lại" (D-15)?**
   - What we know: Next 16.4 truyền cả hai. Docs ghi "In most cases, you should use `retry()` instead"; `retry` fetch và render lại segment, `reset` chỉ xóa state lỗi.
   - What's unclear: D-15 viết `reset`, có thể theo API cũ chứ không phải chủ ý.
   - Recommendation: dùng `retry` và test "gọi `retry` đúng một lần". Planner đưa câu này cho người dùng xác nhận. Nếu giữ `reset` thì chỉ đổi một dòng trong 2 file `error.tsx`; `global-error.tsx` dùng cùng lựa chọn.
2. **Cơ chế ánh xạ snap point (D-05):** dùng hằng TS (`0.25/0.6/0.92`, min 160px) thay cho truyền CSS token, vì Base UI không nhận CSS. Ý định của D-05 vẫn giữ (một nguồn giá trị trong `design-tokens`, có test đối chiếu). Planner ghi rõ trong plan; không cần hỏi lại trừ khi người dùng muốn khác.
3. **Có thêm `@testing-library/jest-dom` 7.0.1 không?** Không bắt buộc. Có thì test a11y ngắn hơn; không có thì dùng DOM API thuần. Mặc định đề xuất: không thêm, đúng danh sách D-04.
4. **UserMenu slot tĩnh có phải là `button` không?** Đề xuất render không tương tác (Avatar + "Tài khoản"), vì không có action thật. Planner chốt theo UI-SPEC ("không chứa action giả").

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | mọi thứ | ✓ | 24.14.1 | — |
| pnpm | FND-01 | ✓ (11.6.0 global) | tự tải 10.34.6 theo `packageManager` | `corepack enable` (corepack 0.34.6 có sẵn) |
| git | commit | ✓ | 2.53.0 | — |
| `node_modules` hợp lệ | build/lint/test | ✗ (hỏng) | — | Cài lại sạch (Pitfall 1) |
| Docs Next local | AGENTS.md | ✗ (0 file) | — | Sau khi cài lại; nếu vẫn trống dùng nextjs.org + `Accept: text/markdown` |
| Vercel CLI | FND-07 | ✗ | — | `pnpm dlx vercel@63.1.2` |
| Tài khoản Vercel + `vercel login/link` | FND-07 | Người dùng thực hiện | — | Checkpoint (D-18) |
| Mạng tới npm registry, Google Fonts (build) | install, `next/font` | ✓ | — | — |

**Missing dependencies with no fallback:** không có. Bước deploy chặn ở checkpoint người dùng.
**Missing dependencies with fallback:** node_modules (cài lại), Vercel CLI (`pnpm dlx`), docs Next (nextjs.org).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11; jsdom 29.1.1 + `@testing-library/react` 16.3.3 + `@testing-library/dom` 10.4.2 + `@testing-library/user-event` 14.6.7 cho `ui-web`/`apps/web`; env node cho `config`, `design-tokens` |
| Config file | Có: `packages/config/vitest/preset.mjs` (node). Wave 0 tạo: `packages/config/vitest/ui-preset.mjs`, `packages/ui-web/vitest.config.ts`, `packages/design-tokens/vitest.config.ts`, `apps/web/vitest.config.ts`, hai file `src/test/setup.ts` |
| Quick run command | `pnpm --filter @tripory/ui-web test` (hoặc `--filter @tripory/web` / `@tripory/config`) |
| Full suite command | `pnpm lint; pnpm typecheck; pnpm test; pnpm build` từ gốc |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | Toolchain pnpm 10 xanh | smoke | `pnpm --version` (=10.34.6 trong repo) + 4 lệnh gate | ❌ Wave 0 (đổi `packageManager`, cài lại) |
| FND-02 | `uiPackage()` bắt vi phạm, không báo nhầm; mọi package nối preset | unit (ESLint thật) | `pnpm --filter @tripory/config test` | ✅ `packages/config/test/boundaries.test.ts` (mở rộng) |
| DS-01 | Token sinh đúng utility, palette mặc định bị gỡ, dark slot không import | unit (compile) | `pnpm --filter @tripory/design-tokens test` | ❌ `packages/design-tokens/src/tokens.test.ts` |
| DS-06 | Không hex/palette/spacing số/arbitrary trong `ui-web` + `apps/web/src/components` | unit (quét file) | `pnpm --filter @tripory/ui-web test -- token-guard` | ❌ `packages/ui-web/src/token-guard.test.ts` |
| DS-06 | Compound children là named export từ entry public | unit | `pnpm --filter @tripory/ui-web test -- exports` | ❌ `packages/ui-web/src/exports.test.ts` |
| DS-03 | 13 atoms: render, role/name/state, Enter/Space, disabled/loading; IconButton thiếu `aria-label` bị bắt | unit (RTL) | `pnpm --filter @tripory/ui-web test -- atoms` | ❌ `src/atoms/*.test.tsx` |
| DS-04, FND-06 | Molecules: label/error liên kết; Select/Tabs/Menu Arrow/Home/End/Esc/restore focus; Tooltip focus+Esc; Toast live region/dismiss | unit (RTL + user-event) | `pnpm --filter @tripory/ui-web test -- molecules` | ❌ `src/molecules/*.test.tsx` |
| FND-06, D-06, D-07 | Dialog + Sheet (bottom/left/right × modal/non-modal): focus trap, Esc, nút đóng, trả focus, nút "Mở rộng/Thu gọn/Đóng bảng"; non-modal: không scrim, bấm ngoài không đóng | unit (RTL) | `pnpm --filter @tripory/ui-web test -- sheet dialog` | ❌ `src/molecules/sheet.test.tsx`, `dialog.test.tsx`, `sheet-snap.test.ts` |
| DS-05, FND-03 | AppShell landmark + skip link; AppHeader chỉ link `/`, có `aria-current`; UserMenu không có dữ liệu giả; class target ≥44px | unit (RTL) | `pnpm --filter @tripory/web test -- components` | ❌ `apps/web/src/components/*.test.tsx` |
| FND-04, D-15 | `loading.tsx` có `role="status"` "Đang tải nội dung…"; `error.tsx` "Thử lại" gọi callback đúng 1 lần; `not-found.tsx` (root + nhóm) có heading/CTA `/`; `global-error.tsx` render | unit (RTL) | `pnpm --filter @tripory/web test -- app` | ❌ `apps/web/src/app/**/*.test.tsx` |
| FND-04 | URL sai trả 404 | smoke | `pnpm --filter @tripory/web build` rồi `next start` + `Invoke-WebRequest /khong-ton-tai` → 404; lặp lại trên URL Vercel | manual/smoke |
| FND-03, FND-07 | 4 viewport không tràn, safe-area, ≥44px, bàn phím đi qua header/main/dialog/sheet, reduced motion | manual | Smoke tay trên `<project>.vercel.app` (D-23) | manual-only (không Playwright ở Phase 1) |
| FND-07 | Deploy production build trên Vercel với Node 24 + pnpm 10 | smoke | `pnpm dlx vercel@63.1.2 deploy --prod` sau checkpoint; đọc log build có "pnpm 10.34.6", Node 24 | manual (checkpoint) |
| DS-07 | Không showcase | unit | guard test: không có `apps/web/src/app/**/dev/**`, không dependency `storybook` | ❌ có thể gộp vào `token-guard.test.ts` |

### Sampling Rate
- **Per task commit:** test của package vừa sửa (`pnpm --filter <pkg> test`) + `pnpm --filter <pkg> lint`.
- **Per wave merge:** `pnpm lint; pnpm typecheck; pnpm test`.
- **Phase gate:** cả 4 lệnh gate xanh từ gốc + smoke tay 4 viewport trên domain production, trước `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `package.json` gốc: `packageManager: pnpm@10.34.6`; xóa và cài lại `node_modules`; lockfile mới.
- [ ] `turbo.json`: `build.dependsOn` thêm `transit`.
- [ ] `packages/config/eslint/boundaries.mjs`: `uiPackage()` + tham số `browser`/`testAllowed` cho `zone()`; `boundaries.test.ts` thêm ca.
- [ ] `packages/config/vitest/ui-preset.mjs` + export `./vitest/ui` (+ file `.d.mts` như preset hiện có).
- [ ] Khung `packages/design-tokens` và `packages/ui-web` (`package.json`, `eslint.config.mjs`, `tsconfig.json` có `jsx: react-jsx`, `vitest.config.ts`, `src/test/setup.ts`).
- [ ] `apps/web`: devDeps `vitest`, `jsdom`, RTL, user-event; script `test`; `vitest.config.ts`; `src/test/setup.ts`; `engines.node: "24.x"`.
- [ ] Catalog: thêm mọi version ở §Installation.

## Security Domain

Phase 1 không có auth, form gửi dữ liệu, endpoint hay secret; bề mặt tấn công chỉ là site tĩnh công khai.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 3 |
| V3 Session Management | no | Phase 3; UserMenu không giả session |
| V4 Access Control | no | `/itineraries/mine` chưa có gate (D-14), không chứa dữ liệu; Phase 3 thêm |
| V5 Input Validation | thấp | Không có form gửi đi; component form chỉ là UI |
| V6 Cryptography | no | — |
| V7 Error Handling | yes | `error.tsx`/`global-error.tsx` không hiển thị `error.message`/stack (prod Next đã che message của Server Component bằng `digest`); copy trung tính của UI-SPEC |
| V14 Configuration | yes | Không token Vercel trong repo (`.vercel`, `.env*` đã ignore); preview giữ Deployment Protection; dependency pin cứng qua `catalog:`; `allowBuilds` chặn install script mặc định |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Lộ thông tin lỗi qua error UI | Information Disclosure | Không render `error.message`/`digest`; chỉ copy cố định |
| Supply chain qua install script | Tampering | pnpm 10 chặn script mặc định; `allowBuilds` quyết từng package; không third-party registry (UI-SPEC `ui_safety_gate`) |
| Dependency trôi version qua shadcn CLI | Tampering | Không chạy `add`/`init` ghi file; chỉ `view` (Pitfall 5) |
| Lộ token Vercel | Information Disclosure | Người dùng tự `vercel login`; `.vercel/` ignore; không CI token (D-22) |
| Trang public bị index sớm | — | Chấp nhận theo D-21 |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, 2026-10-11): pnpm (latest-10 = 10.34.6, time), `@base-ui/react` 1.8.0/1.9.0 (time, peer, exports), cva, clsx, tailwind-merge, tw-animate-css, lucide-react, sonner, jsdom 29.1.1/30.1.2 (engines, time), RTL 16.3.3, dom 10.4.2, user-event 14.6.7, jest-dom 7.0.1, `@vitejs/plugin-react` 6.1.2, vitest 4.1.11 (peer), shadcn 4.21.4, vercel 63.1.2, next 16.4.0 (`dist.fileCount` 8688), `@tailwindcss/turbopack` 4.3.3 (7 file).
- [pnpm 10.x settings](https://pnpm.io/10.x/settings): `allowBuilds` (v10.26.0), `managePackageManagerVersions`, `strictDepBuilds`.
- [pnpm 11.x CLI settings](https://pnpm.io/ru/11.x/settings/cli): `pmOnFail`.
- Next.js 16.4.0 docs (nextjs.org, `Accept: text/markdown`): [error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error), [not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found), [loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups), [transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages), [app icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons), [Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest).
- [Base UI Drawer](https://base-ui.com/react/components/drawer.md): props Root/Popup, snap point, non-modal, CSS vars.
- Mã nguồn đã đọc: `@base-ui/react@1.8.0` (`DrawerPopup.mjs`, `useDrawerSnapPoints.mjs` có kiểm `ResizeObserver`; `useAnimationsFinished.mjs` có `BASE_UI_ANIMATIONS_DISABLED`), `sonner@2.0.8/dist/index.mjs` (gọi `matchMedia`).
- [Tailwind: theme](https://tailwindcss.com/docs/theme), [detecting classes / @source](https://tailwindcss.com/docs/detecting-classes-in-source-files).
- [shadcn monorepo](https://ui.shadcn.com/docs/monorepo); registry `ui.shadcn.com/r/styles/base-nova/drawer.json`; `shadcn --help`, `add --help`, `init --help` (4.21.4).
- Vercel: [monorepos](https://vercel.com/docs/monorepos), [monorepo FAQ](https://vercel.com/docs/monorepos/monorepo-faq), [configure a build](https://vercel.com/docs/builds/configure-a-build), [package managers](https://vercel.com/docs/package-managers), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [vercel link](https://vercel.com/docs/cli/link), [project linking](https://vercel.com/docs/cli/project-linking), [deployment protection](https://vercel.com/docs/deployment-protection).
- [Vite shared options](https://vite.dev/config/shared-options): `oxc`, `resolve.tsconfigPaths`, tsconfig discovery.
- Repo (đọc trực tiếp): `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `packages/config/**`, `apps/web/**`, `.gitignore`, `pnpm-lock.yaml`, `node_modules/.modules.yaml`.

### Secondary (MEDIUM confidence)
- [vercel/vercel#17417](https://github.com/vercel/vercel/issues/17417) (`--repo` và Root Directory, chỉ để tham khảo vì không dùng `--repo`).
- `.planning/research/STACK.md`, `SUMMARY.md`, `PITFALLS.md` (research cấp dự án, 2026-10-09).

### Tertiary (LOW confidence)
- Các mục A1–A12 trong Assumptions Log.

Nội dung từ nguồn web đã được diễn đạt lại để tuân thủ giới hạn bản quyền.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mọi version/peer/engines tra registry trong phiên.
- Architecture: HIGH cho route convention Next và API Drawer (docs 16.4/Base UI hiện hành); MEDIUM cho cấu trúc `uiPackage()` (thiết kế mới, self-test sẽ kiểm) và token pipeline (A1, A9).
- Pitfalls: HIGH cho node_modules hỏng, `allowBuilds`, `snapPoints`, `matchMedia`, Deployment Protection; MEDIUM cho turbo cache (A4) và pnpm trên Vercel (A6).

**Research date:** 2026-10-11
**Valid until:** 2026-10-25 (stack thay đổi nhanh: Base UI vừa ra 1.9.0, pnpm 12 là latest, Vercel CLI cập nhật hàng tuần)
