/* Modal add/edit forms for financial objects; upload statement flow. */
import { useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, CASH_TYPES, COLLECTIBLE_TYPES, INSURANCE_TYPES, INVESTMENT_TYPES,
  PROPERTY_TYPES, RETIREMENT_TYPES, assetCategory, liabilityCategory, uid,
} from './model.js'
import { extractedAccounts, MOCK_STATEMENT_NAME } from './parse.js'
import { Dialog, Field, InstitutionCombobox, MoneyInput, Select, TextInput } from './ui.jsx'

const VALUE_LATER = "I don't know this yet"

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

/* ---------------- Modal shell (spec §8): overlays Net worth, blocks background ---------------- */

function ModalShell({ title, onRequestClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onRequestClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRequestClose])
  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onRequestClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/* ---------------- Asset fields (shared by the side panel) ---------------- */

const assetToForm = (asset) => ({
  name: asset?.name || '',
  institutionOrProvider: asset?.institutionOrProvider || '',
  address: asset?.address || '',
  subtype: asset?.subtype || '',
  value: asset?.value ?? null,
  currency: asset?.currency || 'USD',
})

const defaultSubtype = (category) =>
  category === 'cash' ? 'Checking' :
  category === 'investment' ? 'Brokerage account' :
  category === 'retirement' ? '401(k)' :
  category === 'realestate' ? 'House' :
  category === 'insurance' ? 'Whole life insurance' :
  category === 'collectibles' ? 'Art' : ''

const canAddAsset = (category, f) =>
  ['cash', 'investment', 'insurance', 'crypto'].includes(category) ? !!(f.institutionOrProvider || f.name) :
  category === 'retirement' ? true :
  !!f.name

function AssetFields({ category, form, set, isNew }) {
  const money = (
    <MoneyField label="Current value" amount={form.value} currency={form.currency}
      onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
  )
  if (category === 'cash') return (
    <>
      <Field label="Institution">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Chase, Bank of America…" autoFocus={isNew} />
      </Field>
      <Field label="Account name" helper="Optional">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Everyday checking" />
      </Field>
      <Field label="Account type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={CASH_TYPES} />
      </Field>
      {money}
    </>
  )
  if (category === 'investment') return (
    <>
      <Field label="Institution">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Fidelity, Vanguard, Schwab…" autoFocus={isNew} />
      </Field>
      <Field label="Account name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Fidelity Brokerage Account" />
      </Field>
      <Field label="Account type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={INVESTMENT_TYPES} />
      </Field>
      {money}
    </>
  )
  if (category === 'retirement') return (
    <>
      <Field label="Account type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={RETIREMENT_TYPES} />
      </Field>
      <Field label="Provider">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Fidelity, Vanguard…" autoFocus={isNew} />
      </Field>
      <Field label="Account name" helper="Optional">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Traditional IRA" />
      </Field>
      {money}
    </>
  )
  if (category === 'realestate') return (
    <>
      <Field label="Property name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Austin house" autoFocus={isNew} />
      </Field>
      <Field label="Address">
        <TextInput value={form.address} onChange={(v) => set('address', v)} placeholder="Street, city, state" />
      </Field>
      <Field label="Property type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={PROPERTY_TYPES} />
      </Field>
      {money}
    </>
  )
  if (category === 'insurance') return (
    <>
      <Field label="Provider">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Provider name" autoFocus={isNew} />
      </Field>
      <Field label="Name" helper="Optional">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Whole life policy" />
      </Field>
      <Field label="Type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={INSURANCE_TYPES} />
      </Field>
      {money}
    </>
  )
  if (category === 'crypto') return (
    <>
      <Field label="Where it's held">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Coinbase, cold wallet…" autoFocus={isNew} />
      </Field>
      <Field label="Name" helper="Optional">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Crypto holdings" />
      </Field>
      {money}
    </>
  )
  if (category === 'collectibles') return (
    <>
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Art collection" autoFocus={isNew} />
      </Field>
      <Field label="Type">
        <Select value={form.subtype} onChange={(v) => set('subtype', v)} options={COLLECTIBLE_TYPES} />
      </Field>
      {money}
    </>
  )
  return (
    <>
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Describe the asset" autoFocus={isNew} />
      </Field>
      {money}
    </>
  )
}

/* ---------------- Non-modal side panel: add / edit asset (spec §3–8) ---------------- */

