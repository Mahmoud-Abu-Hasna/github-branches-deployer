# Branch Deployer

A focused desktop app for teams that ship **one codebase as many per-client branches**. Create a new client branch from `main` in a couple of clicks, then cherry-pick a fix across any set of client branches — resolving conflicts file by file — instead of repeating the same git commands in a terminal for every branch.

Built with Electron + React + TypeScript. It shells out to **your own installed `git`** and reuses your existing credentials (SSH keys, credential manager), so it works against any remote — GitHub, GitLab, Bitbucket, or self-hosted.

> Status: early (`v0.1.0`). The core git engine (repo management, branch creation, cherry-pick with conflict resolution) works and is covered by an automated test suite that runs against a disposable fixture repo.

## The problem it solves

If you sell or operate a single product as multiple deployments — one git branch per customer, each forked from a shared `main` — propagating a bug fix means checking out each branch, cherry-picking the same commits, resolving the same conflicts, pushing, and repeating N times. It's slow and error-prone.

Branch Deployer turns that into a guided flow:

1. **Add a repo once** — point it at a local clone and name its base branch.
2. **New client branch** — fork `main`, optionally push it, in one dialog.
3. **Cherry-pick run** — pick commits from `main`, pick the target branches, and the app applies them to each branch in turn, pausing on any conflict so you can resolve it, then pushing each branch when it's clean.

It is deliberately **not** a full git GUI — no staging, no history rewriting, no diffing unrelated files. A few precise operations, done safely against real in-use repos.

## How it differs from pull requests

Pull requests and Branch Deployer both move code between branches, but they're built for opposite situations — they're complementary, not competitors.

| | Pull Request (GitHub/GitLab) | Branch Deployer |
|---|---|---|
| **What it is** | A hosting-platform feature to propose merging one branch into another | A local desktop app that cherry-picks chosen commits across branches |
| **Mechanism** | **Merges** a whole branch (merge commit / squash / rebase) | **Cherry-picks** specific commits — copies them as new commits onto each target |
| **Direction** | Usually feature branch → `main` (integrating new work *in*) | `main` → many client branches (propagating a fix *out*) |
| **Targets per action** | One (this branch into that branch) | Many branches in a single run |
| **What moves** | *Everything* on the source branch not already on the target | Only the exact commits you select — nothing else |
| **Review / discussion / CI** | Yes — that's its main point (approvals, comments, checks) | None — it applies and pushes directly |
| **Where it runs** | On the hosting platform (needs its web UI / API) | On your machine, against your local clone, using your own git |
| **Conflict handling** | Resolved per merge, in the web UI or locally | Paused per file, per branch, as the run hits them |
| **History result** | Branches share commits (same SHAs after merge) | Each branch gets its own copy of the commit (new SHA) — branches stay independent |

In practice you use both: a developer merges a fix into `main` through a reviewed **pull request**, then **Branch Deployer** fans that fix out to the divergent client branches. Doing the fan-out with pull requests would mean one PR per client branch, and merging `main` into a client branch would drag in *all* of main's changes — not just the one fix you want.

> **Honest caveat:** because Branch Deployer skips review and CI and pushes directly, it's a power tool for whoever *owns* the client branches — not a replacement for the pull-request review process on `main` itself. Keep reviewing changes into `main` the normal way; use Branch Deployer only for propagating already-approved commits outward.

## Features

- **Manage multiple repositories** — add as many local repos as you like and switch between them from the sidebar; each keeps its own base branch and settings apply across all of them.
- **Create per-client branches** from the base branch, with optional push and upstream tracking, and branch-name validation.
- **Cherry-pick across many branches in one run** — commits are applied oldest-first; the run reports applied/skipped/pushed status per branch.
- **Per-file conflict resolution** — keep the target branch's version ("ours"), the incoming commit's version ("theirs"), or open the file in your editor and mark it resolved. The app refuses to continue while conflict markers remain.
- **Merge-commit handling** — merge commits are cherry-picked against their first parent (mainline), the same convention GitHub's cherry-pick button uses.
- **Safe by default** — refuses to branch from a dirty working tree, always shows which branch/commit is being acted on, and makes irreversible actions (push, abort) legible.
- **Light/dark aware**, neutral developer-tool UI.

## Requirements

- **Git** installed and available on your `PATH` (`git --version` should work in a terminal). The app does not bundle git — it drives the one you already have, with the credentials it's already configured to use.
- **Node.js 18+** and npm — only to build/run from source (see below). A packaged binary needs no Node.
- **OS**: Windows or macOS (Electron 44).
- A **local clone** of each repo you want to manage, already authenticated for push (via SSH key or a git credential helper).

## Install / run from source

```bash
git clone <your-fork-url> branch-deployer
cd branch-deployer
npm install

# run in development (hot reload)
npm run dev

# or build a distributable
npm run build:win     # Windows installer
npm run build:mac     # macOS app
```

Build output lands in `out/` (dev) and `release/`/`dist/` (packaged); both are gitignored.

## Usage

1. **Add a repo** — click *Add Repo*, choose the local folder of a git clone, give it a name, and set its base branch (e.g. `main`). The remote URL is read from `origin` automatically.
2. **Fetch** to refresh branch and commit state from the remote.
3. **New branch** — create a per-client branch from the base branch; tick *push* to publish it with upstream tracking.
4. **Cherry-pick** — open the wizard, select the commits to propagate, select the target branches, and start the run. On a conflict the run pauses on the affected file; resolve each file, then *Continue* — or *Abort* to roll that branch's cherry-pick back cleanly.

## How it works / security model

- **Git runs only in the Electron main process**, never in the renderer. The UI talks to it over a typed IPC bridge exposed through a `contextBridge` preload — the renderer has no Node access.
- The window is created with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. External links open in your system browser rather than in-app.
- All git invocations go through [`simple-git`](https://github.com/steveukx/git-js) with **arguments passed as arrays** (no shell string interpolation), and branch names are validated against git's ref-name rules — so a crafted branch name can't inject a command.
- **No accounts, no OAuth, no tokens.** The app stores no credentials. Authentication is entirely whatever your system `git` is already set up to do; the only thing persisted locally (via `electron-store`) is the list of repos you added and your preferences.
- The optional "external editor command" in Settings is a program *you* name; it's launched directly (no shell), with the conflicted file as its argument.

## Development

```bash
npm run dev          # run with hot reload
npm test             # run the vitest suite (incl. real-git integration tests)
npm run typecheck    # tsc for both main and renderer
npm run lint         # eslint
npm run format       # prettier
```

The test suite spins up a disposable fixture git repo and exercises the real git service and cherry-pick runner end to end (branch listing, ahead/behind, conflict resolution for "ours"/"theirs", merge-commit cherry-pick, abort). It takes ~30s because it runs real git.

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck`, `npm run lint`, and `npm test` before opening a PR.

## License

[MIT](./LICENSE) © 2026 Mahmoud Abu Hasna
