# Phase 5: Map & Public View - Pattern Map

**Mapped:** 2026-11-11
**Người thực hiện:** orchestrator gsd-plan-phase tự làm vai pattern-mapper (môi trường không có công cụ spawn subagent). Mọi analog dưới đây đã được mở và đọc trong phiên này.
**Nguồn danh sách file:** `05-CONTEXT.md` (Integration Points), `05-RESEARCH.md` (Cấu trúc thư mục đề xuất, Pattern 1..6), `05-UI-SPEC.md` (Component Inventory).

## Quy ước chung (áp dụng cho mọi file mới)

- Component client: dòng đầu `"use client";`, kế đó comment tiếng Việt nêu quyết định (D-xx) và ràng buộc. Ẩn/hiện bằng prop `visible` hoặc `if (!visible) return null;`, không `? :`/`&&` trong JSX. Chọn class theo biến thể bằng bảng `Record` (xem `overview-summary.tsx` `VARIANT`, `day-overview-row.tsx` `EMPHASIS_CLASS`).
- Props: `export type XProps = Readonly<{...}>;`. Hàm thuần tách ra file `.ts` cùng thư mục (xem `overview-format.ts`, `editor-map-pins.ts`).
- Test cạnh file: `x.test.tsx` / `x.test.ts`, Vitest + Testing Library; test route/BFF dùng `// @vitest-environment node` ở dòng đầu.
- RSC không import `/http`; chỉ `apps/web/src/composition/**` được import `@tripory/itinerary/http` (ESLint `httpOnlyInComposition`).
- `import "server-only"` chỉ ở `composition/*.server.ts` (kiến trúc mục 9). Logic thật nằm ở `composition/server/*.ts` không `server-only` để test được.

## File Classification

