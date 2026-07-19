/* Modal add/edit forms for financial objects; upload statement flow. */
import { useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, BANKS, CASH_BANK_TYPES, COLLECTIBLE_TYPES, CRYPTO_PLATFORMS,
  INSURANCE_PROVIDERS, INSURANCE_TYPES, INVESTMENT_FIRMS, INVESTMENT_TYPES, PROPERTY_TYPES,
  RETIREMENT_GROUPS, RETIREMENT_PLANS, RETIREMENT_PROVIDERS, RETIREMENT_TYPES,
  LIABILITY_CATEGORIES, assetCategory, liabilityCategory, uid,
} from './model.js'
import { extractedAccounts, MOCK_STATEMENT_NAME } from './parse.js'
import { Dialog, Field, GroupedSelect, InstitutionCombobox, MoneyInput, Select, TextInput } from './ui.jsx'

function MoneyField({ label, amount, currency, onAmount, onCurrency }) {
  return (
    <Field label={label} helper="A rough estimate is fine.">
      <MoneyInput
        amount={amount} currency={currency}
        onAmount={onAmount}
        onCurrency={onCurrency}
      />
    </Field>
  )
}

/* ---------------- Modal shell (spec §8): overlays Net worth, blocks background ---------------- */

/* ---------------- Asset fields (shared by the side panel) ---------------- */

const CASH_TYPE_OPTIONS = [...CASH_BANK_TYPES, 'Cash', 'Other']
const INVESTMENT_TYPE_OPTIONS = [...INVESTMENT_TYPES, 'Other']
const PROPERTY_TYPE_OPTIONS = [...PROPERTY_TYPES, 'Other']
const INSURANCE_TYPE_OPTIONS = [...INSURANCE_TYPES, 'Other']
const COLLECTIBLE_TYPE_OPTIONS = [...COLLECTIBLE_TYPES, 'Other']

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
  const otherMap = {
    cash: [...CASH_BANK_TYPES, 'Cash'],
    investment: INVESTMENT_TYPES,
    realestate: PROPERTY_TYPES,
    collectibles: COLLECTIBLE_TYPES,
    insurance: INSURANCE_TYPES,
  }
  if (asset && otherMap[asset.category] && f.subtype && !otherMap[asset.category].includes(f.subtype)) {
    f.customType = f.subtype
    f.subtype = 'Other'
  }
  if (asset?.category === 'retirement' && f.subtype && !RETIREMENT_PLANS.includes(f.subtype)) {
    f.customType = f.subtype
    f.subtype = 'Other retirement account'
  }
  return f
}

/* No type field selects a default option. */
const defaultSubtype = () => ''

/* Required fields per category; the primary action is never disabled —
   pressing it highlights what is missing instead. */
const missingAssetFields = (category, f) => {
  const m = {}
  const noInst = !f.institutionOrProvider.trim()
  const noName = !f.name.trim()
  const noCustom = !f.customType.trim()
  if (category === 'cash') {
    if (!f.subtype) m.subtype = true
    else {
      if (f.subtype === 'Other' && noCustom) m.customType = true
      if (CASH_BANK_TYPES.includes(f.subtype) && noInst) m.institution = true
    }
  } else if (category === 'investment') {
    if (!f.subtype) m.subtype = true
    else if (f.subtype === 'Other' && noCustom) m.customType = true
    if (noInst) m.institution = true
  } else if (category === 'retirement') {
    if (!f.subtype) m.subtype = true
    else if (f.subtype === 'Other retirement account' && noCustom) m.customType = true
    if (noInst) m.institution = true
  } else if (category === 'realestate') {
    if (!f.subtype) m.subtype = true
    else if (f.subtype === 'Other' && noCustom) m.customType = true
    if (noName) m.name = true
  } else if (category === 'insurance') {
    if (!f.subtype) m.subtype = true
    if (noInst) m.institution = true
  } else if (category === 'crypto') {
    if (noInst) m.institution = true
  } else if (category === 'collectibles') {
    if (!f.subtype) m.subtype = true
    else if (f.subtype === 'Other' && noCustom) m.customType = true
    if (noName) m.name = true
  } else {
    if (noName) m.name = true
  }
  return m
}

