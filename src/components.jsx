import {
  CATEGORIES, effectiveUSD, fmtMoney, fmtUSD, hasForeignValues,
  institutionAvatar, liabilitiesAnswered, liabilitiesTotalUSD, shareValue, usdOf,
} from './data.js'
import { useCountUp } from './hooks.js'

/* ---------------- Top bar ---------------- */

const TABS = ['Personal', 'Occupation & income', 'Goals', 'Net worth']

export function TopBar({ saved, clientName }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="wordmark">Nevis</span>
        <nav className="tabs" aria-label="Profile sections">
          {TABS.map((t) => (
            <button
              key={t}
              className={'tab' + (t === 'Net worth' ? ' tab-active' : '')}
              title={t === 'Net worth' ? undefined : 'Not part of this prototype'}
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

export function NetWorthBlock({ assets, liabilities, onShowMissing, onGoToLiabilities }) {
  const valued = assets.filter((a) => a.value != null)
  const totalAssets = valued.reduce((s, a) => s + effectiveUSD(a), 0)
  const missing = assets.length - valued.length
  const answered = liabilitiesAnswered(liabilities)

  let label, figure, line
  if (assets.length === 0) {
    label = 'Net worth'
    figure = null
    line = <span className="nw-line nw-line-muted">Appears as you add what you own</span>
  } else if (!answered) {
    label = 'Total assets'
    figure = totalAssets
    line = (
      <button className="nw-line nw-line-link" onClick={onGoToLiabilities}>
        Add liabilities to complete your financial picture
      </button>
    )
  } else {
    label = 'Estimated net worth'
    figure = totalAssets - liabilitiesTotalUSD(liabilities)
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

export function SummaryPanel({ assets, liabilities, onShowMissing, onGoToLiabilities }) {
  const valued = assets.filter((a) => a.value != null)
  const totalAssets = valued.reduce((s, a) => s + effectiveUSD(a), 0)
  const showBreakdown = assets.length > 0 && liabilitiesAnswered(liabilities)
  const foreign = hasForeignValues(assets, liabilities)

  return (
    <aside className="panel">
      <NetWorthBlock
        assets={assets} liabilities={liabilities}
        onShowMissing={onShowMissing} onGoToLiabilities={onGoToLiabilities}
      />
      {showBreakdown && (
        <>
          <div className="divider" />
          <div className="breakdown">
            <div className="breakdown-row">
              <span>What you own</span>
              <span className="breakdown-val">{fmtUSD(totalAssets)}</span>
            </div>
            <div className="breakdown-row">
              <span>What you owe</span>
              <span className="breakdown-val">−{fmtUSD(liabilitiesTotalUSD(liabilities))}</span>
            </div>
          </div>
        </>
      )}
      {foreign && <p className="panel-note">Includes values converted to USD.</p>}
    </aside>
  )
}

/* ---------------- Display money (read-only cell) ---------------- */

function MoneyDisplay({ amount, currency = 'USD', primaryText, usdApprox, missingLabel, addLabel }) {
  if (amount == null) {
    return (
      <div className="value-missing">
        <span className="value-missing-text">{missingLabel}</span>
        <span className="link">{addLabel}</span>
      </div>
    )
  }
  return (
    <div className="value-wrap">
      <span className="value-text">{primaryText}</span>
      {usdApprox != null && <span className="value-approx">≈ {fmtUSD(usdApprox)}</span>}
    </div>
  )
}

/* ---------------- Cards (display mode) ---------------- */

export function AssetCard({ asset, onOpen, highlight }) {
  const cur = asset.currency ?? 'USD'
  const shared = asset.value != null && shareValue(asset) !== asset.value
  const primaryText = shared
    ? <><span className="value-muted">Value {fmtMoney(asset.value, cur)} · </span>Your share {fmtMoney(shareValue(asset), cur)}</>
    : fmtMoney(asset.value, cur)
  const avatar = institutionAvatar(asset.institution || asset.whereHeld)

  return (
    <div
      className={'card card-clickable' + (highlight ? ' card-highlight' : '')}
      id={'asset-' + asset.id}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <span className="card-hint">Edit</span>
      <div className="card-left">
        {avatar && (
          <span className="avatar" style={{ background: avatar.color }} aria-hidden="true">
            {avatar.letter}
          </span>
        )}
        <div className="card-info">
          <div className="card-title">{asset.title}</div>
          {asset.subtitle && <div className="card-subtitle">{asset.subtitle}</div>}
        </div>
      </div>
      <MoneyDisplay
        amount={asset.value} currency={cur}
        primaryText={primaryText}
        usdApprox={cur !== 'USD' ? effectiveUSD(asset) : null}
        missingLabel="Value not added" addLabel="Add value"
      />
    </div>
  )
}

export function LiabilityCard({ liability, assets, onOpen }) {
  const cur = liability.currency ?? 'USD'
  const linked = assets.find((a) => a.id === liability.linkedAssetId)
  const subtitle = [liability.lender, liability.interestRate && `${liability.interestRate}%`, linked?.title]
    .filter(Boolean).join(' · ')

  return (
    <div
      className="card card-clickable"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <span className="card-hint">Edit</span>
      <div className="card-info">
        <div className="card-title">{liability.type}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      <MoneyDisplay
        amount={liability.balance} currency={cur}
        primaryText={fmtMoney(liability.balance, cur)}
        usdApprox={cur !== 'USD' ? usdOf(liability.balance, cur) : null}
        missingLabel="Balance not added" addLabel="Add balance"
      />
    </div>
  )
}

/* ---------------- Groups ---------------- */

export function AssetGroups({ assets, editingId, onOpen, renderEditor, highlightId }) {
  return (
    <div className="groups">
      {CATEGORIES.map((cat) => {
        const items = assets.filter((a) => a.category === cat.key)
        if (items.length === 0) return null
        const valued = items.filter((a) => a.value != null)
        const subtotal = valued.reduce((s, a) => s + effectiveUSD(a), 0)
        return (
          <section className="group" key={cat.key}>
            <div className="group-head">
              <h3 className="group-name">{cat.plural}</h3>
              {items.length >= 2 && (
                <span className="group-subtotal">{valued.length ? fmtUSD(subtotal) : '—'}</span>
              )}
            </div>
            {items.map((a) =>
              a.id === editingId ? (
                <div key={a.id}>{renderEditor(a)}</div>
              ) : (
                <AssetCard
                  key={a.id}
                  asset={a}
                  highlight={a.id === highlightId}
                  onOpen={() => onOpen(a.id)}
                />
              )
            )}
          </section>
        )
      })}
    </div>
  )
}

