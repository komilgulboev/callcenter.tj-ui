import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CCard, CCardBody, CButton, CFormInput, CFormSelect, CSpinner, CRow, CCol,
} from '@coreui/react'
import { useTranslation } from 'react-i18next'
import { getApiUrl, getAuthHeaders } from '../../api'

// ─── Helpers ─────────────────────────────────────────────────
function formatDuration(sec, t) {
  if (!sec) return '—'
  if (sec < 60) return `${sec} ${t('sec')}`
  return `${Math.floor(sec / 60)} ${t('min')} ${sec % 60} ${t('sec')}`
}

function dispositionBadge(d, t) {
  const map = {
    'ANSWERED':   { bg: '#d1e7dd', color: '#0a3622' },
    'NO ANSWER':  { bg: '#fff3cd', color: '#664d03' },
    'BUSY':       { bg: '#f8d7da', color: '#58151c' },
    'FAILED':     { bg: '#e2e3e5', color: '#41464b' },
  }
  const s = map[d] || { bg: '#f8f9fa', color: '#6c757d' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap',
    }}>{t(d) || d}</span>
  )
}

function exportCSV(records, t) {
  const headers = [t('date'), t('src'), t('dst'), t('agent'), t('disposition'), t('duration'), t('billsec')]
  const rows = records.map(r => [
    new Date(r.callDate).toLocaleString('ru-RU'),
    r.src, r.dst,
    r.agentName || '',
    t(r.disposition) || r.disposition,
    r.duration, r.billsec,
  ])
  const csv = [headers, ...rows].map(row => row.join(';')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `calls_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

// ─── Audio Player ─────────────────────────────────────────────
function AudioPlayer({ url, onClose }) {
  const audioRef = useRef(null)
  const [playing, setPlaying]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [duration, setDuration]   = useState(0)
  const [error, setError]         = useState(false)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().catch(() => setError(true)); setPlaying(true) }
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#f0f6ff', borderRadius: 8, padding: '6px 10px',
      border: '1px solid #b6d0fe', minWidth: 260,
    }}>
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onTimeUpdate={e => setProgress(e.target.currentTime / (e.target.duration || 1) * 100)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onError={() => setError(true)}
      />
      {error ? (
        <span style={{ fontSize: 11, color: '#dc3545' }}>⚠️ Файл недоступен</span>
      ) : (
        <>
          <button onClick={toggle} style={{
            background: '#0d6efd', color: '#fff', border: 'none',
            borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {playing ? '⏸' : '▶'}
          </button>
          <div style={{ flex: 1, minWidth: 80 }}>
            <div style={{ height: 4, background: '#dde1e7', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                if (audioRef.current) audioRef.current.currentTime = pct * audioRef.current.duration
              }}
            >
              <div style={{ width: progress + '%', height: '100%', background: '#0d6efd', borderRadius: 2, transition: 'width .1s' }} />
            </div>
            <div style={{ fontSize: 10, color: '#6c757d', marginTop: 2 }}>
              {fmt(audioRef.current?.currentTime)} / {fmt(duration)}
            </div>
          </div>
          <a href={url} download style={{ color: '#6c757d', fontSize: 14, textDecoration: 'none' }} title="Скачать">⬇</a>
        </>
      )}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: 14 }}>✕</button>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 16px',
      border: '1px solid #e9ecef', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 3 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function CallReport() {
  const { t } = useTranslation('report')

  const now      = new Date()
  const todayStr = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  const monthAgo = new Date(now - 30 * 86400000)
  const monthStr = new Date(monthAgo - monthAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const [filters, setFilters] = useState({
    dateFrom: monthStr, dateTo: todayStr,
    src: '', dst: '', disposition: '',
  })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(1)
  const perPage               = 50

  // Активный плеер — id записи
  const [playingId, setPlayingId] = useState(null)

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const load = useCallback(async (p) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: p, perPage })
      if (filters.dateFrom) {
        params.set('dateFrom', new Date(filters.dateFrom).toISOString())
      }
      if (filters.dateTo) {
        // Добавляем 1 день чтобы покрыть записи с любым timezone offset
        const dateTo = new Date(filters.dateTo)
        dateTo.setDate(dateTo.getDate() + 1)
        params.set('dateTo', dateTo.toISOString())
      }
      if (filters.src)         params.set('src',         filters.src)
      if (filters.dst)         params.set('dst',         filters.dst)
      if (filters.disposition) params.set('disposition', filters.disposition)

      const r = await fetch(getApiUrl('/api/reports/calls?' + params), { headers: getAuthHeaders() })
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
      const json = await r.json()
      console.log('📊 CDR response:', json)
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, perPage])

  useEffect(() => { load(1) }, []) // eslint-disable-line

  const handleSearch = () => { setPage(1); setPlayingId(null); load(1) }
  const handleReset  = () => {
    const f = { dateFrom: monthStr, dateTo: todayStr, src: '', dst: '', disposition: '' }
    setFilters(f); setPage(1); setPlayingId(null)
    setTimeout(() => load(1), 0)
  }

  const totalPages = data ? Math.ceil(data.total / perPage) : 1

  const goPage = (p) => { setPage(p); setPlayingId(null); load(p) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Фильтры ── */}
      <CCard style={{ marginBottom: 0 }}>
        <CCardBody style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📊 {t('title')}</div>
          <CRow className="g-2">
            <CCol xs={6} md={3}>
              <label style={lbl}>{t('dateFrom')}</label>
              <CFormInput type="datetime-local" size="sm" style={inp}
                value={filters.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
            </CCol>
            <CCol xs={6} md={3}>
              <label style={lbl}>{t('dateTo')}</label>
              <CFormInput type="datetime-local" size="sm" style={inp}
                value={filters.dateTo} onChange={e => setF('dateTo', e.target.value)} />
            </CCol>
            <CCol xs={6} md={2}>
              <label style={lbl}>{t('src')}</label>
              <CFormInput size="sm" style={inp} value={filters.src} placeholder="110001"
                onChange={e => setF('src', e.target.value)} />
            </CCol>
            <CCol xs={6} md={2}>
              <label style={lbl}>{t('dst')}</label>
              <CFormInput size="sm" style={inp} value={filters.dst} placeholder="110002"
                onChange={e => setF('dst', e.target.value)} />
            </CCol>
            <CCol xs={12} md={2}>
              <label style={lbl}>{t('disposition')}</label>
              <CFormSelect size="sm" style={inp} value={filters.disposition}
                onChange={e => setF('disposition', e.target.value)}>
                <option value="">{t('all_dispositions')}</option>
                <option value="ANSWERED">{t('ANSWERED')}</option>
                <option value="NO ANSWER">{t('NO ANSWER')}</option>
                <option value="BUSY">{t('BUSY')}</option>
                <option value="FAILED">{t('FAILED')}</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <CButton size="sm" color="primary" onClick={handleSearch} disabled={loading}>
              {loading ? <CSpinner size="sm" className="me-1" /> : '🔍'} {t('search')}
            </CButton>
            <CButton size="sm" color="secondary" variant="outline" onClick={handleReset}>
              ✕ {t('reset')}
            </CButton>
            {data?.records?.length > 0 && (
              <CButton size="sm" color="success" variant="outline" style={{ marginLeft: 'auto' }}
                onClick={() => exportCSV(data.records, t)}>
                📥 {t('export')}
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* ── Статистика ── */}
      {data?.stats && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard icon="📞" label={t('total')}         value={data.stats.total}                               color="#0d6efd" />
          <StatCard icon="✅" label={t('answered')}      value={data.stats.answered}                            color="#198754" />
          <StatCard icon="❌" label={t('missed')}        value={data.stats.missed}                              color="#dc3545" />
          <StatCard icon="⏱"  label={t('avg_duration')} value={formatDuration(Math.round(data.stats.avgDuration), t)} color="#6f42c1" />
          <StatCard icon="⏳" label={t('total_duration')} value={formatDuration(data.stats.totalDuration, t)}  color="#0891b2" />
        </div>
      )}

      {/* ── Таблица ── */}
      <CCard style={{ marginBottom: 0 }}>
        <CCardBody style={{ padding: 0 }}>
          {error && (
            <div style={{ padding: '10px 16px', background: '#f8d7da', color: '#58151c', fontSize: 12 }}>
              ❌ {t('load_error')}: {error}
            </div>
          )}
          {loading && !data && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <CSpinner color="primary" />
            </div>
          )}
          {!loading && data?.records?.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, color: '#adb5bd' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div>{t('no_records')}</div>
            </div>
          )}

          {data?.records?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                    <th style={th}>{t('date')}</th>
                    <th style={th}>{t('src')}</th>
                    <th style={th}>{t('dst')}</th>
                    <th style={th}>{t('agent')}</th>
                    <th style={th}>{t('disposition')}</th>
                    <th style={th}>{t('duration')}</th>
                    <th style={th}>{t('billsec')}</th>
                    <th style={th}>{t('recording')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r, i) => (
                    <React.Fragment key={r.id}>
                      <tr
                        style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                      >
                        <td style={td}>
                          <span style={{ color: '#6c757d', whiteSpace: 'nowrap' }}>
                            {new Date(r.callDate).toLocaleString('ru-RU')}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.src || '—'}</td>
                        <td style={td}>{r.dst || '—'}</td>
                        <td style={{ ...td, color: '#6c757d' }}>
                          {r.agentName || <span style={{ color: '#ced4da' }}>—</span>}
                        </td>
                        <td style={td}>{dispositionBadge(r.disposition, t)}</td>
                        <td style={{ ...td, color: '#6c757d' }}>{formatDuration(r.duration, t)}</td>
                        <td style={{ ...td, fontWeight: r.billsec > 0 ? 600 : 400, color: r.billsec > 0 ? '#198754' : '#adb5bd' }}>
                          {formatDuration(r.billsec, t)}
                        </td>
                        <td style={td}>
                          {r.recordingUrl ? (
                            playingId === r.id ? null : (
                              <button
                                onClick={() => setPlayingId(r.id)}
                                style={{
                                  background: '#e8f0fe', color: '#0d6efd', border: '1px solid #b6d0fe',
                                  borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                                }}
                              >
                                ▶ {t('play')}
                              </button>
                            )
                          ) : (
                            <span style={{ color: '#ced4da', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                      {/* Плеер разворачивается под строкой */}
                      {playingId === r.id && r.recordingUrl && (
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={8} style={{ padding: '8px 12px' }}>
                            <AudioPlayer url={r.recordingUrl} onClose={() => setPlayingId(null)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid #e9ecef' }}>
              <CButton size="sm" color="secondary" variant="outline" disabled={page === 1} onClick={() => goPage(page - 1)}>←</CButton>
              <span style={{ fontSize: 12, color: '#6c757d' }}>{t('page')} {page} {t('of')} {totalPages}</span>
              <CButton size="sm" color="secondary" variant="outline" disabled={page === totalPages} onClick={() => goPage(page + 1)}>→</CButton>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

const lbl = { fontSize: 11, color: '#6c757d', display: 'block', marginBottom: 3, fontWeight: 500 }
const inp = { fontSize: 12 }
const th  = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#495057', whiteSpace: 'nowrap' }
const td  = { padding: '7px 12px' }