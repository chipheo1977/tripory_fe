---
phase: 04-itinerary-crud-editor
reviewed: 2026-10-29T04:35:33Z
depth: standard
branch: phase_4
base: c3e993cc6f6d6b9fbe10d14c607858bf2ca76090
files_reviewed: 85
findings:
  blocker: 0
  high: 0
  medium: 1
  low: 6
  total: 7
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-29
**Depth:** standard
**Branch:** `phase_4` (diff against `c3e993c`, the tip of `phase_3`)
**Result:** There are no BLOCKER or high findings. The one medium and six low findings are recorded and non-blocking. The gate verdict is in `04-REVIEW-GATE.json`.

## Scope

All production (non-test) source files changed by plans 04-01 to 04-22. The list came from `git diff --name-status c3e993c HEAD` excluding `.planning/` and `pnpm-lock.yaml` (179 entries, about 85 non-test source files), cross-checked against the `04-NN-SUMMARY.md` key-files lists. Tests, fixtures and config were read only where they explained behaviour.

Files read in full:

- `packages/itinerary/src/**`: domain, application, infrastructure and `react/index.ts`.
- `packages/api-client` (`keepalive`).
- The `ui-web` changes to Sheet, Toast, InlineAlert and Dialog.
- `apps/web`:
  - composition: `itinerary.client.ts`, `http.client.ts`, `maps-resolve.ts`, `maps-handlers.ts`, `json-body.ts`
  - routes: the `/api/maps/resolve` route and the `(editor)` and `(shell)` route groups
  - `proxy.ts`
  - UI: every file under `modules/itinerary/ui` (editor, header, layout, timeline, list, drag-and-drop, forms, dialogs, drafts, leave guard, save status, pending delete)
  - feedback and error mapping

Locked decisions D-01 to D-51 were treated as requirements, not defects. D-32 (a stale access token may lose the unload DELETE), D-40 (no share dialog), D-51 (no rate limit on resolve) and D-45 (403 page) were not flagged.

Verification run (read-only):

| Check | Result |
|---|---|
| `tsc --noEmit` in `apps/web` and `packages/itinerary` | clean |
| `eslint` in `apps/web` and `packages/itinerary` (includes the layer-boundary rules) | clean |
| `vitest run` in `apps/web` | 95 files, 1417 tests, all passed |

`pnpm lint`, `pnpm typecheck` and `pnpm test` through Turborepo crash on this machine with exit code `3221226505` (0xC0000409), before any task runs. This is a host or turbo problem, not a code problem, so the checks were run per package instead. The `packages/*` tests other than itinerary were not re-run.

## Summary

The architecture follows `tripory-fe--ddd-architecture.md`:

- The domain is pure: no `Date`, no `fetch`, no browser globals.
- The DTO-to-domain ACL lives in `infrastructure`.
- `/http` is imported only from `composition/itinerary.client.ts`.
- Hooks reach the repository only through the factory.
- Server-only logic stays in `composition/server`.

Security-sensitive code was checked closely:

- **`/api/maps/resolve`:**
  - It checks method, then Origin, then session, then body.
  - It uses a source-host allowlist and a host check on every hop.
  - It follows at most 3 hops, with `redirect: "manual"`, a 5 s total timeout and a 2 KB input cap.
  - It never fetches the destination, and replies with `no-store`.
  - No SSRF path was found.
- **Bearer-token handling:** the editor fetches data on the client through the BFF, so a stale Bearer is refreshed before a 403 is concluded (D-46).
- **Request bodies:** write bodies are built from fixed field names, and every response goes through Zod and the mapper.
- **User-controlled strings:** they render only as React text nodes. Cover images accept only `https://`, with `referrerPolicy="no-referrer"`.
- **Drafts:** the `sessionStorage` key includes the viewer id, the TTL is 24 h, and values are re-validated with Zod.

The optimistic-update machinery (shared `mutationKey` and `scope`, snapshot and rollback, settle on the last queued write) is sound. The pending-delete controller is idempotent and clears its state before any side effect.

