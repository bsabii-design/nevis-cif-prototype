/* Modal add/edit forms for financial objects; upload statement flow. */
import { useEffect, useRef, useState } from 'react'
import {
  ASSET_CATEGORIES, BANKS, CASH_BANK_TYPES, COLLECTIBLE_TYPES, CRYPTO_PLATFORMS,
  INSURANCE_PROVIDERS, INSURANCE_TYPES, INVESTMENT_FIRMS, INVESTMENT_TYPES, PROPERTY_TYPES,
  RETIREMENT_GROUPS, RETIREMENT_PLANS, RETIREMENT_PROVIDERS, RETIREMENT_TYPES,
  LIABILITY_CATEGORIES, assetCategory, liabilityCategory, uid, CRYPTO_ASSETS, CARD_ISSUERS,
  fmtCompact, fmtMoney, institutionAvatar,
} from './model.js'
import { extractedAccounts, extractedLiabilities, MOCK_STATEMENT_NAME, parseAccountsText, parseLiabilitiesText } from './parse.js'
import { Dialog, Field, GroupedSelect, InstitutionCombobox, MoneyInput, Select, TextInput, SearchableSelect } from './ui.jsx'

function MoneyField({ label, amount, currency, onAmount, onCurrency, required, error }) {
  return (
    <Field label={label} helper="A rough estimate is fine." required={required} error={error}>
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
const CRYPTO_ASSET_OPTIONS = [...CRYPTO_ASSETS, 'Other']

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
    crypto: CRYPTO_ASSETS,
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

/* One-field rule: no financial detail is required — we only prevent a
   completely empty entry (mis-click protection, not a knowledge test).
   The chosen category always provides the row's minimal identity. */
const assetFormEmpty = (f) =>
  !(f.name.trim() || f.institutionOrProvider.trim() || f.address.trim() ||
    f.subtype || f.customType.trim() || f.value != null)

function AssetFields({ category, form, set }) {
  const customTypeField = (label = 'Account type name') => (
    <Field label={label}>
      <TextInput value={form.customType} onChange={(v) => set('customType', v)}
        placeholder="Enter account type" autoFocus />
    </Field>
  )

  if (category === 'cash') {
    const chip = form.subtype
    const isCash = chip === 'Cash'
    return (
      <>
        <Field label="Account type">
          <GroupedSelect value={chip} onChange={(v) => set('subtype', v)}
            options={CASH_TYPE_OPTIONS} placeholder="Select account type" />
        </Field>
        {chip === 'Other' && customTypeField()}
        {!isCash && (
          <Field label="Institution">
            <InstitutionCombobox value={form.institutionOrProvider}
              onChange={(v) => set('institutionOrProvider', v)}
              placeholder="Start typing an institution…" options={BANKS} />
          </Field>
        )}
        <Field label={isCash ? 'Cash label' : 'Account nickname'}>
          <TextInput value={form.name} onChange={(v) => set('name', v)}
            placeholder={isCash ? 'Emergency cash' : 'Everyday checking'} />
        </Field>
        <MoneyField label={isCash ? 'Current amount' : 'Current balance'}
          amount={form.value} currency={form.currency}
          onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
      </>
    )
  }

  if (category === 'investment') return (
    <>
      <Field label="Institution">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Start typing an institution…" options={INVESTMENT_FIRMS} />
      </Field>
      <Field label="Account type">
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
        <Field label="Account type">
          <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
            groups={RETIREMENT_GROUPS} placeholder="Select account type" />
        </Field>
        {form.subtype === 'Other retirement account' && customTypeField()}
        <Field label={isPension ? 'Employer or plan institution' : 'Institution'}>
          <InstitutionCombobox value={form.institutionOrProvider}
            onChange={(v) => set('institutionOrProvider', v)}
            placeholder="Start typing an institution…" options={RETIREMENT_PROVIDERS} />
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
      <Field label="Property type">
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={PROPERTY_TYPE_OPTIONS} placeholder="Select property type" />
      </Field>
      {form.subtype === 'Other' && customTypeField('Property type name')}
      <Field label="Property name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Lake house" />
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
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Business or investment name" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'insurance') return (
    <>
      <Field label="Type">
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={INSURANCE_TYPE_OPTIONS} placeholder="Select type" />
      </Field>
      <Field label="Institution">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Northwestern Mutual, New York Life…" options={INSURANCE_PROVIDERS} />
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
      <Field label="Asset">
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={CRYPTO_ASSET_OPTIONS} placeholder="Bitcoin, Ethereum…" />
      </Field>
      {form.subtype === 'Other' && customTypeField('Asset name')}
      <Field label="Platform or wallet">
        <InstitutionCombobox value={form.institutionOrProvider}
          onChange={(v) => set('institutionOrProvider', v)}
          placeholder="Coinbase, Kraken, Ledger…" options={CRYPTO_PLATFORMS} />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  if (category === 'collectibles') return (
    <>
      <Field label="Type">
        <GroupedSelect value={form.subtype} onChange={(v) => set('subtype', v)}
          options={COLLECTIBLE_TYPE_OPTIONS} placeholder="Select type" />
      </Field>
      {form.subtype === 'Other' && customTypeField('Type name')}
      <Field label="Name">
        <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Art collection" />
      </Field>
      <MoneyField label="Current value" amount={form.value} currency={form.currency}
        onAmount={(v) => set('value', v)} onCurrency={(c) => set('currency', c)} />
    </>
  )

  return (
    <>
      <Field label="Name">
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
const ChevronRight = () => (
  <svg className="panel-choice-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 4l4 4-4 4" />
  </svg>
)

const UploadIcon = () => (
  <svg className="panel-upload-icon" width="18" height="18" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" />
    <path d="M4 13v2.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V13" />
  </svg>
)

const CATEGORY_EXAMPLES = {
  cash: 'Checking, savings, CDs',
  investment: 'Brokerage, managed, trust accounts',
  retirement: '401(k), IRA, pension accounts',
  realestate: 'Home, rental property, land',
  business: 'Private businesses, LLCs, partnerships',
  insurance: 'Whole life, annuities',
  crypto: 'Bitcoin, Ethereum, exchange accounts',
  collectibles: 'Art, watches, wine, classic cars',
  other: 'Anything else of value',
}

/* The choice panel mirrors the Figma list exactly — insurance stays a
   supported category for saved data but is not offered as a starting type. */
const CHOICE_CATEGORIES = ASSET_CATEGORIES.filter((c) => c.key !== 'insurance')

export function AssetPanel({ category: initialCategory, asset, onCommitAsset, onLiveChange, onCommitAccounts, onClose, onRemove, setGuard, onCategoryChange }) {
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
  const [uploadText, setUploadText] = useState('')
  const [readingLabel, setReadingLabel] = useState('')
  const [skipped, setSkipped] = useState([])          // extracted ids excluded from commit
  const [editingId, setEditingId] = useState(null)    // review drill-in
  const editSnapshot = useRef(null)
  const fileRef = useRef(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /* Editing is live: changes flow into the profile (debounced), so an open
     edit form is never "unsaved" — guards protect only creation and review. */
  const formDirty = asset
    ? false
    : !!(form.name || form.institutionOrProvider || form.address || form.value != null)
  const dirty = stage === 'form' ? formDirty : stage === 'review' ? edited : false

  useEffect(() => {
    const kind = stage === 'review' ? 'extract' : 'asset'
    setGuard(dirty ? { kind } : null)
    return () => setGuard(null)
  }, [dirty, stage, setGuard])

  const buildAsset = () => ({
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

  const liveTimer = useRef(null)
  const lastSent = useRef(initialRef.current)
  useEffect(() => {
    if (!asset || stage !== 'form') return
    const snapshot = JSON.stringify(form)
    if (snapshot === lastSent.current) return
    if (assetFormEmpty(form)) return
    clearTimeout(liveTimer.current)
    liveTimer.current = setTimeout(() => { lastSent.current = snapshot; onLiveChange(buildAsset()) }, 400)
    return () => clearTimeout(liveTimer.current)
  }, [form])

  const guarded = (run) => (dirty ? setConfirmLeave({ run }) : run())
  const requestClose = () => guarded(onClose)
  const backToChoice = () => guarded(() => {
    setStage('choice'); setCategory(null); setForm(emptyAssetForm())
    setAccounts([]); setEdited(false); setSkipped([]); setEditingId(null)
  })

  const pickCategory = (key) => {
    setCategory(key)
    setForm((f) => ({ ...f, subtype: defaultSubtype(key) }))
    setAttempted(false)
    setStage('form')
  }

  const startReading = () => {
    setReadingLabel(`Reading ${MOCK_STATEMENT_NAME}`)
    setStage('reading')
    setTimeout(() => {
      setAccounts(extractedAccounts())
      setEdited(false)
      setStage('review')
    }, 1500)
  }

  const submitDescription = () => {
    const t = uploadText.trim()
    if (!t) return
    setReadingLabel('Creating your accounts…')
    setStage('reading')
    setTimeout(() => {
      const parsed = parseAccountsText(t)
      setAccounts(parsed)
      setEdited(false)
      setUploadText('')
      setStage('review')
    }, 1200)
  }

  const setAccount = (id, k, v) => {
    setEdited(true)
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))
  }
  const removeAccount = (id) => {
    setEdited(true)
    setAccounts((list) => list.filter((a) => a.id !== id))
  }
  const toggleSkip = (id) => {
    setEdited(true)
    setSkipped((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }
  const openEdit = (id) => {
    editSnapshot.current = JSON.stringify(accounts.find((a) => a.id === id))
    setEditingId(id)
  }
  const closeEdit = (keep) => {
    if (!keep && editSnapshot.current) {
      const prev = JSON.parse(editSnapshot.current)
      setAccounts((list) => list.map((a) => (a.id === prev.id ? prev : a)))
    }
    setEditingId(null)
  }
  const editingAccount = editingId ? accounts.find((a) => a.id === editingId) : null
  const activeAccounts = accounts.filter((a) => !skipped.includes(a.id))
  /* "Edit investment account" — category label from the extracted type. */
  const extractCatLabel = (t) =>
    ['Checking', 'Savings', 'Money market', 'Certificate of deposit'].includes(t) ? 'bank'
      : t.includes('IRA') || ['401(k)', '403(b)', '457(b)', 'Pension'].includes(t) ? 'retirement'
      : 'investment'

  const cat = category ? assetCategory(category) : null

  const commitForm = () => {
    /* The primary action is always active; an empty form asks for one detail. */
    if (assetFormEmpty(form)) { setAttempted(true); return }
    onCommitAsset(buildAsset())
  }

  const editTitle = () => {
    if (category === 'cash') return form.subtype === 'Cash' ? 'Edit cash' : 'Edit bank account'
    return `Edit ${cat.single.toLowerCase()}`
  }
  const title =
    stage === 'choice' ? 'Add assets' :
    stage === 'upload' || stage === 'reading' ? 'Upload a statement' :
    stage === 'review' ? (editingAccount
      ? `Edit ${extractCatLabel(editingAccount.accountType)} account`
      : `We found ${accounts.length} account${accounts.length === 1 ? '' : 's'}`) :
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
            stage === 'review'
              ? <button className="panel-back" onClick={() => (editingAccount ? closeEdit(true) : backToChoice())}>← Back</button>
              : <button className="panel-back" onClick={backToChoice}>Back</button>
          )}
          <h2 className="panel-title">{title}</h2>
          {stage === 'choice' && <p className="panel-sub">Choose an asset type to add.</p>}
          {stage === 'form' && !asset && (
            <p className="panel-sub">Enter the {category === 'cash' ? 'account' : cat.add} details below.</p>
          )}
          {stage === 'review' && (
            <p className="panel-sub">
              {editingAccount ? 'Review this account before adding it.' : 'Review and edit anything before adding them.'}
            </p>
          )}
        </div>
        <button className="menu-trigger" aria-label="Close" onClick={requestClose}>✕</button>
      </div>

      <div className="panel-body">
        {stage === 'choice' && (
          <>
            <div className="panel-choice">
              {CHOICE_CATEGORIES.map((c) => (
                <button key={c.key} className="panel-choice-row" onClick={() => pickCategory(c.key)}>
                  <span className="panel-choice-main">
                    <span className="panel-choice-name">{c.single}</span>
                    <span className="panel-choice-eg">{CATEGORY_EXAMPLES[c.key]}</span>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
            <div className="ai-wrap">
              <div className="ai-card"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-drag') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('is-drag')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-drag'); startReading() }}>
                <div className="ai-card-head">
                  <span className="ai-card-title">Use AI instead</span>
                  <span className="ai-card-copy">
                    Type what you know, or attach one or more statements.
                    We'll prepare the accounts for your review.
                  </span>
                </div>
                <div className="ai-composer">
                  <textarea
                    className="ai-input"
                    rows={2}
                    placeholder="Fidelity brokerage $1.2M, Chase checking $40K, Vanguard Roth IRA $250K"
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDescription() } }}
                  />
                  <div className="ai-composer-row">
                    <button className="ai-attach" aria-label="Attach statements" onClick={() => fileRef.current?.click()}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 7.5 8.3 13.2a3.7 3.7 0 0 1-5.2-5.2L8.8 2.3a2.5 2.5 0 0 1 3.5 3.5L6.6 11.5a1.2 1.2 0 0 1-1.8-1.8L10 4.5" />
                      </svg>
                    </button>
                    <button
                      className={'ai-send' + (uploadText.trim() ? ' ai-send-on' : '')}
                      aria-label="Create accounts from your description"
                      onClick={submitDescription}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={startReading} />
          </>
        )}

        {stage === 'reading' && (
          <div className="reading">
            <span className="spinner" aria-hidden="true" />
            <span className="reading-text">{readingLabel || `Reading ${MOCK_STATEMENT_NAME}`}</span>
          </div>
        )}

        {stage === 'review' && !editingAccount && (
          <div className="xcards">
            {accounts.map((a) => {
              const off = skipped.includes(a.id)
              const av = institutionAvatar(a.institution)
              return (
                <div key={a.id} className={'xcard' + (off ? ' xcard-off' : '')}
                  role="button" tabIndex={0}
                  onClick={() => !off && openEdit(a.id)}
                  onKeyDown={(e) => { if (!off && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEdit(a.id) } }}>
                  <div className="xcard-title">
                    <span>{a.accountType.replace(/ account$/i, '')}</span>
                    {a.institution && (
                      <span className="xcard-inst">
                        <span className="xcard-dot" aria-hidden="true">·</span>
                        {av && (av.logo
                          ? <img className="avatar avatar-sm avatar-logo" src={av.logo} alt="" aria-hidden="true" />
                          : <span className="avatar avatar-sm" style={{ background: av.color }} aria-hidden="true">{av.letter}</span>)}
                        {a.institution}
                      </span>
                    )}
                  </div>
                  {a.source && (
                    <div className="xcard-src">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4z" /><path d="M8 1v3h3" />
                      </svg>
                      <span className="xcard-src-name">{a.source}</span>
                    </div>
                  )}
                  <div className="xcard-row">
                    <span className="xcard-amount">{a.value == null ? '—' : fmtMoney(a.value, a.currency)}</span>
                    <button className="xcard-skip" onClick={(e) => { e.stopPropagation(); toggleSkip(a.id) }}>
                      {off ? 'Undo' : 'Skip'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {stage === 'review' && editingAccount && (
          <div className="focus-form">
            <Field label="Institution" required>
              <InstitutionCombobox value={editingAccount.institution}
                onChange={(v) => setAccount(editingAccount.id, 'institution', v)} />
            </Field>
            <Field label="Account type" required>
              <Select value={editingAccount.accountType}
                onChange={(v) => setAccount(editingAccount.id, 'accountType', v)} options={SUBTYPE_OPTIONS} />
            </Field>
            <Field label="Account nickname">
              <TextInput value={editingAccount.nickname || ''} placeholder="Fidelity brokerage"
                onChange={(v) => setAccount(editingAccount.id, 'nickname', v)} />
            </Field>
            <Field label="Current value">
              <MoneyInput amount={editingAccount.value} currency={editingAccount.currency}
                onAmount={(v) => setAccount(editingAccount.id, 'value', v)}
                onCurrency={(c) => setAccount(editingAccount.id, 'currency', c)} />
            </Field>
          </div>
        )}

        {stage === 'form' && (
          <div className="focus-form">
            <AssetFields category={category} form={form} set={set} />
          </div>
        )}
      </div>

      {(stage === 'form' || (stage === 'review' && accounts.length > 0)) && (
        <div className="panel-foot">
          {stage === 'form' && !asset && attempted && assetFormEmpty(form) && (
            <span className="panel-foot-hint">Add at least one detail to create this asset.</span>
          )}
          {stage === 'form' && asset && onRemove && (
            <button className="btn btn-tertiary" onClick={onRemove}>Remove</button>
          )}
          {stage === 'form' && asset ? (
            <button className="btn btn-secondary" onClick={onClose}>Done</button>
          ) : stage === 'review' && editingAccount ? (
            <>
              <button className="btn btn-tertiary" onClick={() => closeEdit(false)}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => closeEdit(true)}>Done</button>
            </>
          ) : (
            <>
              <button className="btn btn-tertiary" onClick={direct ? requestClose : backToChoice}>Cancel</button>
              {stage === 'form' ? (
                <button className="btn btn-primary" onClick={commitForm}>
                  {category === 'cash'
                    ? (form.subtype === 'Cash' ? 'Add cash' : form.subtype === 'Other' ? 'Add asset' : 'Add account')
                    : cat.cta}
                </button>
              ) : (
                <button className="btn btn-primary" disabled={activeAccounts.length === 0}
                  onClick={() => activeAccounts.length && onCommitAccounts(activeAccounts)}>
                  Add {activeAccounts.length} account{activeAccounts.length === 1 ? '' : 's'}
                </button>
              )}
            </>
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

const SUBTYPE_OPTIONS = [...CASH_BANK_TYPES, ...INVESTMENT_TYPES.filter((t) => t !== 'Other'), ...RETIREMENT_TYPES]

/* ---------------- Liability side panel (same shell as assets) ---------------- */

const LIABILITY_EXAMPLES = {
  mortgage: 'Home, rental property',
  'personal-loan': 'Car, student, personal',
  'business-loan': 'Loans for a business',
  'credit-line': 'HELOC, other credit lines',
  'credit-card': 'Outstanding balances',
  other: 'Anything else you owe',
}

/* Per-category labels: the "name" slot means different things per debt
   (her review: nobody writes "Mortgage 2" — mortgages relate to property,
   loans to purpose, cards to a nickname). */
const LIABILITY_FIELDS = {
  mortgage: { nameLabel: 'Property', namePlaceholder: 'Select a property', lenderLabel: 'Lender', lenderPlaceholder: 'Chase, Wells Fargo…', propertyPicker: true, requiredAll: true },
  'personal-loan': { nameLabel: 'Loan purpose', namePlaceholder: 'Car loan, student loan, medical…', lenderLabel: 'Lender', lenderPlaceholder: 'Chase, SoFi…' },
  'business-loan': { nameLabel: 'Loan name', namePlaceholder: 'Working capital, equipment loan…', lenderLabel: 'Lender', lenderPlaceholder: 'Chase, Wells Fargo…' },
  'credit-line': { nameLabel: 'Name', namePlaceholder: 'HELOC, credit line…', lenderLabel: 'Lender', lenderPlaceholder: 'Chase, Wells Fargo…' },
  'credit-card': { issuerFirst: true, lenderLabel: 'Card issuer', lenderPlaceholder: 'American Express, Chase…', lenderOptions: CARD_ISSUERS, nameLabel: 'Card nickname', namePlaceholder: 'Amex Platinum, Visa Sapphire…' },
  other: { nameLabel: 'Name', namePlaceholder: 'Describe the debt', lenderLabel: 'Lender', lenderPlaceholder: 'Chase, Wells Fargo…' },
}

/* Mortgage Property field: a mortgage always relates to something the client
   owns, so the field offers their real-estate assets — and "Add a property…"
   creates an unvalued one on the spot. The flow never dead-ends. */
function PropertySelect({ value, onChange, options, onCreateProperty, placeholder }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) { setOpen(false); setCreating(false) } }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const commitDraft = () => {
    const name = draft.trim()
    setCreating(false)
    setDraft('')
    setOpen(false)
    if (!name) return
    onCreateProperty?.(name)
    onChange(name)
  }
  if (creating) {
    return (
      <input className="input" autoFocus value={draft} placeholder="Aspen house, lake cottage…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitDraft() }
          if (e.key === 'Escape') { setCreating(false); setDraft('') }
        }}
        onBlur={commitDraft} />
    )
  }
  return (
    <div className="combo" ref={rootRef}>
      <button type="button" className="input select gsel-trigger"
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        {value || <span className="gsel-placeholder">{placeholder}</span>}
      </button>
      {open && (
        <ul className="combo-list" role="listbox">
          {options.map((p) => (
            <li key={p.name} role="option" aria-selected={p.name === value}
              className={'combo-item combo-item-split' + (p.name === value ? ' combo-item-active' : '')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(p.name); setOpen(false) }}>
              <span>{p.name}</span>
              {p.value != null && <span className="combo-item-value">{fmtCompact(p.value, p.currency || 'USD')}</span>}
            </li>
          ))}
          <li role="option" aria-selected={false}
            className={'combo-item combo-item-add' + (options.length ? '' : ' combo-item-first')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setCreating(true); setDraft('') }}>
            Add a property…
          </li>
        </ul>
      )}
    </div>
  )
}

/* Interest rate with the % living inside the field: shown as "4.25%" at rest,
   plain digits while editing. */
function RateInput({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const shown = value === '' ? '' : focused ? String(value) : value + '%'
  return (
    <input className="input" placeholder="4.25%" inputMode="decimal"
      value={shown}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))} />
  )
}

const liabilityToForm = (l) => ({
  name: l?.name || '',
  lender: l?.lender || '',
  outstandingBalance: l?.outstandingBalance ?? null,
  interestRate: l?.interestRate ?? '',
  currency: l?.currency || 'USD',
})

const liabilityFormEmpty = (f) =>
  !(f.name.trim() || f.lender.trim() || f.outstandingBalance != null || f.interestRate !== '')

export function LiabilityPanel({ category: initialCategory, liability, onCommit, onCommitLiabilities, onLiveChange, onClose, onRemove, setGuard, onCategoryChange, propertyOptions = [], onCreateProperty }) {
  const direct = !!(liability || initialCategory)
  const [stage, setStage] = useState(direct ? 'form' : 'choice') // choice | reading | review | form
  const [category, setCategory] = useState(liability?.category || initialCategory || null)
  useEffect(() => { onCategoryChange?.(category) }, [category, onCategoryChange])
  const [form, setForm] = useState(() => liabilityToForm(liability))
  const initialRef = useRef(JSON.stringify(liabilityToForm(liability)))
  const [confirmLeave, setConfirmLeave] = useState(null) // {run}
  const [attempted, setAttempted] = useState(false)
  const [uploadText, setUploadText] = useState('')
  const [records, setRecords] = useState([])
  const [skipped, setSkipped] = useState([])
  const [readingLabel, setReadingLabel] = useState('')
  const fileRef = useRef(null)
  const readTimer = useRef(null)
  useEffect(() => () => clearTimeout(readTimer.current), [])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /* AI path: same interaction as assets — read, then review before adding. */
  const finishReading = (extracted) => {
    readTimer.current = setTimeout(() => {
      setRecords(extracted)
      setSkipped([])
      setStage('review')
    }, 1400)
  }
  const startReading = () => {
    setReadingLabel(`Reading ${MOCK_STATEMENT_NAME}`)
    setStage('reading')
    finishReading(extractedLiabilities())
  }
  const submitDescription = () => {
    const t = uploadText.trim()
    if (!t) return
    const parsed = parseLiabilitiesText(t)
    if (!parsed.length) return
    setReadingLabel('Reading your description')
    setStage('reading')
    finishReading(parsed)
  }
  const toggleSkip = (id) => setSkipped((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const activeRecords = records.filter((r) => !skipped.includes(r.id))

  const formDirty = liability
    ? false
    : !!(form.name || form.lender || form.outstandingBalance != null || form.interestRate !== '')
  const dirty = (stage === 'form' && formDirty) || stage === 'review' || (stage === 'choice' && !!uploadText.trim())

  useEffect(() => {
    setGuard(dirty ? { kind: 'liability' } : null)
    return () => setGuard(null)
  }, [dirty, setGuard])

  const buildLiability = () => ({
    id: liability?.id ?? uid(),
    category,
    name: form.name.trim(),
    lender: form.lender.trim(),
    currency: form.currency,
    outstandingBalance: form.outstandingBalance ?? null,
    interestRate: form.interestRate === '' ? null : Number(form.interestRate),
  })

  const liveTimer = useRef(null)
  const lastSent = useRef(initialRef.current)
  useEffect(() => {
    if (!liability || stage !== 'form') return
    const snapshot = JSON.stringify(form)
    if (snapshot === lastSent.current) return
    clearTimeout(liveTimer.current)
    liveTimer.current = setTimeout(() => { lastSent.current = snapshot; onLiveChange(buildLiability()) }, 400)
    return () => clearTimeout(liveTimer.current)
  }, [form])

  const guarded = (run) => (dirty ? setConfirmLeave({ run }) : run())
  const requestClose = () => guarded(onClose)
  const backToChoice = () => guarded(() => {
    setStage('choice'); setCategory(null); setForm(liabilityToForm(null))
    setRecords([]); setSkipped([])
  })

  const pickCategory = (key) => { setCategory(key); setStage('form') }
  const cat = category ? liabilityCategory(category) : null
  const title =
    stage === 'choice' ? 'Add liability' :
    stage === 'reading' ? 'Add liability' :
    stage === 'review' ? `We found ${records.length} liabilit${records.length === 1 ? 'y' : 'ies'}` :
    liability ? `Edit ${cat.label.toLowerCase()}` : cat.formTitle

  const cfgNow = category ? (LIABILITY_FIELDS[category] || LIABILITY_FIELDS.other) : null
  const reqMissing = cfgNow?.requiredAll ? {
    name: !form.name.trim(),
    lender: !form.lender.trim(),
    balance: form.outstandingBalance == null,
    rate: form.interestRate === '',
  } : null

  const commit = () => {
    if (reqMissing ? Object.values(reqMissing).some(Boolean) : liabilityFormEmpty(form)) { setAttempted(true); return }
    onCommit(buildLiability())
  }

  return (
    <aside className="shell-panel" aria-label={title}>
      <div className="panel-head">
        <div className="panel-head-titles">
          {!direct && (stage === 'form' || stage === 'review') && (
            <button className="panel-back" onClick={backToChoice}>Back</button>
          )}
          <h2 className="panel-title">{title}</h2>
          {stage === 'choice' && <p className="panel-sub">Choose a liability type to add.</p>}
          {stage === 'review' && <p className="panel-sub">Review and edit anything before adding them.</p>}
          {stage === 'form' && !liability && (
            <p className="panel-sub">Enter the {cat.add} details below.</p>
          )}
        </div>
        <button className="menu-trigger" aria-label="Close" onClick={requestClose}>✕</button>
      </div>

      <div className="panel-body">
        {stage === 'choice' && (
          <>
            <div className="panel-choice">
              {LIABILITY_CATEGORIES.map((c) => (
                <button key={c.key} className="panel-choice-row" onClick={() => pickCategory(c.key)}>
                  <span className="panel-choice-main">
                    <span className="panel-choice-name">{c.label}</span>
                    <span className="panel-choice-eg">{LIABILITY_EXAMPLES[c.key]}</span>
                  </span>
                  <ChevronRight />
                </button>
              ))}
            </div>
            <div className="ai-wrap">
              <div className="ai-card"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-drag') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('is-drag')}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-drag'); startReading() }}>
                <div className="ai-card-head">
                  <span className="ai-card-title">Use AI instead</span>
                  <span className="ai-card-copy">
                    Type what you know or attach one or more statements.
                    We'll prepare the liabilities for your review.
                  </span>
                </div>
                <div className="ai-composer">
                  <textarea
                    className="ai-input"
                    rows={2}
                    placeholder="Chase mortgage, around $620K remaining; Amex balance about $18K"
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDescription() } }}
                  />
                  <div className="ai-composer-row">
                    <button className="ai-attach" aria-label="Attach statements" onClick={() => fileRef.current?.click()}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 7.5 8.3 13.2a3.7 3.7 0 0 1-5.2-5.2L8.8 2.3a2.5 2.5 0 0 1 3.5 3.5L6.6 11.5a1.2 1.2 0 0 1-1.8-1.8L10 4.5" />
                      </svg>
                    </button>
                    <button
                      className={'ai-send' + (uploadText.trim() ? ' ai-send-on' : '')}
                      aria-label="Create liabilities from your description"
                      onClick={submitDescription}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={startReading} />
          </>
        )}

        {stage === 'reading' && (
          <div className="reading">
            <span className="spinner" aria-hidden="true" />
            <span className="reading-text">{readingLabel || 'Reading'}</span>
          </div>
        )}

        {stage === 'review' && (
          <div className="xcards">
            {records.map((r) => {
              const off = skipped.includes(r.id)
              const av = institutionAvatar(r.lender)
              return (
                <div key={r.id} className={'xcard' + (off ? ' xcard-off' : '')}>
                  <div className="xcard-title">
                    <span>{r.catLabel}</span>
                    {r.lender && (
                      <span className="xcard-inst">
                        <span className="xcard-dot" aria-hidden="true">·</span>
                        {av && (av.logo
                          ? <img className="avatar avatar-sm avatar-logo" src={av.logo} alt="" aria-hidden="true" />
                          : <span className="avatar avatar-sm" style={{ background: av.color }} aria-hidden="true">{av.letter}</span>)}
                        {r.lender}
                      </span>
                    )}
                  </div>
                  {r.source && (
                    <div className="xcard-src">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4z" /><path d="M8 1v3h3" />
                      </svg>
                      <span className="xcard-src-name">{r.source}</span>
                    </div>
                  )}
                  <div className="xcard-row">
                    <span className="xcard-amount">{r.outstandingBalance == null ? '—' : fmtMoney(r.outstandingBalance, r.currency)}</span>
                    <button className="xcard-skip" onClick={(e) => { e.stopPropagation(); toggleSkip(r.id) }}>
                      {off ? 'Undo' : 'Skip'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {stage === 'form' && (() => {
          const cfg = cfgNow
          const req = !!cfg.requiredAll
          const err = (k) => (req && attempted && reqMissing[k]) || undefined
          const nameField = cfg.propertyPicker ? (
            <Field label={cfg.nameLabel} key="name" required={req} error={err('name')}>
              <PropertySelect value={form.name} options={propertyOptions}
                placeholder={cfg.namePlaceholder}
                onCreateProperty={onCreateProperty}
                onChange={(v) => set('name', v)} />
            </Field>
          ) : (
            <Field label={cfg.nameLabel} key="name">
              <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder={cfg.namePlaceholder} />
            </Field>
          )
          const lenderField = (
            <Field label={cfg.lenderLabel} key="lender" required={req} error={err('lender')}>
              <InstitutionCombobox value={form.lender} onChange={(v) => set('lender', v)}
                placeholder={cfg.lenderPlaceholder} options={cfg.lenderOptions} />
            </Field>
          )
          return (
            <div className="focus-form">
              {cfg.issuerFirst ? [lenderField, nameField] : [nameField, lenderField]}
              <MoneyField label="Outstanding balance" required={req} error={err('balance')}
                amount={form.outstandingBalance} currency={form.currency}
                onAmount={(v) => set('outstandingBalance', v)} onCurrency={(c) => set('currency', c)} />
              <Field label="Interest rate" required={req} error={err('rate')}>
                <RateInput value={form.interestRate} onChange={(v) => set('interestRate', v)} />
              </Field>
            </div>
          )
        })()}
      </div>

      {(stage === 'form' || (stage === 'review' && records.length > 0)) && (
        <div className="panel-foot">
          {stage === 'form' && !liability && attempted && !reqMissing && liabilityFormEmpty(form) && (
            <span className="panel-foot-hint">Add at least one detail to create this liability.</span>
          )}
          {stage === 'form' && liability && onRemove && (
            <button className="btn btn-tertiary" onClick={onRemove}>Remove</button>
          )}
          {stage === 'form' && liability ? (
            <button className="btn btn-secondary" onClick={onClose}>Done</button>
          ) : stage === 'review' ? (
            <>
              <button className="btn btn-tertiary" onClick={backToChoice}>Cancel</button>
              <button className="btn btn-primary" disabled={activeRecords.length === 0}
                onClick={() => activeRecords.length && onCommitLiabilities(activeRecords)}>
                Add {activeRecords.length} liabilit{activeRecords.length === 1 ? 'y' : 'ies'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-tertiary" onClick={direct ? requestClose : backToChoice}>Cancel</button>
              <button className="btn btn-primary" onClick={commit}>{cat.formTitle}</button>
            </>
          )}
        </div>
      )}

      {confirmLeave && (
        <Dialog
          title={stage === 'review' ? 'Leave without adding these liabilities?' : liability ? 'Leave without saving your changes?' : 'Leave without adding this liability?'}
          body={stage === 'review' ? 'Your changes will be lost.' : liability ? 'Your changes will be lost.' : 'Your entries will be lost.'}
          cancelLabel={stage === 'review' ? 'Keep reviewing' : 'Keep editing'}
          confirmLabel="Leave"
          danger
          onCancel={() => setConfirmLeave(null)}
          onConfirm={() => { const run = confirmLeave.run; setConfirmLeave(null); run() }}
        />
      )}
    </aside>
  )
}
