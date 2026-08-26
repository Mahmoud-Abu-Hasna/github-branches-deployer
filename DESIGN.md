---
name: Branch Deployer
description: A restrained, neutral desktop dev tool for creating per-client git branches and cherry-picking commits across them.
colors:
  bg: "#fbfbfc"
  bg-inset: "#f4f4f6"
  surface: "#ffffff"
  surface-hover: "#f6f6f8"
  border: "#e4e4e8"
  border-strong: "#d4d4d9"
  text: "#18181b"
  text-secondary: "#6b6b74"
  text-tertiary: "#9b9ba3"
  accent: "#5b5ff0"
  accent-hover: "#4c50e0"
  success: "#17803d"
  warning: "#b45309"
  danger: "#c0262a"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
---

# Design System: Branch Deployer

## Overview

**Creative North Star: "The Quiet Console"**

Branch Deployer is an internal-grade git tool: a developer runs it to stand up a
new client branch or push a fix across several branches, watches a live log
resolve a conflict, and gets back to work. The visual world is a restrained,
neutral console in the register of Linear, GitHub Desktop, and the Vercel
dashboard — chosen deliberately over a more expressive terminal/bitmap concept
because the tool handles real pushes to real client repos, and it needs to
disappear into the task rather than perform a personality. Every surface reads
at a glance: what repo, what branch, what state, what's next.

The system draws a firm line between interface chrome (sans-serif, neutral
grays, one indigo accent) and git data (SHAs, branch names, diffs, file paths),
which always renders in monospace — the one place "technical" typography is
earned rather than decorative. Status is color, not shape: success is green,
a conflict is amber, an error is red, and nothing else in the UI competes for
that vocabulary.

**Key Characteristics:**
- Restrained color strategy: neutral grays carry the interface, one indigo
  accent marks every interactive/selected/live element and nothing else.
- One UI typeface (system sans) for everything except git data, which is
  always monospace.
- A persistent sidebar (second neutral layer) holds repo switching; content
  panels sit one step lighter/darker than the sidebar, never competing.
- Dense, tabular, honest about state — skeleton loaders, real empty states,
  badges for status, never a spinner floating in empty space.

## Colors

Neutrals carry the surface; the indigo accent is reserved entirely for
interactive and live-state moments — it never appears as decoration.

### Primary
- **Signal Indigo** (`#5b5ff0`, dark: `#8184f5`): primary buttons, active nav
  item, focus rings, selection highlights, checked checkboxes, current-branch
  badge. Nothing else in the interface uses this hue.

### Neutral
- **Ink** (`#18181b`, dark: `#f4f4f5`): primary text and headings.
- **Slate** (`#6b6b74`, dark: `#a3a3ab`): secondary text, subtitles, muted
  metadata (paths, authors).
- **Ash** (`#9b9ba3`, dark: `#75757e`): placeholder text, disabled icons,
  tertiary labels (uppercase table headers).
- **Paper** (`#fbfbfc`, dark: `#0c0c0e`): page background.
- **Fog** (`#f4f4f6`, dark: `#101013`): the sidebar's second neutral layer —
  always one step off the page background it sits beside.
- **Cloud** (`#ffffff`, dark: `#18181b`): card/panel/dialog surfaces, one step
  lighter than the page in light mode, one step lighter than the sidebar in
  dark mode.
- **Seam** (`#e4e4e8`, dark: `#2a2a2f`): hairline borders between rows, panels,
  and sections.

### Semantic (status only)
- **Applied Green** (`#17803d`, dark: `#4ade80`): pushed/applied/resolved
  states, success badges.
- **Conflict Amber** (`#b45309`, dark: `#fbbf24`): conflict badges and the
  conflict callout — the one place amber appears.
- **Error Red** (`#c0262a`, dark: `#f87171`): errors, the abort action, failed
  pushes.

### Named Rules
**The One Accent Rule.** Signal Indigo marks exactly one thing on any given
screen: what's interactive or currently active. It is never used for
decoration, dividers, or emphasis that isn't actionable.

