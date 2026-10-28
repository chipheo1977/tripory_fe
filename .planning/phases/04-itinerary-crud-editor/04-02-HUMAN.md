# 04-02 — Hướng dẫn tự implement (human)

> Plan gốc: `04-02-PLAN.md`. Brief của lead, mức gợi ý 1 (hướng đi, không đưa code).
> Quy trình: mỗi task làm theo TDD khi plan yêu cầu, tự kiểm bằng lệnh bên dưới, nhắn "review 04-02 task N" để review, **commit riêng từng task** (nhớ `git restore --staged` các file `*-HUMAN.md` trước khi commit code).

## Mục tiêu

Dựng nền hạ tầng mà gần như mọi plan sau đều cần, làm một lần ở Wave 1:
1. Thêm dnd-kit vào catalog (pin cứng) và dependency cho `packages/itinerary`.
2. Khóa ranh giới tầng bằng self-test (không sửa `boundaries.mjs`).
3. Thêm cờ `keepalive` cho `HttpRequest` của `api-client`, để lệnh xóa đang chờ vẫn tới server khi người dùng đóng tab (D-32, D-50).

### Vì sao quan trọng

- Plan 04-05 (spike dnd-kit), 04-09 (hook factory), 04-18/19 (xóa có hoàn tác, kéo thả) đều phụ thuộc plan này.
- Hai thứ ở đây có thể gây lỗi âm thầm: dependency sai (supply chain) và code đặt sai tầng (domain dùng `Date.now()` hay import DOM). Self-test sinh ra để bắt đúng hai lỗi đó ngay từ lúc code.

### Tài liệu nên đọc trước

- `04-RESEARCH.md` §Standard Stack, §Pattern 11
- `04-PATTERNS.md` §packages/itinerary/package.json, §packages/api-client (keepalive), §pnpm-workspace.yaml, §boundaries.test.ts
- `ai-memories/tripory-fe--ddd-architecture.md` (mục 5: ranh giới tầng)

---

## Task 1: Catalog dnd-kit và dependency cho các package

