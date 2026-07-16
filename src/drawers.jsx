import { useEffect, useRef, useState } from 'react'
import { ACCOUNT_TYPES, CATEGORIES, FOUND_ACCOUNTS, fmtUSD, parseUSD, uid } from './data.js'

/* ---------------- Drawer shell ---------------- */

export function Drawer({ title, onClose, children }) {
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

function CurrencyInput({ value, onChange, placeholder = '' }) {
  const [text, setText] = useState(value == null ? '' : value.toLocaleString('en-US'))
  return (
    <div className="currency">
      <span className="currency-prefix">$</span>
      <input
        className="input currency-input"
        value={text}
        placeholder={placeholder}
        inputMode="numeric"
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

const VALUE_HELPER = "Don't know it offhand? Leave it for later."

/* ---------------- Add asset (screen 7) ---------------- */

export function AddAssetDrawer({ onSave, onClose }) {
  const [category, setCategory] = useState(null)
  const [form, setForm] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    const cat = CATEGORIES.find((c) => c.key === category)
    let title, subtitle
    if (category === 'investment') {
      title = form.institution || 'Investment account'
      subtitle = form.accountType || 'Brokerage account'
    } else if (category === 'realestate') {
      title = form.description || 'Property'
      subtitle = form.ownership ? `${form.ownership}% ownership` : undefined
    } else {
      title = form.description || cat.label
      subtitle = form.details || undefined
    }
    onSave({ id: uid(), category, title, subtitle, value: form.value ?? null })
  }

  const canSave =
    category === 'investment' ? !!form.institution :
    category ? !!form.description : false

  return (
    <Drawer title="Add an asset" onClose={onClose}>
      {!category ? (
        <>
          <p className="drawer-sub">What kind of asset is this?</p>
          <div className="tiles">
            {CATEGORIES.map((c) => (
              <button key={c.key} className="tile" onClick={() => setCategory(c.key)}>
                <span className="tile-label">{c.label}</span>
                <span className="tile-hint">{c.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="link drawer-back" onClick={() => { setCategory(null); setForm({}) }}>
            Back
          </button>
          <div className="form">
            {category === 'investment' && (
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
            )}
            {category === 'realestate' && (
              <>
                <Field label="Description">
                  <input
                    className="input"
                    placeholder="City apartment, lake house…"
                    value={form.description || ''}
                    onChange={(e) => set('description', e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Ownership share">
                  <div className="currency">
                    <input
                      className="input currency-input"
                      placeholder="100"
                      inputMode="numeric"
                      value={form.ownership || ''}
                      onChange={(e) => set('ownership', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                    />
                    <span className="currency-suffix">%</span>
                  </div>
                </Field>
                <Field label="Value" helper={VALUE_HELPER}>
                  <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
                </Field>
              </>
            )}
            {category && category !== 'investment' && category !== 'realestate' && (
              <>
                <Field label="Description">
                  <input
                    className="input"
                    placeholder={
                      category === 'collectibles' ? 'Art collection, watches…' :
                      category === 'crypto' ? 'Coinbase, cold wallet…' : 'Describe the asset'
                    }
                    value={form.description || ''}
                    onChange={(e) => set('description', e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Details">
                  <input
                    className="input"
                    placeholder="Anything worth noting (optional)"
                    value={form.details || ''}
                    onChange={(e) => set('details', e.target.value)}
                  />
                </Field>
                <Field label="Value" helper={VALUE_HELPER}>
                  <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
                </Field>
              </>
            )}
          </div>
          <div className="drawer-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!canSave} onClick={save}>Save asset</button>
          </div>
        </>
      )}
    </Drawer>
  )
}

/* ---------------- Statement extraction (screen 8) ---------------- */

export function UploadDrawer({ onAdd, onClose }) {
  const [stage, setStage] = useState('drop') // drop | processing | result
  const [accounts, setAccounts] = useState([])
  const fileRef = useRef(null)

  const startProcessing = () => {
    setStage('processing')
    setTimeout(() => {
      setAccounts(FOUND_ACCOUNTS())
      setStage('result')
    }, 1600)
  }

  const setAccount = (id, k, v) =>
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))

  return (
    <Drawer title="Upload a statement" onClose={onClose}>
      {stage === 'drop' && (
        <>
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); startProcessing() }}
          >
            <span className="dropzone-title">Drop a PDF here, or browse</span>
            <span className="dropzone-hint">We'll read the account names and balances for you.</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={startProcessing}
          />
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
                <Field label="Value">
                  <CurrencyInput
                    value={a.value}
                    onChange={(v) => setAccount(a.id, 'value', v)}
                  />
                </Field>
              </div>
            ))}
          </div>
          <div className="drawer-actions">
            <button className="btn btn-ghost" onClick={onClose}>Discard</button>
            <button
              className="btn btn-primary"
              onClick={() =>
                onAdd(accounts.map((a) => ({
                  id: a.id,
                  category: 'investment',
                  title: a.institution || 'Investment account',
                  subtitle: a.accountType,
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