**The Status-Is-Color Rule.** Success/conflict/error are conveyed by color and
an icon (check / triangle / x), never by shape, size, or position alone —
so the same badge vocabulary reads correctly at a glance everywhere it appears.

## Typography

**Body/UI Font:** System sans stack (`-apple-system`, `Segoe UI`, `Roboto`) —
renders as San Francisco on macOS, Segoe UI on Windows.
**Data/Mono Font:** System monospace stack (`ui-monospace`, `Cascadia Code`,
`Segoe UI Mono`, `Consolas`).

**Character:** One workhorse UI face carries every heading, label, button, and
paragraph — there is no display/body pairing, deliberately, per Operate-mode
convention. Monospace is reserved for anything that is literally git data: a
commit SHA, a branch name inline in a log line, a file path, a diff pane.
Never used as a "technical" costume elsewhere.

### Hierarchy
- **h1** (600 weight, 1.375rem / 22px): page titles ("Repositories",
  repo name, "Cherry-Pick").
- **h2** (600 weight, 1.125rem / 18px): dialog titles.
- **h3** (600 weight, 1rem / 16px): empty-state headings.
- **Body** (400 weight, 0.875rem / 14px, 1.5 line-height): default text,
  form labels' associated copy.
- **Small/label** (500 weight, 0.8125rem / 13px): form labels, buttons,
  select-all rows.
- **Tertiary/caption** (600 weight, 0.75rem / 12px, uppercase, 0.04em
  tracking): table column headers, sidebar section labels.

### Named Rules
**The Fixed-Scale Rule.** All type sizes are fixed rem values, never fluid —
this is a desktop app viewed at one DPI per session, and a shrinking heading
inside a fixed-width sidebar is a bug, not responsiveness.

## Layout

Two-pane app shell: a fixed 232px sidebar (repo switcher + settings) and a
scrollable content area. Content pages cap at `max-width: 860px` and center
with `padding: 32px`, keeping line lengths and table density reasonable
without stretching across an ultrawide window. The cherry-pick wizard reuses
the same page shell rather than a modal — it's a multi-step guided task, not
an interruption, and deserves the full content area. Short, single-purpose
forms (Add Repo, New Branch) stay as centered modal dialogs; the line is
task duration, not arbitrary preference. Spacing runs on a 4px base scale
(`4/8/12/16/20/24/32/40/48px`), applied so that vertical rhythm between
sections is consistently larger than the padding within a section.

## Elevation & Depth