**File:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/web/package.json`, `packages/itinerary/package.json`, `packages/itinerary/src/exports.test.ts` (mới)
**Đọc trước:** `pnpm-workspace.yaml`, `apps/web/package.json`, `packages/itinerary/package.json`, `packages/identity/package.json`, `packages/identity/src/exports.test.ts`

### Các bước

1. **Kiểm version thật trước khi ghi** (đây là bước chống typosquat/gõ nhầm):
   ```powershell
   pnpm view @dnd-kit/core@6.3.1 version
   pnpm view @dnd-kit/sortable@10.0.0 version
   pnpm view @dnd-kit/utilities@3.2.2 version
   pnpm view @dnd-kit/modifiers@9.0.0 version
   ```
   Cả 4 lệnh phải in ra đúng số version.
2. **Catalog** (`pnpm-workspace.yaml`): thêm 4 dòng, mỗi gói một dòng, pin cứng (không `^`, không `~`), đặt theo thứ tự alphabet trong nhóm, với một comment giải thích vì sao dùng bản này.
   - `@dnd-kit/core` 6.3.1, `@dnd-kit/modifiers` 9.0.0, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2.
   - Comment cho `core`: D-34, bản ổn định cuối; `@dnd-kit/react` 0.x còn beta.
3. **`apps/web/package.json`**, trong `dependencies`: thêm 4 gói dnd-kit dạng `"catalog:"` và `"@tripory/itinerary": "workspace:*"`, theo thứ tự alphabet.
4. **`packages/itinerary/package.json`**:
   - script `test` đổi thành `vitest run` (bỏ `--passWithNoTests`).
   - `dependencies`: thêm `zod` dạng `catalog:`.
   - Thêm `peerDependencies`: `@tanstack/react-query` và `react`, cùng dạng `catalog:`.
   - `devDependencies`: thêm `@tanstack/react-query`, `@types/react`, `react` (giữ các mục cũ).
   - **Không** thêm dnd-kit vào package này.
5. **File `packages/itinerary/src/exports.test.ts`**: bắt chước `identity/src/exports.test.ts` (nháy đơn). Một test duy nhất kiểm `import * as publicApi from './index'` là object hợp lệ. Plan 04-09 sẽ mở rộng file này.
6. `pnpm install` từ gốc repo.

### Gợi ý (mức 1)

- Tại sao dnd-kit chỉ khai báo ở `apps/web` mà không ở `packages/itinerary`? Dùng câu hỏi này để tự kiểm: package nào được phép chạm DOM? (Xem lại mục 5 của tài liệu kiến trúc.)
- Tại sao `react` và `@tanstack/react-query` là **peer** dependency chứ không phải dependency thường? Nghĩ về việc app có thể kéo vào hai bản React.
- Nhìn `packages/identity/package.json` để lấy đúng khuôn: ở đó khoản nào là `dependencies`, khoản nào là `peerDependencies`.
- **Bẫy:** `pnpm install` có thể đổi `pnpm-lock.yaml` ở những chỗ không liên quan. Xem `git diff --stat pnpm-lock.yaml` để chắc chỉ thêm đúng các gói mới.

### Tự kiểm

```powershell
pnpm install
pnpm install --frozen-lockfile
pnpm --filter @tripory/itinerary test
pnpm --filter @tripory/web typecheck
Select-String -Path pnpm-workspace.yaml -Pattern '"@dnd-kit/sortable": 10.0.0' -SimpleMatch      # có kết quả
Select-String -Path packages/itinerary/package.json -Pattern 'passWithNoTests' -SimpleMatch        # KHÔNG có kết quả
Select-String -Path packages/itinerary/package.json -Pattern '@dnd-kit' -SimpleMatch                # KHÔNG có kết quả
```

### Commit gợi ý

`chore(04-02): thêm dnd-kit vào catalog và dependency cho packages/itinerary`

---

## Task 2: Case self-test ranh giới

**File:** `packages/config/test/boundaries.test.ts` — **chỉ thêm case**, KHÔNG sửa `packages/config/eslint/boundaries.mjs`
**Đọc trước:** `boundaries.test.ts` (hằng `itinerary`, các case của identity khoảng dòng 93–99, các case của web khoảng dòng 127–164), `boundaries.mjs`

### Các case cần thêm (viết một dòng mỗi case, theo đúng định dạng của case identity hiện có)

**Phải bị chặn (bad):**
- `itinerary domain: zod` — `src/domain/x.ts` import `zod`
- `itinerary domain: Date.now` — `export const x = Date.now();`
- `itinerary react: @dnd-kit/core` — `src/react/x.ts`
- `itinerary react: react-dom` — `import { createPortal } from 'react-dom';`
- `itinerary infrastructure: react` — `src/infrastructure/x.ts` import `useState` từ `react`
- `itinerary test: @testing-library/react` — `src/domain/x.test.ts`

**Phải được phép (ok):**
- `itinerary infrastructure: zod + api-client`
- `itinerary react: @tanstack/react-query + react`
- `itinerary domain: shared-kernel`
- `web: modules/itinerary/ui import @dnd-kit/core + @dnd-kit/sortable`
- `web: modules/itinerary/ui import @tripory/itinerary/react`
- `web: composition/itinerary.client.ts import @tripory/itinerary/http`

**Phải bị chặn (bad, web):** `web: modules/itinerary/ui import @tripory/itinerary/http`. Nếu case này đã có sẵn thì đừng lặp lại.

### Gợi ý (mức 1)

- Hãy chạy test **trước khi** thêm từng nhóm để quan sát: nhóm bad phải đỏ nếu rule chưa chặn, và nhóm ok phải đỏ nếu rule chặn oan.
- Nếu một case "ok" bị rule chặn, **dừng lại**. Đọc kỹ thông báo lỗi và mục 5 của tài liệu kiến trúc. Điều đó nghĩa là phần code đó sẽ nằm sai tầng trong plan sau. Xóa case đó và ghi lý do vào SUMMARY, **tuyệt đối không nới rule** (đây là luật trong `AGENTS.md`).

### Tự kiểm

```powershell
pnpm --filter @tripory/config test
git diff --quiet -- packages/config/eslint/boundaries.mjs; $LASTEXITCODE   # phải là 0
Select-String -Path packages/config/test/boundaries.test.ts -Pattern "itinerary react: @dnd-kit/core" -SimpleMatch   # có kết quả
```

### Commit gợi ý

`test(04-02): khóa ranh giới itinerary và dnd-kit bằng self-test`

---

## Task 3: `HttpRequest.keepalive` trong api-client (TDD)

**File:** `packages/api-client/src/http-client.ts`, `fetch-http-client.ts`, `fetch-http-client.test.ts`
**Đọc trước:** 3 file trên, cộng `with-session-refresh.ts` để chắc request được chuyển nguyên xuống client bên trong.

### Hành vi cần có

- `send({ method: 'DELETE', path: '/x', keepalive: true })` → tham số `init` truyền cho `fetch` có `keepalive === true`.
- Không truyền `keepalive` → `'keepalive' in init` là `false` (đừng truyền `keepalive: undefined`).
- `withSessionRefresh` chuyển nguyên trường `keepalive` xuống client bên trong.

### Các bước (TDD)

1. **Đỏ.** Viết 3 test theo mục trên trong `fetch-http-client.test.ts`, dùng `fixtureFetch` có sẵn. Tên test chứa chữ `keepalive` (acceptance có grep). Chạy và xác nhận đỏ.
2. **Xanh.**
   - `http-client.ts`: trong type `HttpRequest`, sau `sessionRefresh?`, thêm `keepalive?: boolean` kèm doc comment nói rõ mục đích (Phase 4 D-32: lệnh vẫn tới server khi trang đang đóng).
   - `fetch-http-client.ts`: trong `init` của `doFetch`, thêm một spread có điều kiện chỉ đặt khóa khi `request.keepalive` là true.
3. Ca thứ 3 (qua `withSessionRefresh`): nếu wrapper đã spread request thì viết trong `fetch-http-client.test.ts`, bọc `createFetchHttpClient` bằng `withSessionRefresh`. Nếu wrapper không spread thì phải viết trong `with-session-refresh.test.ts`.

### Gợi ý (mức 1)

- Hãy nghĩ vì sao dùng spread có điều kiện chứ không gán thẳng `keepalive: request.keepalive`. Test thứ hai ở trên là câu trả lời.
- **Giới hạn của `keepalive`** (nên biết trước cho plan 04-18): body của request `keepalive` bị trình duyệt giới hạn tổng khoảng 64 KB. DELETE không có body nên không vấn đề, nhưng đừng dùng cờ này cho request lớn.
- Cờ này **không** bỏ qua kiểm tra Origin hay phiên. Request vẫn đi qua `/api/bff` nên vẫn qua `checkSameOrigin` và `readSession` (T-04-04). Không cần sửa BFF.

### Tự kiểm

```powershell
pnpm --filter @tripory/api-client test
Select-String -Path packages/api-client/src/fetch-http-client.ts -Pattern 'keepalive: true' -SimpleMatch   # có kết quả
```

### Commit gợi ý

1. `test(04-02): test HttpRequest.keepalive`
2. `feat(04-02): thêm HttpRequest.keepalive cho api-client`

---

## Định nghĩa "xong" cho 04-02

- 4 gói dnd-kit nằm trong `catalog:` pin cứng; chỉ `apps/web` khai báo chúng.
- `packages/itinerary` có `zod`, peer `react` + `@tanstack/react-query`, test chạy không cần `--passWithNoTests`.
- Self-test ranh giới khóa các hành vi trên, `boundaries.mjs` không đổi.
- `keepalive` có test và `pnpm --filter @tripory/api-client test` xanh.
- Cuối cùng: `pnpm install --frozen-lockfile; pnpm lint; pnpm typecheck; pnpm test` xanh ở root.
- Lead review xong thì lead viết `04-02-SUMMARY.md` và cập nhật STATE/ROADMAP.

## Bảo mật (threat model của plan)

- **T-04-02 (supply chain):** chỉ 4 gói `@dnd-kit/*` của scope chính thức, pin cứng, `pnpm view` xác nhận version, lockfile được commit.
- **T-04-03:** domain không được dùng DOM hay đồng hồ. Self-test chặn dnd-kit, `react-dom`, `Date.now` và `zod` đúng tầng.
- **T-04-04:** `keepalive` chỉ là cờ của fetch, không phải đường vòng qua BFF. Origin và phiên vẫn được kiểm.
