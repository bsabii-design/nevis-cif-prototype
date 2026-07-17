/* Focused pages: add/edit asset, add/edit liability, upload statement. */
import { useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, COLLECTIBLE_TYPES, INVESTMENT_TYPES, LIABILITY_CATEGORIES,
  PROPERTY_TYPES, RETIREMENT_TYPES, assetCategory, liabilityCategory, uid,
} from './model.js'
import { extractedAccounts, MOCK_STATEMENT_NAME } from './parse.js'
import { Breadcrumb, Field, InstitutionCombobox, MoneyInput, Select, TextInput } from './ui.jsx'
import { CategoryGrid } from './components.jsx'

const VALUE_LATER = "I don't know this yet"

/* Registers this form's dirty state with the app-level navigation guard. */
function useGuard(setGuard, dirty, kind) {
  useEffect(() => {
    setGuard(dirty ? { kind } : null)
    return () => setGuard(null)
  }, [dirty, kind, setGuard])
}

function MoneyField({ label, amount, currency, onAmount, onCurrency }) {
  const [later, setLater] = useState(false)
  return (
    <Field label={label} helper={later ? 'You can add this later.' : 'A rough estimate is fine.'}>
      <MoneyInput
        amount={amount} currency={currency}
        onAmount={(v) => { setLater(false); onAmount(v) }}
        onCurrency={onCurrency}
      />
      {amount == null && !later && (
        <button type="button" className="link-quiet" onClick={() => { onAmount(null); setLater(true) }}>
          {VALUE_LATER}
        </button>
      )}
    </Field>
  )
}

/* ---------------- Asset form (spec §14) ---------------- */

const assetToForm = (asset) => ({
  name: asset?.name || '',
  institutionOrProvider: asset?.institutionOrProvider || '',
  address: asset?.address || '',
  subtype: asset?.subtype || '',
  value: asset?.value ?? null,
  currency: asset?.currency || 'USD',
})

const defaultSubtype = (category) =>
  category === 'investment' ? 'Brokerage account' :
  category === 'retirement' ? '401(k)' :
  category === 'realestate' ? 'House' :
  category === 'collectibles' ? 'Art' : ''

const canAddAsset = (category, f) =>
  category === 'investment' ? !!(f.institutionOrProvider || f.name) :
  category === 'retirement' ? true :
  category === 'crypto' ? !!(f.institutionOrProvider || f.name) :
  !!f.name

