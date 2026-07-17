/* Screens: Welcome, Personal, Work & income, Goals, Net worth. */
import { useEffect, useState } from 'react'
import {
  ASSET_CATEGORIES, EMPLOYMENT_STATUSES, LIABILITY_CATEGORIES,
  fmtMoney, missingPersonalFields, requiredComplete,
} from './model.js'
import { parseGoals } from './parse.js'
import { DateInput, Field, MoneyInput, RadioRow, TextInput } from './ui.jsx'
import { AssetList, CategoryGrid, FinancialSummary, LiabilityCard } from './components.jsx'

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

function ResidenceFields({ residence, onChange, required, missing }) {
  const set = (k, v) => onChange({ ...residence, [k]: v })
  return (
    <div className="residence-grid">
      <Field label="Country" required={required} error={missing?.country}>
        <TextInput value={residence.country} onChange={(v) => set('country', v)} />
      </Field>
      <Field label="Street address">
        <TextInput value={residence.street} onChange={(v) => set('street', v)} />
      </Field>
      <div className="residence-row">
        <Field label="City" required={required} error={missing?.city}>
          <TextInput value={residence.city} onChange={(v) => set('city', v)} />
        </Field>
        <Field label="State">
          <TextInput value={residence.state} onChange={(v) => set('state', v)} />
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
  /* Highlight only missing REQUIRED fields, and only after a blocked Share attempt. */
  const flag = shareAttempted && !requiredComplete(profile)
  const missing = flag ? missingPersonalFields(profile) : {}

  useEffect(() => {
    if (flag) {
      setTimeout(() =>
        document.querySelector('.field-missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    }
  }, [flag])

  return (
    <div className="screen screen-narrow">
      <h1 className="page-title">Personal information</h1>
      {flag && <p className="page-message">Add the required details below before sharing.</p>}
      <p className="page-copy">Please review your details and add anything missing.</p>

      <div className="focus-form">
        <div className="residence-row">
          <Field label="Legal first name" required error={missing.firstName}>
            <TextInput value={p.legalFirstName} onChange={(v) => set('legalFirstName', v)} />
          </Field>
          <Field label="Middle name" helper="Optional">
            <TextInput value={p.middleName} onChange={(v) => set('middleName', v)} />
          </Field>
          <Field label="Legal last name" required error={missing.lastName}>
            <TextInput value={p.legalLastName} onChange={(v) => set('legalLastName', v)} />
          </Field>
        </div>

        <Field label="Date of birth" required error={missing.dateOfBirth}>
          <DateInput value={p.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
        </Field>

        <div className="form-section">
          <h2 className="form-section-title">Primary residence <span className="field-required">*</span></h2>
          <ResidenceFields required residence={p.primaryResidence}
            missing={{ country: missing.country, city: missing.city }}
            onChange={(r) => set('primaryResidence', r)} />
        </div>

        {p.additionalResidences.map((r, i) => (
          <div className="form-section" key={i}>
            <div className="form-section-head">
              <h2 className="form-section-title">Additional residence</h2>
              <button className="link-danger"
                onClick={() => set('additionalResidences', p.additionalResidences.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
            <ResidenceFields residence={r}
              onChange={(nr) => set('additionalResidences', p.additionalResidences.map((x, j) => j === i ? nr : x))} />
          </div>
        ))}
        <button className="btn btn-secondary self-start"
          onClick={() => set('additionalResidences', [...p.additionalResidences, { country: '', street: '', city: '', state: '', zip: '' }])}>
          Add another residence
        </button>

        <div className={'form-section' + (missing.citizenship ? ' field-missing' : '')}>
          <h2 className="form-section-title">Citizenship <span className="field-required">*</span></h2>
          {missing.citizenship && <span className="field-error">Required</span>}
          {p.citizenships.map((c, i) => (
            <div className="citizenship-row" key={i}>
              <TextInput value={c} placeholder="United States"
                onChange={(v) => set('citizenships', p.citizenships.map((x, j) => j === i ? v : x))} />
              {p.citizenships.length > 1 && (
                <button className="link-danger"
                  onClick={() => set('citizenships', p.citizenships.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button className="btn btn-secondary self-start"
            onClick={() => set('citizenships', [...p.citizenships, ''])}>
            Add another citizenship
          </button>
        </div>

        <Field label="Email">
          <TextInput value={p.email} onChange={(v) => set('email', v)} />
        </Field>
      </div>

      <div className="focus-actions">
        <button className="btn btn-secondary" onClick={() => onNav('work')}>Continue to work & income</button>
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
    <div className="screen screen-narrow">
      <div className="page-title-row">
        <h1 className="page-title">Work & income</h1>
        <span className="optional-tag">Optional</span>
      </div>
      <p className="page-copy">Add any context that would be useful for your conversation with Sarah.</p>

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

      <div className="focus-actions">
        <button className="btn btn-secondary" onClick={() => onNav('personal')}>Back</button>
        <button className="btn btn-secondary" onClick={() => onNav('goals')}>Continue to goals</button>
      </div>
    </div>
  )
}

/* ---------------- Goals (spec §11) ---------------- */

function GoalCard({ goal, onChange, onRemove }) {
  const [editing, setEditing] = useState(!goal.title)
  const set = (k, v) => onChange({ ...goal, [k]: v })
  const meta = [
    goal.targetYear ? `Around ${goal.targetYear}` : 'Timeline not added',
    goal.targetAmount != null ? `${fmtMoney(goal.targetAmount, goal.currency)} target` : 'Target amount not added',
  ].join(' · ')

  if (!editing) {
    return (
      <div className="card">
        <div className="card-info">
          <div className="card-title">{goal.title}</div>
          <div className="card-subtitle">{meta}</div>
        </div>
        <div className="card-right">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-ghost btn-remove" onClick={onRemove}>Remove</button>
        </div>
      </div>
    )
  }
  return (
    <div className="card editor-card">
      <div className="extract-grid">
        <div className="editor-wide">
          <Field label="Goal">
            <TextInput value={goal.title} onChange={(v) => set('title', v)} placeholder="What would you like to achieve?" autoFocus={!goal.title} />
          </Field>
        </div>
        <Field label="Target year" helper="Optional">
          <input className="input" inputMode="numeric" placeholder="2036" value={goal.targetYear ?? ''}
            onChange={(e) => set('targetYear', e.target.value ? Number(e.target.value.replace(/\D/g, '').slice(0, 4)) : null)} />
        </Field>
        <Field label="Target amount" helper="Optional">
          <MoneyInput amount={goal.targetAmount} currency={goal.currency}
            onAmount={(v) => set('targetAmount', v)} onCurrency={(c) => set('currency', c)} />
        </Field>
      </div>
      <div className="editor-actions">
        <button className="btn btn-ghost btn-remove" onClick={onRemove}>Remove</button>
        <span className="editor-actions-spacer" />
        <button className="btn btn-secondary" onClick={() => setEditing(false)}>Close</button>
      </div>
    </div>
  )
}

export function Goals({ profile, onChange, onNav }) {
  const [text, setText] = useState('')
  const [creating, setCreating] = useState(false)
  const goals = profile.goals
  const setGoals = (g) => onChange({ ...profile, goals: g })

  const create = () => {
    if (!text.trim()) return
    setCreating(true)
    setTimeout(() => {
      setGoals([...goals, ...parseGoals(text)])
      setText('')
      setCreating(false)
    }, 1200)
  }

  return (
    <div className="screen screen-narrow">
      <h1 className="page-title">Your goals</h1>

      {goals.length === 0 ? (
        <>
          <h2 className="goals-question">What would you like your wealth to help you achieve?</h2>
          <p className="page-copy">
            Describe what you're planning in your own words.<br />
            We'll help turn it into a clear set of goals.
          </p>
          <textarea
            className="input goals-textarea"
            rows={4}
            placeholder="For example: I'd like to sell my business in about ten years, move closer to the coast and help pay for my children's college."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {creating ? (
            <div className="reading"><span className="spinner" aria-hidden="true" /><span className="reading-text">Creating your goals…</span></div>
          ) : (
            <div className="goals-actions">
              <button className="btn btn-secondary" onClick={() => onNav('networth')}>I'd rather explore this with Sarah</button>
              <button className="btn btn-primary" disabled={!text.trim()} onClick={create}>Create goals</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="groups">
            <div className="group">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g}
                  onChange={(ng) => setGoals(goals.map((x) => (x.id === g.id ? ng : x)))}
                  onRemove={() => setGoals(goals.filter((x) => x.id !== g.id))} />
              ))}
            </div>
          </div>
          <button className="btn btn-secondary self-start"
            onClick={() => setGoals([...goals, { id: Date.now(), title: '', targetYear: null, targetAmount: null, currency: 'USD' }])}>
            Add another goal
          </button>
        </>
      )}

      <div className="focus-actions">
        <button className="btn btn-secondary" onClick={() => onNav('work')}>Back</button>
        <button className="btn btn-secondary" onClick={() => onNav('networth')}>Continue to net worth</button>
      </div>
    </div>
  )
}

/* ---------------- Net worth (spec §12–13, §19) ---------------- */

export function NetWorth({ profile, tab, onTab, onNav, onAddAsset, onEditAsset, onRemoveAsset,
  onAddLiability, onEditLiability, onRemoveLiability, onUpload, onAnswerNone, onChange }) {
  const { assets, liabilities, liabilitiesExplicitlyNone: none } = profile

  return (
    <div className="screen">
      <div className="page-title-row">
        <h1 className="page-title">Your net worth</h1>
        <button className="btn btn-secondary" onClick={onUpload}>Upload statement</button>
      </div>
      <p className="page-copy">
        Add anything you own or owe to build a clearer financial picture.<br />
        You can update it anytime.
      </p>

      <div className="nw-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'assets'}
          className={'nw-tab' + (tab === 'assets' ? ' nw-tab-active' : '')}
          onClick={() => onTab('assets')}>
          Assets <span className="nw-tab-count">{assets.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'liabilities'}
          className={'nw-tab' + (tab === 'liabilities' ? ' nw-tab-active' : '')}
          onClick={() => onTab('liabilities')}>
          Liabilities <span className="nw-tab-count">{liabilities.length}</span>
        </button>
      </div>

      <div className="nw-layout">
        <div className="nw-main">
          {tab === 'assets' && (
            assets.length === 0 ? (
              <>
                <h2 className="nw-empty-title">What do you own?</h2>
                <p className="page-copy">Choose a category to add your first asset.<br />You can add more later.</p>
                <CategoryGrid categories={ASSET_CATEGORIES} onPick={onAddAsset} />
                <div className="upload-block">
                  <span>Have a recent account statement?</span>
                  <button className="btn btn-secondary" onClick={onUpload}>Upload statement</button>
                </div>
              </>
            ) : (
              <>
                <div className="list-actions">
                  <button className="btn btn-secondary" onClick={() => onAddAsset(null)}>Add asset</button>
                </div>
                <AssetList assets={assets} onEdit={onEditAsset} onRemove={onRemoveAsset} />
              </>
            )
          )}

          {tab === 'liabilities' && (
            liabilities.length === 0 ? (
              none ? (
                <>
                  <h2 className="nw-empty-title">No liabilities</h2>
                  <p className="page-copy">You've told us you don't currently have any liabilities.</p>
                  <button className="btn btn-secondary self-start" onClick={() => onAddLiability(null)}>Add a liability</button>
                </>
              ) : (
                <>
                  <h2 className="nw-empty-title">What do you owe?</h2>
                  <p className="page-copy">Choose a category to add a liability.</p>
                  <CategoryGrid categories={LIABILITY_CATEGORIES} onPick={onAddLiability} />
                  <div className="upload-block">
                    <button className="btn btn-secondary" onClick={onAnswerNone}>I don't have any liabilities</button>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="list-actions">
                  <button className="btn btn-secondary" onClick={() => onAddLiability(null)}>Add liability</button>
                </div>
                <div className="group">
                  {liabilities.map((l) => (
                    <LiabilityCard key={l.id} liability={l}
                      onEdit={() => onEditLiability(l)} onRemove={() => onRemoveLiability(l)} />
                  ))}
                </div>
              </>
            )
          )}
        </div>
        <FinancialSummary profile={profile} />
      </div>

      <div className="focus-actions focus-actions-start">
        <button className="btn btn-secondary" onClick={() => onNav('goals')}>Back</button>
      </div>
    </div>
  )
}