| File mới / sửa | Vai trò | Luồng dữ liệu | Analog gần nhất | Độ khớp |
|----------------|---------|---------------|-----------------|---------|
| `composition/server/public-itinerary.ts` | loader thuần (server) | request-response (BE → union) | `composition/server/auth-handlers.ts` (zod envelope + `callBackend`) | role-match |
| `composition/itinerary.server.ts` | adapter `server-only` | request-response | `composition/viewer.server.ts` (`cache`, `cookies`, `connection`) | exact |
| `composition/server/public-metadata.ts` | hàm thuần build `Metadata` | transform | `modules/itinerary/ui/overview-format.ts` (chuỗi tiếng Việt thuần) | role-match |
| `app/og-default.png/route.tsx` | route handler ảnh | request-response (static) | `app/api/places/search/route.ts` (chỉ export GET) | partial |
| `app/(public)/(viewer)/itineraries/[id]/page.tsx` | page RSC | request-response | `app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx` | exact |
| `app/(public)/(viewer)/layout.tsx` | layout toàn màn | — | `app/(dashboard)/(editor)/layout.tsx` | exact |
| `app/(public)/(site)/layout.tsx` | layout AppShell | — | `app/(public)/layout.tsx` (di chuyển nguyên) | exact |
| `modules/itinerary/ui/public-itinerary-page.tsx` | RSC phân loại kết quả | request-response | `modules/identity/ui/dashboard-session-gate.tsx` | exact |
| `modules/itinerary/ui/public-itinerary-view.tsx` | container client | event-driven | `modules/itinerary/ui/itinerary-editor.tsx` (`LoadedEditor`) | role-match |
| `modules/itinerary/ui/use-public-view.ts` | hook URL state | event-driven | `modules/itinerary/ui/use-editor-tab.ts`, `my-itineraries-view.tsx` (tab theo URL) | role-match |
| `modules/itinerary/ui/view-mode-toggle.tsx` | component | event-driven | `packages/ui-web/src/molecules/toggle-chip.tsx` | role-match |
| `packages/ui-web/src/molecules/segmented-control.tsx` | molecule | event-driven | `toggle-chip.tsx` (Base UI `ToggleGroup` + `Toggle`) | exact |
| `modules/itinerary/ui/public-header.tsx` | component | — | `modules/itinerary/ui/editor-header.tsx` (`HEADER_CLASSES`, `ROW_CLASSES`), `components/app-header.tsx` | role-match |
| `modules/itinerary/ui/draft-strip.tsx` | component | — | `publish-button.tsx` `PublishHintStrip` | role-match |
| `modules/itinerary/ui/article-*.tsx`, `public-article.tsx` | component SSR+client | transform | `overview-summary.tsx`, `day-overview-row.tsx` | role-match |
| `modules/itinerary/ui/day-chip-strip.tsx`, `use-active-day.ts` | component + hook | event-driven | `day-tabs.tsx` (`EdgeFade`, `useTabStrip`) + `test/fake-intersection-observer.ts` | role-match |
| `modules/itinerary/ui/public-map-mode.tsx` | container | event-driven | `itinerary-editor.tsx` (selection, camera, layout) + `editor-layout.tsx` | role-match |
| `modules/itinerary/ui/public-day-tabs.tsx` | component | event-driven | `day-tabs.tsx` (bỏ `useAddDay`) | exact |
| `modules/itinerary/ui/public-overview-panel.tsx`, `public-overview-summary.tsx` | component | — | `overview-panel.tsx`, `overview-summary.tsx` | exact |
| `modules/itinerary/ui/public-day-panel.tsx`, `public-waypoint-item.tsx` | component | event-driven | `day-panel.tsx`, `waypoint-list.tsx` (`WaypointSelection`) | role-match |
| `modules/itinerary/ui/share-dialog.tsx`, `share-link-field.tsx` | component | event-driven | `publish-dialog.tsx` + `responsive-form-surface.tsx` | role-match |
| `modules/itinerary/ui/share-button.tsx` | component | event-driven | `publish-button.tsx` (variant theo `useMediaQuery`) | exact |
| `modules/itinerary/ui/qr-code.tsx`, `qr-matrix.ts`, `qr-file-name.ts`, `use-qr-download.ts`, `use-copy-link.ts`, `use-native-share.ts`, `use-share-url.ts` | hook + hàm thuần | transform / event-driven | `use-media-query.ts` (`useSyncExternalStore`), `draft-storage.ts` (bọc `localStorage`) | role-match |
| `modules/itinerary/ui/public-forbidden.tsx` | component | — | `editor-forbidden.tsx` | exact |
| `modules/itinerary/ui/public-itinerary-skeleton.tsx` | component | — | `editor-skeleton.tsx`, `app/(public)/loading.tsx` | role-match |
| `packages/itinerary` `author` (domain, dto, mapper) | ACL | transform | `dto.ts` `coverImages` `.nullish()` + `mappers.ts` `blankToNull` | exact |

## Excerpts then chốt (đã đọc trong phiên)

### Page RSC có `await params` + `notFound()` trước khi chạm cookie
`edit/page.tsx`: `const { id } = await params; const itineraryId = parseItineraryId(id); if (itineraryId === null) notFound();` rồi mới `await getViewer()`. Trang công khai làm y hệt, thêm `generateMetadata` dùng cùng hàm `cache`.

### `cache` + `cookies()` + `connection()`
`viewer.server.ts`: `export const getSessionKind = cache(async () => { const jar = await cookies(); await connection(); const nowSec = Math.floor(Date.now() / 1000); return readSession((name) => jar.get(name)?.value, nowSec, isSecureCookieEnv()).state; });`. Loader công khai cần cả `accessToken` nên dùng `readSession(...)` đầy đủ (`SessionState`: `none | invalid | stale{claims} | fresh{claims, accessToken}`), không dùng `getSessionKind`.

### Gọi BE từ server
`callBackend(deps, "/api/v1/itineraries/{id}", { method: "GET", headers })` trả `{ kind: "response", status, body, contentType } | { kind: "timeout" } | { kind: "network" }`; không ném `ApiError`; khóa origin. `serverDeps()` đọc `process.env` lúc gọi.

