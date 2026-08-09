/* Screens: Welcome, Personal, Work & income, Goals, Net worth. */
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, EMPLOYMENT_STATUSES, LIABILITY_CATEGORIES, US_STATES, computeSummary,
  COUNTRY_NAMES, fmtCompact, fmtMoney, fmtUSD, missingPersonalFields, missingWorkFields, usdOf,
} from './model.js'
import { parseGoals } from './parse.js'
import { CompanyInput, CountrySelect, DateInput, Field, MoneyInput, PhoneInput, RadioRow, SearchableSelect, TextInput } from './ui.jsx'
import { AssetRow, LiabilityRow } from './components.jsx'
import { useCountUp } from './hooks.js'

/* ---------------- Welcome (spec §7) ---------------- */

/* Get started (Figma 60-18907): full-bleed wave video, one white card.
   The artifact build ships only the poster frame — the video 404s there
   and the background image stays. */
export function Welcome({ onStart }) {
  const poster = globalThis.__NEVIS_POSTER__ || '/nevis-waves.jpg'
  return (
    <div className="welcome-hero" style={{ backgroundImage: `url(${poster})` }}>
      <video className="welcome-video" autoPlay muted loop playsInline poster={poster}>
        <source src="/nevis-waves.mp4" type="video/mp4" />
      </video>
      <div className="welcome-card">
        <span className="welcome-brand">Nevis</span>
        <div className="welcome-intro">
          <div className="welcome-intro-copy">
            <h1 className="welcome-title">Welcome, Jonathan</h1>
            <p className="welcome-copy">
              Sarah invited you to add information to your financial profile before your meeting.
              This will help her understand your goals and financial situation, so you can spend
              more time discussing strategy.
            </p>
          </div>
        </div>
        <div className="welcome-section">
          <span className="welcome-sec-label">What you can add</span>
          <div className="welcome-sec-body">
            <span>Personal details</span>
            <span>Work and income</span>
            <span>Goals</span>
            <span>What you own and owe</span>
          </div>
        </div>
        <div className="welcome-section">
          <span className="welcome-sec-label">Before you start</span>
          <div className="welcome-sec-body">
            <p>
              You can do this in parts and come back anytime. Rough estimates are fine.
              Sarah won&rsquo;t see anything until you share your profile.
            </p>
          </div>
        </div>
        <button className="btn btn-primary btn-lg welcome-cta" onClick={onStart}>Get started</button>
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
function AddressFields({ residence, onChange, errors = {}, onBlurField, optional = false }) {
  const set = (k, v) => onChange({ ...residence, [k]: v })
  const isUS = (residence.country || '').trim() === 'United States'
  const req = !optional
  return (
    <>
      <div className="addr-top">
        <Field label="Country" required={req} error={errors.country}>
          <CountrySelect value={residence.country} options={COUNTRY_NAMES}
            placeholder="Start typing a country"
            onChange={(v) => set('country', v)} onBlur={() => onBlurField?.('country')} />
        </Field>
        <Field label="Street address" required={req} error={errors.street}>
          <TextInput value={residence.street} onChange={(v) => set('street', v)}
            onBlur={() => onBlurField?.('street')} />
        </Field>
      </div>
      <div className="addr-row">
        <Field label="City" required={req} error={errors.city}>
          <TextInput value={residence.city} onChange={(v) => set('city', v)}
            onBlur={() => onBlurField?.('city')} />
        </Field>
        {isUS ? (
          <Field label="State" required={req} error={errors.state}>
            <SearchableSelect value={residence.state} options={US_STATES}
              onChange={(v) => set('state', v)} onBlur={() => onBlurField?.('state')} />
          </Field>
        ) : (
          <Field label="State / province / region">
            <TextInput value={residence.state} onChange={(v) => set('state', v)} />
          </Field>
        )}
        <Field label="ZIP code" required={req} error={errors.zip}>
          <TextInput value={residence.zip} onChange={(v) => set('zip', v)} inputMode="numeric"
            onBlur={() => onBlurField?.('zip')} />
        </Field>
      </div>
    </>
  )
}

export function Personal({ profile, onChange, onNav, shareAttempted }) {
  const p = profile.personal
  const set = (k, v) => onChange({ ...profile, personal: { ...p, [k]: v } })
  const missing = missingPersonalFields(profile)
  const flag = shareAttempted && Object.values(missing).some(Boolean)
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
          </div>
          <div className="field-pair">
            <Field label="Email" required error={emailError()}>
              <TextInput value={p.email} type="email" onChange={(v) => set('email', v)} onBlur={() => markTouched('email')} />
            </Field>
            <Field label="Phone" required error={err('phone')}>
              <PhoneInput value={p.phone} onChange={(v) => set('phone', v)} onBlur={() => markTouched('phone')}
                country={p.phoneCountry || 'United States'}
                onCountry={(c, v) => onChange({ ...profile, personal: { ...p, phoneCountry: c, phone: v ?? p.phone } })} />
            </Field>
          </div>
        </div>

        {/* ---- Residential address ---- */}
        <div className="form-section">
          <div className="form-section-head-block">
            <h2 className="form-section-title">Residential address</h2>
          </div>
          <AddressFields residence={p.primaryResidence}
            errors={{ country: err('country'), street: err('street'), city: err('city'), state: err('state', 'Select a state.'), zip: err('zip') }}
            onBlurField={(k) => markTouched(k)}
            onChange={(r) => set('primaryResidence', r)} />
          {p.additionalResidences.map((r, i) => (
            <div className="form-subblock" key={i}>
              <div className="form-subblock-head">
                <span className="form-subblock-title">Additional address</span>
                <button className="link-danger"
                  onClick={() => set('additionalResidences', p.additionalResidences.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <AddressFields residence={r} optional
                onChange={(nr) => set('additionalResidences', p.additionalResidences.map((x, j) => j === i ? nr : x))} />
            </div>
          ))}
          <button className="add-row"
            onClick={() => set('additionalResidences', [...p.additionalResidences, { country: '', street: '', apartment: '', city: '', state: '', zip: '' }])}>
            <PlusIcon /> Add another address
          </button>
        </div>

        {/* ---- Citizenship ---- */}
        <div className="form-section">
          <div className="form-section-head-block">
            <h2 className="form-section-title">Citizenship</h2>
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

export function Work({ profile, onChange, onNav, shareAttempted }) {
  const w = profile.work
  const set = (k, v) => onChange({ ...profile, work: { ...w, [k]: v } })
  const st = w.employmentStatus
  const missing = missingWorkFields(profile)
  const flag = shareAttempted && Object.values(missing).some(Boolean)
  const err = (k) => (flag && missing[k] ? 'Required' : null)

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
        <h1 className="page-title">Work & income</h1>
        {flag && <p className="page-message">Add the required details below before sharing.</p>}
        <p className="page-copy">Add any relevant details about your work and income.</p>
      </div>

      <div className="focus-form">
        <Field label="Employment status" required error={err('employmentStatus')}>
          <RadioRow name="Employment status" options={EMPLOYMENT_STATUSES}
            value={st} onChange={(v) => set('employmentStatus', v)} />
        </Field>

        {st === 'Employed' && (
          <div className="field-pair">
            <Field label="Job title" required error={err('jobTitle')}><TextInput value={w.jobTitle} onChange={(v) => set('jobTitle', v)} /></Field>
            <Field label="Employer" required error={err('employer')}><CompanyInput value={w.employer} onChange={(v) => set('employer', v)} /></Field>
          </div>
        )}
        {(st === 'Self-employed' || st === 'Business owner') && (
          <div className="field-pair">
            <Field label="Occupation" required error={err('occupation')}><TextInput value={w.occupation} onChange={(v) => set('occupation', v)} /></Field>
            <Field label="Business name" required error={err('businessName')}><CompanyInput value={w.businessName} onChange={(v) => set('businessName', v)} /></Field>
          </div>
        )}
        {st === 'Retired' && (
          <div className="field-pair">
            <Field label="Previous occupation">
              <TextInput value={w.occupation} onChange={(v) => set('occupation', v)} />
            </Field>
            <Field label="Annual retirement income">
              <MoneyInput amount={w.annualIncome} currency={w.currency}
                onAmount={(v) => set('annualIncome', v)} onCurrency={(c) => set('currency', c)} />
            </Field>
          </div>
        )}

        {st && st !== 'Retired' && st !== 'Not employed' && (
          <div className="field-half">
            <Field label="Annual income" required helper="A rough estimate is fine." error={err('annualIncome')}>
              <MoneyInput amount={w.annualIncome} currency={w.currency}
                onAmount={(v) => set('annualIncome', v)} onCurrency={(c) => set('currency', c)} />
            </Field>
          </div>
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
  'Retire early', 'Buy a home', 'Children’s education',
  'Make a major purchase', 'Sell my business', 'Support parents',
  'Leave a legacy', 'Give to charity',
]

/* Goals saved under earlier label wording keep their pill lit. */
const PRESET_ALIASES = {
  "Kids' education": 'Children’s education',
  "Children's education": 'Children’s education',
  'A big purchase': 'Make a major purchase',
  'Care for my parents': 'Support parents',
  'Support my parents': 'Support parents',
  'Charitable giving': 'Give to charity',
}

/* Optional Details placeholder per preset — an example teaches faster than
   an instruction. */
const PRESET_DETAIL_EXAMPLES = {
  'Retire early': 'For example: Step back around 55',
  'Buy a home': 'For example: A second home near the coast',
  'Children’s education': 'For example: College for two kids',
  'Make a major purchase': 'For example: A boat, a plane, an art piece',
  'Sell my business': 'For example: Full or partial exit in a few years',
  'Support parents': 'For example: Ongoing care and housing costs',
  'Leave a legacy': 'For example: Trusts set up for the family',
  'Give to charity': 'For example: Annual donations or setting up a foundation',
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
  /* The pill IS the goal's type: preset cards keep their name fixed — a
     different goal means a different pill, not a rename. Only "Other" goals
     are named freely. */
  const isPreset = !!goal.preset
  const meta = [goal.horizon, goal.targetAmount != null ? fmtCompact(goal.targetAmount, goal.currency) : null]
    .filter(Boolean).join(' · ')
  const chevron = (
    <svg className="goal-row-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {editing ? <path d="M4 10l4-4 4 4" /> : <path d="M4 6l4 4 4-4" />}
    </svg>
  )

  if (!editing) {
    return (
      <div className="goal-item">
        <div className="goal-row" onClick={onOpen} role="button" tabIndex={0} aria-expanded={false}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}>
          <span className="goal-row-title">{goal.title}</span>
          <span className="goal-row-meta">{meta}</span>
          {chevron}
        </div>
      </div>
    )
  }
  return (
    <div className="goal-item">
      {/* The open head is the same row, chevron flipped — clicking it (or the
          chevron) folds the goal back. Fields save as you type; there is no
          Done because there is nothing to confirm. */}
      {isPreset ? (
        <div className="goal-row" onClick={onClose} role="button" tabIndex={0} aria-expanded={true}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose() } }}>
          <span className="goal-row-title">{goal.title}</span>
          <span className="goal-row-meta">{meta}</span>
          {chevron}
        </div>
      ) : (
        <div className="goal-editor-head">
          <Field label="Goal" required>
            <TextInput value={goal.title} onChange={(v) => set('title', v)}
              placeholder="Describe your goal" />
          </Field>
          <button className="goal-collapse" aria-label="Collapse" onClick={onClose}>{chevron}</button>
        </div>
      )}
      <div className="goal-body">
        {/* Settings grammar (Linear): label on the left, control on the
            right — each detail is one quiet row. */}
        <div className="goal-set-row">
          <span className="goal-set-label">When</span>
          <RadioRow name="When" options={HORIZONS} value={goal.horizon || ''}
            onChange={(v) => set('horizon', v || null)} />
        </div>
        <div className="goal-set-row">
          <span className="goal-set-label">Estimated amount</span>
          <div className="goal-set-money">
            <MoneyInput amount={goal.targetAmount} currency={goal.currency}
              onAmount={(v) => set('targetAmount', v)} onCurrency={(c) => set('currency', c)} />
            <span className="field-helper">A rough estimate is fine.</span>
          </div>
        </div>
        {isPreset && (
          <div className="goal-set-row">
            <span className="goal-set-label">Details</span>
            <div className="goal-set-note">
              <TextInput value={goal.note || ''} onChange={(v) => set('note', v)}
                placeholder={PRESET_DETAIL_EXAMPLES[goal.preset] || 'Anything that helps explain this goal'} />
            </div>
          </div>
        )}
        <div className="editor-actions">
          <button className="btn btn-tertiary" onClick={onRemove}>Remove</button>
        </div>
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
        <h1 className="page-title">Goals</h1>
        <p className="page-copy">
          What would you like to achieve? Select all that apply.
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
        <div className="goal-section">
          <h2 className="goal-section-title">Your selected goals</h2>
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

  const summary = computeSummary(profile)
  const shownNW = useCountUp(summary.nw)
  /* Card link navigates; a brief highlight lands the eye on the actions. */
  const [flashLiabs, setFlashLiabs] = useState(false)
  const goLiabilities = () => {
    onTab('liabilities')
    setFlashLiabs(true)
    setTimeout(() => setFlashLiabs(false), 1500)
  }
  /* Excluded records collapse into one corner indicator + hover tooltip,
     so the card never grows a line and stays a fixed height. */
  const excludedParts = []
  if (summary.assets.excluded > 0)
    excludedParts.push(`${summary.assets.excluded} asset${summary.assets.excluded > 1 ? 's' : ''} without ${summary.assets.excluded === 1 ? 'a value' : 'values'}`)
  if (summary.liabs.excluded > 0)
    excludedParts.push(`${summary.liabs.excluded} ${summary.liabs.excluded === 1 ? 'liability' : 'liabilities'} without ${summary.liabs.excluded === 1 ? 'a balance' : 'balances'}`)
  const excludedSummary = excludedParts.length ? `Estimate excludes ${excludedParts.join(' and ')}` : null
  const equation = summary.rows?.length === 2 && summary.rows.every((r) => /^\$/.test(r.value))

  /* Only categories that contain saved records appear on the page. */
  /* The table reads investments-first (per the Figma Full frame); the add
     panel keeps its own cash-first order. */
  const TABLE_ORDER = ['investment', 'retirement', 'realestate', 'cash', 'business', 'crypto', 'insurance', 'collectibles', 'other']
  const assetGroups = ASSET_CATEGORIES.filter((c) => assets.some((a) => a.category === c.key))
    .sort((a, b) => TABLE_ORDER.indexOf(a.key) - TABLE_ORDER.indexOf(b.key))
  const liabGroups = LIABILITY_CATEGORIES.filter((c) => liabilities.some((l) => l.category === c.key))

  return (
    <div className="screen">
      <div className="narrow-col">
      <div className="title-block">
        <h1 className="page-title">Net worth</h1>
        <p className="nw-copy">
          Build a clearer picture of what you own and owe.<br />
          You can update it anytime.
        </p>
      </div>

      {/* Summary is always there once anything exists — only a fully empty
          profile (no assets, no liabilities) has nothing to summarize. */}
      {(assets.length > 0 || liabilities.length > 0) && (
        <div className="nw-summary">
          {excludedSummary && (
            <div className="nw-indicator" tabIndex={0} role="img" aria-label={excludedSummary}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle className="nw-neq-bg" cx="8" cy="8" r="8" />
                <line x1="4.6" y1="6.9" x2="11.4" y2="6.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="4.6" y1="9.5" x2="11.4" y2="9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="10.2" y1="4.4" x2="5.8" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="nw-indicator-tip" role="tooltip">{excludedSummary}</span>
            </div>
          )}
          <span className="nw-sum-label">Estimated net worth</span>
          <span className={'nw-sum-fig' + (summary.nw == null ? ' nw-sum-fig-empty' : '')}>
            {summary.nw == null ? '—' : fmtUSD(shownNW)}
          </span>
          <div className="nw-sum-stats">
            <div className="nw-stat">
              <span className="nw-stat-label">Assets</span>
              {summary.assets.count === 0 ? (
                <span className="nw-stat-hint">Add at least one asset</span>
              ) : summary.assets.known === 0 ? (
                <span className="nw-stat-val nw-stat-val-empty">—</span>
              ) : (
                <span className="nw-stat-val">{fmtUSD(summary.assets.total)}</span>
              )}
            </div>
            <div className="nw-stat">
              <span className="nw-stat-label">Liabilities</span>
              {!summary.liabs.answered ? (
                <button className="nw-slot-link" onClick={goLiabilities}>Add liabilities or confirm none.</button>
              ) : summary.liabs.count > 0 && summary.liabs.known === 0 ? (
                <span className="nw-stat-val nw-stat-val-empty">—</span>
              ) : (
                <span className="nw-stat-val">{fmtUSD(summary.liabs.total)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="nw-header">
        <div className="nw-divider" />

        <div className="nw-toolbar">
          <div className="nw-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'assets'}
              className={'nw-pill' + (tab === 'assets' ? ' nw-pill-active' : '')}
              onClick={() => onTab('assets')}>
              Assets<span className="nw-pill-count">{assets.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'liabilities'}
              className={'nw-pill' + (tab === 'liabilities' ? ' nw-pill-active' : '')}
              onClick={() => onTab('liabilities')}>
              Liabilities<span className="nw-pill-count">{liabilities.length}</span>
            </button>
          </div>
          <div className="nw-toolbar-right">
            {tab === 'assets' && assets.length > 0 && (
              <button className="btn btn-primary" onClick={() => onAddAsset(null)}>Add asset</button>
            )}
            {tab === 'liabilities' && liabilities.length > 0 && (
              <button className="btn btn-primary" onClick={() => onAddLiability(null)}>Add liability</button>
            )}
          </div>
        </div>
      </div>

      <div className="nw-main">
          {tab === 'assets' && (
            <>
              {assets.length === 0 && (
                <div className="nw-empty">
                  <h2 className="nw-empty-title">No assets yet</h2>
                  <p className="page-copy">Start with an account, property, or investment.</p>
                  <button className="btn btn-primary nw-empty-cta" onClick={() => onAddAsset(null)}>Add asset</button>
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
                <div className={'nw-empty' + (flashLiabs ? ' flash-target' : '')}>
                  <h2 className="nw-empty-title">No liabilities yet</h2>
                  <p className="page-copy">Include mortgages, loans, credit card balances, or other debt.</p>
                  <button className="btn btn-primary nw-empty-cta" onClick={() => onAddLiability(null)}>Add liability</button>
                  <button className="link-quiet" onClick={onAnswerNone}>
                    I don’t have any liabilities
                  </button>
                </div>
              )}

              {none && liabilities.length === 0 && (
                <div className="nw-empty">
                  <p className="owe-none">
                    You don't currently have any liabilities. Add one if that changes.
                  </p>
                  <button className="add-row" onClick={() => onAddLiability(null)}>
                    <PlusIcon /> Add a liability
                  </button>
                </div>
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
