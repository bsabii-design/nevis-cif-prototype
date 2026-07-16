let nextId = 100
export const uid = () => nextId++

export const CATEGORIES = [
  { key: 'investment', label: 'Investment account', plural: 'Investment accounts' },
  { key: 'realestate', label: 'Real estate', plural: 'Real estate' },
  { key: 'collectibles', label: 'Collectibles', plural: 'Collectibles' },
  { key: 'crypto', label: 'Crypto', plural: 'Crypto' },
  { key: 'other', label: 'Other', plural: 'Other' },
]

export const ACCOUNT_TYPES = ['Brokerage account', 'IRA', '401(k)', 'Pension', 'Other']

/* Mock list of major US institutions for the autocomplete. Free text is always allowed. */
export const INSTITUTIONS = [
  'Fidelity', 'Vanguard', 'Charles Schwab', 'Chase', 'Morgan Stanley',
  'Goldman Sachs', 'Merrill Lynch', 'Wells Fargo', 'Bank of America', 'Citi',
  'J.P. Morgan', 'UBS', 'Edward Jones', 'T. Rowe Price', 'Betterment',
  'Robinhood', 'E*TRADE', 'Coinbase', 'Kraken', 'Gemini',
]

/* Letter-avatar colors: Nevis swatch strongs (readable with white text). */
const AVATAR_COLORS = ['#455285', '#68457A', '#346C83', '#596625', '#AD5507', '#8F2F28']

export const institutionAvatar = (name) => {
  if (!name) return null
  const match = INSTITUTIONS.find((n) => n.toLowerCase() === name.trim().toLowerCase())
  if (!match) return null
  let h = 0
  for (const c of match) h = (h * 31 + c.charCodeAt(0)) % 997
  return { letter: match[0].toUpperCase(), color: AVATAR_COLORS[h % AVATAR_COLORS.length] }
}
export const PROPERTY_TYPES = ['House', 'Apartment', 'Condo', 'Townhouse', 'Land', 'Commercial', 'Other']
export const COLLECTIBLE_CATEGORIES = ['Art', 'Watches', 'Wine', 'Jewelry', 'Cars', 'Other']
export const LIABILITY_TYPES = ['Mortgage', 'Loan', 'Credit line', 'Other']

/* ---- Currency (minimal). Demo rates, hardcoded on purpose. ---- */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'JPY']
export const RATES_TO_USD = { USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12, CAD: 0.73, JPY: 0.0067 }
export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', CAD: 'CA$', JPY: '¥' }

export const usdOf = (amount, currency = 'USD') =>
  amount == null ? null : Math.round(amount * (RATES_TO_USD[currency] ?? 1))

/* What an asset contributes to net worth, in USD:
   converted at the demo rate, then reduced to the client's ownership share. */
export const effectiveUSD = (a) => {
  if (a.value == null) return null
  let usd = usdOf(a.value, a.currency)
  if (a.category === 'realestate' && a.ownershipShare != null && a.ownershipShare < 100)
    usd = Math.round(usd * (a.ownershipShare / 100))
  return usd
}

/* Original-currency value at the client's share (for card display). */
export const shareValue = (a) => {
  if (a.value == null) return null
  if (a.category === 'realestate' && a.ownershipShare != null && a.ownershipShare < 100)
    return Math.round(a.value * (a.ownershipShare / 100))
  return a.value
}

export const liabilitiesTotalUSD = (liabilities) =>
  liabilities.items.reduce((s, l) => s + (usdOf(l.balance, l.currency) ?? 0), 0)

export const hasForeignValues = (assets, liabilities) =>
  assets.some((a) => a.value != null && (a.currency ?? 'USD') !== 'USD') ||
  liabilities.items.some((l) => l.balance != null && (l.currency ?? 'USD') !== 'USD')

/* ---- Formatting ---- */

export const fmtMoney = (n, currency = 'USD') =>
  n == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export const fmtUSD = (n) => fmtMoney(n, 'USD')

/* "1,850,000" → 1850000 ; junk/empty → null */
export const parseAmount = (s) => {
  const digits = String(s).replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/* ---- Seed data ---- */

export const seedAssets = () => [
  { id: uid(), category: 'investment', title: 'Fidelity', subtitle: 'Brokerage account', institution: 'Fidelity', accountType: 'Brokerage account', value: 6400000, currency: 'USD' },
  { id: uid(), category: 'investment', title: 'Pension', subtitle: 'Employer pension', institution: 'Pension', accountType: 'Pension', value: null, currency: 'USD' },
  { id: uid(), category: 'realestate', title: 'Austin house', subtitle: 'House', propertyType: 'House', ownershipShare: 100, value: 4800000, currency: 'USD' },
  { id: uid(), category: 'realestate', title: 'Barcelona apartment', subtitle: 'Apartment', propertyType: 'Apartment', ownershipShare: 100, value: 850000, currency: 'EUR' },
  { id: uid(), category: 'collectibles', title: 'Art collection', subtitle: 'Art', collectibleCategory: 'Art', value: null, currency: 'USD' },
  { id: uid(), category: 'crypto', title: 'Coinbase', whereHeld: 'Coinbase', value: 900000, currency: 'USD' },
]

export const seedProfile = () => {
  const assets = seedAssets()
  return {
    assets,
    liabilities: {
      explicitNone: false,
      items: [{
        id: uid(), type: 'Mortgage', lender: 'First Republic',
        balance: 800000, currency: 'USD', interestRate: '5.1',
        linkedAssetId: assets.find((a) => a.title === 'Austin house')?.id ?? null,
      }],
    },
  }
}
export const blankLiabilities = () => ({ explicitNone: false, items: [] })

export const liabilitiesAnswered = (l) => l.explicitNone || l.items.length > 0

export const FOUND_ACCOUNTS = () => [
  { id: uid(), institution: 'Fidelity', accountType: 'Brokerage account', value: 1850000, currency: 'USD' },
  { id: uid(), institution: 'Fidelity', accountType: '401(k)', value: 620000, currency: 'USD' },
]