Mostly flat, tonal layering over shadow: the sidebar and page background sit
one step apart in lightness (`--bg` vs `--bg-inset`), and panels/cards sit one
step lighter/darker than whatever they're on. Shadow is reserved for things
that visually float above the flow — dialogs and their backdrop.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(20,20,30,.06)`): resting elevation for primary
  buttons, distinguishing them from flat secondary/ghost buttons.
- **md** (`0 4px 12px rgba(20,20,30,.08), 0 1px 2px rgba(20,20,30,.06)`):
  reserved, currently unused — available for a future popover/menu.
- **lg** (`0 12px 32px rgba(20,20,30,.14), 0 2px 6px rgba(20,20,30,.08)`):
  modal dialogs, floating above the backdrop blur.

### Named Rules
**The Flat-Content Rule.** Tables, lists, and panels within the page never
carry their own shadow — only things that interrupt the page (dialogs) do.

## Shapes

Two radius steps only: `8px` (`--radius-md`) for buttons, inputs, panels, and
dialogs; `12px` (`--radius-lg`) for the outer panel/empty-state containers,
one step softer to read as a "container of containers." Badges and the
sidebar's active-item pill use a full `999px` radius. Borders are always
`1px`, never heavier — weight comes from color contrast (`--border` vs
`--border-strong`), not stroke width.

## Components

### Buttons
- **Shape:** `8px` radius, `32px` height (`28px` for the `.btn-sm` variant
  used inside dense areas like the conflict-resolution actions).
- **Primary:** Signal Indigo background, white text, `sm` shadow. One per
  view — the single next-step action (Add Repo, Create Branch, Continue
  Cherry-Pick, Start Cherry-Pick).
- **Secondary:** white/surface background, `1px` `--border-strong` border,
  neutral text. The default for anything not the primary action (Fetch,
  New Branch, Cancel, Back, Keep Ours/Theirs).
- **Ghost:** transparent, secondary-colored text, no border; surface-tint on
  hover. Used for lower-emphasis actions (Open in Editor, Mark Resolved
  Manually, the sidebar-adjacent remove icon).
- **Danger:** transparent with a danger-colored border and text, danger-soft
  fill on hover. Reserved for genuinely destructive/irreversible actions
  (Abort Run).

### Badges
- **Style:** `20px` tall pill, `1px` border, `12px` text, 600 weight.
- **Neutral:** `--bg-inset` fill — branch type (local/remote), base-branch
  marker.
- **Success / Warning / Danger:** soft-tinted fill matching the semantic
  color, used only for actual git states (pushed, conflict, unresolved),
  never for arbitrary emphasis.

### Panels / Cards
- **Corner:** `12px` radius.
- **Background:** `--surface`, `1px` `--border`.
- **Shadow:** none (see Elevation & Depth).
- **Internal Padding:** `16–20px` depending on content density.

### Inputs / Fields
- **Style:** `1px` `--border-strong` stroke, `8px` radius, `34px` height,
  `--surface` background.
- **Focus:** border shifts to Signal Indigo plus a 3px indigo focus ring
  (`box-shadow`), applied via `:focus-visible` everywhere, including custom
  checkboxes.
- **Checkboxes:** custom-drawn (not native chrome) — `16px`, `4px` radius,
  fills Signal Indigo with a white check mark when checked, so it matches the
  rest of the accent vocabulary instead of the OS's default checkbox color.

### Navigation (Sidebar)
- **Style:** `--bg-inset` background, `1px` right border separating it from
  content. Brand mark (indigo `24px` square with a branch-glyph icon) at top,
  then an "Add Repo" secondary button, then the repo list, then Settings
  pinned to the bottom via a top-bordered footer.
- **States:** default (secondary text, tertiary icon), hover (`--surface-hover`
  fill, text promotes to primary), active (`--accent-soft` fill, indigo text
  and icon).

### Conflict Resolution Panel (signature component)
Two-pane monospace diff view (Ours / Theirs) per conflicted file, collapsed by
default except the first file, expand/collapse via chevron. Per-file actions
(Keep Ours / Keep Theirs / Open in Editor / Mark Resolved Manually) are
`btn-sm` buttons directly below the panes — resolving is a single click, not a
separate submit step. The file header carries a live badge (amber
"unresolved" → green "resolved: ours/theirs/manual") so scanning the file
list shows exactly what's left without opening each one.

## Do's and Don'ts

### Do:
- **Do** use monospace exclusively for git data (SHAs, branch names inline in
  logs, file paths, diff panes) — never for UI chrome or labels.
- **Do** keep Signal Indigo to exactly one interactive/active element's worth
  of visual weight per view.
- **Do** show skeleton rows (not spinners) for list/table loading, and a real
  empty state (icon + heading + one sentence + primary action) whenever a
  collection is genuinely empty.
- **Do** give every status (pushed, conflict, error, unresolved) both a color
  and an icon, never color alone.

### Don't:
- **Don't** use a modal for a multi-step guided flow (the cherry-pick wizard
  is a full page for this reason) — modals are for single, short, interruptive
  forms only (Add Repo, New Branch).
- **Don't** introduce a second accent color. Every non-neutral color in this
  system is either Signal Indigo or a semantic status color; there is no
  decorative color.
- **Don't** use native browser checkbox/scrollbar/selection chrome — they're
  themed from the palette (see Components → Inputs, and the global scrollbar
  and `::selection` rules) so no OS-default control breaks the system.
- **Don't** add a shadow to in-page content (tables, panels, lists) — shadow
  is reserved for dialogs interrupting the page.
