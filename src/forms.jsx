/* Modal add/edit forms for financial objects; upload statement flow. */
import { useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, BANKS, CASH_BANK_TYPES, COLLECTIBLE_TYPES, INSURANCE_TYPES,
  INVESTMENT_FIRMS, INVESTMENT_TYPES, PROPERTY_TYPES, RETIREMENT_GROUPS, RETIREMENT_PLANS,
  RETIREMENT_PROVIDERS, RETIREMENT_TYPES, assetCategory, liabilityCategory, uid,
} from './model.js'
import { extractedAccounts, MOCK_STATEMENT_NAME } from './parse.js'
import { Dialog, Field, GroupedSelect, InstitutionCombobox, MoneyInput, Select, TextInput } from './ui.jsx'

const VALUE_LATER = "I don't know this yet"

function MoneyField({ label, amount, currency, onAmount, onCurrency, helper, allowLater = true }) {
  const [later, setLater] = useState(false)
  return (
    <Field label={label} helper={helper ?? (later ? 'You can add this later.' : 'A rough estimate is fine.')}>
      <MoneyInput
        amount={amount} currency={currency}
        onAmount={(v) => { setLater(false); onAmount(v) }}
        onCurrency={onCurrency}
      />
      {allowLater && amount == null && !later && (
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

const INVESTMENT_CHIPS = [
  { value: 'Brokerage account', label: 'Brokerage' },
  { value: 'Managed account', label: 'Managed' },
  { value: 'Trust account', label: 'Trust' },
  { value: 'Other', label: 'Other' },
]

const CASH_CHIPS = [
  ...CASH_BANK_TYPES.map((t) => ({ value: t, label: t === 'Certificate of deposit' ? 'CD' : t })),
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' },
]

const assetToForm = (asset) => {
  const f = {
    name: asset?.name || '',
    institutionOrProvider: asset?.institutionOrProvider || '',
    address: asset?.address || '',
    subtype: asset?.subtype || '',
    value: asset?.value ?? null,
    currency: asset?.currency || 'USD',
    customType: '',
  }
  /* Saved custom types map back onto the "Other" option. */
  if (asset?.category === 'cash' && f.subtype &&
      ![...CASH_BANK_TYPES, 'Cash'].includes(f.subtype)) {
    f.customType = f.subtype
    f.subtype = 'Other'
  }
  if (asset?.category === 'investment' && f.subtype && !INVESTMENT_TYPES.includes(f.subtype)) {
    f.customType = f.subtype
    f.subtype = 'Other'
  }
  if (asset?.category === 'retirement' && f.subtype && !RETIREMENT_PLANS.includes(f.subtype)) {
    f.customType = f.subtype
    f.subtype = 'Other retirement account'
  }
  return f
}

const defaultSubtype = (category) =>
  category === 'cash' ? '' :
  category === 'investment' ? '' :
  category === 'retirement' ? '' :
  category === 'realestate' ? 'House' :
  category === 'insurance' ? 'Whole life insurance' :
  category === 'collectibles' ? 'Art' : ''

const canAddAsset = (category, f) => {
  if (category === 'cash') {
    if (!f.subtype) return false
    if (f.subtype === 'Cash') return true
    if (f.subtype === 'Other') return !!f.customType.trim()
    return !!f.institutionOrProvider.trim()
  }
  if (category === 'investment' || category === 'retirement') {
    if (!f.subtype || !f.institutionOrProvider.trim()) return false
    const other = category === 'investment' ? 'Other' : 'Other retirement account'
    return f.subtype === other ? !!f.customType.trim() : true
  }
  if (['insurance', 'crypto'].includes(category)) return !!(f.institutionOrProvider || f.name)
  return !!f.name
}

function AssetFields({ category, form, set, isNew }) {
  const money = (
    <MoneyField label="Current value" amount={form.value} currency={form.currency}
      onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
  )
  if (category === 'cash') {
    const chip = form.subtype
    const isBank = CASH_BANK_TYPES.includes(chip)
    const balance = (label) => (
      <MoneyField label={label} amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)}
        helper="Optional — a rough estimate is fine." allowLater={false} />
    )
    return (
      <>
        <Field label="Account type" required>
          <div className="radio-row" role="radiogroup" aria-label="Account type">
            {CASH_CHIPS.map((c) => (
              <button key={c.value} role="radio" aria-checked={chip === c.value} aria-label={c.value}
                className={'radio-pill' + (chip === c.value ? ' radio-pill-on' : '')}
                onClick={() => set('subtype', c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </Field>
        {chip === 'Other' && (
          <Field label="Account type name" required>
            <TextInput value={form.customType} onChange={(v) => set('customType', v)}
              placeholder="Enter account type" autoFocus />
          </Field>
        )}
        {(isBank || chip === 'Other') && (
          <Field label="Institution" required={isBank} helper={chip === 'Other' ? 'Optional' : undefined}>
            <InstitutionCombobox value={form.institutionOrProvider}
              onChange={(v) => set('institutionOrProvider', v)}
              placeholder="Start typing an institution…" options={BANKS} />
          </Field>
        )}
        {chip && chip !== 'Cash' && (
          <Field label="Account nickname" helper="Optional">
            <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Everyday checking" />
          </Field>
        )}
        {chip === 'Cash' && (
          <Field label="Cash label" helper="Optional">
            <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Emergency cash" />
          </Field>
        )}
        {chip && balance(chip === 'Cash' ? 'Current amount' : 'Current balance')}
      </>
    )
  }
  if (category === 'investment') return (
    <>
      <Field label="Institution" required>
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Start typing an institution…" options={INVESTMENT_FIRMS} />
      </Field>
      <Field label="Account type" required>
        <div className="radio-row" role="radiogroup" aria-label="Account type">
          {INVESTMENT_CHIPS.map((c) => (
            <button key={c.value} role="radio" aria-checked={form.subtype === c.value} aria-label={c.value}
              className={'radio-pill' + (form.subtype === c.value ? ' radio-pill-on' : '')}
              onClick={() => set('subtype', c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </Field>
      {form.subtype === 'Other' && (
        <Field label="Account type name" required>
          <TextInput value={form.customType} onChange={(v) => set('customType', v)}
            placeholder="Enter account type" autoFocus />
        </Field>
      )}
      <Field label="Account nickname" helper="Optional">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Fidelity brokerage" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)}
        helper="Optional — a rough estimate is fine." allowLater={false} />
    </>
  )
  if (category === 'retirement') {
    const isPension = form.subtype === 'Pension'
    return (
      <>
        <Field label="Account type" required>
          <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
            groups={RETIREMENT_GROUPS} placeholder="Select account type" />
        </Field>
        {form.subtype === 'Other retirement account' && (
          <Field label="Account type name" required>
            <TextInput value={form.customType} onChange={(v) => set('customType', v)}
              placeholder="Enter account type" autoFocus />
          </Field>
        )}
        <Field label={isPension ? 'Employer or plan provider' : 'Provider'} required>
          <InstitutionCombobox value={form.institutionOrProvider}
            onChange={(v) => set('institutionOrProvider', v)}
            placeholder="Start typing a provider…" options={RETIREMENT_PROVIDERS} />
        </Field>
        <Field label="Account nickname" helper="Optional">
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Current employer 401(k)" />
        </Field>
        <MoneyField label={isPension ? 'Estimated pension value' : 'Current balance'}
          amount={form.value} currency={form.currency}
          onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)}
          helper="Optional — a rough estimate is fine." allowLater={false} />
      </>
    )
  }
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
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Provider name" />
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
          onChange={(v) => set('institutionOrProvider', v)} placeholder="Coinbase, cold wallet…" />
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

/* ---------------- Non-modal side panel: upload + manual entry ---------------- */

const emptyAssetForm = () => assetToForm(null)

export function AssetPanel({ category: initialCategory, asset, onCommitAsset, onCommitAccounts, onClose, setGuard }) {
  const direct = !!(asset || initialCategory)
  const [stage, setStage] = useState(direct ? 'form' : 'choice') // choice | form | upload | reading | review
  const [category, setCategory] = useState(asset?.category || initialCategory || null)
  const [form, setForm] = useState(() => {
    const f = assetToForm(asset)
    if (!asset && initialCategory) f.subtype = defaultSubtype(initialCategory)
    return f
  })
  const initialRef = useRef(JSON.stringify(assetToForm(asset)))
  const [accounts, setAccounts] = useState([])
  const [edited, setEdited] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(null) // {run}
  const fileRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const formDirty = asset
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.institutionOrProvider || form.address || form.value != null)
  const dirty = stage === 'form' ? formDirty : stage === 'review' ? edited : false

  useEffect(() => {
    const kind = stage === 'review' ? 'extract' : asset ? 'asset-edit' : 'asset'
    setGuard(dirty ? { kind } : null)
    return () => setGuard(null)
  }, [dirty, stage, asset, setGuard])

  const guarded = (run) => (dirty ? setConfirmLeave({ run }) : run())
  const requestClose = () => guarded(onClose)
  const backToChoice = () => guarded(() => {
    setStage('choice'); setCategory(null); setForm(emptyAssetForm())
    setAccounts([]); setEdited(false)
  })

  const pickCategory = (key) => {
    setCategory(key)
    setForm((f) => ({ ...f, subtype: defaultSubtype(key) }))
    setStage('form')
  }

  const startReading = () => {
    setStage('reading')
    setTimeout(() => {
      setAccounts(extractedAccounts())
      setEdited(false)
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

  const cat = category ? assetCategory(category) : null

  const commitForm = () => {
    onCommitAsset({
      id: asset?.id ?? uid(),
      category,
      subtype:
        (category === 'cash' && form.subtype === 'Other') ||
        (category === 'investment' && form.subtype === 'Other') ||
        (category === 'retirement' && form.subtype === 'Other retirement account')
          ? form.customType.trim()
          : form.subtype,
      name: form.name.trim(),
      institutionOrProvider: form.institutionOrProvider.trim(),
      address: form.address.trim(),
      currency: form.currency,
      value: form.value ?? null,
    })
  }

  const editTitle = () => {
    if (category === 'cash') return form.subtype === 'Cash' ? 'Edit cash' : 'Edit bank account'
    return `Edit ${cat.single.toLowerCase()}`
  }
  const title =
    stage === 'choice' ? 'Add assets' :
    stage === 'upload' || stage === 'reading' ? 'Upload a statement' :
    stage === 'review' ? `We found ${accounts.length} account${accounts.length === 1 ? '' : 's'}` :
    asset ? editTitle() : cat.formTitle

  const confirmCopy = stage === 'review'
    ? { title: 'Leave without adding these accounts?', body: 'Your changes will be lost.', stay: 'Keep reviewing' }
    : asset
      ? { title: 'Leave without saving changes?', body: 'Your changes will be lost.', stay: 'Keep editing' }
      : { title: 'Leave without adding this asset?', body: 'Your entries will be lost.', stay: 'Keep editing' }

  return (
    <aside className="shell-panel" aria-label={title}>
      <div className="panel-head">
        <div className="panel-head-titles">
          {!direct && stage !== 'choice' && (
            <button className="panel-back" onClick={backToChoice}>Back to Add assets</button>
          )}
          <h2 className="panel-title">{title}</h2>
        </div>
        <button className="menu-trigger" aria-label="Close" onClick={requestClose}>✕</button>
      </div>

      <div className="panel-body">
        {stage === 'choice' && (
          <>
            <button className="upload-row" onClick={() => setStage('upload')}>
              <span className="upload-row-title">Upload a statement</span>
              <span className="upload-row-copy">We'll extract accounts and values from a recent statement.</span>
            </button>
            <div className="or-row" role="separator">Or add manually</div>
            <div className="panel-types">
              {ASSET_CATEGORIES.map((c) => (
                <button key={c.key} className="panel-type" onClick={() => pickCategory(c.key)}>
                  {c.single}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === 'upload' && (
          <>
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
            <p className="page-copy">Review the details before adding them to your profile.</p>
            {accounts.map((a) => (
              <div className="extract-card" key={a.id}>
                <div className="extract-head">
                  <span className="extract-title">{a.title}</span>
                  <button className="link-danger" onClick={() => removeAccount(a.id)}>Remove account</button>
                </div>
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
            ))}
          </>
        )}

        {stage === 'form' && (
          <div className="focus-form">
            <AssetFields category={category} form={form} set={set} isNew={!asset} />
          </div>
        )}
      </div>

      {(stage === 'form' || (stage === 'review' && accounts.length > 0)) && (
        <div className="panel-foot">
          <button className="btn btn-secondary" onClick={requestClose}>Cancel</button>
          {stage === 'form' ? (
            <button className="btn btn-primary" disabled={!canAddAsset(category, form)} onClick={commitForm}>
              {asset ? 'Save changes'
                : category === 'cash'
                  ? (form.subtype === 'Cash' ? 'Add cash' : form.subtype === 'Other' ? 'Add asset' : 'Add account')
                  : cat.cta}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onCommitAccounts(accounts)}>
              Add {accounts.length} account{accounts.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      {confirmLeave && (
        <Dialog
          title={confirmCopy.title}
          body={confirmCopy.body}
          cancelLabel={confirmCopy.stay}
          confirmLabel="Leave"
          danger
          onCancel={() => setConfirmLeave(null)}
          onConfirm={() => { const run = confirmLeave.run; setConfirmLeave(null); run() }}
        />
      )}
    </aside>
  )
}

const SUBTYPE_OPTIONS = [...INVESTMENT_TYPES.filter((t) => t !== 'Other'), ...RETIREMENT_TYPES]

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
            placeholder="Chase, Wells Fargo…" />
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
