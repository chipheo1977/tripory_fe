# 01-08 Vercel Deployment Diagnosis

## Root cause

The linked Vercel project was configured with **Framework Preset: Other**. `pnpm dlx vercel@63.1.2 project inspect` reported:

- Root Directory: `apps/web`
- Node.js Version: `24.x`
- Framework Preset: `Other`
- Output Directory: ``public` if it exists, or `.` ``

A non-secret JSON inspection showed `framework: null` and `outputDirectory: null`. Therefore, `public` was not an explicit Output Directory override; it was the default behavior selected by the incorrect `Other` framework preset. Running the deployment command from the repository root was not the conflict: after correcting the preset, Vercel built the app at `/vercel/path0/apps/web` using the existing Root Directory setting.

## Fix applied

The linked project settings were updated non-interactively with Vercel CLI 63.1.2:

```powershell
pnpm dlx vercel@63.1.2 project update --framework nextjs --auto-detect output-directory --yes
```

A subsequent `pnpm dlx vercel@63.1.2 project inspect` confirmed:

- Framework Preset: `Next.js`
- Output Directory: `Next.js default`
- Root Directory: `apps/web`
- Node.js Version: `24.x`

No custom Output Directory, static export, fake `public` artifact, or `--prebuilt` deployment was used.

## Deployment verification

`pnpm dlx vercel@63.1.2 deploy --prod` completed successfully. The deployment is **Ready** and the production alias is:

- `https://triporyv1.vercel.app`

`pnpm dlx vercel@63.1.2 inspect --logs triporyv1-hx8xyfvj7-loib12s-projects.vercel.app` confirmed:

- pnpm `10.34.6` was selected from the root `package.json`.
- All 8 workspace projects were available during installation.
- Next.js `16.4.0` was detected.
- `turbo run build` invoked `next build` for `@tripory/web`.
- The production output deployed successfully and reached `Ready`.

The CLI also reported that Vercel Authentication deployment protection is currently enabled. This is separate from the failed-build root cause and may affect unauthenticated public smoke checks.

## Repository impact

**Source/config file changed in the repository: NO.**

The fix changed only remote Vercel project settings. This diagnosis note is documentation only. `.vercel/project.json` remains ignored and untracked, and no token or secret environment value was written to the repository.

## Local validation

Run from the repository root after the remote setting update:

- `pnpm lint` — passed (7/7 tasks)
- `pnpm typecheck` — passed (7/7 tasks)
- `pnpm test` — passed (7/7 tasks)