export function AssetPanel({ category: initialCategory, asset, onCommit, onClose, setGuard }) {
  const [category, setCategory] = useState(asset?.category || initialCategory || null)
  const [form, setForm] = useState(() => {
    const f = assetToForm(asset)
    if (!asset && initialCategory) f.subtype = defaultSubtype(initialCategory)
    return f
  })
  const initialRef = useRef(JSON.stringify(assetToForm(asset)))
  const [confirmLeave, setConfirmLeave] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const dirty = asset
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.institutionOrProvider || form.address || form.value != null)

  /* Register with the app-level guard so navigation asks before discarding. */
  useEffect(() => {
    setGuard(dirty ? { kind: asset ? 'asset-edit' : 'asset' } : null)
    return () => setGuard(null)
  }, [dirty, asset, setGuard])

  const requestClose = () => (dirty ? setConfirmLeave(true) : onClose())
  const pickCategory = (key) => {
    setCategory(key)
    setForm((f) => ({ ...f, subtype: defaultSubtype(key) }))
  }

  const cat = category ? assetCategory(category) : null

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
    <aside className="panel side-panel">
      {!category ? (
        <>
          <div className="side-panel-head">
            <h2 className="dialog-title">Add an asset</h2>
            <button className="menu-trigger" aria-label="Close" onClick={requestClose}>✕</button>
          </div>
          <p className="page-copy">What type of asset would you like to add?</p>
          <div className="panel-types">
            {ASSET_CATEGORIES.map((c) => (
              <button key={c.key} className="panel-type" onClick={() => pickCategory(c.key)}>
                {c.single}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="dialog-title">{asset ? `Edit ${cat.single.toLowerCase()}` : cat.formTitle}</h2>
          <div className="focus-form">
            <AssetFields category={category} form={form} set={set} isNew={!asset} />
          </div>
          <div className="dialog-actions">
            <button className="btn btn-secondary" onClick={requestClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!canAddAsset(category, form)} onClick={commit}>
              {asset ? 'Save changes' : cat.cta}
            </button>
          </div>
        </>
      )}

      {confirmLeave && (
        <Dialog
          title={asset ? 'Leave without saving changes?' : 'Leave without adding this asset?'}
          body={asset ? 'Your changes will be lost.' : 'Your entries will be lost.'}
          cancelLabel="Keep editing"
          confirmLabel="Leave"
          danger
          onCancel={() => setConfirmLeave(false)}
          onConfirm={onClose}
        />
      )}
    </aside>
  )
}

/* ---------------- Liability modal ---------------- */

const liabilityToForm = (l) => ({
  name: l?.name || '',
  lender: l?.lender || '',
  outstandingBalance: l?.outstandingBalance ?? null,
  interestRate: l?.interestRate ?? '',
  currency: l?.currency || 'USD',
})

export function LiabilityModal({ category, liability, onCommit, onClose }) {
  const catKey = liability?.category || category
  const cat = liabilityCategory(catKey)
  const [form, setForm] = useState(() => liabilityToForm(liability))
  const initialRef = useRef(JSON.stringify(liabilityToForm(liability)))
  const [confirmLeave, setConfirmLeave] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const dirty = liability
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.lender || form.outstandingBalance != null || form.interestRate !== '')

  const requestClose = () => (dirty ? setConfirmLeave(true) : onClose())

  const commit = () => {
    onCommit({
      id: liability?.id ?? uid(),
      category: catKey,
      name: form.name.trim(),
      lender: form.lender.trim(),
      currency: form.currency,
      outstandingBalance: form.outstandingBalance ?? null,
      interestRate: form.interestRate === '' ? null : Number(form.interestRate),
    })
  }

  return (
    <ModalShell title={liability ? `Edit ${cat.label.toLowerCase()}` : cat.formTitle} onRequestClose={requestClose}>
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

      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={requestClose}>Cancel</button>
        <button className="btn btn-primary" onClick={commit}>
          {liability ? 'Save changes' : 'Add liability'}
        </button>
      </div>

      {confirmLeave && (
        <Dialog
          title={liability ? 'Leave without saving your changes?' : 'Leave without adding this liability?'}
          body={liability ? 'Your changes will be lost.' : 'Your entries will be lost.'}
          cancelLabel="Keep editing"
          confirmLabel="Leave"
          danger
          onCancel={() => setConfirmLeave(false)}
          onConfirm={onClose}
        />
      )}
    </ModalShell>
  )
}

/* ---------------- Upload statement + extraction review (unchanged logic) ---------------- */

const SUBTYPE_OPTIONS = [...INVESTMENT_TYPES.filter((t) => t !== 'Other'), ...RETIREMENT_TYPES]

function useGuard(setGuard, dirty, kind) {
  useEffect(() => {
    setGuard(dirty ? { kind } : null)
    return () => setGuard(null)
  }, [dirty, kind, setGuard])
}

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
          <div className="focus-actions focus-actions-start">
            <button className="btn btn-secondary" onClick={() => onLeave('assets')}>Cancel</button>
          </div>
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
