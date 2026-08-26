# Branch Deployer — Task List

Desktop app (Electron + React + TS) to create per-client branches from `main` and
cherry-pick commits across branches, for any git repo. See the approved plan at
`C:\Users\LENOVO\.claude\plans\i-have-project-called-bubbly-cake.md` for full
architecture/context.

**Resuming after an interruption (e.g. a usage limit):** work top-to-bottom, phase
by phase. Each unchecked task is small and self-contained — pick up at the first
unchecked box. Each phase ends in a working, testable state, so it's always safe to
stop between tasks.

## Phase 0 — Project Setup
- [ ] 0.1 Scaffold with electron-vite `react-ts` template; verify `npm run dev` opens a blank window.
- [ ] 0.2 `git init` the app's own repo; `.gitignore` (node_modules, out, release, dist); initial commit.
- [ ] 0.3 ESLint + Prettier + TS strict mode; `npm run lint` / `npm run typecheck` scripts.
- [ ] 0.4 `src/shared/types.ts` placeholder domain types; path aliases (`@shared/*`, `@main/*`, `@renderer/*`).
- [ ] 0.5 BrowserWindow security defaults (`contextIsolation`, `nodeIntegration: false`, `sandbox`, CSP meta tag).
- [ ] 0.6 Install `simple-git`, `electron-store`; smoke-test import from main.

## Phase 1 — Persistence & Repo Management
- [ ] 1.1 `main/services/repoStore.ts` (typed electron-store wrapper).
- [ ] 1.2 `repo:list` / `repo:add` / `repo:remove` IPC handlers.
- [ ] 1.3 `repo:pickLocalFolder` (native dialog, validates `.git` present).
- [ ] 1.4 Preload `window.api.repos.*` / `window.api.settings.*` + ambient types.
- [ ] 1.5 `RepoListPage.tsx` (list + empty state).
- [ ] 1.6 "Add Repo" flow UI (folder picker → name/base-branch form → add).
- [ ] 1.7 `SettingsPage.tsx` shell (repo removal, external editor field).
- [ ] 1.8 Basic routing between RepoList / RepoDashboard (stub) / Settings.

## Phase 2 — Git Read Operations
- [ ] 2.1 `gitService.fetch(repo)`.
- [ ] 2.2 `gitService.isWorkingTreeClean(repo)`.
- [ ] 2.3 `gitService.listBranches(repo)` with ahead/behind vs base.
- [ ] 2.4 `gitService.getLog(repo, branch, skip, limit, search)`.
- [ ] 2.5 Wire `git:fetch` / `git:listBranches` / `git:getLog` / `git:isWorkingTreeClean` IPC + preload.
- [ ] 2.6 `RepoDashboardPage.tsx` branch table + Fetch button.
- [ ] 2.7 Manual test against a small real local repo (not sahel).

## Phase 3 — Branch Creation
- [ ] 3.1 `gitService.createBranch(repo, name, fromBranch, push)` with pre-flight checks + ref-name validation.
- [ ] 3.2 Wire `git:createBranch` IPC + preload.
- [ ] 3.3 `NewBranchDialog.tsx` (name input, base branch dropdown, push checkbox).
- [ ] 3.4 Wire into dashboard, refresh on success, surface errors.
- [ ] 3.5 Manual test against disposable fixture repo.

## Phase 4 — Test Fixture Infrastructure
- [ ] 4.1 `tests/e2e/setup-test-repo.ts` (temp working repo + temp bare origin, seeded `main` + `branch-a`/`branch-b`).
- [ ] 4.2 Deliberate conflicting-commit scenario helper.
- [ ] 4.3 Teardown helper + manual-spin-up npm script.
- [ ] 4.4 Install Vitest; first unit test against the fixture (`getLog`, `listBranches`).

## Phase 5 — Cherry-Pick Core (clean path)
- [ ] 5.1 `startCherryPickRun` skeleton (chronological sort, in-memory run state keyed by `runId`).
- [ ] 5.2 Sequential clean-path loop: checkout, pull `--ff-only`, cherry-pick `--no-edit` per commit, push, progress events.
- [ ] 5.3 Progress event channel (main → renderer) + preload subscribe wrapper.
- [ ] 5.4 `git:startCherryPickRun` invoke handler.
- [ ] 5.5 Unit test: clean 1-commit/1-branch cherry-pick.
- [ ] 5.6 Unit test: multi-commit/multi-branch sequential run.

## Phase 6 — Cherry-Pick Wizard UI (clean path)
- [ ] 6.1 `CommitPickerStep.tsx` (source branch, checkboxes, select-all, search).
- [ ] 6.2 `TargetBranchPickerStep.tsx` (checkboxes, select-all).
- [ ] 6.3 Wizard state (zustand) + Next/Back nav.
- [ ] 6.4 `RunProgressStep.tsx` (live progress from events).
- [ ] 6.5 `SummaryStep.tsx` (final per-branch results).
- [ ] 6.6 Manual E2E test of full wizard, clean path.

## Phase 7 — Conflict Detection & Resolution (service layer)
- [ ] 7.1 `getConflictFiles(repo)` (parse `git status --porcelain=v1` conflict codes).
- [ ] 7.2 Extend cherry-pick loop: on conflict, emit event and pause run.
- [ ] 7.3 `getFileVersions(repo, filePath)` via `git show :2:`/`:3:`.
- [ ] 7.4 `resolveFile(repo, filePath, resolution)` for ours/theirs/manual (+ conflict-marker guardrail for manual).
- [ ] 7.5 `openInExternalEditor(repo, filePath)`.
- [ ] 7.6 `continueCherryPick` (`--no-edit`/`GIT_EDITOR=true`) and `abortCherryPick`.
- [ ] 7.7 Wire all new IPC channels + preload.
- [ ] 7.8 Unit test: conflict → resolve-ours → continue → verify.
- [ ] 7.9 Unit tests: resolve-theirs path, abort path.

## Phase 8 — Conflict Resolution UI
- [ ] 8.1 `ConflictResolutionStep.tsx` shell (conflicted file list).
- [ ] 8.2 Two-pane read-only Ours/Theirs viewer per file.
- [ ] 8.3 Per-file Ours/Theirs radio + external-editor / mark-resolved fallback.
- [ ] 8.4 Continue/Abort controls (Continue enabled only once all files resolved).
- [ ] 8.5 Wire into RunProgressStep flow (inline on `conflict` event).
- [ ] 8.6 Manual E2E test of conflict scenario through the UI.

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
