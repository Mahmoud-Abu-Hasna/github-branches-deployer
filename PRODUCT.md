# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers who sell or operate a single codebase as multiple client deployments,
where each client gets their own git branch forked from a shared `main` (the
motivating case: a Laravel app called "sahel," sold as product-as-a-service, with
one branch per client like `beauty-time`, `gas`, `hyper-cleaning`). Today it's used
solo by the app's author, but it's built as a general-purpose tool anyone could run
on their own machine — it operates on whatever git repo the user points it at and
authenticates as whatever git/GitHub identity is already configured on that
machine (no built-in accounts or hosted auth of its own).

## Product Purpose

Removes the manual, repetitive git workflow of standing up a new client branch and
propagating a fix from `main` into some or all client branches by hand. Success is
a desktop app where creating a new client copy and safely applying upstream
commits to chosen branches (including resolving cherry-pick conflicts) takes a few
clicks instead of a sequence of terminal commands repeated per branch.

## Positioning

A focused, repo-agnostic branch/cherry-pick tool — not a full git GUI (no staging,
diffing unrelated files, or history rewriting) and not tied to GitHub's API or any
hosting provider. It shells out to the user's own installed git and reuses their
existing credentials (SSH keys, credential manager), so it works against any git
remote a neighboring "GitHub desktop client" style tool would refuse to touch.

## Operating Context

Runs as an Electron desktop app (Windows and macOS) against local clones of git
repos already on disk. The core loop: add a repo once, then repeatedly either (a)
create a new branch from `main` for a newly sold client copy and push it, or (b)
pick a set of commits from `main` and apply them across a chosen set of client
branches, resolving any merge conflicts per file as they occur. Runs unattended
mid-flow are not expected — a human is present to resolve each conflict as the
run pauses on it.

## Capabilities and Constraints

- Plain git only: clone/fetch/branch/cherry-pick/push against any remote (GitHub,
  GitLab, self-hosted). No GitHub API, no OAuth/PAT flow, no bundled credential
  storage — auth is whatever the system's git is already configured to do.
- Cherry-pick conflicts are resolved per file as a whole-file choice (keep the
  target branch's version or the incoming commit's version), with a fallback to
  open the file in an external editor and mark it manually resolved. Not a
  line-by-line/hunk-level merge editor.
- Git operations run in the Electron main process only, never the renderer.
- Requires the system's `git` binary to be installed and on PATH.

## Evidence on Hand

No existing screenshots, logos, or brand assets — the UI so far is unstyled native
HTML controls built purely to prove the underlying git engine (repo management,
branch creation, cherry-pick with conflict resolution — all working and covered by
automated tests against a disposable fixture repo). Nothing here should be taken
as an intentional visual direction; a genuine redesign is in progress.

## Brand Commitments

Visual direction: a clean, restrained, neutral developer-tool aesthetic in the
register of Linear, GitHub Desktop, and the Vercel dashboard — the user chose
this "standing exit" over a more expressive terminal/bitmap concept after
seeing both. Restrained color strategy (neutrals plus one accent), Inter (or
the system UI font stack) for interface text, a monospace face for git data
(SHAs, branch names, file paths, diffs), light/dark theme aware via
`prefers-color-scheme`. Execute this register at full fidelity — precise
spacing and type scale, real component states, no half-styled native
controls left over from the functional-first build.

## Product Principles

- Trust the visible state of git over anything the app assumes — always show what
  branch/commit is being acted on, and never silently proceed past something
  that needs the user's judgment (a conflict, a dirty working tree, a diverged
  branch).
- Favor a few, precise operations (add repo, new branch, cherry-pick) done safely
  over a broad git GUI feature set.
- The tool should feel trustworthy to run against a real, in-use client repo —
  errors and irreversible actions (push, abort) must be legible, not cryptic.
