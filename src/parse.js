/* Mocked AI: goals text → goal cards, statement → extracted accounts. */
import { BANKS, INSTITUTIONS, INVESTMENT_FIRMS, RETIREMENT_PROVIDERS, uid } from './model.js'

/* ---------------- Goals parsing (spec §11) ---------------- */

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20 }
const THIS_YEAR = new Date().getFullYear()

const sentenceCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/* People sometimes type in ALL CAPS — never render it back at them. */
const normalizeCase = (s) => {
  const letters = s.replace(/[^a-zA-Z]/g, '')
  return letters.length >= 4 && letters === letters.toUpperCase() ? s.toLowerCase() : s
}

const cleanTitle = (clause) =>
  sentenceCase(
    normalizeCase(
      clause
        .replace(/^(i['’]d like to|i['’]d love to|i want to|i hope to|i plan to|we['’]d like to|we want to|and|also)\s+/i, '')
        .replace(/\s+for (?:about|around)?\s*\$?\d[\w,.]*/i, '')
        .replace(/\s+in about .*$/i, '')
        .replace(/\s+(?:by|in)\s+\d{4}.*$/i, '')
        .replace(/[.?!]\s*$/, '')
        .trim()
    )
  )

const extractYear = (clause) => {
  const explicit = clause.match(/\b(20\d\d)\b/)
  if (explicit) return Number(explicit[1])
  const inYears = clause.match(/in about (\w+) years?|in (\w+) years?/i)
  if (inYears) {
    const w = (inYears[1] || inYears[2] || '').toLowerCase()
    const n = WORD_NUMBERS[w] ?? (Number(w) || null)
    if (n) return THIS_YEAR + n
  }
  return null
}

const extractGoalAmount = (clause) => {
  const m = clause.replace(/,/g, '').match(/\$\s*(\d+(?:\.\d+)?)\s*(million|m\b|k\b)?/i)
  if (!m) return null
  let n = parseFloat(m[1])
  const suf = (m[2] || '').toLowerCase()
  if (suf.startsWith('m')) n *= 1e6
  else if (suf === 'k') n *= 1e3
  return Math.round(n)
}

/* Years-out -> soft horizon bucket. Precise dates are advisor work, not client homework. */
const horizonFromYear = (year) => {
  if (year == null) return null
  const n = year - THIS_YEAR
  return n <= 5 ? 'Within 5 years' : n <= 10 ? '5–10 years' : '10+ years'
}

export const parseGoals = (text) => {
  // The demo sentence maps to the exact goals from the spec.
  if (/sell my business/i.test(text) && /coast/i.test(text) && /college/i.test(text)) {
    return [
      { id: uid(), title: 'Sell my business', horizon: '5–10 years', targetAmount: null, currency: 'USD', note: 'sell my business in about ten years' },
      { id: uid(), title: 'Move closer to the coast', horizon: '5–10 years', targetAmount: null, currency: 'USD', note: 'move closer to the coast' },
      { id: uid(), title: "Help pay for my children's college", horizon: null, targetAmount: null, currency: 'USD', note: "help pay for my children's college" },
    ]
  }
  const clauses = text.split(/,\s*(?:and\s+)?|\s+and\s+|\.\s+|;\s*/i).map((c) => c.trim()).filter(Boolean)
  const goals = clauses
    .map((clause) => {
      const title = cleanTitle(clause)
      if (!title || title.length < 3) return null
      return { id: uid(), title, horizon: horizonFromYear(extractYear(clause)), targetAmount: extractGoalAmount(clause), currency: 'USD', note: clause }
    })
    .filter(Boolean)
  return goals.length ? goals : [{ id: uid(), title: sentenceCase(text.trim()), horizon: null, targetAmount: null, currency: 'USD', note: text.trim() }]
}

/* ---------------- Statement extraction (spec §17–18) ---------------- */

export const MOCK_STATEMENT_NAME = 'Fidelity_statement.pdf'

export const extractedAccounts = () => [
  { id: uid(), title: 'Fidelity Brokerage Account', institution: 'Fidelity', accountType: 'Brokerage account', category: 'investment', value: 1240500, currency: 'USD' },
  { id: uid(), title: 'Traditional IRA', institution: 'Fidelity', accountType: 'Traditional IRA', category: 'retirement', value: 480200, currency: 'USD' },
]

/* ---------------- Describe-your-accounts parsing (mock) ----------------
   "Fidelity brokerage around $1.2M, Chase checking $40K and a Vanguard
   Roth IRA about $250K" -> extracted accounts for the same review stage. */

const ALL_INSTITUTIONS = [...new Set([...BANKS, ...INVESTMENT_FIRMS, ...RETIREMENT_PROVIDERS, ...INSTITUTIONS])]

/* Shorthand people actually write -> canonical dictionary name */
const INSTITUTION_ALIASES = {
  schwab: 'Charles Schwab', boa: 'Bank of America', bofa: 'Bank of America',
  citibank: 'Citi', amex: 'American Express', etrade: 'E*TRADE',
  jpmorgan: 'J.P. Morgan', 'jp morgan': 'J.P. Morgan', ally: 'Ally Bank',
}

const TYPE_PATTERNS = [
  [/roth\s*ira/i, 'Roth IRA'], [/traditional\s*ira/i, 'Traditional IRA'],
  [/sep\s*ira/i, 'SEP IRA'], [/\bira\b/i, 'Traditional IRA'],
  [/40[13]\s*\(?k\)?/i, '401(k)'], [/403\s*\(?b\)?/i, '403(b)'], [/457/i, '457(b)'],
  [/pension/i, 'Pension'],
  [/brokerage/i, 'Brokerage account'], [/managed/i, 'Managed account'], [/trust/i, 'Trust account'],
  [/checking/i, 'Checking'], [/savings/i, 'Savings'], [/money\s*market/i, 'Money market'],
  [/\bcds?\b|certificate/i, 'Certificate of deposit'],
]

const extractAccountAmount = (clause) => {
  const masked = clause.replace(/40[13]\s*\(?[kb]\)?|457\s*\(?b\)?/gi, ' ')
  const m = masked.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?\b/i)
  if (!m) return null
  if (!/[$km]|million|thousand/i.test(m[0]) && Number(m[1]) < 1000) return null
  let n = parseFloat(m[1])
  const suf = (m[2] || '').toLowerCase()
  if (suf.startsWith('m')) n *= 1e6
  else if (suf) n *= 1e3
  return Math.round(n)
}

export const parseAccountsText = (text) => {
  const clauses = text.split(/,\s*(?:and\s+)?|\s+and\s+|\.\s+|;\s*/i).map((c) => c.trim()).filter(Boolean)
  const accounts = []
  for (const clause of clauses) {
    const lower = clause.toLowerCase()
    const inst = ALL_INSTITUTIONS.find((n) => lower.includes(n.toLowerCase()))
      || INSTITUTION_ALIASES[Object.keys(INSTITUTION_ALIASES).find((a) => lower.includes(a))]
      || ''
    const type = (TYPE_PATTERNS.find(([re]) => re.test(clause)) || [])[1] || ''
    const value = extractAccountAmount(clause)
    if (!inst && !type && value == null) continue
    accounts.push({
      id: uid(),
      title: [inst, type.replace(/ account$/i, '')].filter(Boolean).join(' ') || 'Account',
      institution: inst,
      accountType: type || 'Brokerage account',
      value,
      currency: 'USD',
    })
  }
  return accounts
}
