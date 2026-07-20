/* Screens: Welcome, Personal, Work & income, Goals, Net worth. */
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, EMPLOYMENT_STATUSES, LIABILITY_CATEGORIES, computeSummary,
  fmtMoney, fmtUSD, missingPersonalFields, requiredComplete, usdOf,
} from './model.js'
import { parseGoals } from './parse.js'
import { DateInput, Field, GroupedSelect, MoneyInput, PhoneInput, RadioRow, TextInput } from './ui.jsx'
import { AssetRow, FinancialSummary, LiabilityRow } from './components.jsx'
import { useCountUp } from './hooks.js'

/* ---------------- Welcome (spec §7) ---------------- */

export function Welcome({ onStart }) {
  return (
    <div className="welcome">
      <h1 className="welcome-title">Welcome, Jonathan</h1>
      <p className="page-copy">Sarah invited you to complete your financial profile before your meeting.</p>
      <p className="page-copy">
        This will help her understand your goals and financial situation, so you can spend
        more of your meeting discussing strategy.
      </p>
      <p className="page-copy">You can complete this in parts and come back anytime. Rough estimates are fine.</p>
      <button className="btn btn-primary welcome-cta" onClick={onStart}>Get started</button>
      <div className="welcome-list">
        <span className="welcome-list-title">What you can add</span>
        <span>Personal details</span>
        <span>Work and income</span>
        <span>Goals</span>
        <span>Assets and liabilities</span>
      </div>
    </div>
  )
}

/* ---------------- Personal information (spec §9) ---------------- */

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
  </svg>
)

/* `primary` marks the residence whose country + state drive tax residency
   (the only required parts); street/city/ZIP stay optional. */
function ResidenceFields({ residence, onChange, primary, errors = {}, onBlurField }) {
  const set = (k, v) => onChange({ ...residence, [k]: v })
  const blur = (k) => () => onBlurField?.(k)
  return (
    <div className="residence-grid">
      <Field label="Country" required={primary} error={errors.country}>
        <TextInput value={residence.country} onChange={(v) => set('country', v)} onBlur={blur('country')} />
      </Field>
      <Field label="Street address">
        <TextInput value={residence.street} onChange={(v) => set('street', v)} />
      </Field>
      <Field label="Apartment, suite, unit, etc.">
        <TextInput value={residence.apartment} onChange={(v) => set('apartment', v)} />
      </Field>
      <div className="addr-row">
        <Field label="City">
          <TextInput value={residence.city} onChange={(v) => set('city', v)} />
        </Field>
        <Field label="State" required={primary} error={errors.state}>
          <TextInput value={residence.state} onChange={(v) => set('state', v)} onBlur={blur('state')} />
        </Field>
        <Field label="ZIP code">
          <TextInput value={residence.zip} onChange={(v) => set('zip', v)} inputMode="numeric" />
        </Field>
      </div>
    </div>
  )
}

