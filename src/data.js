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

export const seedAssets = () => [
  { id: uid(), category: 'investment', title: 'Fidelity', subtitle: 'Brokerage account', value: 6400000 },
  { id: uid(), category: 'investment', title: 'Schwab', subtitle: 'IRA', value: 2100000 },
  { id: uid(), category: 'investment', title: 'Pension', subtitle: 'Employer pension', value: null },
  { id: uid(), category: 'realestate', title: 'Austin house', subtitle: 'Primary residence · 100% ownership', value: 4800000 },
  { id: uid(), category: 'collectibles', title: 'Art collection', subtitle: 'Paintings and prints', value: null },
  { id: uid(), category: 'crypto', title: 'Coinbase', subtitle: 'Digital assets', value: 900000 },
]

export const seedLiabilities = () => ({ answered: true, total: 800000 })
export const blankLiabilities = () => ({ answered: false, total: 0 })

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
