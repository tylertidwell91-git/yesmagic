/**
 * Parses pasted text from another selling site's show list into
 * { title, date (YYYY-MM-DD), time } objects. Noise lines (Copy show link, etc.)
 * and standalone separators are ignored.
 */

const NOISE_LINES = new Set(
  [
    'copy show link',
    'open show',
    'edit show',
    'clone items',
    'start sharing',
    'cancel show',
    'enable private mode',
  ].map((s) => s.toLowerCase())
)

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const TIME_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toIsoDate(month, day, year) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function formatTimeMatch(m) {
  const h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  return `${h}:${min} ${ap}`
}

function filterLines(rawLines) {
  return rawLines.filter((l) => {
    if (l === '•' || l === '—' || l === '–' || l === '-') return false
    return !NOISE_LINES.has(l.toLowerCase())
  })
}

/**
 * @param {string} text
 * @returns {{ title: string, date: string, time: string }[]}
 */
export function parseExternalShowPaste(text) {
  const rawLines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
  const lines = filterLines(rawLines)

  const shows = []
  let lastEnd = -1
  let i = 0
  while (i < lines.length) {
    const dm = lines[i].match(DATE_RE)
    if (!dm) {
      i += 1
      continue
    }
    const month = parseInt(dm[1], 10)
    const day = parseInt(dm[2], 10)
    const year = parseInt(dm[3], 10)
    const dateStr = toIsoDate(month, day, year)
    const title = lines
      .slice(lastEnd + 1, i)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    let timeStr = ''
    let j = i + 1
    for (; j < lines.length; j += 1) {
      if (DATE_RE.test(lines[j])) break
      const tmm = lines[j].match(TIME_RE)
      if (tmm) {
        timeStr = formatTimeMatch(tmm)
        lastEnd = j
        break
      }
    }
    if (!timeStr) {
      lastEnd = i
    }

    shows.push({
      title: title || 'Untitled show',
      date: dateStr,
      time: timeStr,
    })
    i = lastEnd + 1
  }

  return shows
}
