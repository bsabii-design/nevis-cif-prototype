import { useState } from 'react'
import {
  ACCOUNT_TYPES, COLLECTIBLE_CATEGORIES, CATEGORIES, CURRENCIES,
  LIABILITY_TYPES, PROPERTY_TYPES, parseAmount, uid,
} from './data.js'

/* ---------------- Field primitives ---------------- */

export function Field({ label, helper, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {helper && <span className="field-helper">{helper}</span>}
    </label>
  )
}

/* Compact currency select (default USD) + amount. */
export function MoneyInput({ amount, currency = 'USD', onAmount, onCurrency }) {
  const [text, setText] = useState(amount == null ? '' : amount.toLocaleString('en-US'))
  return (
    <div className="money">
      <select
        className="input select money-cur"
        value={currency}
        aria-label="Currency"
        onChange={(e) => onCurrency(e.target.value)}
      >
        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input
        className="input"
        value={text}
        inputMode="numeric"
        onChange={(e) => {
          setText(e.target.value)
          onAmount(parseAmount(e.target.value))
        }}
        onBlur={() => {
          const n = parseAmount(text)
          setText(n == null ? '' : n.toLocaleString('en-US'))
        }}
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange }) {
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

/* ---------------- Inline asset editor ---------------- */

const buildAsset = (category, form) => {
  const base = { id: uid(), category, value: form.value ?? null, currency: form.currency || 'USD' }
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

const canSaveAsset = (category, form) =>
  category === 'investment' ? !!form.institution :
  category === 'realestate' ? !!form.name :
  category === 'crypto' ? !!form.whereHeld :
  !!form.description

export function InlineAssetEditor({ onSave, onCancel }) {
  const [category, setCategory] = useState('investment')
  const [form, setForm] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const money = (
    <Field label={category === 'realestate' ? 'Estimated value' : 'Current value'} helper={VALUE_HELPER}>
      <MoneyInput
        amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)}
      />
    </Field>
  )

  return (
    <div className="card editor">
      <div className="editor-grid">
        <Field label="Type">
          <select
            className="input select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setForm({ currency: form.currency }) }}
          >
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>

        {category === 'investment' && (
          <>
            <Field label="Institution">
              <input className="input" placeholder="Fidelity, Vanguard, Schwab…" autoFocus
                value={form.institution || ''} onChange={(e) => set('institution', e.target.value)} />
            </Field>
            <Field label="Account type">
              <select className="input select" value={form.accountType || 'Brokerage account'}
                onChange={(e) => set('accountType', e.target.value)}>
                {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            {money}
          </>
        )}

        {category === 'realestate' && (
          <>
            <Field label="Name or address">
              <input className="input" placeholder="Austin house, 12 Lake Rd…" autoFocus
                value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Property type">
              <select className="input select" value={form.propertyType || 'House'}
                onChange={(e) => set('propertyType', e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            {money}
            <div className="editor-wide">
              <Toggle label="Do you own this with someone else?" checked={!!form.shared} onChange={(v) => set('shared', v)} />
            </div>
            {form.shared && (
              <Field label="Your share">
                <div className="currency">
                  <input className="input currency-input" placeholder="50" inputMode="numeric"
                    value={form.share || ''}
                    onChange={(e) => set('share', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} />
                  <span className="currency-suffix">%</span>
                </div>
              </Field>
            )}
            <div className="editor-wide">
              <Toggle label="Is there a mortgage on this property?" checked={!!form.mortgage} onChange={(v) => set('mortgage', v)} />
              {form.mortgage && <p className="qrow-note">We'll start a mortgage entry for you under What you owe.</p>}
            </div>
          </>
        )}

        {category === 'collectibles' && (
          <>
            <Field label="Category">
              <select className="input select" value={form.collectibleCategory || 'Art'}
                onChange={(e) => set('collectibleCategory', e.target.value)}>
                {COLLECTIBLE_CATEGORIES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Description">
              <input className="input" placeholder="Paintings and prints, watch collection…" autoFocus
                value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
            </Field>
            {money}
          </>
        )}

        {category === 'crypto' && (
          <>
            <Field label="Where it's held">
              <input className="input" placeholder="Coinbase, Ledger cold wallet…" autoFocus
                value={form.whereHeld || ''} onChange={(e) => set('whereHeld', e.target.value)} />
            </Field>
            {money}
          </>
        )}

        {category === 'other' && (
          <>
            <Field label="Description">
              <input className="input" placeholder="Describe the asset" autoFocus
                value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
            </Field>
            {money}
          </>
        )}
      </div>

      <div className="editor-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!canSaveAsset(category, form)}
          onClick={() => onSave(buildAsset(category, form), { mortgage: category === 'realestate' && !!form.mortgage })}
        >
          Save asset
        </button>
      </div>
    </div>
  )
}

/* ---------------- Inline liability editor ---------------- */

export function InlineLiabilityEditor({ properties, onSave, onCancel }) {
  const [form, setForm] = useState({ type: 'Mortgage' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="card editor">
      <div className="editor-grid">
        <Field label="Type">
          <select className="input select" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {LIABILITY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Lender">
          <input className="input" placeholder="First Republic, Chase…" autoFocus
            value={form.lender || ''} onChange={(e) => set('lender', e.target.value)} />
        </Field>
        <Field label="Outstanding balance" helper={VALUE_HELPER}>
          <MoneyInput
            amount={form.balance} currency={form.currency}
            onAmount={(v) => set('balance', v)} onCurrency={(c) => set('currency', c)}
          />
        </Field>
        <Field label="Interest rate">
          <div className="currency">
            <input className="input currency-input" placeholder="5.1" inputMode="decimal"
              value={form.interestRate || ''}
              onChange={(e) => set('interestRate', e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} />
            <span className="currency-suffix">%</span>
          </div>
        </Field>
        {form.type === 'Mortgage' && (
          <Field label="Linked property">
            <select className="input select" value={form.linkedAssetId || ''}
              onChange={(e) => set('linkedAssetId', e.target.value)}>
              <option value="">Not linked</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
        )}
      </div>
      <div className="editor-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!form.lender}
          onClick={() => onSave({
            id: uid(), type: form.type, lender: form.lender,
            balance: form.balance ?? null, currency: form.currency || 'USD',
            interestRate: form.interestRate || null,
            linkedAssetId: form.linkedAssetId ? Number(form.linkedAssetId) : null,
          })}
        >
          Save liability
        </button>
      </div>
    </div>
  )
}

/* ---------------- Statement import (inline strip) ---------------- */

export function ImportResult({ accounts, setAccount, onAdd, onDiscard }) {
  return (
    <div className="import-strip">
      <p className="drawer-sub">
        We found {accounts.length} accounts in your Fidelity statement.
        Check the numbers — you can edit anything.
      </p>
      {accounts.map((a) => (
        <div className="found" key={a.id}>
          <Field label="Institution">
            <input className="input" value={a.institution}
              onChange={(e) => setAccount(a.id, 'institution', e.target.value)} />
          </Field>
          <Field label="Account type">
            <select className="input select" value={a.accountType}
              onChange={(e) => setAccount(a.id, 'accountType', e.target.value)}>
              {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Value" helper={VALUE_HELPER}>
            <MoneyInput amount={a.value} currency={a.currency}
              onAmount={(v) => setAccount(a.id, 'value', v)}
              onCurrency={(c) => setAccount(a.id, 'currency', c)} />
          </Field>
        </div>
      ))}
      <div className="editor-actions">
        <button className="btn btn-ghost" onClick={onDiscard}>Discard</button>
        <button className="btn btn-primary" onClick={onAdd}>Add {accounts.length} accounts</button>
      </div>
    </div>
  )
}
