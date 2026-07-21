/* Domain components: shell, summary, cards, category grid. */
import {
  ASSET_CATEGORIES, assetCategory, assetSubtitle, assetTitle, computeSummary,
  fmtCompact, fmtMoney, fmtUSD, hasForeignValues, institutionAvatar, liabilityCategory, usdOf,
} from './model.js'
import { Fragment, useEffect, useRef, useState } from 'react'
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

export function Sidebar({ activeKey, onNav, clientName, sections }) {
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
  // The stats read as the equation behind the figure when both sides are real money.
  const equation = s.rows?.length === 2 && s.rows.every((r) => /^\$/.test(r.value))
  return (
    <section className="summary-card">
      <div className="summary-main">
        <span className="nw-label">
          <span className="nw-label-term">
            Estimated net worth
            <span className="nw-tip" role="tooltip">
              Based on the values you've entered. A rough picture is enough for your first conversation.
            </span>
          </span>
        </span>
        <div className={'nw-figure' + (s.nw == null ? ' nw-figure-empty' : '')}>
          {s.nw == null ? '—' : fmtUSD(shown)}
        </div>
        {s.line && <span className="nw-line">{s.line}</span>}
      </div>
      {s.rows && (
        <div className="summary-side">
          <div className="summary-stats">
            {s.rows.map((r, i) => (
              <Fragment key={r.label}>
                {i > 0 && equation && <span className="summary-op" aria-hidden="true">−</span>}
                <div className="summary-stat">
                  <span className="summary-stat-label">{r.label}</span>
                  <span className={'summary-stat-value' + (/^[$€£C]|^\d|^—/.test(r.value) ? '' : ' breakdown-val-muted')}>{r.value}</span>
                </div>
              </Fragment>
            ))}
          </div>
          {hasForeignValues(profile) && <span className="panel-note">Includes values converted to USD.</span>}
        </div>
      )}
    </section>
  )
}

/* ---------------- Cards ---------------- */


const stripAcct = (t) => (t || '').replace(/ account$/, '')

/* Institution name with its letter avatar inline, same 20px size as the combobox list. */
function Inst({ name }) {
  const av = institutionAvatar(name)
  return (
    <span className="inst">
      {av && (av.logo
        ? <img className="avatar avatar-sm avatar-logo" src={av.logo} alt="" aria-hidden="true" />
        : <span className="avatar avatar-sm" style={{ background: av.color }} aria-hidden="true">{av.letter}</span>)}
      {name}
    </span>
  )
}

/* Primary / secondary hierarchy per category (spec §6).
   `primaryType` + `primaryInst` render as "Type / [avatar] Institution". */
export const assetRowText = (a) => {
  const t = a.subtype, inst = a.institutionOrProvider, name = a.name
  /* When a row has no identity fields the category itself is the identity —
     "Investment account — $2M" is an honest, meaningful record. */
  const catLabel = assetCategory(a.category)?.single || 'Asset'
  if (a.category === 'cash' || a.category === 'investment' || a.category === 'retirement') {
    const type = a.category === 'investment' ? stripAcct(t) : t
    if (!type && !inst) return { primary: name || catLabel, secondary: null }
    return { primaryType: type, primaryInst: inst, secondary: name || null }
  }
  if (a.category === 'realestate') {
    return name
      ? { primary: name, secondary: [t, a.address].filter(Boolean).join(' · ') || null }
      : { primary: t || catLabel, secondary: a.address || null }
  }
  // The group band already says "Business interests" — echoing it in the row adds nothing.
  if (a.category === 'business') return { primary: name || catLabel, secondary: null }
  if (a.category === 'insurance') {
    return name
      ? { primary: name, secondaryInst: inst, secondary: t || null }
      : { primary: t || catLabel, secondaryInst: inst || null }
  }
  if (a.category === 'crypto') {
    if (t) return { primaryType: t, primaryInst: inst || undefined, secondary: name || null }
    return name
      ? { primary: name, secondaryInst: inst || null }
      : { primaryInst: inst || null, primary: inst ? undefined : catLabel }
  }
  if (a.category === 'collectibles') {
    return name ? { primary: name, secondary: t || null } : { primary: t || catLabel, secondary: null }
  }
  return { primary: name || catLabel, secondary: null }
}

const missingValueLabel = (a) =>
  a.category === 'cash'
    ? (a.subtype === 'Cash' ? 'Amount not added' : 'Balance not added')
    : a.category === 'retirement'
      ? (a.subtype === 'Pension' ? 'Value not added' : 'Balance not added')
      : 'Value not added'

/* One shared row for every saved asset type. Letter avatar when the row has an institution. */
export function AssetRow({ asset, onEdit, onRemove, active }) {
  const cur = asset.currency ?? 'USD'
  const { primary, primaryType, primaryInst, secondary, secondaryInst } = assetRowText(asset)
  return (
    <div className={'arow' + (active ? ' arow-active' : '')} onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() }
      }}>
      <div className="arow-primary">
        {primary}
        {/* the middle dot lives between two present values only */}
        {primaryType && <span className={primaryInst ? 'arow-type' : undefined}>{primaryType}</span>}
        {primaryInst && <Inst name={primaryInst} />}
      </div>
      {(secondary || secondaryInst) && (
        <div className="arow-secondary">
          {secondaryInst && <Inst name={secondaryInst} />}
          {secondary && <span className={secondaryInst ? 'arow-note-gap' : undefined}>{secondary}</span>}
        </div>
      )}
      <div className="arow-value">
        {asset.value == null ? (
          <span className="value-missing-text" title={missingValueLabel(asset)} aria-label={missingValueLabel(asset)}>—</span>
        ) : (
          <div className="value-wrap">
            <span className="value-text">{fmtCompact(asset.value, cur)}</span>
            {cur !== 'USD' && <span className="value-approx">≈ {fmtCompact(usdOf(asset.value, cur))}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/* Liability as the same flat row: "Category · [avatar] Lender", nickname/rate muted, balance right. */
export function LiabilityRow({ liability, onEdit, active }) {
  const cur = liability.currency ?? 'USD'
  const cat = liabilityCategory(liability.category)
  /* Identity first: the property / purpose / card the debt is about. The
     category label is a fallback only — the group band already names it. */
  const identity = liability.name?.trim() || cat?.label || 'Liability'
  const meta = liability.interestRate != null && liability.interestRate !== ''
    ? `${liability.interestRate}% interest` : null
  return (
    <div className={'arow' + (active ? ' arow-active' : '')} onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() }
      }}>
      <div className="arow-primary">
        <span className={liability.lender ? 'arow-type' : undefined}>{identity}</span>
        {liability.lender && <Inst name={liability.lender} />}
      </div>
      {meta && <div className="arow-secondary">{meta}</div>}
      <div className="arow-value">
        {liability.outstandingBalance == null ? (
          <span className="value-missing-text" title="Balance not added" aria-label="Balance not added">—</span>
        ) : (
          <div className="value-wrap">
            <span className="value-text">{fmtCompact(liability.outstandingBalance, cur)}</span>
            {cur !== 'USD' && <span className="value-approx">≈ {fmtCompact(usdOf(liability.outstandingBalance, cur))}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
