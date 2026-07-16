import { useEffect, useRef, useState } from 'react'
import {
  ACCOUNT_TYPES, CATEGORIES, COLLECTIBLE_CATEGORIES, FOUND_ACCOUNTS,
  PROPERTY_TYPES, parseUSD, uid,
} from './data.js'

/* ---------------- Drawer shell ---------------- */

function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <h2 className="drawer-title">{title}</h2>
          <button className="btn btn-ghost drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------------- Field primitives ---------------- */

function Field({ label, helper, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {helper && <span className="field-helper">{helper}</span>}
    </label>
  )
}

function CurrencyInput({ value, onChange, autoFocus }) {
  const [text, setText] = useState(value == null ? '' : value.toLocaleString('en-US'))
  return (
    <div className="currency">
      <span className="currency-prefix">$</span>
      <input
        className="input currency-input"
        value={text}
        inputMode="numeric"
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseUSD(e.target.value))
        }}
        onBlur={() => {
          const n = parseUSD(text)
          setText(n == null ? '' : n.toLocaleString('en-US'))
        }}
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="qrow">
      <span className="qrow-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={'switch' + (checked ? ' switch-on' : '')}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

const VALUE_HELPER = "Don't know it offhand? Leave it for later."

/* ---------------- Per-type field sets (final) ---------------- */

