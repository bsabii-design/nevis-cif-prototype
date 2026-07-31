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

/* Compact money for lists: scanning, not bookkeeping. Full values live in
   editors and details. Below $1M numbers are still short enough to read in
   full ($985,000); from 1M up they earn the shorthand — 1M+ → M · 1B+ → B,
   at most one decimal ($1.2M, never $1.24M). */
export const fmtCompact = (n, currency = 'USD') => {
  if (n == null) return ''
  const abs = Math.abs(n)
  if (abs < 1e6) return fmtMoney(n, currency)
  const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : [1e6, 'M']
  const v = (Math.round((n / div) * 10) / 10).toFixed(1).replace(/\.0$/, '')
  return `${CURRENCY_SYMBOLS[currency] ?? ''}${v}${suffix}`
}

/* "1,850,000" → 1850000 ; junk/empty → null */
export const parseAmount = (s) => {
  const digits = String(s).replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/* ---------------- Categories ---------------- */

/* Ordered by how likely a client is to hold the asset type, descending. */
export const ASSET_CATEGORIES = [
  { key: 'cash', label: 'Cash & bank accounts', single: 'Cash & bank account', add: 'bank account', cta: 'Add account', formTitle: 'Add cash or bank account' },
  { key: 'investment', label: 'Investment accounts', single: 'Investment account', add: 'investment account', cta: 'Add account', formTitle: 'Add investment account' },
  { key: 'retirement', label: 'Retirement accounts', single: 'Retirement account', add: 'retirement account', cta: 'Add account', formTitle: 'Add retirement account' },
  { key: 'realestate', label: 'Real estate', single: 'Real estate', add: 'property', cta: 'Add asset', formTitle: 'Add real estate' },
  { key: 'business', label: 'Business interests', single: 'Business interest', add: 'business interest', cta: 'Add asset', formTitle: 'Add business interest' },
  { key: 'insurance', label: 'Insurance & annuities', single: 'Insurance or annuity', add: 'policy', cta: 'Add asset', formTitle: 'Add insurance or annuity' },
  { key: 'crypto', label: 'Crypto & digital assets', single: 'Crypto or digital asset', add: 'crypto', cta: 'Add asset', formTitle: 'Add crypto or digital asset' },
  { key: 'collectibles', label: 'Art & collectibles', single: 'Art or collectible', add: 'item', cta: 'Add asset', formTitle: 'Add art or collectible' },
  { key: 'other', label: 'Other assets', single: 'Other asset', add: 'asset', cta: 'Add asset', formTitle: 'Add other asset' },
]
export const assetCategory = (key) => ASSET_CATEGORIES.find((c) => c.key === key)

export const CASH_BANK_TYPES = ['Checking', 'Savings', 'Money market', 'Certificate of deposit']

/* Banking institutions for the cash & bank account form (not investment-first). */
export const BANKS = [
  'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One',
  'U.S. Bank', 'PNC', 'Ally Bank', 'Truist', 'TD Bank', 'Fifth Third Bank', 'Citizens Bank',
]
export const INSURANCE_TYPES = ['Whole life insurance', 'Universal life insurance', 'Annuity']

/* Insurance and annuity providers. */
export const INSURANCE_PROVIDERS = [
  'New York Life', 'Northwestern Mutual', 'MassMutual', 'Prudential',
  'Pacific Life', 'Nationwide', 'Guardian Life', 'Lincoln Financial', 'Transamerica',
]

/* Crypto platforms and wallets. */
export const CRYPTO_ASSETS = ['Bitcoin', 'Ethereum', 'Solana', 'USDC', 'XRP']

export const CARD_ISSUERS = [
  'American Express', 'Chase', 'Capital One', 'Citi', 'Discover',
  'Bank of America', 'Wells Fargo', 'Barclays', 'U.S. Bank', 'Synchrony',
]

export const CRYPTO_PLATFORMS = [
  'Coinbase', 'Kraken', 'Gemini', 'Binance.US', 'Robinhood', 'Ledger', 'Trezor', 'Cold wallet',
]
export const INVESTMENT_TYPES = ['Brokerage account', 'Managed account', 'Trust account']

/* Investment-first suggestions for the investment account form. */
export const INVESTMENT_FIRMS = [
  'Fidelity', 'Vanguard', 'Charles Schwab', 'E*TRADE', 'Morgan Stanley',
  'Merrill', 'J.P. Morgan', 'Interactive Brokers', 'Robinhood', 'Betterment',
  'T. Rowe Price', 'Goldman Sachs', 'UBS', 'Edward Jones',
]

/* Retirement plan providers for the retirement account form. */
export const RETIREMENT_PROVIDERS = [
  'Fidelity', 'Vanguard', 'Charles Schwab', 'Empower', 'Principal',
  'TIAA', 'Voya', 'Merrill', 'John Hancock', 'Edward Jones',
]

export const RETIREMENT_GROUPS = [
  { label: 'Employer-sponsored plans', options: ['401(k)', '403(b)', '457(b)', 'Thrift Savings Plan (TSP)', 'Pension'] },
  { label: 'Individual retirement accounts', options: ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA'] },
  { label: 'Other', options: ['Other retirement account'] },
]
export const RETIREMENT_PLANS = RETIREMENT_GROUPS.flatMap((g) => g.options)
export const RETIREMENT_TYPES = ['401(k)', '403(b)', '457(b)', 'Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Pension']
export const PROPERTY_TYPES = ['House', 'Apartment or condo', 'Commercial property', 'Land']
export const COLLECTIBLE_TYPES = ['Art', 'Watches', 'Jewelry', 'Wine', 'Collectible vehicle']

export const LIABILITY_CATEGORIES = [
  { key: 'mortgage', label: 'Mortgage', group: 'Mortgages', add: 'mortgage', formTitle: 'Add mortgage' },
  { key: 'personal-loan', label: 'Personal loan', group: 'Personal loans', add: 'personal loan', formTitle: 'Add personal loan' },
  { key: 'business-loan', label: 'Business loan', group: 'Business loans', add: 'business loan', formTitle: 'Add business loan' },
  { key: 'credit-line', label: 'Line of credit', group: 'Credit lines', add: 'line of credit', formTitle: 'Add line of credit' },
  { key: 'credit-card', label: 'Credit card balance', group: 'Credit card balances', add: 'credit card balance', formTitle: 'Add credit card balance' },
  { key: 'other', label: 'Other debt', group: 'Other debt', add: 'debt', formTitle: 'Add other debt' },
]
export const liabilityCategory = (key) => LIABILITY_CATEGORIES.find((c) => c.key === key)

export const EMPLOYMENT_STATUSES = ['Employed', 'Self-employed', 'Business owner', 'Retired', 'Not employed']

/* ---------------- Institutions (autocomplete) ---------------- */

/* ---------------- Countries & US states (searchable selects) ---------------- */

export const COUNTRIES = [
  ['United States', 'US'], ['United Kingdom', 'GB'], ['Canada', 'CA'], ['Australia', 'AU'],
  ['Germany', 'DE'], ['France', 'FR'], ['Spain', 'ES'], ['Italy', 'IT'], ['Portugal', 'PT'],
  ['Netherlands', 'NL'], ['Belgium', 'BE'], ['Switzerland', 'CH'], ['Austria', 'AT'],
  ['Ireland', 'IE'], ['Sweden', 'SE'], ['Norway', 'NO'], ['Denmark', 'DK'], ['Finland', 'FI'],
  ['Iceland', 'IS'], ['Poland', 'PL'], ['Czech Republic', 'CZ'], ['Greece', 'GR'],
  ['Cyprus', 'CY'], ['Malta', 'MT'], ['Luxembourg', 'LU'], ['Monaco', 'MC'],
  ['Estonia', 'EE'], ['Latvia', 'LV'], ['Lithuania', 'LT'], ['Hungary', 'HU'], ['Romania', 'RO'],
  ['Bulgaria', 'BG'], ['Croatia', 'HR'], ['Slovenia', 'SI'], ['Slovakia', 'SK'],
  ['Ukraine', 'UA'], ['Georgia', 'GE'], ['Armenia', 'AM'], ['Kazakhstan', 'KZ'],
  ['Turkey', 'TR'], ['Israel', 'IL'], ['United Arab Emirates', 'AE'], ['Saudi Arabia', 'SA'],
  ['Qatar', 'QA'], ['India', 'IN'], ['Singapore', 'SG'], ['Hong Kong', 'HK'], ['Japan', 'JP'],
  ['South Korea', 'KR'], ['China', 'CN'], ['Taiwan', 'TW'], ['Thailand', 'TH'],
  ['Vietnam', 'VN'], ['Philippines', 'PH'], ['Indonesia', 'ID'], ['Malaysia', 'MY'],
  ['New Zealand', 'NZ'], ['Mexico', 'MX'], ['Brazil', 'BR'], ['Argentina', 'AR'],
  ['Chile', 'CL'], ['Colombia', 'CO'], ['Peru', 'PE'], ['Uruguay', 'UY'],
  ['South Africa', 'ZA'], ['Egypt', 'EG'], ['Morocco', 'MA'], ['Nigeria', 'NG'], ['Kenya', 'KE'],
]
export const COUNTRY_NAMES = COUNTRIES.map(([n]) => n)

/* Real flag for a recognized country: emoji from its ISO code (offline, no assets). */
export const countryFlag = (name) => {
  const hit = COUNTRIES.find(([n]) => n.toLowerCase() === (name || '').trim().toLowerCase())
  if (!hit) return null
  return String.fromCodePoint(...[...hit[1]].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
  'American Samoa', 'Guam', 'Northern Mariana Islands', 'Puerto Rico', 'U.S. Virgin Islands',
]

export const INSTITUTIONS = [
  'Fidelity', 'Vanguard', 'Charles Schwab', 'Chase', 'Morgan Stanley',
  'Goldman Sachs', 'Merrill Lynch', 'Wells Fargo', 'Bank of America', 'Citi',
  'J.P. Morgan', 'UBS', 'Edward Jones', 'T. Rowe Price', 'Betterment',
  'Robinhood', 'E*TRADE', 'Coinbase', 'Kraken', 'Gemini',
]

const AVATAR_COLORS = ['#455285', '#68457A', '#346C83', '#596625', '#AD5507', '#8F2F28']

/* Known institutions ship a real logo (bundled locally in /public/logos);
   everything else — a family trust, a private lender — falls back to the
   letter avatar. The mix is deliberate: the system supports both. */
const LOGO_FILES = {
  'fidelity': 'fidelity', 'vanguard': 'vanguard', 'charles schwab': 'schwab', 'chase': 'chase',
  'morgan stanley': 'morganstanley', 'goldman sachs': 'goldman', 'merrill': 'merrill', 'merrill lynch': 'merrill',
  'wells fargo': 'wellsfargo', 'bank of america': 'bofa', 'citi': 'citi', 'j.p. morgan': 'jpmorgan',
  'ubs': 'ubs', 'edward jones': 'edwardjones', 't. rowe price': 'trowe', 'betterment': 'betterment',
  'robinhood': 'robinhood', 'e*trade': 'etrade', 'coinbase': 'coinbase', 'kraken': 'kraken', 'gemini': 'gemini',
  'ally bank': 'ally', 'capital one': 'capitalone', 'u.s. bank': 'usbank', 'pnc': 'pnc', 'truist': 'truist',
  'td bank': 'td', 'fifth third bank': 'fifththird', 'empower': 'empower', 'principal': 'principal',
  'tiaa': 'tiaa', 'voya': 'voya', 'john hancock': 'johnhancock', 'interactive brokers': 'ibkr',
  'new york life': 'nyl', 'northwestern mutual': 'northwestern', 'massmutual': 'massmutual',
  'prudential': 'prudential', 'pacific life': 'pacificlife', 'nationwide': 'nationwide',
  'guardian life': 'guardian', 'lincoln financial': 'lincoln', 'transamerica': 'transamerica',
  'binance.us': 'binanceus', 'northern trust': 'northerntrust',
  'citi private bank': 'citi', 'tesla': 'tesla',
}

/* Every institution gets an avatar, including free-text entries.
   Color is a deterministic hash of the name: one institution, one color, everywhere. */
export const institutionAvatar = (name) => {
  const n = (name || '').trim()
  if (!n) return null
  let h = 0
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 997
  const slug = LOGO_FILES[n.toLowerCase()]
  return {
    letter: n[0].toUpperCase(),
    color: AVATAR_COLORS[h % AVATAR_COLORS.length],
    logo: slug ? (globalThis.__NEVIS_LOGOS__?.[slug] || `/logos/${slug}.png`) : null, // single-file build injects data URIs
  }
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
  const knownLiabs = liabilities.filter((l) => l.outstandingBalance != null)
  const totalLiabs = knownLiabs.reduce((s, l) => s + usdOf(l.outstandingBalance, l.currency), 0)
  const liabsAnswered = liabilities.length > 0 || none

  /* Partial-honest estimate: compute from the values we know and declare
     what was left out. '—' only when the math truly cannot run: no assets,
     no valued assets, or the liabilities question unanswered. $0 only when
     the client explicitly said there are no debts. */
  const nw = assets.length === 0 || knownAssets.length === 0 || !liabsAnswered
    ? null
    : totalAssets - totalLiabs

  return {
    nw,
    assets: {
      count: assets.length,
      known: knownAssets.length,
      total: totalAssets,
      excluded: assets.length - knownAssets.length,
    },
    liabs: {
      answered: liabsAnswered,
      none,
      count: liabilities.length,
      known: knownLiabs.length,
      total: totalLiabs,
      excluded: liabilities.length - knownLiabs.length,
    },
    /* legacy shape for older consumers */
    rows: [
      { label: 'Total assets', value: knownAssets.length === 0 ? '—' : fmtUSD(totalAssets) },
      { label: 'Total liabilities', value: !liabsAnswered ? '—' : fmtUSD(totalLiabs) },
    ],
    line: null,
  }
}

export const hasForeignValues = (profile) =>
  profile.assets.some((a) => a.value != null && (a.currency ?? 'USD') !== 'USD') ||
  profile.liabilities.some((l) => l.outstandingBalance != null && (l.currency ?? 'USD') !== 'USD')

/* ---------------- Required-before-share logic (spec §5) ---------------- */

/* MM/DD/YYYY, must be a real calendar date. */
export const isValidDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '')
  if (!m) return false
  const [, mm, dd, yyyy] = m.map(Number)
  if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false
  const d = new Date(yyyy, mm - 1, dd)
  return d.getMonth() === mm - 1 && d.getDate() === dd
}

/* 5-digit ZIP or ZIP+4, stored as text. */
export const isValidUSZip = (z) => /^\d{5}(-\d{4})?$/.test((z || '').trim())
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim())

