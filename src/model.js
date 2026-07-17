/* Data model, honest math, demo seed, persistence. Per final spec. */

let nextId = 100
export const uid = () => nextId++

/* ---------------- Currencies ---------------- */

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF']
/* Static mocked conversion table — prototype only. */
export const RATES_TO_USD = { USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12 }
export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ' }

export const usdOf = (amount, currency = 'USD') =>
  amount == null ? null : Math.round(amount * (RATES_TO_USD[currency] ?? 1))

export const fmtMoney = (n, currency = 'USD') =>
  n == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export const fmtUSD = (n) => fmtMoney(n, 'USD')

/* "1,850,000" → 1850000 ; junk/empty → null */
export const parseAmount = (s) => {
  const digits = String(s).replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/* ---------------- Categories ---------------- */

export const ASSET_CATEGORIES = [
  { key: 'investment', label: 'Investment accounts', single: 'Investment account', hint: 'Brokerage and managed accounts', cta: 'Add account', formTitle: 'Add investment account' },
  { key: 'retirement', label: 'Retirement accounts', single: 'Retirement account', hint: '401(k), IRA and pension', cta: 'Add account', formTitle: 'Add retirement account' },
  { key: 'realestate', label: 'Real estate', single: 'Real estate', hint: 'Homes and other property', cta: 'Add asset', formTitle: 'Add real estate' },
  { key: 'business', label: 'Business interests', single: 'Business interest', hint: 'Private companies and investments', cta: 'Add asset', formTitle: 'Add business interest' },
  { key: 'crypto', label: 'Crypto', single: 'Crypto', hint: 'Coins, wallets and exchange accounts', cta: 'Add asset', formTitle: 'Add crypto' },
  { key: 'collectibles', label: 'Art and collectibles', single: 'Collectibles', hint: 'Art, watches, wine and more', cta: 'Add asset', formTitle: 'Add art or collectible' },
  { key: 'other', label: 'Other assets', single: 'Other asset', hint: 'Anything else of value', cta: 'Add asset', formTitle: 'Add other asset' },
]
export const assetCategory = (key) => ASSET_CATEGORIES.find((c) => c.key === key)

export const INVESTMENT_TYPES = ['Brokerage account', 'Managed account', 'Trust account', 'Other']
export const RETIREMENT_TYPES = ['401(k)', 'Traditional IRA', 'Roth IRA', 'Pension', 'Other retirement account']
export const PROPERTY_TYPES = ['House', 'Apartment', 'Commercial property', 'Land', 'Other']
export const COLLECTIBLE_TYPES = ['Art', 'Watches', 'Wine', 'Jewelry', 'Other']

export const LIABILITY_CATEGORIES = [
  { key: 'mortgage', label: 'Mortgage', formTitle: 'Add a mortgage' },
  { key: 'personal-loan', label: 'Personal loan', formTitle: 'Add a personal loan' },
  { key: 'business-loan', label: 'Business loan', formTitle: 'Add a business loan' },
  { key: 'credit-line', label: 'Line of credit', formTitle: 'Add a line of credit' },
  { key: 'credit-card', label: 'Credit card balance', formTitle: 'Add a credit card balance' },
  { key: 'other', label: 'Other debt', formTitle: 'Add other debt' },
]
export const liabilityCategory = (key) => LIABILITY_CATEGORIES.find((c) => c.key === key)

export const EMPLOYMENT_STATUSES = ['Employed', 'Self-employed', 'Business owner', 'Retired', 'Not employed']

/* ---------------- Institutions (autocomplete) ---------------- */

export const INSTITUTIONS = [
  'Fidelity', 'Vanguard', 'Charles Schwab', 'Chase', 'Morgan Stanley',
  'Goldman Sachs', 'Merrill Lynch', 'Wells Fargo', 'Bank of America', 'Citi',
  'J.P. Morgan', 'UBS', 'Edward Jones', 'T. Rowe Price', 'Betterment',
  'Robinhood', 'E*TRADE', 'Coinbase', 'Kraken', 'Gemini',
]

const AVATAR_COLORS = ['#455285', '#68457A', '#346C83', '#596625', '#AD5507', '#8F2F28']

export const institutionAvatar = (name) => {
  if (!name) return null
  const match = INSTITUTIONS.find((n) => n.toLowerCase() === name.trim().toLowerCase())
  if (!match) return null
  let h = 0
  for (const c of match) h = (h * 31 + c.charCodeAt(0)) % 997
  return { letter: match[0].toUpperCase(), color: AVATAR_COLORS[h % AVATAR_COLORS.length] }
}

/* ---------------- Card presentation ---------------- */

export const assetTitle = (a) =>
  a.name || a.subtype || assetCategory(a.category)?.single || 'Asset'

export const assetSubtitle = (a) => {
  const parts = [a.institutionOrProvider, a.subtype].filter(Boolean)
  return parts.length ? parts.join(' · ') : assetCategory(a.category)?.single
}

export const liabilityTitle = (l) =>
  l.name || liabilityCategory(l.category)?.label || 'Liability'

export const liabilitySubtitle = (l) =>
  [l.lender, l.interestRate != null && l.interestRate !== '' ? `${l.interestRate}% interest` : null]
    .filter(Boolean).join(' · ')

/* ---------------- Honest financial summary (spec §22) ----------------
   Returns { rows: [{label, value}] | null, nw: number|null, line: string|null }
   - unanswered liabilities are never $0
   - unknown liability balances block the calculation
   - unknown asset values are excluded with one explanatory line          */

export const computeSummary = (profile) => {
  const { assets, liabilities, liabilitiesExplicitlyNone: none } = profile
  const knownAssets = assets.filter((a) => a.value != null)
  const totalAssets = knownAssets.reduce((s, a) => s + usdOf(a.value, a.currency), 0)
  const unknownAssets = assets.length - knownAssets.length
  const knownLiabs = liabilities.filter((l) => l.outstandingBalance != null)
  const totalLiabs = knownLiabs.reduce((s, l) => s + usdOf(l.outstandingBalance, l.currency), 0)
  const unknownLiabs = liabilities.length - knownLiabs.length

  const assetsRow = { label: 'Total assets', value: assets.length === 0 ? 'None added' : knownAssets.length === 0 ? '—' : fmtUSD(totalAssets) }
  const excludesLine = unknownAssets > 0
    ? `Excludes ${unknownAssets} asset${unknownAssets > 1 ? 's' : ''} without a value`
    : null

  // State A — nothing added at all
  if (assets.length === 0 && liabilities.length === 0 && !none) {
    return { rows: null, nw: null, line: 'Add assets and liabilities to build your financial picture' }
  }

  // State D — at least one liability balance is unknown: blocks calculation
  if (unknownLiabs > 0) {
    return {
      rows: [assetsRow, { label: 'Total liabilities', value: 'Incomplete' }],
      nw: null,
      line: `Add ${unknownLiabs} missing balance${unknownLiabs > 1 ? 's' : ''} to calculate`,
    }
  }

  // Liabilities unanswered (none added, no explicit answer) — State B
  if (liabilities.length === 0 && !none) {
    return {
      rows: [assetsRow, { label: 'Total liabilities', value: 'Not added yet' }],
      nw: null,
      line: 'Add liabilities to complete your financial picture',
    }
  }

  // Liabilities resolved (explicitly none, or all balances known)
  const liabsRow = { label: 'Total liabilities', value: fmtUSD(totalLiabs) }

  // State F — liabilities resolved but no assets added
  if (assets.length === 0) {
    return { rows: [assetsRow, liabsRow], nw: null, line: 'Add assets to build your financial picture' }
  }

  // State C (no known asset values) — never show $0 net worth
  if (knownAssets.length === 0) {
    return { rows: [assetsRow, liabsRow], nw: null, line: 'Add an asset value to calculate' }
  }

  // States C / E — calculable
  return { rows: [assetsRow, liabsRow], nw: totalAssets - totalLiabs, line: excludesLine }
}

export const hasForeignValues = (profile) =>
  profile.assets.some((a) => a.value != null && (a.currency ?? 'USD') !== 'USD') ||
  profile.liabilities.some((l) => l.outstandingBalance != null && (l.currency ?? 'USD') !== 'USD')

/* ---------------- Required-before-share logic (spec §5) ---------------- */

export const missingPersonalFields = (p) => ({
  firstName: !p.personal.legalFirstName?.trim(),
  lastName: !p.personal.legalLastName?.trim(),
  dateOfBirth: !p.personal.dateOfBirth?.trim(),
  country: !p.personal.primaryResidence.country?.trim(),
  city: !p.personal.primaryResidence.city?.trim(),
  citizenship: !p.personal.citizenships.some((c) => c.trim()),
})

export const requiredComplete = (p) =>
  Object.values(missingPersonalFields(p)).every((m) => !m)

/* ---------------- Profiles ---------------- */

const emptyResidence = () => ({ country: 'United States', street: '', city: '', state: '', zip: '' })

export const blankProfile = () => ({
  shared: false,
  personal: {
    legalFirstName: 'Jonathan', // prefilled from the advisor invitation
    middleName: '',
    legalLastName: 'Reeves',
    dateOfBirth: '',
    primaryResidence: { ...emptyResidence(), city: '' },
    additionalResidences: [],
    citizenships: [''],
    email: 'jonathan.reeves@example.com',
  },
  work: { employmentStatus: '', jobTitle: '', occupation: '', employer: '', businessName: '', annualIncome: null, currency: 'USD' },
  goals: [],
  assets: [],
  liabilities: [],
  liabilitiesExplicitlyNone: false,
})

export const seedProfile = () => ({
  shared: false,
  personal: {
    legalFirstName: 'Jonathan',
    middleName: '',
    legalLastName: 'Reeves',
    dateOfBirth: '05/12/1975',
    primaryResidence: { country: 'United States', street: '145 W 67th St', city: 'New York', state: 'NY', zip: '10023' },
    additionalResidences: [],
    citizenships: ['United States'],
    email: 'jonathan.reeves@example.com',
  },
  work: { employmentStatus: 'Business owner', jobTitle: '', occupation: 'Consulting', employer: '', businessName: 'Reeves Consulting Group', annualIncome: 450000, currency: 'USD' },
  goals: [
    { id: uid(), title: 'Sell my business', targetYear: 2036, targetAmount: null, currency: 'USD' },
    { id: uid(), title: 'Move closer to the coast', targetYear: 2036, targetAmount: null, currency: 'USD' },
  ],
  assets: [
    { id: uid(), category: 'investment', subtype: 'Brokerage account', name: 'Fidelity Brokerage Account', institutionOrProvider: 'Fidelity', address: '', currency: 'USD', value: 1240500 },
    { id: uid(), category: 'retirement', subtype: 'Traditional IRA', name: 'Traditional IRA', institutionOrProvider: 'Fidelity', address: '', currency: 'USD', value: 480200 },
    { id: uid(), category: 'realestate', subtype: 'House', name: 'Austin house', institutionOrProvider: '', address: '', currency: 'USD', value: 1000000 },
    { id: uid(), category: 'collectibles', subtype: 'Art', name: 'Art collection', institutionOrProvider: '', address: '', currency: 'USD', value: null },
  ],
  liabilities: [
    { id: uid(), category: 'mortgage', name: '', lender: 'Chase', currency: 'USD', outstandingBalance: 520000, interestRate: 4.25 },
  ],
  liabilitiesExplicitlyNone: false,
})

/* ---------------- Persistence (prototype: localStorage) ---------------- */

const STORAGE_KEY = 'nevis-cif-v2'

export const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.profile?.personal) return null
    // keep generated ids ahead of any stored ones
    const ids = [...data.profile.assets, ...data.profile.liabilities, ...data.profile.goals].map((x) => x.id)
    nextId = Math.max(nextId, ...ids, 0) + 1
    return data
  } catch {
    return null
  }
}

export const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* prototype */ }
}
