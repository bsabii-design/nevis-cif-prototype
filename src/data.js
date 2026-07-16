let nextId = 100
export const uid = () => nextId++

export const CATEGORIES = [
  { key: 'investment', label: 'Investment account', plural: 'Investment accounts', hint: 'Brokerage, IRA, 401(k), pension' },
  { key: 'realestate', label: 'Real estate', plural: 'Real estate', hint: 'Homes and property' },
  { key: 'collectibles', label: 'Collectibles', plural: 'Collectibles', hint: 'Art, watches, wine' },
  { key: 'crypto', label: 'Crypto', plural: 'Crypto', hint: 'Coins and wallets' },
  { key: 'other', label: 'Other', plural: 'Other', hint: 'Anything else of value' },
]

export const ACCOUNT_TYPES = ['Brokerage account', 'IRA', '401(k)', 'Pension', 'Other']
export const PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Land', 'Commercial', 'Other']
export const COLLECTIBLE_CATEGORIES = ['Art', 'Watches', 'Wine', 'Jewelry', 'Cars', 'Other']
export const LIABILITY_TYPES = ['Mortgage', 'Loan', 'Credit line', 'Other']

/* Real estate owned in part counts at the client's share; everything else at face value. */
export const effectiveValue = (a) => {
  if (a.value == null) return null
  if (a.category === 'realestate' && a.ownershipShare != null && a.ownershipShare < 100)
    return Math.round(a.value * (a.ownershipShare / 100))
  return a.value
}

export const liabilitiesTotal = (liabilities) =>
  liabilities.items.reduce((s, l) => s + (l.balance ?? 0), 0)

export const seedAssets = () => {
  const austin = {
    id: uid(), category: 'realestate',
    title: 'Austin house', subtitle: 'House',
    propertyType: 'House', ownershipShare: 100, value: 4800000,
  }
  return [
    { id: uid(), category: 'investment', title: 'Fidelity', subtitle: 'Brokerage account', institution: 'Fidelity', accountType: 'Brokerage account', value: 6400000 },
    { id: uid(), category: 'investment', title: 'Schwab', subtitle: 'IRA', institution: 'Schwab', accountType: 'IRA', value: 2100000 },
    { id: uid(), category: 'investment', title: 'Pension', subtitle: 'Employer pension', institution: 'Pension', accountType: 'Pension', value: null },
    austin,
    { id: uid(), category: 'collectibles', title: 'Art collection', subtitle: 'Art', collectibleCategory: 'Art', value: null },
    { id: uid(), category: 'crypto', title: 'Coinbase', whereHeld: 'Coinbase', value: 900000 },
  ]
}

export const seedLiabilities = (assets) => ({
  answered: true,
  items: [{
    id: uid(), type: 'Mortgage', lender: 'First Republic',
    balance: 800000, interestRate: 5.1,
    linkedAssetId: assets?.find((a) => a.category === 'realestate')?.id ?? null,
  }],
})
export const blankLiabilities = () => ({ answered: false, items: [] })

export const FOUND_ACCOUNTS = () => [
  { id: uid(), institution: 'Fidelity', accountType: 'Brokerage account', value: 1850000 },
  { id: uid(), institution: 'Fidelity', accountType: '401(k)', value: 620000 },
]

export const fmtUSD = (n) =>
  n == null ? '' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/* "1,850,000" → 1850000 ; junk/empty → null */
export const parseUSD = (s) => {
  const digits = String(s).replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}