/* Required = only what identifies the client and prepares the advisor:
   name, email, DOB, residency (country + state), citizenship.
   Street/city/ZIP are KYC-level detail — optional, gathered later. */
export const missingPersonalFields = (p) => {
  const r = p.personal.primaryResidence
  return {
    firstName: !p.personal.legalFirstName?.trim(),
    lastName: !p.personal.legalLastName?.trim(),
    email: !isValidEmail(p.personal.email),
    phone: !p.personal.phone?.trim(),
    dateOfBirth: !isValidDate(p.personal.dateOfBirth),
    country: !r.country?.trim(),
    street: !r.street?.trim(),
    city: !r.city?.trim(),
    state: r.country?.trim() === 'United States' && !r.state?.trim(),
    zip: !r.zip?.trim(),
    citizenship: !p.personal.citizenships.some((c) => c.trim()),
  }
}

/* What each section "answers" — content or an explicit deferral counts.
   Used for the sidebar state dots and the share checklist. */
export const sectionState = (p) => ({
  personal: requiredComplete(p),
  work: !!(p.work.employmentStatus || p.work.annualIncome != null || p.work.jobTitle || p.work.businessName || p.work.occupation),
  goals: p.goals.length > 0,
  networth:
    p.assets.length > 0 &&
    (p.liabilities.length > 0 || p.liabilitiesExplicitlyNone),
})

