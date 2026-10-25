export interface DiffLine {
  text: string
  kind: 'same' | 'added' | 'removed'
}

interface Op {
  type: 'equal' | 'insert' | 'delete'
  aIndex: number
  bIndex: number
}

// Myers O(ND) diff, where D is the number of *differing* lines — not O(N*M)
// like a naive LCS table. A real source file with a normal-sized conflict
// (most lines identical, a handful actually changed) stays cheap even at
// thousands of lines; this only bails out if the two versions are so
// unrelated that the edit distance itself is huge.
const MAX_EDIT_STEPS = 20_000

function shortestEditTrace(a: string[], b: string[]): number[][] | null {
  const n = a.length
  const m = b.length
  const max = n + m
  if (max === 0) return []
  const offset = max
  const v = new Array(2 * max + 1).fill(0)
  const trace: number[][] = []

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice())
    if (d > MAX_EDIT_STEPS) return null
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset]
      } else {
        x = v[k - 1 + offset] + 1
      }
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[k + offset] = x
      if (x >= n && y >= m) return trace
    }
  }
  return null
}

function backtrack(n: number, m: number, trace: number[][]): Op[] {
  const max = n + m
  const offset = max
  let x = n
  let y = m
  const ops: Op[] = []

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d]
    const k = x - y
    const prevK = k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset]) ? k + 1 : k - 1
    const prevX = v[prevK + offset]
    const prevY = prevX - prevK

    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', aIndex: x - 1, bIndex: y - 1 })
      x--
      y--
    }
    if (d > 0) {
      if (x === prevX) {
        ops.push({ type: 'insert', aIndex: x, bIndex: y - 1 })
      } else {
        ops.push({ type: 'delete', aIndex: x - 1, bIndex: y })
      }
    }
    x = prevX
    y = prevY
  }

  return ops.reverse()
}

/** Line-level diff for the conflict viewer's Ours/Theirs panes. Returns null (caller falls back to plain text) only for pathologically unrelated files. */
export function diffLines(oursText: string, theirsText: string): { ours: DiffLine[]; theirs: DiffLine[] } | null {
  // Real file content (from `git show`) almost always ends in a trailing
  // newline; splitting on '\n' as-is would turn that into a phantom empty
  // "line" at the end of every file, which can even show as a spurious
  // added/removed line if only one side has the trailing newline.
  const a = oursText.replace(/\n$/, '').split('\n')
  const b = theirsText.replace(/\n$/, '').split('\n')
  const trace = shortestEditTrace(a, b)
  if (!trace) return null
  const ops = backtrack(a.length, b.length, trace)

  const ours: DiffLine[] = []
  const theirs: DiffLine[] = []
  for (const op of ops) {
    if (op.type === 'equal') {
      ours.push({ text: a[op.aIndex], kind: 'same' })
      theirs.push({ text: b[op.bIndex], kind: 'same' })
    } else if (op.type === 'delete') {
      ours.push({ text: a[op.aIndex], kind: 'removed' })
    } else {
      theirs.push({ text: b[op.bIndex], kind: 'added' })
    }
  }
  return { ours, theirs }
}