export function AssetForm({ asset, initialCategory, setGuard, onCommit, onLeave }) {
  const [category, setCategory] = useState(asset?.category || initialCategory || null)
  const [form, setForm] = useState(() => {
    const f = assetToForm(asset)
    if (!asset && (asset?.category || initialCategory)) f.subtype = defaultSubtype(asset?.category || initialCategory)
    return f
  })
  const initialRef = useRef(JSON.stringify(assetToForm(asset)))
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const dirty = asset
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.institutionOrProvider || form.address || form.value != null)
  useGuard(setGuard, dirty, 'asset')

  const cat = assetCategory(category)

  const pickCategory = (key) => {
    setCategory(key)
    setForm((f) => ({ ...f, subtype: defaultSubtype(key) }))
  }

  const commit = () => {
    onCommit({
      id: asset?.id ?? uid(),
      category,
      subtype: form.subtype,
      name: form.name.trim(),
      institutionOrProvider: form.institutionOrProvider.trim(),
      address: form.address.trim(),
      currency: form.currency,
      value: form.value ?? null,
    })
  }

  return (
    <div className="focus-page">
      <Breadcrumb parent="Net worth" onParent={() => onLeave('assets')} current={asset ? 'Edit asset' : 'Add asset'} />

      {!category ? (
        <>
          <h1 className="page-title">What kind of asset is this?</h1>
          <CategoryGrid categories={ASSET_CATEGORIES} onPick={pickCategory} />
        </>
      ) : (
        <>
          <h1 className="page-title">{asset ? `Edit ${cat.single.toLowerCase()}` : cat.formTitle}</h1>
          <div className="focus-form">
            {category === 'realestate' && (
              <>
                <Field label="Property name">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Austin house" autoFocus={!asset} />
                </Field>
                <Field label="Address">
                  <TextInput value={form.address} onChange={(v) => set('address', v)} placeholder="Street, city, state" />
                </Field>
                <Field label="Property type">
                  <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={PROPERTY_TYPES} />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'retirement' && (
              <>
                <Field label="Account type">
                  <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={RETIREMENT_TYPES} />
                </Field>
                <Field label="Provider">
                  <InstitutionCombobox value={form.institutionOrProvider}
                    onChange={(v) => set('institutionOrProvider', v)} placeholder="Fidelity, Vanguard…" autoFocus={!asset} />
                </Field>
                <Field label="Account name" helper="Optional">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Traditional IRA" />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'investment' && (
              <>
                <Field label="Institution">
                  <InstitutionCombobox value={form.institutionOrProvider}
                    onChange={(v) => set('institutionOrProvider', v)} placeholder="Fidelity, Vanguard, Schwab…" autoFocus={!asset} />
                </Field>
                <Field label="Account name">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Fidelity Brokerage Account" />
                </Field>
                <Field label="Account type">
                  <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={INVESTMENT_TYPES} />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'business' && (
              <>
                <Field label="Name">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Reeves Consulting Group" autoFocus={!asset} />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'crypto' && (
              <>
                <Field label="Where it's held">
                  <InstitutionCombobox value={form.institutionOrProvider}
                    onChange={(v) => set('institutionOrProvider', v)} placeholder="Coinbase, cold wallet…" autoFocus={!asset} />
                </Field>
                <Field label="Name" helper="Optional">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Crypto holdings" />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'collectibles' && (
              <>
                <Field label="Name">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Art collection" autoFocus={!asset} />
                </Field>
                <Field label="Type">
                  <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={COLLECTIBLE_TYPES} />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}

            {category === 'other' && (
              <>
                <Field label="Name">
                  <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Describe the asset" autoFocus={!asset} />
                </Field>
                <MoneyField label="Current value" amount={form.value} currency={form.currency}
                  onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
              </>
            )}
          </div>

          <div className="focus-actions">
            <button className="btn btn-secondary" onClick={() => onLeave('assets')}>Cancel</button>
            <button className="btn btn-primary" disabled={!canAddAsset(category, form)} onClick={commit}>
              {asset ? 'Save changes' : cat.cta}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Liability form (spec §20) ---------------- */

const liabilityToForm = (l) => ({
  name: l?.name || '',
  lender: l?.lender || '',
  outstandingBalance: l?.outstandingBalance ?? null,
  interestRate: l?.interestRate ?? '',
  currency: l?.currency || 'USD',
})

export function LiabilityForm({ liability, initialCategory, setGuard, onCommit, onLeave }) {
  const [category, setCategory] = useState(liability?.category || initialCategory || null)
  const [form, setForm] = useState(() => liabilityToForm(liability))
  const initialRef = useRef(JSON.stringify(liabilityToForm(liability)))
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const dirty = liability
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.lender || form.outstandingBalance != null || form.interestRate !== '')
  useGuard(setGuard, dirty, 'liability')

  const cat = liabilityCategory(category)

  const commit = () => {
    onCommit({
      id: liability?.id ?? uid(),
      category,
      name: form.name.trim(),
      lender: form.lender.trim(),
      currency: form.currency,
      outstandingBalance: form.outstandingBalance ?? null,
      interestRate: form.interestRate === '' ? null : Number(form.interestRate),
    })
  }

  return (
    <div className="focus-page">
      <Breadcrumb parent="Net worth" onParent={() => onLeave('liabilities')} current={liability ? 'Edit liability' : 'Add liability'} />

      {!category ? (
        <>
          <h1 className="page-title">What kind of liability is this?</h1>
          <CategoryGrid categories={LIABILITY_CATEGORIES} onPick={setCategory} />
        </>
      ) : (
        <>
          <h1 className="page-title">{liability ? `Edit ${cat.label.toLowerCase()}` : cat.formTitle}</h1>
          <div className="focus-form">
            <Field label="Name" helper="Optional">
              <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder={cat.label} />
            </Field>
            <Field label="Lender">
              <InstitutionCombobox value={form.lender} onChange={(v) => set('lender', v)}
                placeholder="Chase, Wells Fargo…" autoFocus={!liability} />
            </Field>
            <MoneyField label="Outstanding balance" amount={form.outstandingBalance} currency={form.currency}
              onAmount={(v) => set('outstandingBalance', v)} onCurrency={(c) => set('currency', c)} />
            <Field label="Interest rate" helper="Optional">
              <div className="currency rate-field">
                <input className="input currency-input" placeholder="4.25" inputMode="decimal"
                  value={form.interestRate}
                  onChange={(e) => set('interestRate', e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} />
                <span className="currency-suffix">%</span>
              </div>
            </Field>
          </div>

          <div className="focus-actions">
            <button className="btn btn-secondary" onClick={() => onLeave('liabilities')}>Cancel</button>
            <button className="btn btn-primary" onClick={commit}>
              {liability ? 'Save changes' : 'Add liability'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Upload statement + extraction review (spec §17–18) ---------------- */

const SUBTYPE_OPTIONS = [...INVESTMENT_TYPES.filter((t) => t !== 'Other'), ...RETIREMENT_TYPES]

export function UploadFlow({ setGuard, onCommit, onLeave }) {
  const [stage, setStage] = useState('upload') // upload | reading | review
  const [accounts, setAccounts] = useState([])
  const [edited, setEdited] = useState(false)
  const fileRef = useRef(null)

  useGuard(setGuard, stage === 'review' && edited, 'extract')

  const startReading = () => {
    setStage('reading')
    setTimeout(() => {
      setAccounts(extractedAccounts())
      setStage('review')
    }, 1500)
  }

  const setAccount = (id, k, v) => {
    setEdited(true)
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))
  }
  const removeAccount = (id) => {
    setEdited(true)
    setAccounts((list) => list.filter((a) => a.id !== id))
  }

  return (
    <div className="focus-page">
      <Breadcrumb parent="Net worth" onParent={() => onLeave('assets')} current="Upload statement" />

      {stage === 'upload' && (
        <>
          <h1 className="page-title">Upload a statement</h1>
          <p className="page-copy">Upload a recent statement and we'll use it to fill in the account details.</p>
          <div
            className="upload-zone"
            role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); startReading() }}
          >
            <span className="upload-title">Drag and drop a file here</span>
            <span className="upload-or">or</span>
            <span className="btn btn-secondary">Choose a file</span>
            <span className="upload-hint">PDF, JPG or PNG</span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={startReading} />
        </>
      )}

      {stage === 'reading' && (
        <div className="reading">
          <span className="spinner" aria-hidden="true" />
          <span className="reading-text">Reading {MOCK_STATEMENT_NAME}</span>
        </div>
      )}

      {stage === 'review' && (
        <>
          <h1 className="page-title">We found {accounts.length} account{accounts.length === 1 ? '' : 's'}</h1>
          <p className="page-copy">Review the details before adding them to your profile.</p>
          <div className="extract-list">
            {accounts.map((a) => (
              <div className="extract-card" key={a.id}>
                <div className="extract-head">
                  <span className="extract-title">{a.title}</span>
                  <button className="link-danger" onClick={() => removeAccount(a.id)}>Remove account</button>
                </div>
                <div className="extract-grid">
                  <Field label="Institution">
                    <InstitutionCombobox value={a.institution} onChange={(v) => setAccount(a.id, 'institution', v)} />
                  </Field>
                  <Field label="Account type">
                    <Select value={a.accountType} onChange={(v) => setAccount(a.id, 'accountType', v)} options={SUBTYPE_OPTIONS} />
                  </Field>
                  <Field label="Current value">
                    <MoneyInput amount={a.value} currency={a.currency}
                      onAmount={(v) => setAccount(a.id, 'value', v)}
                      onCurrency={(c) => setAccount(a.id, 'currency', c)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="focus-actions">
            <button className="btn btn-secondary" onClick={() => onLeave('assets')}>Cancel</button>
            {accounts.length > 0 && (
              <button className="btn btn-primary" onClick={() => onCommit(accounts)}>
                Add {accounts.length} account{accounts.length === 1 ? '' : 's'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