export const requiredComplete = (p) =>
  Object.values(missingPersonalFields(p)).every((m) => !m)

/* ---------------- Profiles ---------------- */

export const emptyResidence = () => ({ country: 'United States', street: '', apartment: '', city: '', state: '', zip: '' })

export const blankProfile = () => ({
  shared: false,
  personal: {
    legalFirstName: 'Jonathan', // prefilled from the advisor invitation
    middleName: '',
    legalLastName: 'Reeves',
    dateOfBirth: '',
    primaryResidence: emptyResidence(),
    additionalResidences: [],
    citizenships: [''],
    email: 'jonathan.reeves@example.com',
    phone: '',
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
    primaryResidence: { country: 'United States', street: '145 W 67th St', apartment: '', city: 'New York', state: 'NY', zip: '10023' },
    additionalResidences: [],
    citizenships: ['United States'],
    email: 'jonathan.reeves@example.com',
    phone: '(212) 555-0164',
  },
  work: { employmentStatus: 'Employed', jobTitle: 'Chief Financial Officer', occupation: '', employer: 'Tesla', businessName: '', annualIncome: 1200000, currency: 'USD' },
  /* Mirrors the Figma "Goals / With goals" frame 1:1. */
  goals: [
    { id: uid(), title: 'Retire early', preset: 'Retire early', horizon: '5–10 years', targetAmount: 8000000, currency: 'USD', note: '' },
    { id: uid(), title: 'Buy a home', preset: 'Buy a home', horizon: 'Within 5 years', targetAmount: 3500000, currency: 'USD', note: 'A second home near the coast' },
    { id: uid(), title: 'Children’s education', preset: 'Children’s education', horizon: '5–10 years', targetAmount: 2500000, currency: 'USD', note: '' },
  ],
  /* Demo dataset mirrors the Figma "Net worth / Full" frame 1:1:
     $156,970,000 = $167,820,000 valued assets − $10,850,000 liabilities,
     with two records deliberately left unvalued (Growth Portfolio, art). */
  assets: [
    { id: uid(), category: 'investment', subtype: 'Brokerage account', name: 'Family Portfolio', institutionOrProvider: 'Fidelity', address: '', currency: 'USD', value: 111200000 },
    { id: uid(), category: 'investment', subtype: 'Managed account', name: 'Growth Portfolio', institutionOrProvider: 'Betterment', address: '', currency: 'USD', value: null },
    { id: uid(), category: 'investment', subtype: 'Trust account', name: 'Family Trust', institutionOrProvider: 'Northern Trust', address: '', currency: 'USD', value: 1800000 },
    { id: uid(), category: 'retirement', subtype: '457(b)', name: 'Executive Plan', institutionOrProvider: 'Empower', address: '', currency: 'USD', value: 480000 },
    { id: uid(), category: 'retirement', subtype: '403(b)', name: 'Employer Plan', institutionOrProvider: 'Charles Schwab', address: '', currency: 'USD', value: 5000000 },
    { id: uid(), category: 'retirement', subtype: 'Roth IRA', name: 'Roth IRA', institutionOrProvider: 'Fidelity', address: '', currency: 'USD', value: 320000 },
    { id: uid(), category: 'realestate', subtype: 'House', name: 'Aspen residence', institutionOrProvider: '', address: '', currency: 'USD', value: 12500000 },
    { id: uid(), category: 'realestate', subtype: 'Apartment', name: 'Manhattan apartment', institutionOrProvider: '', address: '', currency: 'USD', value: 8800000 },
    { id: uid(), category: 'realestate', subtype: 'Land', name: 'Napa vineyard', institutionOrProvider: '', address: '', currency: 'USD', value: 1500000 },
    { id: uid(), category: 'cash', subtype: 'Checking', name: 'Personal', institutionOrProvider: 'J.P. Morgan', address: '', currency: 'USD', value: 420000 },
    { id: uid(), category: 'cash', subtype: 'Savings', name: 'Reserve', institutionOrProvider: 'Bank of America', address: '', currency: 'USD', value: 1800000 },
    { id: uid(), category: 'cash', subtype: 'Money market', name: 'Cash Management', institutionOrProvider: 'Fidelity', address: '', currency: 'USD', value: 380000 },
    { id: uid(), category: 'business', subtype: '40% ownership', name: 'Meridian Capital', institutionOrProvider: '', address: '', currency: 'USD', value: 18500000 },
    { id: uid(), category: 'crypto', subtype: 'Bitcoin', name: '', institutionOrProvider: 'Coinbase', address: '', currency: 'USD', value: 1900000 },
    { id: uid(), category: 'crypto', subtype: 'Ethereum', name: '', institutionOrProvider: 'Coinbase', address: '', currency: 'USD', value: 520000 },
    { id: uid(), category: 'collectibles', subtype: 'Art', name: 'Contemporary art collection', institutionOrProvider: '', address: '', currency: 'USD', value: null },
    { id: uid(), category: 'collectibles', subtype: 'Classic car', name: '1963 Ferrari 250 GT Lusso', institutionOrProvider: '', address: '', currency: 'USD', value: 2700000 },
  ],
  liabilities: [
    { id: uid(), category: 'mortgage', subtype: '', name: 'Manhattan apartment', lender: 'J.P. Morgan', currency: 'USD', outstandingBalance: 3600000, interestRate: 5.1 },
    { id: uid(), category: 'mortgage', subtype: '', name: 'Aspen residence', lender: 'Bank of America', currency: 'USD', outstandingBalance: 5200000, interestRate: 4.7 },
    { id: uid(), category: 'credit-line', subtype: 'Securities-backed line', name: 'Portfolio line', lender: 'Morgan Stanley', currency: 'USD', outstandingBalance: 1400000, interestRate: null },
    { id: uid(), category: 'credit-line', subtype: 'Private bank credit line', name: 'Family liquidity', lender: 'Citi Private Bank', currency: 'USD', outstandingBalance: 650000, interestRate: null },
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