### Gate theo loại phiên
`dashboard-session-gate.tsx`: `switch (decideDashboardGate(kind))` với `recover` → `<SessionRecovery fallback={loading} />`. Trang công khai dùng cùng `SessionRecovery` (truyền qua prop từ `page.tsx`, vì `modules` không import ngược `app/`).

### Biến thể theo breakpoint không remount
`publish-button.tsx`: `const presentation = PRESENTATION_BY_FROM_MD[String(fromMd) as "true" | "false"]`, bảng `VARIANT_BY_PRESENTATION`, `useMediaQuery(MD_QUERY)`. `ShareButton` theo mẫu này.

### Dialog/Sheet responsive
`ResponsiveFormSurface({ open, onOpenChange, onOpenChangeComplete, title, titleId, children, locked, closeButton, initialFocus })`. `ShareDialog` truyền `locked={false}`, `closeButton`.

### Chọn điểm đồng bộ danh sách ↔ bản đồ
`itinerary-editor.tsx`: `useMapSelection()`, `useMapCamera(() => fitTargetFor(...))`, `handlePinSelect` (select + `camera.reveal` + `setSheetRequest`), `handleActivate` (select + `camera.focus`), `mapReadySelection = mapStatus === "ready" ? { selectedId, onSelect } : undefined`, `changeTab` (clear + fit). Bản chỉ đọc giữ nguyên các hàm này, bỏ phần ghi.

### Thanh dính đáy trong Sheet
`timeline-add-bar.tsx`: `sticky bottom-0 border-t border-border bg-surface p-stack-md pb-[calc(var(--semantic-space-stack-md)+env(safe-area-inset-bottom))] empty:hidden`, nằm trong `TimelinePanel`/`SheetTimeline` (vùng cuộn có `bottom = hiddenBottom`). Viên thuốc trong sheet của chế độ Bản đồ đặt trong một thanh tương tự (không cần thêm API `sheetFooter` cho `NarrowBody`).

### Test mock hooks itinerary
`publish-dialog.test.tsx`: `vi.mock("@/composition/itinerary.client", async () => { const { createItineraryHooks } = await import("@tripory/itinerary/react"); ... })`, `QueryClientProvider client={makeQueryClient()}`, `SaveStatusProvider store={createSaveStatusStore()}`, `userEvent.setup()`.

### Invariants tĩnh
`itinerary-invariants.test.ts`: `walk()` đọc nguồn `.ts/.tsx` không phải test; `itineraryUiTsx`; khẳng định `Tải thêm`/`Chia sẻ` (cần thu hẹp, Pitfall 5); `<img` phải có `referrerPolicy`; `dangerouslySetInnerHTML` cấm trong `modules/itinerary`.

### Route test
`proxy-coverage.test.ts`: `listPages("(public)")` đệ quy, `toUrl` bỏ segment `(group)`; sau khi tách `(site)`/`(viewer)` test vẫn bao phủ (không đổi); `/itineraries/x` phải `isProtectedPath === false`.

### Token
`components.css` khai báo biến trong `:root`; `tokens.test.ts` có (1) bảng `declarations(...)` toEqual (dòng ~186-215) và (2) danh sách utility build thử với `compiler.build([...])` (dòng ~398-420). Thêm `--share-qr-size: 192px` phải sửa cả hai.

### Dependency mới
`pnpm-workspace.yaml` `catalog:` ghi version cứng, có comment lý do; `apps/web/package.json` dùng `"uqr": "catalog:"`. App preset ESLint không có allowlist thư viện ngoài (chỉ cấm import sâu `src` và `/http` ngoài composition).

## Không có analog (planner dùng RESEARCH / UI-SPEC)

| File | Lý do |
|------|-------|
| `app/og-default.png/route.tsx` | Chưa có route ảnh; dùng `next/og` `ImageResponse` theo `image-response.md` (Route Handlers). Nếu `next build` lỗi thì PNG tĩnh trong `apps/web/public/` |
| `qr-matrix.ts` | Dùng `uqr` `encode(text, { ecc: "M", border: 2 })` trả `{ data: boolean[][], size }`; không có mã tương tự trong repo |

## PATTERN MAPPING COMPLETE