## Medium

### MD-01: A hidden tab commits the pending delete through the "unload" path, which can silently lose it and leaves the cache out of date

**File:** `apps/web/src/modules/itinerary/ui/use-pending-delete.ts:70` (the commit branch), `:92-94` (the `pagehide` and `visibilitychange` listeners)

**Issue:** D-50 requires the pending DELETE to be sent when the tab becomes hidden. The hook sends every `flush("unload")` through `itineraryUnload.deleteWaypoint`, which uses `bffUnloadHttp`: no session refresh, and a `.catch(() => undefined)` that drops errors. That path was designed for the tab closing (D-32 accepts losing the DELETE on a stale token). The `visibilitychange` to `hidden` case is different: the page stays alive and the user usually comes back.

Consequences for a plain tab switch:

1. If the access token is stale, the BFF returns 401, and the error is swallowed. The user saw "Đã xóa" and the undo toast, but the waypoint was never deleted.
2. `controller.finish` has already cleared `pendingIds`, and the unload branch does not touch the cache or the save-status store. The deleted waypoint reappears when the user returns, until the focus refetch finishes.
3. The save indicator shows neither "Đang lưu…" nor "Lỗi – Thử lại".

D-50 only says to send the DELETE on hidden. It does not require the non-refreshing path.

**Fix:** Use `via: "unload"` only for `pagehide`. For `visibilitychange` to `hidden`, commit on the normal path (`controller.flush("normal")`). It uses `useDeleteWaypoint`, which refreshes the session, applies the optimistic removal, and feeds the save indicator. If a keepalive guarantee is still wanted, run the normal mutation and also send the keepalive request. Or, in the unload branch, apply `withoutWaypoint` to the cache and call `store.markFailed` on failure.

## Low

### LW-01: Opening "Xóa lịch trình" commits the pending waypoint delete and does not order it before the itinerary DELETE

**File:** `apps/web/src/modules/itinerary/ui/itinerary-editor.tsx:307-311`

**Issue:** `handleDeleteItinerary` calls `pending.flush()` before it opens the confirm dialog. Two effects:

- The waypoint delete becomes irreversible even if the user cancels the dialog, because flushing dismisses the undo toast.
- `useDeleteItinerary` has its own mutation key and no scope. The waypoint DELETE (scoped as `itinerary:<id>`) is therefore not sequenced against it. If the user confirms before the DELETE completes, the waypoint request can reach the BE after the itinerary is gone. That gives `Waypoint.NotFound` or `Itinerary.NotFound`, a spurious error toast, and "Lỗi – Thử lại" in the indicator.

**Fix:** Flush when the user confirms (in `onDeleted` or before `remove.mutateAsync`), not when the dialog opens. Or skip the flush entirely, since deleting the itinerary removes the waypoint anyway. Pending ids are cleared on unmount.

### LW-02: Saving trip info does not write the cache, so the title and cover show old data until the refetch ends

**File:** `apps/web/src/modules/itinerary/ui/trip-info-dialog.tsx:160` with `packages/itinerary/src/react/index.ts:160` (`useUpdateMetadata`, no `onSuccess` or `optimistic`)

**Issue:** The dialog closes and the save indicator says "Đã lưu" right after the PUT returns. The cache still holds the previous metadata until `settle` invalidates and the GET returns. The header title, the summary and the document `<title>` flash the old values for one round trip.

**Fix:** Pass `optimistic: (it, input) => ({ ...it, ...input })` (a frozen copy with the four fields applied) in `useUpdateMetadata`, or `setQueryData` in `onSuccess`. The existing rollback and settle logic already handles failure.

### LW-03: The "back to the list" flag ignores in-editor navigation made after entering from the list

**File:** `apps/web/src/modules/itinerary/ui/entry-flag.ts:5` and `itinerary-editor.tsx:53-61`

