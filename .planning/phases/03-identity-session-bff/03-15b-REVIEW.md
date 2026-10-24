# BFF forwards shared secret and client IP to BE for rate-limited auth calls (D-35)

The BE now rate-limits login (5/min), register (3/h) and refresh (20/min) per IP and only trusts `X-Forwarded-For` when `X-Bff-Secret` matches. This change adds an optional server-only `BFF_SHARED_SECRET`, a pure `deriveClientIp` helper, and lets `callBackend` attach both headers, but only for login, register and refresh. Login/register pass a BE 429 through to the browser with `errorCode`, message and a sanitised `Retry-After`. Refresh keeps its 429 => 503 keep-cookies behaviour. Reviewed range: `3dccda1..ba4e708` (3 commits). Verification evidence is in all three commit messages: lint 8/8, typecheck 8/8, test 8/8 (web 845 tests), build OK. Nothing re-run.

Watch for: (1) `deriveClientIp` falls back to `x-real-ip` / `x-forwarded-for`, which are client-controllable off Vercel; the helper's doc comment records this, and it only matters when the secret is also set (possible, LOW, non-blocking). (2) `.planning/config.json` and `packages/api-client/src/fetch-http-client.ts` are still modified in the working tree but NOT in any of the three commits (confirmed).

**Verdict**: APPROVED

## High-level view

The secret is parsed in `composition/server/env.ts` as an optional key that is absent when unset or empty, and it rejects control characters without echoing the value. It is declared in `turbo.json` (build and dev) and in `.env.example` as a commented dev placeholder. It is referenced only inside `composition/server/**`, and the static invariants now enforce that.

`callBackend` is the only place the two headers are built. It strips any caller-supplied `x-bff-secret` / `x-forwarded-for` (case-insensitive) and then adds them only when the secret is set and `clientIp` passes `isIP`. The no-IP case sends nothing, with a documented reason: BE falls back to the socket IP anyway, so sending the secret would only add exposure. Only the three rate-limited handlers pass `clientIp`; change-password and the generic proxy do not. The generic proxy also builds its own header allowlist (`accept`, `content-type`, server-set `authorization`), so browser-supplied headers never reach `callBackend`.

429 handling is a small addition in `forwardUpstream`: status and body already passed through, and `Retry-After` is now copied when `callBackend` extracted a 1-7 digit integer. Refresh does not use `forwardUpstream` for non-success, so its 503 `Bff.RefreshUnavailable` path is untouched, and a new test pins it. No feedback-map entry was added; `RateLimit.TooManyRequests` falls through to the BE message, and the new `UNMAPPED` entry plus a dedicated test lock this in.

Docs: BE-DEPENDENCIES items 1 and 2 were updated and items 15 and 16 added, D-35 was added to CONTEXT, and UAT section A got the secret line and a rate-limit note. Plan 03-15 files have no diff, and no UAT results were filled in.

<details>
<summary>Issues (3)</summary>

1. **Spoofable fallback headers off Vercel (possible, LOW, non-blocking)** — `x-real-ip` and `x-forwarded-for` are accepted from the request. If hosting moves off Vercel without a header-overwriting proxy while the secret is set, a client could pick its own rate-limit bucket. Re-check on any hosting change, as the comment in `client-ip.ts` already says.
2. **IPv6 zone IDs accepted (possible, LOW)** — `isIP("fe80::1%eth0")` returns 6, so a zone-suffixed value would be forwarded as-is. It is harmless for header safety, since `isIP` rejects CR/LF, but it could be rejected for tidiness.
3. **Dev placeholder secret in docs and `.env.example` (confirmed, informational)** — `dev-bff-secret-change-me` appears commented out in `.env.example` and uncommented inside a UAT checklist code block. It matches the BE's committed `appsettings.Development.json` value and is not a real secret. Make sure production never uses it.

</details>

<details>
<summary>Details</summary>

## Header construction in callBackend and the /api/bff proxy

`withRateLimitHeaders` filters caller headers before adding its own, so the only route to `x-bff-secret` / `x-forwarded-for` is the `clientIp` parameter plus env. The `isIP` re-check inside `callBackend` is deliberate defence in depth on top of `deriveClientIp`: a CRLF or multi-IP string cannot become a header value. When there are no headers and no usable secret/IP it returns `undefined`, so the previous call shape is unchanged.

The proxy test sends `x-bff-secret`, `X-Forwarded-For`, `x-real-ip` and `x-vercel-forwarded-for` on GET and POST while the secret is configured. It asserts none reach the BE and that neither the forged value nor the secret appears in the outgoing headers. That covers the injection concern directly, and it passes because the proxy never forwards request headers beyond the allowlist.

## Secret containment

No `console` or logging call was added. The env error message names the variable but not the value, and a test asserts that. Tests also assert the secret is absent from login responses (success, 429, 500) including headers, from the refresh 429 body, and from the invalid-URL error. The static invariants walk non-test sources under `apps/web/src`: one fails on any `BFF_SHARED_SECRET` / `bffSharedSecret` outside `composition/server/`, one fails on `NEXT_PUBLIC_*BFF|SHARED_SECRET` in sources, `turbo.json`, `.env.example` and `next.config.*`, and one fails if `next.config.*` mentions the secret (inlining via `env`). `.env.local` is not in the diff. No ESLint boundary or allowlist file changed.

## 429 passthrough versus refresh

For login and register a BE 429 reaches the client as 429 with the BE envelope, `content-type`, `cache-control: no-store`, no `Set-Cookie`, and `Retry-After` only when valid. Date-form and oversize values are dropped on purpose, so the BE cannot push arbitrary strings into a browser header. The refresh test confirms 503, the `Bff.RefreshUnavailable` error code, no cookie changes, and no `Retry-After`.

Not tested: `Retry-After` on a 429 from change-password or the generic proxy. Neither forwards it, since the BE does not rate-limit them.

</details>

<details>
<summary>File map</summary>

- `apps/web/src/composition/server/env.ts` / `env.test.ts`: optional `bffSharedSecret`, control-character check, tests
- `apps/web/src/composition/server/upstream.ts` / `upstream.test.ts`: `clientIp`, header stripping and injection, `retryAfter`
- `apps/web/src/composition/server/client-ip.ts` / `client-ip.test.ts`: new pure helper citing https://vercel.com/docs/headers/request-headers
- `apps/web/src/composition/server/auth-handlers.ts` and its credentials/refresh tests: pass IP, forward `Retry-After`
- `apps/web/src/composition/server/bff.ts` / `bff.forward.test.ts`: comment only, plus the injection test
- `apps/web/src/auth-invariants.test.ts`: three secret invariants
- `apps/web/src/lib/feedback/select-error-message.test.ts`: `RateLimit.TooManyRequests` test
- `turbo.json`, `apps/web/.env.example`: env declaration
- `.planning/phases/03-identity-session-bff/03-{BE-DEPENDENCIES,CONTEXT,UAT-CHECKLIST}.md`: docs

Full diff: `git diff 3dccda1 ba4e708`

</details>
