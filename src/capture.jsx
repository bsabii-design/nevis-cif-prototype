import { useEffect, useRef, useState } from 'react'
import { ACCOUNT_TYPES } from './data.js'
import { Field, MoneyInput } from './editors.jsx'
import { VOICE_TRANSCRIPT, isQuestion, mockFileResults } from './parse.js'

/* ---------------- Icons (inline, stroke = currentColor) ---------------- */

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <rect x="6" y="1.5" width="4" height="7.5" rx="2" />
    <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0" />
    <line x1="8" y1="12" x2="8" y2="14.5" />
  </svg>
)

const AttachIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M13 7.5 8.2 12.3a3.4 3.4 0 0 1-4.8-4.8L8.6 2.3a2.3 2.3 0 0 1 3.2 3.2L6.9 10.4a1.1 1.1 0 0 1-1.6-1.6l4.5-4.5" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="13" x2="8" y2="3" />
    <path d="M4 7l4-4 4 4" />
  </svg>
)

/* ---------------- Capture bar ---------------- */

const CHIPS = ['Brokerage at Fidelity', 'Our Austin house', 'Crypto on Coinbase', 'Mortgage with Chase']
const FALLBACK_LINE = "I can add things to your picture — for advice, that's what Sarah is for at your meeting."

export function CaptureBar({ showChips, onSubmit, onFiles, onAddManually }) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [fallback, setFallback] = useState(false)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    if (isQuestion(t)) {
      setFallback(true) // input preserved so the client can rephrase
      return
    }
    setFallback(false)
    onSubmit(t)
    setText('') // the bar always clears after processing
  }

  const toggleMic = () => {
    if (recording) {
      setRecording(false)
      setText(VOICE_TRANSCRIPT)
      inputRef.current?.focus()
    } else {
      setRecording(true)
    }
  }

  return (
    <div
      className="capture-dock"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const names = [...(e.dataTransfer?.files || [])].map((f) => f.name)
        onFiles(names.length ? names : ['statement.pdf'])
      }}
    >
      {fallback && (
        <div className="capture-fallback" role="status">
          <span>{FALLBACK_LINE}</span>
          <button className="capture-fallback-close" onClick={() => setFallback(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="capture-bar">
        <button
          className={'capture-icon' + (recording ? ' capture-icon-active' : '')}
          onClick={toggleMic}
          aria-label={recording ? 'Stop dictation' : 'Dictate'}
        >
          <MicIcon />
        </button>

        {recording ? (
          <button className="capture-listening" onClick={toggleMic}>
            <span className="pulse" aria-hidden="true" />
            Listening…
          </button>
        ) : (
          <input
            ref={inputRef}
            className="capture-input"
            value={text}
            placeholder="Add what you own — type it, drop statements, or dictate"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}

        <button className="capture-icon" onClick={() => fileRef.current?.click()} aria-label="Attach statements">
          <AttachIcon />
        </button>
        <input
          ref={fileRef} type="file" accept=".pdf" multiple hidden
          onChange={(e) => {
            const names = [...e.target.files].map((f) => f.name)
            e.target.value = ''
            if (names.length) onFiles(names)
          }}
        />
        <button className="capture-submit" onClick={submit} disabled={!text.trim() || recording} aria-label="Add">
          <ArrowIcon />
        </button>
      </div>

      <div className="capture-below">
        {showChips ? (
          <div className="capture-chips">
            {CHIPS.map((c) => (
              <button key={c} className="chip" onClick={() => { setText(c); inputRef.current?.focus() }}>
                {c}
              </button>
            ))}
          </div>
        ) : <span />}
        <button className="capture-manual" onClick={onAddManually}>Prefer a form? Add manually</button>
      </div>
    </div>
  )
}

/* ---------------- Batch statements: progressive processing + review ---------------- */

export function BatchPanel({ fileNames, assets, onApply, onDiscard }) {
  const [rows, setRows] = useState(fileNames.map((name) => ({ name, status: 'processing', foundCount: 0 })))
  const [items, setItems] = useState([])
  const [dupes, setDupes] = useState(0)
  const [stage, setStage] = useState('processing')

  useEffect(() => {
    const timers = []
    const collected = []
    let dupeCount = 0
    fileNames.forEach((name, i) => {
      timers.push(setTimeout(() => {
        const res = mockFileResults(i, assets)
        if (res.unreadable) {
          setRows((r) => r.map((row, j) => (j === i ? { ...row, status: 'unreadable' } : row)))
        } else {
          const fresh = []
          for (const item of res.found) {
            const dup = collected.some((c) =>
              c.institution === item.institution && c.accountType === item.accountType && c.value === item.value && !item.updateAssetId)
            if (dup) { dupeCount++; continue }
            collected.push(item)
            fresh.push(item)
          }
          setItems([...collected])
          setDupes(dupeCount)
          setRows((r) => r.map((row, j) => (j === i ? { ...row, status: 'done', foundCount: fresh.length } : row)))
        }
        if (i === fileNames.length - 1) timers.push(setTimeout(() => setStage('review'), 400))
      }, 700 + i * 800))
    })
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setItem = (id, k, v) =>
    setItems((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))

  const unreadable = rows.filter((r) => r.status === 'unreadable').length
  const footer = [
    dupes > 0 && `${dupes} duplicate${dupes > 1 ? 's' : ''} skipped`,
    unreadable > 0 && `${unreadable} file${unreadable > 1 ? 's' : ''} couldn't be read`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="import-strip">
      <div className="batch-files">
        {rows.map((r) => (
          <div className="batch-file" key={r.name}>
            {r.status === 'processing'
              ? <span className="spinner spinner-sm" aria-hidden="true" />
              : <span className={'batch-mark' + (r.status === 'unreadable' ? ' batch-mark-muted' : '')}>{r.status === 'unreadable' ? '—' : '✓'}</span>}
            <span className="batch-name">{r.name}</span>
            <span className="batch-status">
              {r.status === 'processing' ? 'Reading…' :
               r.status === 'unreadable' ? "Couldn't read this file" :
               `${r.foundCount} account${r.foundCount === 1 ? '' : 's'} found`}
            </span>
          </div>
        ))}
      </div>

      {stage === 'review' && (
        <>
          <p className="drawer-sub">
            Check the numbers — you can edit anything before adding.
          </p>
          {items.map((a) => (
            <div className="found" key={a.id}>
              {a.updateAssetId && (
                <p className="found-update">Updates existing · {a.updateTitle}</p>
              )}
              <Field label="Institution">
                <input className="input" value={a.institution}
                  onChange={(e) => setItem(a.id, 'institution', e.target.value)} />
              </Field>
              <Field label="Account type">
                <select className="input select" value={a.accountType}
                  onChange={(e) => setItem(a.id, 'accountType', e.target.value)}>
                  {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Value" helper="Don't know it offhand? Leave it for later.">
                <MoneyInput amount={a.value} currency={a.currency}
                  onAmount={(v) => setItem(a.id, 'value', v)}
                  onCurrency={(c) => setItem(a.id, 'currency', c)} />
              </Field>
            </div>
          ))}
          {footer && <p className="batch-footer">{footer}</p>}
          <div className="editor-actions">
            <span className="editor-actions-spacer" />
            <button className="btn btn-ghost" onClick={onDiscard}>Discard</button>
            <button className="btn btn-primary" onClick={() => onApply(items)}>
              Add {items.length} item{items.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