function AssetFields({ category, form, set, errors = {} }) {
  const err = (k) => (errors[k] ? 'Required' : null)
  const customTypeField = (label = 'Account type name') => (
    <Field label={label} required error={err('customType')}>
      <TextInput value={form.customType} onChange={(v) => set('customType', v)}
        placeholder="Enter account type" autoFocus />
    </Field>
  )

  if (category === 'cash') {
    const chip = form.subtype
    const isBank = CASH_BANK_TYPES.includes(chip)
    return (
      <>
        <Field label="Account type" required error={err('subtype')}>
          <GroupedSelect value={chip} onChange={(v) => set('subtype', v)}
            options={CASH_TYPE_OPTIONS} placeholder="Select account type" />
        </Field>
        {chip === 'Other' && customTypeField()}
        {(isBank || chip === 'Other') && (
          <Field label="Institution" required={isBank} error={err('institution')}>
            <InstitutionCombobox value={form.institutionOrProvider}
              onChange={(v) => set('institutionOrProvider', v)}
              placeholder="Start typing an institution…" options={BANKS} />
          </Field>
        )}
        {chip && chip !== 'Cash' && (
          <Field label="Account nickname">
            <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Everyday checking" />
          </Field>
        )}
        {chip === 'Cash' && (
          <Field label="Cash label">
            <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Emergency cash" />
          </Field>
        )}
        {chip && (
          <MoneyField label={chip === 'Cash' ? 'Current amount' : 'Current balance'}
            amount={form.value} currency={form.currency}
            onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
        )}
      </>
    )
  }

  if (category === 'investment') return (
    <>
      <Field label="Institution" required error={err('institution')}>
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Start typing an institution…" options={INVESTMENT_FIRMS} />
      </Field>
      <Field label="Account type" required error={err('subtype')}>
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={INVESTMENT_TYPE_OPTIONS} placeholder="Select account type" />
      </Field>
      {form.subtype === 'Other' && customTypeField()}
      <Field label="Account nickname">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Fidelity brokerage" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'retirement') {
    const isPension = form.subtype === 'Pension'
    return (
      <>
        <Field label="Account type" required error={err('subtype')}>
          <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
            groups={RETIREMENT_GROUPS} placeholder="Select account type" />
        </Field>
        {form.subtype === 'Other retirement account' && customTypeField()}
        <Field label={isPension ? 'Employer or plan provider' : 'Provider'} required error={err('institution')}>
          <InstitutionCombobox value={form.institutionOrProvider}
            onChange={(v) => set('institutionOrProvider', v)}
            placeholder="Start typing a provider…" options={RETIREMENT_PROVIDERS} />
        </Field>
        <Field label="Account nickname">
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Current employer 401(k)" />
        </Field>
        <MoneyField label={isPension ? 'Estimated pension value' : 'Current balance'}
          amount={form.value} currency={form.currency}
          onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
      </>
    )
  }

  if (category === 'realestate') return (
    <>
      <Field label="Property type" required error={err('subtype')}>
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={PROPERTY_TYPE_OPTIONS} placeholder="Select property type" />
      </Field>
      {form.subtype === 'Other' && customTypeField('Property type name')}
      <Field label="Property name" required error={err('name')}>
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Austin house" />
      </Field>
      <Field label="Address">
        <TextInput value={form.address} onChange={(v) => set('address', v)} placeholder="Street, city, state" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'business') return (
    <>
      <Field label="Name" required error={err('name')}>
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Business or investment name" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'insurance') return (
    <>
      <Field label="Type" required error={err('subtype')}>
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={INSURANCE_TYPE_OPTIONS} placeholder="Select type" />
      </Field>
      <Field label="Provider" required error={err('institution')}>
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Start typing a provider…" options={INSURANCE_PROVIDERS} />
      </Field>
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Whole life policy" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'crypto') return (
    <>
      <Field label="Platform or wallet" required error={err('institution')}>
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Coinbase, Kraken, Ledger…" options={CRYPTO_PLATFORMS} />
      </Field>
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Crypto holdings" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'collectibles') return (
    <>
      <Field label="Type" required error={err('subtype')}>
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={COLLECTIBLE_TYPE_OPTIONS} placeholder="Select type" />
      </Field>
      {form.subtype === 'Other' && customTypeField('Type name')}
      <Field label="Name" required error={err('name')}>
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Art collection" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  return (
    <>
      <Field label="Name" required error={err('name')}>
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Describe the asset" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )
}

/* ---------------- Non-modal side panel: upload + manual entry ---------------- */

const emptyAssetForm = () => assetToForm(null)

/* One-line examples that help a non-expert see where their thing belongs. */
const CATEGORY_EXAMPLES = {
  cash: 'Checking, savings, CDs',
  investment: 'Brokerage, managed, trust accounts',
  retirement: '401(k), IRA, pension',
  realestate: 'Home, rental property, land',
  business: 'Ownership stakes, partnerships',
  insurance: 'Whole life, annuities',
  crypto: 'Coins, wallets, exchange accounts',
  collectibles: 'Art, watches, wine, vehicles',
  other: 'Anything else of value',
}

export function AssetPanel({ category: initialCategory, asset, onCommitAsset, onCommitAccounts, onClose, onRemove, setGuard, onCategoryChange }) {
  const direct = !!(asset || initialCategory)
  const [stage, setStage] = useState(direct ? 'form' : 'choice') // choice | form | upload | reading | review
  const [category, setCategory] = useState(asset?.category || initialCategory || null)
  useEffect(() => { onCategoryChange?.(category) }, [category, onCategoryChange])
  const [form, setForm] = useState(() => {
    const f = assetToForm(asset)
    if (!asset && initialCategory) f.subtype = defaultSubtype(initialCategory)
    return f
  })
  const initialRef = useRef(JSON.stringify(assetToForm(asset)))
  const [accounts, setAccounts] = useState([])
  const [edited, setEdited] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(null) // {run}
  const [attempted, setAttempted] = useState(false)
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
    setAttempted(false)
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
    /* The primary action is always active: pressing it surfaces what's missing. */
    if (Object.keys(missingAssetFields(category, form)).length > 0) {
      setAttempted(true)
      setTimeout(() => {
        const el = document.querySelector('.shell-panel .field-missing input, .shell-panel .field-missing .gsel-trigger')
        el?.focus()
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
      return
    }
    onCommitAsset({
      id: asset?.id ?? uid(),
      category,
      subtype:
        form.subtype === 'Other' || form.subtype === 'Other retirement account'
          ? form.customType.trim() || form.subtype
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
            <button className="upload-hero" onClick={() => setStage('upload')}>
              <span className="upload-hero-title">Drop in any statement</span>
              <span className="upload-hero-copy">Nevis reads it and adds your accounts and balances for you.</span>
              <span className="upload-hero-hint">PDF or a photo · Statements stay private to you and Sarah</span>
            </button>
            <div className="or-row" role="separator">Or add manually</div>
            <div className="panel-types">
              {ASSET_CATEGORIES.map((c) => (
                <button key={c.key} className="panel-tile" onClick={() => pickCategory(c.key)}>
                  <span className="panel-tile-name">{c.single}</span>
                  <span className="panel-tile-eg">{CATEGORY_EXAMPLES[c.key]}</span>
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
            <AssetFields category={category} form={form} set={set}
              errors={attempted ? missingAssetFields(category, form) : {}} />
          </div>
        )}
      </div>

      {(stage === 'form' || (stage === 'review' && accounts.length > 0)) && (
        <div className="panel-foot">
          {stage === 'form' && asset && onRemove && (
            <button className="btn btn-ghost btn-remove panel-foot-remove" onClick={onRemove}>Remove</button>
          )}
          <button className="btn btn-secondary" onClick={requestClose}>Cancel</button>
          {stage === 'form' ? (
            <button className="btn btn-primary" onClick={commitForm}>
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

/* ---------------- Liability side panel (same shell as assets) ---------------- */

const LIABILITY_EXAMPLES = {
  mortgage: 'Home loan',
  'personal-loan': 'Car, student, personal',
  'business-loan': 'Business borrowing',
  'credit-line': 'HELOC, other credit lines',
  'credit-card': 'Outstanding balances',
  other: 'Anything else you owe',
}

const liabilityToForm = (l) => ({
  name: l?.name || '',
  lender: l?.lender || '',
  outstandingBalance: l?.outstandingBalance ?? null,
  interestRate: l?.interestRate ?? '',
  currency: l?.currency || 'USD',
})

export function LiabilityPanel({ category: initialCategory, liability, onCommit, onClose, onRemove, setGuard, onCategoryChange }) {
  const direct = !!(liability || initialCategory)
  const [stage, setStage] = useState(direct ? 'form' : 'choice') // choice | form
  const [category, setCategory] = useState(liability?.category || initialCategory || null)
  useEffect(() => { onCategoryChange?.(category) }, [category, onCategoryChange])
  const [form, setForm] = useState(() => liabilityToForm(liability))
  const initialRef = useRef(JSON.stringify(liabilityToForm(liability)))
  const [confirmLeave, setConfirmLeave] = useState(null) // {run}
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const formDirty = liability
    ? JSON.stringify(form) !== initialRef.current
    : !!(form.name || form.lender || form.outstandingBalance != null || form.interestRate !== '')
  const dirty = stage === 'form' && formDirty

  useEffect(() => {
    setGuard(dirty ? { kind: liability ? 'liability-edit' : 'liability' } : null)
    return () => setGuard(null)
  }, [dirty, liability, setGuard])

  const guarded = (run) => (dirty ? setConfirmLeave({ run }) : run())
  const requestClose = () => guarded(onClose)
  const backToChoice = () => guarded(() => {
    setStage('choice'); setCategory(null); setForm(liabilityToForm(null))
  })

  const pickCategory = (key) => { setCategory(key); setStage('form') }
  const cat = category ? liabilityCategory(category) : null
  const title = stage === 'choice' ? 'Add liabilities' : liability ? `Edit ${cat.label.toLowerCase()}` : cat.formTitle

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
    <aside className="shell-panel" aria-label={title}>
      <div className="panel-head">
        <div className="panel-head-titles">
          {!direct && stage === 'form' && (
            <button className="panel-back" onClick={backToChoice}>Back to Add liabilities</button>
          )}
          <h2 className="panel-title">{title}</h2>
        </div>
        <button className="menu-trigger" aria-label="Close" onClick={requestClose}>✕</button>
      </div>

      <div className="panel-body">
        {stage === 'choice' && (
          <div className="panel-types">
            {LIABILITY_CATEGORIES.map((c) => (
              <button key={c.key} className="panel-tile" onClick={() => pickCategory(c.key)}>
                <span className="panel-tile-name">{c.label}</span>
                <span className="panel-tile-eg">{LIABILITY_EXAMPLES[c.key]}</span>
              </button>
            ))}
          </div>
        )}

        {stage === 'form' && (
          <div className="focus-form">
            <Field label="Name">
              <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder={cat.label} />
            </Field>
            <Field label="Lender">
              <InstitutionCombobox value={form.lender} onChange={(v) => set('lender', v)}
                placeholder="Chase, Wells Fargo…" />
            </Field>
            <MoneyField label="Outstanding balance" amount={form.outstandingBalance} currency={form.currency}
              onAmount={(v) => set('outstandingBalance', v)} onCurrency={(c) => set('currency', c)} />
            <Field label="Interest rate">
              <div className="currency rate-field">
                <input className="input currency-input" placeholder="4.25" inputMode="decimal"
                  value={form.interestRate}
                  onChange={(e) => set('interestRate', e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} />
                <span className="currency-suffix">%</span>
              </div>
            </Field>
          </div>
        )}
      </div>

      {stage === 'form' && (
        <div className="panel-foot">
          {liability && onRemove && (
            <button className="btn btn-ghost btn-remove panel-foot-remove" onClick={onRemove}>Remove</button>
          )}
          <button className="btn btn-secondary" onClick={requestClose}>Cancel</button>
          <button className="btn btn-primary" onClick={commit}>
            {liability ? 'Save changes' : 'Add liability'}
          </button>
        </div>
      )}

      {confirmLeave && (
        <Dialog
          title={liability ? 'Leave without saving your changes?' : 'Leave without adding this liability?'}
          body={liability ? 'Your changes will be lost.' : 'Your entries will be lost.'}
          cancelLabel="Keep editing"
          confirmLabel="Leave"
          danger
          onCancel={() => setConfirmLeave(null)}
          onConfirm={() => { const run = confirmLeave.run; setConfirmLeave(null); run() }}
        />
      )}
    </aside>
  )
}
