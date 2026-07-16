import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, effectiveValue, fmtUSD, liabilitiesTotal, parseUSD } from './data.js'
import { useCountUp } from './hooks.js'

/* ---------------- Top bar ---------------- */

const TABS = ['Personal', 'Occupation & income', 'Goals', 'Assets', 'Liabilities']

export function TopBar({ saved, clientName }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="wordmark">Nevis</span>
        <nav className="tabs" aria-label="Profile sections">
          {TABS.map((t) => (
            <button
              key={t}
              className={'tab' + (t === 'Assets' ? ' tab-active' : '')}
              title={t === 'Assets' ? undefined : 'Not part of this prototype'}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <span className={'saved' + (saved ? ' saved-visible' : '')} aria-live="polite">
            <span className="saved-dot" />
            Saved
          </span>
          <span className="client-name">{clientName}</span>
        </div>
      </div>
    </header>
  )
}

/* ---------------- Net worth block (signature component) ----------------
   Anatomy: label → figure → at most ONE line below. Never two. */

export function NetWorthBlock({ assets, liabilities, onShowMissing }) {
  const valued = assets.filter((a) => a.value != null)
  const totalAssets = valued.reduce((s, a) => s + effectiveValue(a), 0)
  const missing = assets.length - valued.length

  let label, figure, line
  if (assets.length === 0) {
    label = 'Net worth'
    figure = null
    line = <span className="nw-line nw-line-muted">Appears as you add what you own</span>
  } else if (!liabilities.answered) {
    label = 'Total assets'
    figure = totalAssets
    line = (
      <button className="nw-line nw-line-link" title="Not part of this prototype">
        Add liabilities to complete your financial picture
      </button>
    )
  } else {
    label = 'Estimated net worth'
    figure = totalAssets - liabilitiesTotal(liabilities)
    line =
      missing > 0 ? (
        <button className="nw-line nw-line-link" onClick={onShowMissing}>
          Excludes {missing} asset{missing > 1 ? 's' : ''} without a value
        </button>
      ) : null
  }

  const shown = useCountUp(figure)

  return (
    <div className="nw-block">
      <div className="nw-label">{label}</div>
      <div className={'nw-figure' + (figure == null ? ' nw-figure-empty' : '')}>
        {figure == null ? '—' : fmtUSD(shown)}
      </div>
      {line}
    </div>
  )
}

export function SummaryPanel({ assets, liabilities, onShowMissing }) {
  const valued = assets.filter((a) => a.value != null)
  const totalAssets = valued.reduce((s, a) => s + effectiveValue(a), 0)
  const showBreakdown = assets.length > 0 && liabilities.answered

  return (
    <aside className="panel">
      <NetWorthBlock assets={assets} liabilities={liabilities} onShowMissing={onShowMissing} />
      {showBreakdown && (
        <>
          <div className="divider" />
          <div className="breakdown">
            <div className="breakdown-row">
              <span>Total assets</span>
              <span className="breakdown-val">{fmtUSD(totalAssets)}</span>
            </div>
            <div className="breakdown-row">
              <span>Liabilities</span>
              <span className="breakdown-val">−{fmtUSD(liabilitiesTotal(liabilities))}</span>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}

/* ---------------- Asset cards ---------------- */

function ValueCell({ asset, onChange }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const start = () => {
    setText(asset.value == null ? '' : String(asset.value.toLocaleString('en-US')))
    setEditing(true)
  }
  const commit = () => {
    onChange(parseUSD(text))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="value-edit">
        <span className="value-edit-prefix">$</span>
        <input
          ref={inputRef}
          className="input value-edit-input"
          value={text}
          inputMode="numeric"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      </div>
    )
  }
  if (asset.value == null) {
    return (
      <div className="value-missing">
        <span className="value-missing-text">Value not added</span>
        <button className="link" onClick={start}>Add value</button>
      </div>
    )
  }
  const shared = effectiveValue(asset) !== asset.value
  return (
    <button className="value-text" onClick={start} title="Edit value">
      {shared ? (
        <>
          <span className="value-muted">Value {fmtUSD(asset.value)} · </span>
          Your share {fmtUSD(effectiveValue(asset))}
        </>
      ) : (
        fmtUSD(asset.value)
      )}
    </button>
  )
}

export function AssetCard({ asset, onChange, highlight }) {
  return (
    <div className={'card' + (highlight ? ' card-highlight' : '')} id={'asset-' + asset.id}>
      <div className="card-info">
        <div className="card-title">{asset.title}</div>
        {asset.subtitle && <div className="card-subtitle">{asset.subtitle}</div>}
      </div>
      <ValueCell asset={asset} onChange={onChange} />
    </div>
  )
}

export function AssetGroups({ assets, onChangeValue, highlightId }) {
  return (
    <div className="groups">
      {CATEGORIES.map((cat) => {
        const items = assets.filter((a) => a.category === cat.key)
        if (items.length === 0) return null
        const valued = items.filter((a) => a.value != null)
        const subtotal = valued.reduce((s, a) => s + effectiveValue(a), 0)
        return (
          <section className="group" key={cat.key}>
            <div className="group-head">
              <h2 className="group-name">{cat.plural}</h2>
              <span className="group-subtotal">{valued.length ? fmtUSD(subtotal) : '—'}</span>
            </div>
            {items.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                highlight={a.id === highlightId}
                onChange={(v) => onChangeValue(a.id, v)}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}

export function EmptyState({ onAdd }) {
  return (
    <div className="empty">
      <h2 className="empty-title">Add what you own</h2>
      <p className="empty-copy">
        Accounts, property, collectibles — anything that makes up your financial picture.
        A rough estimate is fine.
      </p>
      <div className="empty-actions">
        <button className="btn btn-primary" onClick={onAdd}>Add assets</button>
      </div>
    </div>
  )
}
