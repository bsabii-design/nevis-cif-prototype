/* Screens: Welcome, Personal, Work & income, Goals, Net worth. */
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, EMPLOYMENT_STATUSES, LIABILITY_CATEGORIES, US_STATES, computeSummary,
  COUNTRY_NAMES, fmtCompact, fmtMoney, fmtUSD, missingPersonalFields, requiredComplete, usdOf,
} from './model.js'
import { parseGoals } from './parse.js'
import { CountrySelect, DateInput, Field, MoneyInput, PhoneInput, RadioRow, SearchableSelect, TextInput } from './ui.jsx'
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

/* Address block per Figma Desktop-33: Country (searchable, flag), Street,
   then City / State / ZIP as three equal columns. State is a searchable
   US-states select only for United States; elsewhere it relabels to
   "State / province / region" and accepts free text. */
function AddressFields({ residence, onChange, errors = {}, onBlurField }) {
  const set = (k, v) => onChange({ ...residence, [k]: v })
  const isUS = (residence.country || '').trim() === 'United States'
  return (
    <>
      <Field label="Country" required error={errors.country}>
        <CountrySelect value={residence.country} options={COUNTRY_NAMES}
          placeholder="Start typing a country"
          onChange={(v) => set('country', v)} onBlur={() => onBlurField?.('country')} />
      </Field>
      <Field label="Street address">
        <TextInput value={residence.street} onChange={(v) => set('street', v)} />
      </Field>
      <div className="addr-row">
        <Field label="City">
          <TextInput value={residence.city} onChange={(v) => set('city', v)} />
        </Field>
        {isUS ? (
          <Field label="State" required error={errors.state}>
            <SearchableSelect value={residence.state} options={US_STATES}
              onChange={(v) => set('state', v)} onBlur={() => onBlurField?.('state')} />
          </Field>
        ) : (
          <Field label="State / province / region">
            <TextInput value={residence.state} onChange={(v) => set('state', v)} />
          </Field>
        )}
        <Field label="ZIP code">
          <TextInput value={residence.zip} onChange={(v) => set('zip', v)} inputMode="numeric" />
        </Field>
      </div>
    </>
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
          <div className="form-section-head-block">
            <h2 className="form-section-title">Legal identity</h2>
            <p className="form-section-copy">As you have it in your ID.</p>
          </div>
          <div className="field-pair">
            <Field label="First name" required error={err('firstName')}>
              <TextInput value={p.legalFirstName} onChange={(v) => set('legalFirstName', v)} onBlur={() => markTouched('firstName')} />
            </Field>
            <Field label="Last name" required error={err('lastName')}>
              <TextInput value={p.legalLastName} onChange={(v) => set('legalLastName', v)} onBlur={() => markTouched('lastName')} />
            </Field>
          </div>
          <div className="addr-row">
            <Field label="Date of birth" required error={dobError()}>
              <DateInput value={p.dateOfBirth}
                onChange={(v) => set('dateOfBirth', v)} onBlur={() => markTouched('dateOfBirth')} />
            </Field>
          </div>
        </div>

        {/* ---- Contact ---- */}
        <div className="form-section">
          <div className="form-section-head-block">
            <h2 className="form-section-title">Contact</h2>
            <p className="form-section-copy">How you can be reached.</p>
          </div>
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
          <div className="form-section-head-block">
            <h2 className="form-section-title">Residential address</h2>
            <p className="form-section-copy">Your primary home address.</p>
          </div>
          <AddressFields residence={p.primaryResidence}
            errors={{ country: err('country'), state: err('state', 'Select a state.') }}
            onBlurField={(k) => markTouched(k)}
            onChange={(r) => set('primaryResidence', r)} />
        </div>

        {/* ---- Citizenship ---- */}
        <div className="form-section">
          <div className="form-section-head-block">
            <h2 className="form-section-title">Citizenship</h2>
            <p className="form-section-copy">For tax and residency context.</p>
          </div>
          <Field label="Country of citizenship" required error={err('citizenship')}>
            <CountrySelect value={p.citizenships[0] || ''} options={COUNTRY_NAMES}
              placeholder="Start typing a country"
              onChange={(v) => set('citizenships', p.citizenships.map((x, j) => j === 0 ? v : x))}
              onBlur={() => markTouched('citizenship')} />
          </Field>
          {p.citizenships.slice(1).map((c, i) => (
            <div className="citizenship-row" key={i + 1}>
              <Field label="Additional citizenship">
                <CountrySelect value={c} options={COUNTRY_NAMES}
                  placeholder="Start typing a country"
                  onChange={(v) => set('citizenships', p.citizenships.map((x, j) => j === i + 1 ? v : x))} />
              </Field>
              <button className="link-danger citizenship-remove"
                onClick={() => set('citizenships', p.citizenships.filter((_, j) => j !== i + 1))}>
                Remove
              </button>
            </div>
          ))}
          <button className="add-row" onClick={() => set('citizenships', [...p.citizenships, ''])}>
            <PlusIcon /> Add another citizenship
          </button>
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

/* The standard goal taxonomy — one tap creates the goal, no AI in the way.
   ~8 presets cover most real cases; "Other…" catches the rest in the
   client's own words. */
/* Lifecycle order: the personal big three, then liquidity & family
   events, then legacy — with Other closing the list. */
const GOAL_PRESETS = [
  'Retire early', 'Buy a home', "Children's education",
  'Make a major purchase', 'Sell my business', 'Support my parents',
  'Leave a legacy', 'Charitable giving',
]

/* Goals saved under earlier label wording keep their pill lit. */
const PRESET_ALIASES = {
  "Kids' education": "Children's education",
  'A big purchase': 'Make a major purchase',
  'Care for my parents': 'Support my parents',
}

const CheckIcon = () => (
  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1.5 5.5 4 8l4.5-6" />
  </svg>
)

/* Resting rows never show absence; the editor offers optional detail.
   One goal open at a time — the list stays compact (accordion, parent-owned). */
function GoalRow({ goal, editing, onOpen, onClose, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...goal, [k]: v })

  if (!editing) {
    return (
      <div className="goal-row" onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}>
        <span className="goal-row-title">{goal.title}</span>
        <span className="goal-row-when">{goal.horizon}</span>
        <span className="goal-row-amount">{goal.targetAmount != null ? fmtCompact(goal.targetAmount, goal.currency) : ''}</span>
      </div>
    )
  }
  return (
    <div className="goal-editor">
      <Field label="Goal">
        <TextInput value={goal.title} onChange={(v) => set('title', v)}
          placeholder="What would you like to achieve?" />
      </Field>
      <div className="goal-duo">
        <Field label="When">
          <RadioRow name="When" options={HORIZONS} value={goal.horizon || ''}
            onChange={(v) => set('horizon', v || null)} />
        </Field>
        <Field label="Amount">
          <MoneyInput amount={goal.targetAmount} currency={goal.currency}
            onAmount={(v) => set('targetAmount', v)} onCurrency={(c) => set('currency', c)} />
        </Field>
      </div>
      <div className="editor-actions">
        <button className="btn btn-ghost btn-remove" onClick={onRemove}>Remove</button>
        <span className="editor-actions-spacer" />
        <button className="btn btn-secondary" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export function Goals({ profile, onChange }) {
  const [other, setOther] = useState('')
  const [editingId, setEditingId] = useState(null)
  const goals = profile.goals
  const setGoals = (g) => onChange({ ...profile, goals: g })

  /* Unchecking stashes the goal's details; re-checking restores them —
     toggling is a safe round trip, never a silent data loss. */
  const stashRef = useRef({})
  const presetGoal = (label) => goals.find((g) => g.preset === label || PRESET_ALIASES[g.preset] === label)
  const removeGoal = (g) => {
    if (g.preset) stashRef.current[g.preset] = g
    setGoals(goals.filter((x) => x.id !== g.id))
    if (editingId === g.id) setEditingId(null)
  }
  const togglePreset = (label) => {
    const g = presetGoal(label)
    if (g) {
      removeGoal(g)
    } else {
      const restored = stashRef.current[label]
      setGoals([...goals, restored ?? { id: Date.now(), title: label, horizon: null, targetAmount: null, currency: 'USD', preset: label, note: '' }])
    }
  }
  const addOther = () => {
    const t = other.trim()
    if (!t) return
    setGoals([...goals, ...parseGoals(t)])
    setOther('')
  }

  return (
    <div className="screen">
      <div className="narrow-col">
      <div className="title-block">
        <h1 className="page-title">Your goals</h1>
        <p className="page-copy">
          What would you like your wealth to help you achieve? Select all that apply — rough is fine.
        </p>
      </div>

      <div className="goal-picker">
        {GOAL_PRESETS.map((label) => {
          const on = !!presetGoal(label)
          return (
            <button key={label} className={'goal-pick' + (on ? ' goal-pick-on' : '')}
              role="checkbox" aria-checked={on} onClick={() => togglePreset(label)}>
              <span className="goal-check">{on && <CheckIcon />}</span>
              {label}
            </button>
          )
        })}
        <span className={'goal-pick goal-other' + (other ? ' goal-pick-on' : '')}>
          <input
            className="goal-other-input"
            value={other}
            placeholder="Other…"
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOther() } }}
            onBlur={addOther}
          />
        </span>
      </div>

      {goals.length > 0 && (
        <div className="goal-rows">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g}
              editing={editingId === g.id}
              onOpen={() => setEditingId(g.id)}
              onClose={() => setEditingId(null)}
              onChange={(ng) => setGoals(goals.map((x) => (x.id === g.id ? ng : x)))}
              onRemove={() => removeGoal(g)} />
          ))}
        </div>
      )}

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
              Assets{assets.length > 0 && <span className="nw-pill-count">{assets.length}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'liabilities'}
              className={'nw-pill' + (tab === 'liabilities' ? ' nw-pill-active' : '')}
              onClick={() => onTab('liabilities')}>
              Liabilities{liabilities.length > 0 && <span className="nw-pill-count">{liabilities.length}</span>}
            </button>
          </div>
          <div className="nw-toolbar-right">
            {tab === 'assets' && assets.length > 0 && (
              <button className="btn btn-primary" onClick={() => onAddAsset(null)}>Add assets</button>
            )}
            {tab === 'liabilities' && liabilities.length > 0 && (
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
                  <h2 className="nw-empty-title">No assets added yet</h2>
                  <p className="page-copy">Add accounts, property, investments, or anything else you own.</p>
                  <button className="btn btn-primary nw-empty-cta" onClick={() => onAddAsset(null)}>Add assets</button>
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
                      <span className="group-subtotal">{known.length ? fmtCompact(subtotal) : '—'}</span>
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
                  <h2 className="nw-empty-title">No liabilities added yet</h2>
                  <p className="page-copy">Add mortgages, loans, credit balances, or anything else you owe.</p>
                  <button className="btn btn-primary nw-empty-cta" onClick={() => onAddLiability(null)}>Add liabilities</button>
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
                      <span className="group-subtotal">{known.length ? fmtCompact(subtotal) : '—'}</span>
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