export function Personal({ profile, onChange, onNav, shareAttempted }) {
  const p = profile.personal
  const set = (k, v) => onChange({ ...profile, personal: { ...p, [k]: v } })
  const missing = missingPersonalFields(profile)
  const flag = shareAttempted && !requiredComplete(profile)
  const [touched, setTouched] = useState({})
  const markTouched = (k) => setTouched((t) => ({ ...t, [k]: true }))

  /* Show an error once the user leaves a field invalid, or after a blocked Share attempt. */
  const err = (k, message = 'Required') =>
    missing[k] && (flag || touched[k]) ? message : null
  const dobError = () =>
    missing.dateOfBirth && (flag || touched.dateOfBirth)
      ? (p.dateOfBirth?.trim() ? 'Enter a valid date in MM/DD/YYYY format.' : 'Required')
      : null
  const emailError = () =>
    missing.email && (flag || touched.email)
      ? (p.email?.trim() ? 'Enter a valid email address.' : 'Required')
      : null

  useEffect(() => {
    if (flag) {
      setTimeout(() =>
        document.querySelector('.field-missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
  }, [flag])

  return (
    <div className="screen">
      <div className="narrow-col">
      <div className="title-block">
        <h1 className="page-title">Personal information</h1>
        {flag && <p className="page-message">Add the required details below before sharing.</p>}
        <p className="page-copy">Please review your details and add anything missing.</p>
      </div>

      <div className="focus-form form-filled">
        {/* ---- Legal identity ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Legal identity</h2>
          <div className="field-pair">
            <Field label="Legal first name" required error={err('firstName')}>
              <TextInput value={p.legalFirstName} onChange={(v) => set('legalFirstName', v)} onBlur={() => markTouched('firstName')} />
            </Field>
            <Field label="Legal last name" required error={err('lastName')}>
              <TextInput value={p.legalLastName} onChange={(v) => set('legalLastName', v)} onBlur={() => markTouched('lastName')} />
            </Field>
          </div>
          <div className="field-pair">
            <Field label="Middle name">
              <TextInput value={p.middleName} onChange={(v) => set('middleName', v)} />
            </Field>
            <Field label="Date of birth" required error={dobError()}>
              <DateInput value={p.dateOfBirth}
                onChange={(v) => set('dateOfBirth', v)} onBlur={() => markTouched('dateOfBirth')} />
            </Field>
          </div>
        </div>

        {/* ---- Contact ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Contact</h2>
          <p className="form-section-copy">So your advisor can reach you and send your summary.</p>
          <div className="field-pair">
            <Field label="Email" required error={emailError()}>
              <TextInput value={p.email} type="email" onChange={(v) => set('email', v)} onBlur={() => markTouched('email')} />
            </Field>
            <Field label="Phone">
              <PhoneInput value={p.phone} onChange={(v) => set('phone', v)} />
            </Field>
          </div>
        </div>

        {/* ---- Residential address ---- */}
        <div className="form-section">
          <div className="form-section-header">
            <h2 className="form-section-title">Residential address</h2>
            <button className="section-add" aria-label="Add another residence"
              onClick={() => set('additionalResidences', [...p.additionalResidences, { country: '', street: '', apartment: '', city: '', state: '', zip: '' }])}>
              <PlusIcon />
            </button>
          </div>
          <p className="form-section-copy">Your primary home — this sets your tax residency.</p>
          <ResidenceFields primary residence={p.primaryResidence}
            errors={{ country: err('country'), state: err('state', 'Select a state.') }}
            onBlurField={(k) => markTouched(k)}
            onChange={(r) => set('primaryResidence', r)} />

          {p.additionalResidences.map((r, i) => (
            <div className="form-subsection" key={i}>
              <div className="form-section-head">
                <h3 className="form-subsection-title">Additional residence</h3>
                <button className="link-danger"
                  onClick={() => set('additionalResidences', p.additionalResidences.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <ResidenceFields residence={r}
                onChange={(nr) => set('additionalResidences', p.additionalResidences.map((x, j) => j === i ? nr : x))} />
            </div>
          ))}
        </div>

        {/* ---- Citizenship ---- */}
        <div className="form-section">
          <div className="form-section-header">
            <h2 className="form-section-title">Citizenship</h2>
            <button className="section-add" aria-label="Add another citizenship"
              onClick={() => set('citizenships', [...p.citizenships, ''])}>
              <PlusIcon />
            </button>
          </div>
          <p className="form-section-copy">For tax and residency context.</p>
          <Field label="Country of citizenship" required error={err('citizenship')}>
            <TextInput value={p.citizenships[0] || ''} placeholder="United States"
              onChange={(v) => set('citizenships', p.citizenships.map((x, j) => j === 0 ? v : x))}
              onBlur={() => markTouched('citizenship')} />
          </Field>
          {p.citizenships.slice(1).map((c, i) => (
            <div className="citizenship-row" key={i + 1}>
              <Field label="Additional country of citizenship">
                <TextInput value={c}
                  onChange={(v) => set('citizenships', p.citizenships.map((x, j) => j === i + 1 ? v : x))} />
              </Field>
              <button className="link-danger citizenship-remove"
                onClick={() => set('citizenships', p.citizenships.filter((_, j) => j !== i + 1))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      </div>
    </div>
  )
}

/* ---------------- Work & income (spec §10) ---------------- */

export function Work({ profile, onChange, onNav }) {
  const w = profile.work
  const set = (k, v) => onChange({ ...profile, work: { ...w, [k]: v } })
  const st = w.employmentStatus

  return (
    <div className="screen">
      <div className="narrow-col">
      <div className="title-block">
        <div className="page-title-row">
          <h1 className="page-title">Occupation & income</h1>
          <span className="optional-tag">Optional</span>
        </div>
        <p className="page-copy">Add any context that would be useful for your conversation with Sarah.</p>
      </div>

      <div className="focus-form">
        <Field label="Employment status">
          <RadioRow name="Employment status" options={EMPLOYMENT_STATUSES}
            value={st} onChange={(v) => set('employmentStatus', v)} />
        </Field>

        {st === 'Employed' && (
          <>
            <Field label="Job title"><TextInput value={w.jobTitle} onChange={(v) => set('jobTitle', v)} /></Field>
            <Field label="Employer"><TextInput value={w.employer} onChange={(v) => set('employer', v)} /></Field>
          </>
        )}
        {(st === 'Self-employed' || st === 'Business owner') && (
          <>
            <Field label="Occupation"><TextInput value={w.occupation} onChange={(v) => set('occupation', v)} /></Field>
            <Field label="Business name"><TextInput value={w.businessName} onChange={(v) => set('businessName', v)} /></Field>
          </>
        )}
        {st === 'Retired' && (
          <Field label="Previous occupation" helper="Optional">
            <TextInput value={w.occupation} onChange={(v) => set('occupation', v)} />
          </Field>
        )}

        {st && st !== 'Not employed' && (
          <Field label={st === 'Retired' ? 'Annual retirement income' : 'Annual income'} helper="A rough estimate is fine.">
            <MoneyInput amount={w.annualIncome} currency={w.currency}
              onAmount={(v) => set('annualIncome', v)} onCurrency={(c) => set('currency', c)} />
          </Field>
        )}
      </div>

      </div>
    </div>
  )
}

/* ---------------- Goals ---------------- */

const HORIZONS = ['Within 5 years', '5–10 years', '10+ years', 'Not sure yet']

/* Quiet inline examples — hints to start from, not choice controls. */
const GOAL_TRIES = [
  { label: 'Retire early', seed: "I'd like to retire early" },
  { label: 'Buy a home', seed: 'I want to buy a home' },
  { label: "Kids' education", seed: "I'd like to help pay for my children's education" },
  { label: 'Sell my business', seed: 'I plan to sell my business' },
  { label: 'Leave a legacy', seed: 'I want to leave a legacy for my family' },
]

/* Resting rows never show absence; the editor offers optional detail.
   One goal open at a time — the list stays compact (accordion, parent-owned). */
function GoalRow({ goal, editing, onOpen, onClose, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...goal, [k]: v })
  const [showAmount, setShowAmount] = useState(goal.targetAmount != null)

  if (!editing) {
    const meta = [goal.horizon, goal.targetAmount != null ? fmtMoney(goal.targetAmount, goal.currency) : null]
      .filter(Boolean).join(' · ')
    return (
      <div className="goal-row" onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}>
        <span className="goal-row-title">{goal.title}</span>
        {meta ? <span className="goal-row-meta">{meta}</span> : <span className="goal-row-hint">Add timing</span>}
      </div>
    )
  }
  return (
    <div className="goal-editor">
      <Field label="Goal">
        <TextInput value={goal.title} onChange={(v) => set('title', v)}
          placeholder="What would you like to achieve?" />
      </Field>
      <Field label="When">
        <GroupedSelect options={HORIZONS} value={goal.horizon || ''}
          placeholder="Select timing" onChange={(v) => set('horizon', v || null)} />
      </Field>
      {showAmount ? (
        <Field label="Estimated amount">
          <MoneyInput amount={goal.targetAmount} currency={goal.currency}
            onAmount={(v) => set('targetAmount', v)} onCurrency={(c) => set('currency', c)} />
        </Field>
      ) : (
        <button className="goal-add-amount" onClick={() => setShowAmount(true)}>+ Add estimated amount</button>
      )}
      <div className="editor-actions">
        <button className="btn btn-ghost btn-remove" onClick={onRemove}>Remove</button>
        <span className="editor-actions-spacer" />
        <button className="btn btn-secondary" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export function Goals({ profile, onChange }) {
  const [text, setText] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const goals = profile.goals
  const setGoals = (g) => onChange({ ...profile, goals: g })
  const addSeed = (seed) =>
    setText((t) => {
      const base = t.trim()
      if (base.toLowerCase().includes(seed.toLowerCase())) return t
      return base ? base.replace(/\.?\s*$/, '. ') + seed : seed
    })

  const create = () => {
    if (!text.trim()) return
    setCreating(true)
    setTimeout(() => {
      setGoals([...goals, ...parseGoals(text)])
      setText('')
      setCreating(false)
    }, 1200)
  }

  const empty = goals.length === 0
  return (
    <div className="screen goals-screen">
      <div className="narrow-col">
      <div className="title-block">
        <h1 className="page-title">Your goals</h1>
        <p className="page-copy">
          {empty
            ? 'What would you like your wealth to help you achieve? Describe it in your own words — rough is fine.'
            : 'These shape the strategy Sarah prepares for your meeting. Edit anything — rough is fine.'}
        </p>
      </div>

      {!empty && (
        <div className="goal-rows">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g}
              editing={editingId === g.id}
              onOpen={() => setEditingId(g.id)}
              onClose={() => setEditingId(null)}
              onChange={(ng) => setGoals(goals.map((x) => (x.id === g.id ? ng : x)))}
              onRemove={() => { setGoals(goals.filter((x) => x.id !== g.id)); if (editingId === g.id) setEditingId(null) }} />
          ))}
        </div>
      )}

      <div className="goal-compose">
        <div className="goal-composer">
          <textarea
            className="input goals-textarea"
            rows={empty ? 4 : 2}
            placeholder={empty
              ? "For example: I'd like to sell my business in about ten years, move closer to the coast and help pay for my children's college."
              : 'Add another goal in your own words…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); create() }
            }}
          />
          <button
            className={'composer-send' + (text.trim() && !creating ? ' composer-send-on' : '')}
            aria-label="Turn your words into goals"
            title="Turn your words into goals"
            disabled={creating}
            onClick={create}>
            {creating ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
              </svg>
            )}
          </button>
        </div>
        <p className="goal-try">
          Try one of these:{' '}
          {GOAL_TRIES.map((c, i) => (
            <Fragment key={c.label}>
              {i > 0 && <span className="goal-try-sep"> · </span>}
              <button className="goal-try-btn" onClick={() => addSeed(c.seed)}>{c.label}</button>
            </Fragment>
          ))}
        </p>
      </div>

      </div>
    </div>
  )
}

/* ---------------- Net worth: one page, category bubbles, modal forms ---------------- */

const GROUP_ADD_LABEL = {
  cash: 'Add bank account',
  investment: 'Add investment account',
  retirement: 'Add retirement account',
  realestate: 'Add property',
  business: 'Add business interest',
  insurance: 'Add insurance or annuity',
  crypto: 'Add crypto asset',
  collectibles: 'Add collectible',
  other: 'Add other asset',
}


export function NetWorth({ profile, tab, onTab, selectedCats, onToggleCat,
  onAddAsset, onAddLiability, onEditAsset, onRemoveAsset, onEditLiability, onRemoveLiability,
  onAnswerNone, panelOpen, panelTarget }) {
  const { assets, liabilities, liabilitiesExplicitlyNone: none } = profile

  /* Collapsing header: when the summary card scrolls out of view, a compact
     net-worth figure fades into the sticky toolbar so the counter stays visible. */
  const cardRef = useRef(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => setCompact(!e.isIntersecting),
      { rootMargin: '-57px 0px 0px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const nw = computeSummary(profile).nw
  const shownNW = useCountUp(nw)
  const compactNW = nw == null ? '—' : fmtUSD(shownNW)

  /* Only categories that contain saved records appear on the page. */
  const assetGroups = ASSET_CATEGORIES.filter((c) => assets.some((a) => a.category === c.key))
  const liabGroups = LIABILITY_CATEGORIES.filter((c) => liabilities.some((l) => l.category === c.key))

  return (
    <div className="screen">
      <div className="narrow-col">
      <div className="nw-header-top" ref={cardRef}>
        <div className="title-block">
          <h1 className="page-title">Net worth</h1>
          <p className="page-copy">
            Add anything you own or owe to build a clearer financial picture.<br />
            You can update it anytime.
          </p>
        </div>

        <FinancialSummary profile={profile} />
      </div>

      <div className={'nw-header' + (compact ? ' nw-header-compact' : '')}>
        <div className="nw-compact-bar" aria-hidden={!compact}>
          <span className="nw-compact-label">Estimated net worth</span>
          <span className="nw-compact-fig">{compactNW}</span>
        </div>

        <div className="nw-divider" />

        <div className="nw-toolbar">
          <div className="nw-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'assets'}
              className={'nw-pill' + (tab === 'assets' ? ' nw-pill-active' : '')}
              onClick={() => onTab('assets')}>
              Assets
            </button>
            <button role="tab" aria-selected={tab === 'liabilities'}
              className={'nw-pill' + (tab === 'liabilities' ? ' nw-pill-active' : '')}
              onClick={() => onTab('liabilities')}>
              Liabilities
            </button>
          </div>
          <div className="nw-toolbar-right">
            {tab === 'assets' ? (
              <button className="btn btn-primary" onClick={() => onAddAsset(null)}>Add assets</button>
            ) : (
              <button className="btn btn-primary" onClick={() => onAddLiability(null)}>Add liabilities</button>
            )}
          </div>
        </div>
      </div>

      <div className="nw-main">
          {tab === 'assets' && (
            <>
              {assets.length === 0 && (
                <div className="nw-empty">
                  <h2 className="nw-empty-title">Start your financial picture</h2>
                  <p className="page-copy">
                    Add accounts, property, and anything else you own.<br />
                    Your net worth builds as you go — rough estimates are fine.
                  </p>
                </div>
              )}
              {assetGroups.map((cat) => {
                const items = assets.filter((a) => a.category === cat.key)
                const known = items.filter((a) => a.value != null)
                const subtotal = known.reduce((s, a) => s + usdOf(a.value, a.currency), 0)
                return (
                  <section className="group" key={cat.key}>
                    <div className={'group-head' + (panelTarget && !panelTarget.id && panelTarget.category === cat.key ? ' group-head-active' : '')}>
                      <h3 className="group-name">{cat.label}</h3>
                      <button className="group-plus"
                        aria-label={GROUP_ADD_LABEL[cat.key]} title={GROUP_ADD_LABEL[cat.key]}
                        onClick={(e) => { e.currentTarget.blur(); onAddAsset(cat.key) }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                          <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
                        </svg>
                      </button>
                      <span className="group-subtotal">{known.length ? fmtUSD(subtotal) : '—'}</span>
                    </div>
                    <div className="group-rows">
                      {items.map((a) => (
                        <AssetRow key={a.id} asset={a} active={panelTarget?.id === a.id}
                          onEdit={() => onEditAsset(a)} onRemove={() => onRemoveAsset(a)} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </>
          )}

          {tab === 'liabilities' && (
            <>
              {liabilities.length === 0 && !none && (
                <div className="nw-empty">
                  <h2 className="nw-empty-title">What do you owe?</h2>
                  <p className="page-copy">
                    Mortgages, loans, credit lines — anything you owe.<br />
                    This completes the picture: net worth is what you own minus what you owe.
                  </p>
                  <button className="link-quiet" onClick={onAnswerNone}>
                    I don't have any liabilities
                  </button>
                </div>
              )}

              {none && liabilities.length === 0 && (
                <p className="owe-none">
                  No liabilities — you've told us you don't currently have any.
                  Add one if that changes.
                </p>
              )}

              {liabGroups.map((cat) => {
                const items = liabilities.filter((l) => l.category === cat.key)
                const known = items.filter((l) => l.outstandingBalance != null)
                const subtotal = known.reduce((s, l) => s + usdOf(l.outstandingBalance, l.currency), 0)
                return (
                  <section className="group" key={cat.key}>
                    <div className={'group-head' + (panelTarget && !panelTarget.id && panelTarget.category === cat.key ? ' group-head-active' : '')}>
                      <h3 className="group-name">{cat.group}</h3>
                      <button className="group-plus"
                        aria-label={`Add ${cat.add}`} title={`Add ${cat.add}`}
                        onClick={(e) => { e.currentTarget.blur(); onAddLiability(cat.key) }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
                          <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
                        </svg>
                      </button>
                      <span className="group-subtotal">{known.length ? fmtUSD(subtotal) : '—'}</span>
                    </div>
                    <div className="group-rows">
                      {items.map((l) => (
                        <LiabilityRow key={l.id} liability={l} active={panelTarget?.id === l.id}
                          onEdit={() => onEditLiability(l)} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </>
          )}
      </div>
      </div>
    </div>
  )
}
