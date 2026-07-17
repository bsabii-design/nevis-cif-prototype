/* Screens: Welcome, Personal, Work & income, Goals, Net worth. */
import { useEffect, useState } from 'react'
import {
  ASSET_CATEGORIES, EMPLOYMENT_STATUSES, LIABILITY_CATEGORIES,
  fmtMoney, fmtUSD, missingPersonalFields, requiredComplete, usdOf,
} from './model.js'
import { parseGoals } from './parse.js'
import { DateInput, Field, MoneyInput, PhoneInput, RadioRow, TextInput } from './ui.jsx'
import { AssetCard, FinancialSummary, LiabilityCard } from './components.jsx'

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

function ResidenceFields({ residence, onChange, required, errors = {}, onBlurField }) {
  const set = (k, v) => onChange({ ...residence, [k]: v })
  const blur = (k) => () => onBlurField?.(k)
  return (
    <div className="residence-grid">
      <Field label="Country" required={required} error={errors.country}>
        <TextInput value={residence.country} onChange={(v) => set('country', v)} onBlur={blur('country')} />
      </Field>
      <Field label="Street address" required={required} error={errors.street}>
        <TextInput value={residence.street} onChange={(v) => set('street', v)} onBlur={blur('street')} />
      </Field>
      <Field label="Apartment, suite, unit, etc." helper="Optional">
        <TextInput value={residence.apartment} onChange={(v) => set('apartment', v)} />
      </Field>
      <div className="addr-row">
        <Field label="City" required={required} error={errors.city}>
          <TextInput value={residence.city} onChange={(v) => set('city', v)} onBlur={blur('city')} />
        </Field>
        <Field label="State" required={required} error={errors.state}>
          <TextInput value={residence.state} onChange={(v) => set('state', v)} onBlur={blur('state')} />
        </Field>
        <Field label="ZIP code" required={required} error={errors.zip}>
          <TextInput value={residence.zip} onChange={(v) => set('zip', v)} inputMode="numeric" onBlur={blur('zip')} />
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
  const zipError = () =>
    missing.zip && (flag || touched.zip)
      ? (p.primaryResidence.zip?.trim() ? 'Enter a valid ZIP code.' : 'Required')
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
      <h1 className="page-title">Personal information</h1>
      {flag && <p className="page-message">Add the required details below before sharing.</p>}
      <p className="page-copy">Please review your details and add anything missing.</p>

      <div className="focus-form">
        {/* ---- Legal identity ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Legal identity</h2>
          <div className="name-row">
            <Field label="Legal first name" required error={err('firstName')}>
              <TextInput value={p.legalFirstName} onChange={(v) => set('legalFirstName', v)} onBlur={() => markTouched('firstName')} />
            </Field>
            <Field label="Legal last name" required error={err('lastName')}>
              <TextInput value={p.legalLastName} onChange={(v) => set('legalLastName', v)} onBlur={() => markTouched('lastName')} />
            </Field>
          </div>
          <div className="field-half">
            <Field label="Middle name" helper="Optional">
              <TextInput value={p.middleName} onChange={(v) => set('middleName', v)} />
            </Field>
          </div>
          <Field label="Date of birth" required error={dobError()}>
            <DateInput className="input-compact" value={p.dateOfBirth}
              onChange={(v) => set('dateOfBirth', v)} onBlur={() => markTouched('dateOfBirth')} />
          </Field>
        </div>

        {/* ---- Residential address ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Residential address</h2>
          <ResidenceFields required residence={p.primaryResidence}
            errors={{
              country: err('country'), street: err('street'), city: err('city'),
              state: err('state', 'Select a state.'), zip: zipError(),
            }}
            onBlurField={(k) => markTouched(k)}
            onChange={(r) => set('primaryResidence', r)} />

          {p.additionalResidences.map((r, i) => (
            <div className="form-subsection" key={i}>
              <div className="form-section-head">
                <h3 className="form-subsection-title">Additional residential address</h3>
                <button className="link-danger"
                  onClick={() => set('additionalResidences', p.additionalResidences.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <ResidenceFields residence={r}
                onChange={(nr) => set('additionalResidences', p.additionalResidences.map((x, j) => j === i ? nr : x))} />
            </div>
          ))}
          <button className="link-add"
            onClick={() => set('additionalResidences', [...p.additionalResidences, { country: '', street: '', apartment: '', city: '', state: '', zip: '' }])}>
            + Add another residential address
          </button>
        </div>

        {/* ---- Citizenship ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Citizenship</h2>
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
          <button className="link-add" onClick={() => set('citizenships', [...p.citizenships, ''])}>
            + Add another citizenship
          </button>
        </div>

        {/* ---- Contact ---- */}
        <div className="form-section">
          <h2 className="form-section-title">Contact</h2>
          <Field label="Email">
            <TextInput value={p.email} onChange={(v) => set('email', v)} />
          </Field>
          <Field label="Phone" helper="Optional">
            <PhoneInput value={p.phone} onChange={(v) => set('phone', v)} />
          </Field>
        </div>
      </div>

      </div>

      <div className="sticky-footer">
        <div className="sticky-footer-col">
          <button className="btn btn-secondary ml-auto" onClick={() => onNav('work')}>Continue</button>
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

      </div>

      <div className="sticky-footer">
        <div className="sticky-footer-col">
          <button className="btn btn-secondary" onClick={() => onNav('personal')}>Back</button>
          <button className="btn btn-secondary" onClick={() => onNav('goals')}>Continue</button>
        </div>
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
    <div className="screen">
      <div className="narrow-col">
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

      </div>

      <div className="sticky-footer">
        <div className="sticky-footer-col">
          <button className="btn btn-secondary" onClick={() => onNav('work')}>Back</button>
          <button className="btn btn-secondary" onClick={() => onNav('networth')}>Continue</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Net worth: one page, category bubbles, modal forms ---------------- */

function CategoryBubbles({ categories, selected, locked, onToggle }) {
  return (
    <div className="bubbles">
      {categories.map((c) => {
        const on = selected.has(c.key)
        return (
          <button
            key={c.key}
            role="checkbox"
            aria-checked={on}
            className={'bubble' + (on ? ' bubble-on' : '')}
            title={locked.has(c.key) ? 'Remove its records first to hide this category' : undefined}
            onClick={() => onToggle(c.key)}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

export function NetWorth({ profile, tab, onTab, onNav, selectedCats, onToggleCat,
  onAddAsset, onAddLiability, onEditAsset, onRemoveAsset, onEditLiability, onRemoveLiability,
  onUpload, onAnswerNone, sidePanel }) {
  const { assets, liabilities, liabilitiesExplicitlyNone: none } = profile

  const liabsWithRecords = new Set(liabilities.map((l) => l.category))
  const effLiabs = new Set([...selectedCats.liabilities, ...liabsWithRecords])

  /* Only categories that contain saved assets appear on the page. */
  const assetGroups = ASSET_CATEGORIES.filter((c) => assets.some((a) => a.category === c.key))
  const liabGroups = LIABILITY_CATEGORIES.filter((c) => effLiabs.has(c.key))

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
            <>
              <div className="list-actions">
                <button className="btn btn-secondary" onClick={() => onAddAsset(null)}>Add asset</button>
              </div>

              {assetGroups.map((cat) => {
                const items = assets.filter((a) => a.category === cat.key)
                const known = items.filter((a) => a.value != null)
                const subtotal = known.reduce((s, a) => s + usdOf(a.value, a.currency), 0)
                return (
                  <section className="group" key={cat.key}>
                    <div className="group-head">
                      <h3 className="group-name">{cat.label}</h3>
                      {items.length >= 2 && (
                        <span className="group-subtotal">{known.length ? fmtUSD(subtotal) : '—'}</span>
                      )}
                    </div>
                    {items.map((a) => (
                      <AssetCard key={a.id} asset={a}
                        onEdit={() => onEditAsset(a)} onRemove={() => onRemoveAsset(a)} />
                    ))}
                    <button className="link-add" onClick={() => onAddAsset(cat.key)}>
                      + Add {items.length > 0 ? 'another ' : ''}{cat.add}
                    </button>
                  </section>
                )
              })}
            </>
          )}

          {tab === 'liabilities' && (
            <>
              <div className="cat-select">
                <h2 className="nw-empty-title">What do you owe?</h2>
                <p className="select-hint">Select all that apply</p>
                <CategoryBubbles
                  categories={LIABILITY_CATEGORIES}
                  selected={effLiabs}
                  locked={liabsWithRecords}
                  onToggle={(k) => onToggleCat('liabilities', k)}
                />
              </div>

              {none && liabilities.length === 0 && (
                <p className="owe-none">
                  No liabilities — you've told us you don't currently have any.
                  Select a category above if that changes.
                </p>
              )}

              {liabGroups.map((cat) => {
                const items = liabilities.filter((l) => l.category === cat.key)
                return (
                  <section className="group" key={cat.key}>
                    <div className="group-head">
                      <h3 className="group-name">{cat.group}</h3>
                    </div>
                    {items.map((l) => (
                      <LiabilityCard key={l.id} liability={l}
                        onEdit={() => onEditLiability(l)} onRemove={() => onRemoveLiability(l)} />
                    ))}
                    <button className="link-add" onClick={() => onAddLiability(cat.key)}>
                      + Add {items.length > 0 ? 'another ' : ''}{cat.add}
                    </button>
                  </section>
                )
              })}

              {liabilities.length === 0 && !none && (
                <button className="btn btn-secondary owe-none-btn" onClick={onAnswerNone}>
                  I don't have any liabilities
                </button>
              )}
            </>
          )}
        </div>
        {sidePanel ? (
          <div className="right-col">
            {sidePanel}
            <FinancialSummary profile={profile} sticky={false} />
          </div>
        ) : (
          <FinancialSummary profile={profile} />
        )}
      </div>

      <div className="sticky-footer">
        <div className="sticky-footer-col">
          <button className="btn btn-secondary" onClick={() => onNav('goals')}>Back</button>
        </div>
      </div>
    </div>
  )
}