function TypeFields({ category, form, set }) {
  if (category === 'investment') {
    return (
      <>
        <Field label="Institution">
          <input
            className="input"
            placeholder="Fidelity, Vanguard, Schwab…"
            value={form.institution || ''}
            onChange={(e) => set('institution', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Account type">
          <select
            className="input select"
            value={form.accountType || 'Brokerage account'}
            onChange={(e) => set('accountType', e.target.value)}
          >
            {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Current value" helper={VALUE_HELPER}>
          <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
        </Field>
      </>
    )
  }
  if (category === 'realestate') {
    return (
      <>
        <Field label="Name or address">
          <input
            className="input"
            placeholder="Austin house, 12 Lake Rd…"
            value={form.name || ''}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Property type">
          <select
            className="input select"
            value={form.propertyType || 'House'}
            onChange={(e) => set('propertyType', e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estimated value" helper={VALUE_HELPER}>
          <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
        </Field>
        <Toggle
          label="Do you own this with someone else?"
          checked={!!form.shared}
          onChange={(v) => set('shared', v)}
        />
        {form.shared && (
          <Field label="Your share">
            <div className="currency share-field">
              <input
                className="input currency-input"
                placeholder="50"
                inputMode="numeric"
                value={form.share || ''}
                onChange={(e) => set('share', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
              />
              <span className="currency-suffix">%</span>
            </div>
          </Field>
        )}
        <Toggle
          label="Is there a mortgage on this property?"
          checked={!!form.mortgage}
          onChange={(v) => set('mortgage', v)}
        />
        {form.mortgage && (
          <p className="qrow-note">We'll start a mortgage entry for you in Liabilities.</p>
        )}
      </>
    )
  }
  if (category === 'collectibles') {
    return (
      <>
        <Field label="Category">
          <select
            className="input select"
            value={form.collectibleCategory || 'Art'}
            onChange={(e) => set('collectibleCategory', e.target.value)}
          >
            {COLLECTIBLE_CATEGORIES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <input
            className="input"
            placeholder="Paintings and prints, watch collection…"
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Value" helper={VALUE_HELPER}>
          <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
        </Field>
      </>
    )
  }
  if (category === 'crypto') {
    return (
      <>
        <Field label="Where it's held">
          <input
            className="input"
            placeholder="Coinbase, Ledger cold wallet…"
            value={form.whereHeld || ''}
            onChange={(e) => set('whereHeld', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Value" helper={VALUE_HELPER}>
          <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
        </Field>
      </>
    )
  }
  /* other */
  return (
    <>
      <Field label="Description">
        <input
          className="input"
          placeholder="Describe the asset"
          value={form.description || ''}
          onChange={(e) => set('description', e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Value" helper={VALUE_HELPER}>
        <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
      </Field>
    </>
  )
}

const buildAsset = (category, form) => {
  const base = { id: uid(), category, value: form.value ?? null }
  if (category === 'investment')
    return { ...base, title: form.institution, subtitle: form.accountType || 'Brokerage account', institution: form.institution, accountType: form.accountType || 'Brokerage account' }
  if (category === 'realestate') {
    const share = form.shared ? Math.min(100, Number(form.share) || 100) : 100
    return { ...base, title: form.name, subtitle: form.propertyType || 'House', propertyType: form.propertyType || 'House', ownershipShare: share }
  }
  if (category === 'collectibles')
    return { ...base, title: form.description, subtitle: form.collectibleCategory || 'Art', collectibleCategory: form.collectibleCategory || 'Art' }
  if (category === 'crypto')
    return { ...base, title: form.whereHeld, whereHeld: form.whereHeld }
  return { ...base, title: form.description }
}

const canSave = (category, form) =>
  category === 'investment' ? !!form.institution :
  category === 'realestate' ? !!form.name :
  category === 'crypto' ? !!form.whereHeld :
  !!form.description

/* ---------------- Add assets: one panel for upload + manual ---------------- */

export function AddAssetsDrawer({ onSaveAsset, onAddAccounts, onClose }) {
  const [stage, setStage] = useState('panel') // panel | processing | result
  const [category, setCategory] = useState(null)
  const [form, setForm] = useState({})
  const [accounts, setAccounts] = useState([])
  const fileRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const startProcessing = () => {
    setStage('processing')
    setTimeout(() => {
      setAccounts(FOUND_ACCOUNTS())
      setStage('result')
    }, 1600)
  }

  const setAccount = (id, k, v) =>
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))

  const save = () => {
    onSaveAsset(buildAsset(category, form), {
      mortgage: category === 'realestate' && !!form.mortgage,
    })
  }

  return (
    <Drawer title="Add assets" onClose={onClose}>
      {stage === 'panel' && (
        <>
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); startProcessing() }}
          >
            <span className="dropzone-title">Drop a statement here, or browse</span>
            <span className="dropzone-hint">We'll read the account names and balances for you.</span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" hidden onChange={startProcessing} />

          <div className="or-row" role="separator">Or add manually</div>

          <div className="tiles">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={'tile' + (category === c.key ? ' tile-selected' : '')}
                onClick={() => { setCategory(c.key); setForm({}) }}
              >
                <span className="tile-label">{c.label}</span>
                <span className="tile-hint">{c.hint}</span>
              </button>
            ))}
          </div>

          {category && (
            <div className="form">
              <TypeFields category={category} form={form} set={set} />
            </div>
          )}

          <div className="drawer-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {category && (
              <button className="btn btn-primary" disabled={!canSave(category, form)} onClick={save}>
                Save asset
              </button>
            )}
          </div>
        </>
      )}

      {stage === 'processing' && (
        <div className="processing">
          <span className="spinner" aria-hidden="true" />
          <span className="processing-text">Reading your statement…</span>
        </div>
      )}

      {stage === 'result' && (
        <>
          <p className="drawer-sub">
            We found {accounts.length} accounts in your Fidelity statement.
            Check the numbers — you can edit anything.
          </p>
          <div className="found-list">
            {accounts.map((a) => (
              <div className="found" key={a.id}>
                <Field label="Institution">
                  <input
                    className="input"
                    value={a.institution}
                    onChange={(e) => setAccount(a.id, 'institution', e.target.value)}
                  />
                </Field>
                <Field label="Account type">
                  <select
                    className="input select"
                    value={a.accountType}
                    onChange={(e) => setAccount(a.id, 'accountType', e.target.value)}
                  >
                    {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Value" helper={VALUE_HELPER}>
                  <CurrencyInput value={a.value} onChange={(v) => setAccount(a.id, 'value', v)} />
                </Field>
              </div>
            ))}
          </div>
          <div className="drawer-actions">
            <button className="btn btn-ghost" onClick={() => setStage('panel')}>Discard</button>
            <button
              className="btn btn-primary"
              onClick={() =>
                onAddAccounts(accounts.map((a) => ({
                  id: a.id,
                  category: 'investment',
                  title: a.institution || 'Investment account',
                  subtitle: a.accountType,
                  institution: a.institution,
                  accountType: a.accountType,
                  value: a.value ?? null,
                })))
              }
            >
              Add {accounts.length} accounts
            </button>
          </div>
        </>
      )}
    </Drawer>
  )
}
