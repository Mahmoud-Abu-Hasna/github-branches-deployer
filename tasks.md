# Branch Deployer — Task List

Desktop app (Electron + React + TS) to create per-client branches from `main` and
cherry-pick commits across branches, for any git repo. See the approved plan at
`C:\Users\LENOVO\.claude\plans\i-have-project-called-bubbly-cake.md` for full
architecture/context.

**Resuming after an interruption (e.g. a usage limit):** work top-to-bottom, phase
by phase. Each unchecked task is small and self-contained — pick up at the first
unchecked box. Each phase ends in a working, testable state, so it's always safe to
stop between tasks.

## UI Redesign (unplanned, done after Phase 8)
The functional UI from Phases 1–8 was plain unstyled native controls. After the
user tried the app and called it "too bad," ran a full design pass via the
`impeccable` skill: wrote `PRODUCT.md`, chose a direction (offered a bold
terminal/bitmap concept vs. the "standing exit" — user picked the restrained
Linear/GitHub-Desktop/Vercel-register canon), and rebuilt every screen against a
real design-token system (`src/renderer/src/index.css`) — colors, type scale,
spacing, radii, shadows, light/dark via `prefers-color-scheme`. Also restructured
navigation: added a persistent sidebar (repo switcher + settings) instead of a
flat page stack, and converted the cherry-pick wizard from a modal to a full
in-page view (multi-step guided flows shouldn't be modals). Added `lucide-react`
for icons. Wrote `DESIGN.md` recording the resulting system. See `PRODUCT.md` and
`DESIGN.md` at the project root for the full record.
**Not verified in a real window** — same Electron-sandbox limitation as
everywhere else in this file; the mechanical design-slop detector found zero
issues, and `tsc`/`eslint`/`electron-vite build` all pass, but please look at it
for real and say if anything reads wrong.

## Bug fix: "Add Repo" failing silently
User reported clicking Browse in Add Repo did nothing (no file explorer, no
error). Root cause: several async click handlers across the renderer had no
`try/catch` (`AddRepoDialog.handlePickFolder` in particular), so any failure
from the main process became an **unhandled promise rejection** — invisible to
the user. Fixed by:
- Adding `try/catch` with visible error messages to every previously-unguarded
  handler (`AddRepoDialog`, `RepoListPage.handleRemove`,
  `SettingsPage.handleSave`, `CommitPickerStep`/`TargetBranchPickerStep` data
  loads, `RunProgressStep.handleContinue/handleAbort`,
  `ConflictResolutionStep.loadVersions/handleOpenInEditor`). Also fixed a
  related bug in `handleContinue`: it cleared the conflict-resolution view
  *before* awaiting `continueCherryPick`, so a failed continue (e.g. a file
  still unresolved) left the user stuck with no way back into that screen.
- Added a global safety net (`ToastProvider`, `window.addEventListener`
  `unhandledrejection`/`error`) that surfaces any error I still missed as a
  dismissible toast, instead of ever failing silently again — this was Phase
  9.3 ("global error boundary + toast system"), pulled forward because this
  bug made clear it couldn't wait.
- Root cause found from the follow-up error text ("Cannot read properties of
  undefined (reading 'repos')" — i.e. `window.api` itself was `undefined`):
  the preload script was built as an **ES module** (`out/preload/index.mjs`,
  electron-vite's default whenever `package.json` has `"type": "module"` and
  the installed Electron version is new enough). Electron's **sandboxed**
  preload scripts (`sandbox: true`, set in `src/main/index.ts`) do not
  reliably execute an ESM preload — `contextBridge.exposeInMainWorld` never
  ran, so `window.api` was never created and every IPC call crashed on
  `window.api.repos`. Fixed by forcing the preload build to CommonJS output
  (`electron.vite.config.ts` → `preload.build.rollupOptions.output.format:
  'cjs'`, which changes the output file to `out/preload/index.cjs`) and
  updating the loaded path in `src/main/index.ts` to match. CJS is the
  traditional, universally-supported preload format regardless of sandbox
  settings or Electron version.

**That CJS fix wasn't the whole story.** Same error persisted. Added
diagnostics (preload path/exists check, `webContents` `preload-error`
listener, renderer-console forwarding to the main terminal) and got the real
error: `Error: module not found: @electron-toolkit/preload`. **Sandboxed
Electron preload scripts (`sandbox: true`) can only `require()` Node builtins
and Electron's own API — not arbitrary third-party npm packages** — so
`@electron-toolkit/preload` (only used for the unused `window.electron`
scaffold leftover, never referenced anywhere in this app's own code) crashed
the whole preload script before it ever reached `contextBridge.exposeInMainWorld`.
Fixed by removing it entirely: dropped the import/usage from
`src/preload/index.ts` and `index.d.ts`, and removed the now-unused dependency
from `package.json`. The preload bundle now only `require()`s `"electron"`
itself, confirmed by inspecting the built `out/preload/index.cjs`.

## Phase 0 — Project Setup
- [x] 0.1 Scaffold with electron-vite `react-ts` template (hand-scaffolded — the
      `create-electron` CLI needs an interactive prompt this environment can't
      answer); `electron-vite build` succeeds for main/preload/renderer.
      **Not yet verified:** `npm run dev` opening an actual window — the Electron
      binary download hung with no progress in this sandbox (no proxy/mirror
      configured, no cache files ever appeared). Run `npm run dev` once on your
      own machine to confirm the window opens; if it hangs on "Downloading
      Electron binary" there too, set `ELECTRON_MIRROR`/`ELECTRON_CUSTOM_DIR` or
      check your network/proxy.
- [x] 0.2 `git init` the app's own repo; `.gitignore` (node_modules, out, release, dist); initial commit.
- [x] 0.3 ESLint + Prettier + TS strict mode; `npm run lint` / `npm run typecheck` scripts. (TypeScript pinned to ^5.9.3, not the newer 7.x line — typescript-eslint doesn't support TS7 yet.)
- [x] 0.4 `src/shared/types.ts` placeholder domain types; path aliases (`@shared/*`, `@main/*`, `@renderer/*`).
- [x] 0.5 BrowserWindow security defaults (`contextIsolation`, `nodeIntegration: false`, `sandbox`, CSP meta tag).
- [x] 0.6 Install `simple-git`, `electron-store`; smoke-tested `simple-git` import directly (OK). `electron-store` transitively requires the `electron` package, which only fully resolves once the Electron binary is present — expected, will work on your machine.

## Phase 1 — Persistence & Repo Management
- [x] 1.1 `main/services/repoStore.ts` (typed electron-store wrapper).
- [x] 1.2 `repo:list` / `repo:add` / `repo:remove` IPC handlers.
- [x] 1.3 `repo:pickLocalFolder` (native dialog, validates `.git` present).
- [x] 1.4 Preload `window.api.repos.*` / `window.api.settings.*` + ambient types.
- [x] 1.5 `RepoListPage.tsx` (list + empty state).
- [x] 1.6 "Add Repo" flow UI (folder picker → name/base-branch form → add).
- [x] 1.7 `SettingsPage.tsx` shell (external editor field, cherry-pick strategy). Repo removal lives on RepoListPage instead (natural place next to each repo card).
- [x] 1.8 Basic routing between RepoList / RepoDashboard (stub) / Settings (plain useState view switch, no router dependency needed yet).

  **Not yet manually verified in a real window** (Electron binary couldn't
  download in this sandbox — see Phase 0 note). `electron-vite build` +
  `tsc --noEmit` + `eslint` all pass. Please run `npm run dev` on your machine
  and click through: Add Repo → pick a folder → appears in list → click into
  dashboard stub → Settings tab saves. Report back anything that looks wrong.

## Phase 2 — Git Read Operations
- [x] 2.1 `gitService.fetch(repo)`.
- [x] 2.2 `gitService.isWorkingTreeClean(repo)`.
- [x] 2.3 `gitService.listBranches(repo)` with ahead/behind vs base.
- [x] 2.4 `gitService.getLog(repo, branch, skip, limit, search)`.
- [x] 2.5 Wire `git:fetch` / `git:listBranches` / `git:getLog` / `git:isWorkingTreeClean` IPC + preload.
- [x] 2.6 `RepoDashboardPage.tsx` branch table + Fetch button.
- [x] 2.7 Manual test — verified the exact raw git commands used by `gitService`
      (`branch -a -v`, `log --pretty=format:...`, `rev-list --left-right --count`)
      directly against this app's own real repo (not sahel), including a temp
      branch to confirm ahead/behind math is correct. Full UI click-through still
      needs your machine (see Phase 0 note on the Electron binary download).

## Phase 3 — Branch Creation
- [x] 3.1 `gitService.createBranch(repo, name, fromBranch, push)` with pre-flight checks + ref-name validation.
- [x] 3.2 Wire `git:createBranch` IPC + preload.
- [x] 3.3 `NewBranchDialog.tsx` (name input, base branch field, push checkbox).
- [x] 3.4 Wire into dashboard, refresh on success, surface errors.
- [x] 3.5 Manual test: simulated the exact command sequence (`checkout -b <new>
      <base>`, `push -u origin <new>`) against a disposable temp bare-origin +
      working-clone repo — new branch created from base and pushed correctly.
      Full UI click-through still needs your machine.

## Phase 4 — Test Fixture Infrastructure
- [x] 4.1 `tests/e2e/setup-test-repo.ts` (temp working repo + temp bare origin, seeded `main` + `branch-a`/`branch-b`).
- [x] 4.2 Deliberate conflicting-commit scenario helper (built into setup: a commit
      on `main` and a commit on `branch-a` both edit the same line of
      `shared.txt` differently, so cherry-picking main's commit onto branch-a
      always conflicts).
- [x] 4.3 Teardown helper (`fixture.cleanup()`) + `npm run fixture:up` manual-spin-up script (via `tsx`).
- [x] 4.4 Installed Vitest (was already in package.json from Phase 0); wrote and
      passed 3 unit tests (`vitest.config.ts` + `tests/gitService.test.ts`)
      against the fixture — `getLog` ordering, `listBranches` ahead/behind math,
      `isWorkingTreeClean`. Found and fixed two real bugs in the fixture script
      along the way (workDir created after simple-git needed it to exist;
      double-checkout of an already-created branch).

## Phase 5 — Cherry-Pick Core (clean path)
- [x] 5.1 `startCherryPickRun` skeleton (chronological sort via `sortShasChronologically`, in-memory run state keyed by `runId`, in `cherryPickRunner.ts`).
- [x] 5.2 Sequential clean-path loop: checkout, pull `--ff-only`, cherry-pick `--no-edit` per commit, push, progress events.
      **Design note:** built the loop conflict-aware from the start (pause on
      conflict, resumable state) since Phase 7 needed to hook into the same
      loop anyway — see the Phase 7 note below for what got pulled forward.
- [x] 5.3 Progress event channel (main → renderer via `webContents.send`) + preload `events.onCherryPickProgress` subscribe/unsubscribe wrapper.
- [x] 5.4 `git:startCherryPickRun` invoke handler.
- [x] 5.5 Unit test: clean 1-commit/1-branch cherry-pick (verifies applied + pushed + file content).
- [x] 5.6 Unit test: multi-commit/multi-branch sequential run (verifies chronological ordering is enforced regardless of selection order).

  **3 real bugs found and fixed while testing against the fixture repo (not
  hypothetical — each reproduced with a real `git` process):**
  1. `git cherry-pick --continue` after resolving every conflict as "ours" can
     leave zero diff vs HEAD; git then refuses `--continue` ("nothing to
     commit") and wants `--skip` instead — `continueCherryPick` now catches
     this and falls back to `--skip`, recording the commit as skipped.
  2. `simple-git` blocks `GIT_EDITOR`/`core.editor` overrides by default as an
     unsafe-injection guard; fixed by explicitly opting in
     (`unsafe: { allowUnsafeEditor: true }`) for that one call — and by NOT
     spreading the full `process.env` into `.env()` (a stray `GIT_ASKPASS` in
     this dev environment tripped the same guard).
  3. `finishBranch` was gating the push on `!result.conflicted`, but that flag
     just means "this branch hit a conflict at some point in the run" for
     reporting — it stayed `true` after a successful resolution, so a resolved
     branch's push was silently skipped. Fixed to gate only on `!result.error`.

## Phase 6 — Cherry-Pick Wizard UI (clean path)
- [x] 6.1 `CommitPickerStep.tsx` (source branch, debounced-search commit list with checkboxes + select-all).
      **Fix (post-first-real-test):** was hardcoded to a single 30-commit page
      with no way to see older commits. Added a "Load 30 more" control that
      appends the next page (`skip: commits.length`) and tracks `hasMore`;
      "select all" is now explicitly labeled "Select all loaded" since it only
      ever applies to what's fetched so far.
- [x] 6.2 `TargetBranchPickerStep.tsx` (checkboxes, select-all, excludes source branch).
- [x] 6.3 Wizard state + Next/Back nav — **plain `useState` in `CherryPickWizard.tsx`
      instead of zustand.** The wizard is a single linear flow with no state
      shared outside its own component tree, so a global store added nothing;
      removed the unused `zustand` dependency from package.json.
- [x] 6.4 `RunProgressStep.tsx` (live progress from `events.onCherryPickProgress`, text log).
      **Fix (post-first-real-test):** in dev mode (React `StrictMode`), the
      effect subscribing to progress events was gated behind the same
      `started` ref used to guard the one-time `startCherryPickRun` IPC call.
      StrictMode's dev-only mount→cleanup→mount-again cycle unsubscribed the
      listener on the first cleanup, then the second effect invocation hit
      the `started.current` guard and returned before ever resubscribing —
      so the cherry-pick genuinely ran on the backend (git operations really
      happened) but the renderer never received another event again: stuck
      showing "Running…" forever, no conflict ever surfaced. Fixed by always
      (re-)subscribing on every effect invocation and only guarding the
      actual `startCherryPickRun` call with the ref.
- [x] 6.5 `SummaryStep.tsx` (final per-branch results table).
- [ ] 6.6 Manual E2E test of full wizard, clean path — **not yet done** (needs
      the Electron window; see Phase 0 note). Ready for you to try once
      `npm run dev` works on your machine.

## Phase 7 — Conflict Detection & Resolution (service layer)
**Implemented alongside Phase 5**, not as a separate later pass — the run loop
needed conflict detection/pause built in from the start (see Phase 5 note), so
it made more sense to finish the whole engine in one piece than to write a
throwaway clean-only loop and rewrite it here.
- [x] 7.1 `getConflictFiles(repo)` (parse `git status --porcelain=v1` conflict codes) — in `gitService.ts`.
- [x] 7.2 Cherry-pick loop pauses and emits a `conflict` progress event as soon as a cherry-pick fails with conflicted files.
- [x] 7.3 `getFileVersions(repo, filePath)` via `git show :2:`/`:3:` — in `gitService.ts`.
- [x] 7.4 `resolveFile(repo, filePath, resolution)` for ours/theirs/manual (+ conflict-marker regex guardrail for manual) — in `cherryPickRunner.ts` (tied to run state, so it lives with the runner rather than gitService).
- [x] 7.5 `openInExternalEditor(repoId, filePath)` — in the IPC handler directly (uses Electron's `shell`/`spawn`, not appropriate for the Electron-agnostic `gitService`).
- [x] 7.6 `continueCherryPick(runId)` and `abortCherryPick(runId)` — keyed by `runId` rather than `repoId` (matches the plan's intent, more precise if a repo ever had >1 concurrent run).
- [x] 7.7 Wired all channels (`git:getConflictFiles`, `git:getFileVersions`, `git:resolveFile`, `git:openInExternalEditor`, `git:continueCherryPick`, `git:abortCherryPick`) + preload.
- [x] 7.8 Unit test: conflict → resolve-theirs → continue → verify (found bug #3 above via this test).
- [x] 7.9 Unit tests: resolve-ours path (found bug #1 above), abort path — all passing.

## Phase 8 — Conflict Resolution UI
- [x] 8.1 `ConflictResolutionStep.tsx` shell (conflicted file list, expand/collapse per file).
- [x] 8.2 Two-pane read-only Ours/Theirs viewer per file (fetched via `getFileVersions`, lazy-loaded on expand).
- [x] 8.3 Per-file Keep Ours / Keep Theirs buttons + Open in Editor / Mark Resolved Manually fallback (buttons instead of the originally-sketched radio group — clearer as one-click actions since choosing applies immediately rather than needing a separate submit).
- [x] 8.4 Continue/Abort controls (Continue disabled until every conflicted file is resolved).
- [x] 8.5 Wired into `RunProgressStep`: renders `ConflictResolutionStep` in place of the log view whenever a `conflict` progress event arrives.
- [ ] 8.6 Manual E2E test of conflict scenario through the UI — **not yet done**,
      same Electron-window limitation as 6.6. The underlying engine's conflict
      path is thoroughly covered by the Phase 5/7 unit tests (resolve-ours,
      resolve-theirs, abort all pass against a real git conflict), so the risk
      here is UI wiring only, not git logic.

## Phase 9 — Polish & Safety
- [ ] 9.1 Clean-tree guard UI messaging before New Branch / Cherry-Pick.
- [ ] 9.2 Pre-run diverged-branch detection + per-branch skip option.
- [ ] 9.3 Global error boundary + toast system for git stderr.
- [ ] 9.4 Loading/disabled states to prevent double-invocation.
- [ ] 9.5 App icon, window title, About/Settings polish.
- [ ] 9.6 IPC input validation (stale repo id/path) audit.

## Phase 10 — Packaging
- [ ] 10.1 Install electron-builder; write `electron-builder.yml`.
- [ ] 10.2 `build:win` script; local NSIS build + smoke test.
- [ ] 10.3 `build:mac` script + doc note (macOS/CI required); stretch: GH Actions macOS workflow.
- [ ] 10.4 Verify unsigned build launches on a clean machine/VM if available; document Gatekeeper/SmartScreen workaround in README.

## Phase 11 — Automated Testing Pass
- [ ] 11.1 Install `@playwright/test` w/ Electron support + config-dir override launcher.
- [ ] 11.2 E2E: add-repo flow.
- [ ] 11.3 E2E: clean cherry-pick full flow.
- [ ] 11.4 E2E: conflicting cherry-pick flow.
- [ ] 11.5 E2E: multi-branch select-all run.
- [ ] 11.6 E2E: abort mid-run flow.
- [ ] 11.7 Wire `npm test` (Vitest + Playwright); `docs/TESTING.md` note.

## Phase 12 — Real-World Validation
- [ ] 12.1 Clone `github.com/Dndtech/sahl_api` to a scratch location (separate from the user's real working copy).
- [ ] 12.2 Add as managed repo; verify branch list matches known branches with correct ahead/behind.
- [ ] 12.3 Real "new branch from main" test on the scratch clone (throwaway branch, deleted after).
- [ ] 12.4 Real cherry-pick of a small commit set onto 2–3 throwaway branches; verify integrity, then discard scratch clone.