**Issue:** `enteredFromList()` stays true for the whole editor lifetime. After entering from the list, the user can open "Đổi mật khẩu" from the UserMenu and then use the browser Back button to return to the editor. The editor's back button then calls `router.back()` and lands on the settings page, not the list. The flag is cleared only inside `navigateBack`.

**Fix:** Clear the flag on any in-app navigation away from the editor. `useNavigationGuard.onNavigate` already sees these links. Or compare `history.state` or a stored entry index instead of using a module boolean.

### LW-04: The resolve route parses the whole JSON body before it applies its 2 KB length limit

**File:** `apps/web/src/composition/server/maps-handlers.ts:38`

**Issue:** `readJsonObject(request)` calls `request.json()` and buffers the entire body. The `MAX_URL_LENGTH` check happens afterwards. Only signed-in, same-origin callers can reach this code, so the exposure is small. The BFF already limits bodies to `BFF_MAX_BODY_BYTES` before reading.

**Fix:** Check `content-length` against a small cap (for example 4 KB) before reading. Reject with 413 or 400 `Bff.InvalidBody`.

### LW-05: The Google host regex is copied into two layers, and its country-code branch is wider than needed

**File:** `apps/web/src/composition/server/maps-resolve.ts:15`, `packages/itinerary/src/domain/location-input.ts:35`

**Issue:** The identical `GOOGLE_HOST` regex is defined twice. A fix in one copy will not reach the other, and the two copies guard different things (server allowlist versus client parser). The `[a-z]{2}` branch accepts any two-letter suffix, not only Google's real country domains. The server follows Google-controlled redirects only and returns the URL as text, so this is not exploitable today. It is still the check the SSRF reasoning relies on.

**Fix:** Keep one definition. The domain layer is the natural owner; export the host test from `@tripory/itinerary`, since composition may import the package root. Optionally restrict the suffix to an explicit list of Google country domains.

### LW-06: Smaller correctness and consistency items

**Files and issues:**

- `apps/web/src/modules/itinerary/ui/location-field.tsx:132-137` and `waypoint-form-dialog.tsx:165`. If the form is submitted while a short link has no job yet and no stored resolution, `flush()` returns `{ status: "resolving" }`. `handle` then reports `LOCATION_REQUIRED` ("Vui lòng dán tọa độ hoặc link…") although the field is filled. Fix: have `flush` start `run` for the current short URL when no job exists, or map `resolving` to a "đang đọc link" message.
- `packages/itinerary/src/domain/permissions.ts:9`. The comment cites D-45 (the 403 page). The pending-delete rule for publishing is D-38.
- `packages/itinerary/src/application/use-cases.ts:9`. `reorderWaypoints` is exported and tested but never called. `useReorderWaypoints` calls the repository directly, and the comment in `react/index.ts` explains why. Either call the use case from the hook, which needs the current cache snapshot, or drop the export so the "write command with checks goes through a use case" rule in the architecture doc is not half-applied.

## Not flagged (checked, no defect)

- **Optimistic updates and settle:** `isMutating <= 1` in `settle` counts queued scoped mutations, so only the last write in a drag chain refetches.
- **Reorder `onMutate`:** it runs before the scope queue wait, so the DELETE flush at drag start updates the cache before the reorder validity check.
- **Pending-delete controller:** `pending = null` is set before any side effect, and toast handlers only act while they belong to the current entry. Undo, auto-commit and Sonner's own dismiss cannot double-fire.
- **`parseLocationInput`:** hosts are matched exactly (no `evil.com/maps/…` bypass), `decodeURIComponent` is guarded, and control characters and length are handled.
- **Mapper:** it sorts copies, so cached arrays are not mutated. It throws on invalid ids or coordinates instead of passing bad data on.
- **Route-group split:** `(shell)` and `(editor)` keep the session gate, and `isProtectedPath` protects `/itineraries/{id}/edit` without protecting the future public `/itineraries/{id}`.

---

_Reviewed: 2026-10-29T04:35:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
