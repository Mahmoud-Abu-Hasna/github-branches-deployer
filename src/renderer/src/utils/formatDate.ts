const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** "3 hours ago" / "2 days ago" style for recent dates, falling back to an absolute date once that stops being useful (>30 days). */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (Math.abs(diffSec) < 60) return RTF.format(diffSec, 'second')
  if (Math.abs(diffMin) < 60) return RTF.format(diffMin, 'minute')
  if (Math.abs(diffHour) < 24) return RTF.format(diffHour, 'hour')
  if (Math.abs(diffDay) < 30) return RTF.format(diffDay, 'day')

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Full date+time for a tooltip, since the relative/short form alone loses precision. */
export function formatAbsoluteDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
