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

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M2.5 4h11" />
    <path d="M5.5 4V2.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4" />
    <path d="M3.8 4l.6 9a1.2 1.2 0 0 0 1.2 1.1h4.8a1.2 1.2 0 0 0 1.2-1.1l.6-9" />
    <line x1="6.4" y1="7" x2="6.4" y2="11.5" />
    <line x1="9.6" y1="7" x2="9.6" y2="11.5" />
  </svg>
)

const stripAcct = (t) => (t || '').replace(/ account$/, '')

/* Primary / secondary hierarchy per category (spec §6). */
export const assetRowText = (a) => {
  const t = a.subtype, inst = a.institutionOrProvider, name = a.name
  if (a.category === 'cash' || a.category === 'investment' || a.category === 'retirement') {
    const type = a.category === 'investment' ? stripAcct(t) : t
    return { primary: [type, inst].filter(Boolean).join(' · ') || name || 'Account', secondary: name || null }
  }
  if (a.category === 'realestate') {
    return name
      ? { primary: name, secondary: [t, a.address].filter(Boolean).join(' · ') || null }
      : { primary: t || 'Property', secondary: a.address || null }
  }
  if (a.category === 'business') return { primary: name || 'Business interest', secondary: name ? 'Business interest' : null }
  if (a.category === 'insurance') {
    return name
      ? { primary: name, secondary: [inst, t].filter(Boolean).join(' · ') || null }
      : { primary: t || 'Insurance or annuity', secondary: inst || null }
  }
  if (a.category === 'crypto') {
    return name
      ? { primary: name, secondary: inst || null }
      : { primary: inst || 'Crypto', secondary: null }
  }
  if (a.category === 'collectibles') {
    return name ? { primary: name, secondary: t || null } : { primary: t || 'Collectible', secondary: null }
  }
  return { primary: name || 'Asset', secondary: null }
}

const missingValueLabel = (a) =>
  a.category === 'cash'
    ? (a.subtype === 'Cash' ? 'Amount not added' : 'Balance not added')
    : a.category === 'retirement'
      ? (a.subtype === 'Pension' ? 'Value not added' : 'Balance not added')
      : 'Value not added'

/* One shared row for every saved asset type. No icons, avatars or logos. */
export function AssetRow({ asset, onEdit, onRemove }) {
  const cur = asset.currency ?? 'USD'
  const { primary, secondary } = assetRowText(asset)
  return (
    <div className="arow" onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
      <div className="arow-text">
        <div className="arow-primary">{primary}</div>
        {secondary && <div className="arow-secondary">{secondary}</div>}
      </div>
      <div className="arow-value">
        {asset.value == null ? (
          <span className="value-missing-text">{missingValueLabel(asset)}</span>
        ) : (
          <div className="value-wrap">
            <span className="value-text">{fmtMoney(asset.value, cur)}</span>
            {cur !== 'USD' && <span className="value-approx">≈ {fmtUSD(usdOf(asset.value, cur))}</span>}
          </div>
        )}
      </div>
      <OverflowMenu items={[
        { label: 'Edit', onSelect: onEdit },
        { label: 'Remove asset', danger: true, onSelect: onRemove },
      ]} />
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
        <button className="card-remove" aria-label="Remove liability"
          onClick={(e) => { e.stopPropagation(); onRemove() }}>
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}
