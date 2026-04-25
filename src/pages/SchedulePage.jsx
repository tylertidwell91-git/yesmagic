import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

const API_URL = '/api/shows'

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

function formatDay(date) {
  return date.toISOString().slice(0, 10)
}

function getCalendarWeeks(startDate, weeks = 5) {
  const weeksOut = []
  const d = new Date(startDate)
  d.setHours(0, 0, 0, 0)
  const firstDow = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - firstDow)

  for (let w = 0; w < weeks; w++) {
    const week = []
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(start)
      cellDate.setDate(start.getDate() + w * 7 + day)
      week.push(cellDate)
    }
    weeksOut.push(week)
  }
  return weeksOut
}

export default function SchedulePage() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailsShowId, setDetailsShowId] = useState(null)
  const [detailsAnchorRect, setDetailsAnchorRect] = useState(null)
  const detailsPopoverRef = useRef(null)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setShows(Array.isArray(data) ? data : []))
      .catch(() => setShows([]))
      .finally(() => setLoading(false))
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const calendarWeeks = useMemo(() => getCalendarWeeks(today, 5), [today])

  const showsByDate = useMemo(() => {
    const map = {}
    shows.forEach((s) => {
      const key = String(s.date || '').slice(0, 10)
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    Object.keys(map).forEach((k) => map[k].sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    return map
  }, [shows])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  useEffect(() => {
    if (!detailsShowId) {
      setDetailsAnchorRect(null)
      return
    }
    const el = document.querySelector(`[data-show-id="${detailsShowId}"]`)
    if (el) setDetailsAnchorRect(el.getBoundingClientRect())
  }, [detailsShowId])

  useEffect(() => {
    if (detailsShowId == null) return
    const handleClickOutside = (e) => {
      if (detailsPopoverRef.current && !detailsPopoverRef.current.contains(e.target)) {
        const trigger = document.querySelector(`[data-show-id="${detailsShowId}"]`)
        if (trigger && trigger.contains(e.target)) return
        setDetailsShowId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [detailsShowId])

  if (loading) {
    return (
      <div className="yesmagic-main schedule-page">
        <p style={{ color: 'var(--ym-muted)' }}>Loading schedule…</p>
      </div>
    )
  }

  return (
    <div className="yesmagic-main schedule-page">
      <h2 className="schedule-title">Live Stream Shows Schedule</h2>
      <p style={{ color: 'var(--ym-muted)', marginBottom: '1.5rem' }}>
        Upcoming shows for the next few weeks.
      </p>

      <div className="schedule-calendar">
        <div className="schedule-calendar-header">
          {monthNames[today.getMonth()]} {today.getFullYear()}
        </div>
        <table className="schedule-calendar-grid">
          <thead>
            <tr>
              {dayNames.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarWeeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cellDate) => {
                  const key = formatDay(cellDate)
                  const isCurrentMonth = cellDate.getMonth() === today.getMonth()
                  const isToday = formatDay(cellDate) === formatDay(today)
                  const dayShows = showsByDate[key] || []
                  return (
                    <td
                      key={key}
                      className={`schedule-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    >
                      <div className="schedule-day-num">{cellDate.getDate()}</div>
                      <div className="schedule-day-shows">
                        {dayShows.map((s) => {
                          const hasDetails = (s.details ?? '').trim().length > 0
                          const isDetailsOpen = detailsShowId === s.id
                          return (
                            <div
                              key={s.id}
                              data-show-id={s.id}
                              className={`schedule-show-item ${hasDetails ? 'schedule-show-item--has-details' : ''}`}
                              title={hasDetails ? (s.details ?? '').trim() : undefined}
                              onClick={() => hasDetails && setDetailsShowId(isDetailsOpen ? null : s.id)}
                              role={hasDetails ? 'button' : undefined}
                              tabIndex={hasDetails ? 0 : undefined}
                              onKeyDown={(e) => {
                                if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault()
                                  setDetailsShowId((id) => (id === s.id ? null : s.id))
                                }
                              }}
                            >
                              <span className="schedule-show-time">{s.time || '—'}</span>
                              <span className="schedule-show-title">{s.title || 'Show'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/" className="ym-btn ym-btn-secondary" style={{ marginTop: '1.5rem' }}>
        Back to shop
      </Link>

      {detailsShowId && detailsAnchorRect && (() => {
        const openShow = shows.find((s) => s.id === detailsShowId)
        if (!openShow || !(openShow.details ?? '').trim()) return null
        const popoverWidth = 360
        const left = Math.max(12, Math.min(detailsAnchorRect.left, typeof window !== 'undefined' ? window.innerWidth - popoverWidth - 12 : detailsAnchorRect.left))
        const bottom = typeof window !== 'undefined' ? window.innerHeight - detailsAnchorRect.top + 8 : 0
        return createPortal(
          <div
            className="schedule-show-details-popover schedule-show-details-popover--fixed"
            ref={detailsPopoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${left}px`,
              bottom: `${bottom}px`,
              width: `min(${popoverWidth}px, calc(100vw - 24px))`,
            }}
          >
            <div className="schedule-show-details-popover-title">
              {openShow.title || 'Show'} — {openShow.time || '—'}
            </div>
            <div className="schedule-show-details-popover-body">
              {(openShow.details ?? '').trim()}
            </div>
            <button
              type="button"
              className="schedule-show-details-close ym-btn ym-btn-sm ym-btn-secondary"
              onClick={() => setDetailsShowId(null)}
            >
              Close
            </button>
          </div>,
          document.body
        )
      })()}
    </div>
  )
}
