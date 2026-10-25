import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeDate } from '../src/renderer/src/utils/formatDate'

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats a few minutes ago', () => {
    expect(formatRelativeDate('2026-01-15T11:55:00Z')).toBe('5 minutes ago')
  })

  it('formats a few hours ago', () => {
    expect(formatRelativeDate('2026-01-15T09:00:00Z')).toBe('3 hours ago')
  })

  it('formats a few days ago', () => {
    expect(formatRelativeDate('2026-01-13T12:00:00Z')).toBe('2 days ago')
  })

  it('falls back to an absolute date beyond 30 days', () => {
    const result = formatRelativeDate('2025-01-15T12:00:00Z')
    expect(result).not.toMatch(/ago$/)
    expect(result).toContain('2025')
  })

  it('returns a placeholder instead of "Invalid Date" for an empty/unparsable date', () => {
    expect(formatRelativeDate('')).toBe('—')
    expect(formatRelativeDate('not a date')).toBe('—')
  })
})
