import { describe, expect, it } from 'vitest'
import { diffLines } from '../src/renderer/src/utils/lineDiff'

function kinds(lines: { kind: string }[]): string[] {
  return lines.map((l) => l.kind)
}

describe('diffLines', () => {
  it('marks identical files as entirely "same"', () => {
    const text = 'a\nb\nc\n'
    const result = diffLines(text, text)
    expect(result).not.toBeNull()
    expect(kinds(result!.ours)).toEqual(['same', 'same', 'same'])
    expect(kinds(result!.theirs)).toEqual(['same', 'same', 'same'])
  })

  it('detects a pure insertion', () => {
    const result = diffLines('a\nb\n', 'a\nx\nb\n')
    expect(result).not.toBeNull()
    expect(kinds(result!.ours)).toEqual(['same', 'same'])
    expect(kinds(result!.theirs)).toEqual(['same', 'added', 'same'])
    expect(result!.theirs.find((l) => l.kind === 'added')?.text).toBe('x')
  })

  it('detects a pure deletion', () => {
    const result = diffLines('a\nx\nb\n', 'a\nb\n')
    expect(result).not.toBeNull()
    expect(kinds(result!.ours)).toEqual(['same', 'removed', 'same'])
    expect(kinds(result!.theirs)).toEqual(['same', 'same'])
  })

  it('detects a one-line change as remove+add, not a full-file rewrite', () => {
    const result = diffLines('line1\nline2\nline3\n', 'line1\nCHANGED\nline3\n')
    expect(result).not.toBeNull()
    expect(kinds(result!.ours)).toEqual(['same', 'removed', 'same'])
    expect(kinds(result!.theirs)).toEqual(['same', 'added', 'same'])
  })

  it('handles a large file with only a small localized diff, quickly', () => {
    const common = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const a = [...common].join('\n')
    const bArr = [...common]
    bArr[1500] = 'CHANGED LINE'
    const b = bArr.join('\n')

    const start = Date.now()
    const result = diffLines(a, b)
    const elapsed = Date.now() - start

    expect(result).not.toBeNull()
    expect(elapsed).toBeLessThan(1000)
    const oursKinds = kinds(result!.ours)
    const theirsKinds = kinds(result!.theirs)
    expect(oursKinds.filter((k) => k === 'removed')).toHaveLength(1)
    expect(theirsKinds.filter((k) => k === 'added')).toHaveLength(1)
    expect(oursKinds.filter((k) => k === 'same')).toHaveLength(2999)
  })

  it('round-trips: same-kind lines equal the original text in order', () => {
    const a = 'x\ny\nz\nw\n'
    const b = 'x\nz\nw\nq\n'
    const result = diffLines(a, b)!
    expect(result.ours.map((l) => l.text).join('\n')).toBe(a.replace(/\n$/, ''))
    expect(result.theirs.map((l) => l.text).join('\n')).toBe(b.replace(/\n$/, ''))
  })

  it('does not report a phantom diff from a trailing newline alone', () => {
    const result = diffLines('a\nb\nc\n', 'a\nb\nc')
    expect(result).not.toBeNull()
    expect(kinds(result!.ours)).toEqual(['same', 'same', 'same'])
    expect(kinds(result!.theirs)).toEqual(['same', 'same', 'same'])
  })
})
