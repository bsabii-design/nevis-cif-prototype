/* Domain components: shell, summary, cards, category grid. */
import {
  ASSET_CATEGORIES, assetCategory, assetSubtitle, assetTitle, computeSummary,
  fmtMoney, fmtUSD, hasForeignValues, institutionAvatar, liabilitySubtitle, liabilityTitle, usdOf,
} from './model.js'
import { useEffect, useRef, useState } from 'react'
import { OverflowMenu } from './ui.jsx'
import { useCountUp } from './hooks.js'

/* ---------------- Top bar + sidebar (layout per Figma mock) ---------------- */

export const NAV = [
  { key: 'personal', label: 'Personal' },
  { key: 'work', label: 'Occupation & income' },
  { key: 'goals', label: 'Goals' },
  { key: 'networth', label: 'Net worth' },
]

/* Collaborator avatar, Figma-style: the only persistent access indicator. */
function CollabAvatar() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div className="collab" ref={ref}>
      <button className="collab-avatar" onClick={() => setOpen(!open)} aria-label="Sarah can view this profile">
        S
      </button>
      <span className="collab-tip" role="tooltip">Sarah can view this profile</span>
      {open && (
        <div className="collab-pop">
          <span className="collab-pop-name">Sarah</span>
          <span className="collab-pop-role">Can view this profile</span>
        </div>
      )}
    </div>
  )
}

export function TopBar({ saved, showNav = true, shared, onShare }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="wordmark">Nevis</span>
        <div className="topbar-right">
          <span className={'saved' + (saved ? ' saved-visible' : '')} aria-live="polite">
            <span className="saved-dot" />
            Saved
          </span>
          {showNav && (shared ? <CollabAvatar /> : (
            <button className="btn btn-secondary" onClick={onShare}>Share</button>
          ))}
        </div>
      </div>
    </header>
  )
}

export function Sidebar({ activeKey, onNav, clientName }) {
  return (
    <nav className="sidebar" aria-label="Sections">
      <div className="side-links">
        {NAV.map((s) => (
          <button key={s.key}
            className={'side-link' + (s.key === activeKey ? ' side-link-active' : '')}
            onClick={() => onNav(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="side-identity">
        <span className="side-avatar" aria-hidden="true">{clientName[0]}</span>
        <span className="side-name">{clientName}</span>
      </div>
    </nav>
  )
}

/* ---------------- Financial summary card (spec §22 logic unchanged) ---------------- */

export function FinancialSummary({ profile }) {
  const s = computeSummary(profile)
  const shown = useCountUp(s.nw)
  return (
    <section className="summary-card">
      <span className="nw-label">Estimated net worth</span>
      <div className={'nw-figure' + (s.nw == null ? ' nw-figure-empty' : '')}>
        {s.nw == null ? '—' : fmtUSD(shown)}
      </div>
      {s.line && <span className="nw-line">{s.line}</span>}
      {s.rows && (
        <div className="summary-stats">
          {s.rows.map((r) => (
            <div className="summary-stat" key={r.label}>
              <span className="summary-stat-label">{r.label}</span>
              <span className={'summary-stat-value' + (/^[$€£C]|^\d|^—/.test(r.value) ? '' : ' breakdown-val-muted')}>{r.value}</span>
            </div>
          ))}
          {hasForeignValues(profile) && <span className="panel-note">Includes values converted to USD.</span>}
        </div>
      )}
    </section>
  )
}

/* ---------------- Cards ---------------- */

export function AssetCard({ asset, onEdit, onRemove }) {
  const avatar = institutionAvatar(asset.institutionOrProvider)
  const cur = asset.currency ?? 'USD'
  return (
    <div className="card card-clickable" onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
      <div className="card-left">
        {avatar && <span className="dot" style={{ background: avatar.color }} aria-hidden="true" />}
        <div className="card-info">
          <div className="card-title">{assetTitle(asset)}</div>
          <div className="card-subtitle">{assetSubtitle(asset)}</div>
        </div>
      </div>
      <div className="card-right">
        {asset.value == null ? (
          <span className="value-missing-text">Value not added</span>
        ) : (
          <div className="value-wrap">
            <span className="value-text">{fmtMoney(asset.value, cur)}</span>
            {cur !== 'USD' && <span className="value-approx">≈ {fmtUSD(usdOf(asset.value, cur))}</span>}
          </div>
        )}
        <OverflowMenu items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Remove asset', danger: true, onSelect: onRemove },
        ]} />
      </div>
    </div>
  )
}

export function LiabilityCard({ liability, onEdit, onRemove }) {
  const cur = liability.currency ?? 'USD'
  return (
    <div className="card card-clickable" onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
      <div className="card-left">
        <div className="card-info">
          <div className="card-title">{liabilityTitle(liability)}</div>
          {liabilitySubtitle(liability) && <div className="card-subtitle">{liabilitySubtitle(liability)}</div>}
        </div>
      </div>
      <div className="card-right">
        {liability.outstandingBalance == null ? (
          <span className="value-missing-text">Balance not added</span>
        ) : (
          <div className="value-wrap">
            <span className="value-text">{fmtMoney(liability.outstandingBalance, cur)}</span>
            {cur !== 'USD' && <span className="value-approx">≈ {fmtUSD(usdOf(liability.outstandingBalance, cur))}</span>}
          </div>
        )}
        <OverflowMenu items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Remove liability', danger: true, onSelect: onRemove },
        ]} />
      </div>
    </div>
  )
}

/* Grouped asset list: headers only when multiple categories exist. */
export function AssetList({ assets, onEdit, onRemove }) {
  const cats = ASSET_CATEGORIES.filter((c) => assets.some((a) => a.category === c.key))
  const grouped = cats.length > 1
  return (
    <div className="groups">
      {cats.map((cat) => {
        const items = assets.filter((a) => a.category === cat.key)
        const known = items.filter((a) => a.value != null)
        const subtotal = known.reduce((s, a) => s + usdOf(a.value, a.currency), 0)
        return (
          <section className="group" key={cat.key}>
            {grouped && (
              <div className="group-head">
                <h3 className="group-name">{cat.label}</h3>
                {items.length >= 2 && (
                  <span className="group-subtotal">{known.length ? fmtUSD(subtotal) : '—'}</span>
                )}
              </div>
            )}
            {items.map((a) => (
              <AssetCard key={a.id} asset={a} onEdit={() => onEdit(a)} onRemove={() => onRemove(a)} />
            ))}
          </section>
        )
      })}
    </div>
  )
}

