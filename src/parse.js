/* Mocked AI: goals text → goal cards, statement → extracted accounts. */
import { uid } from './model.js'

/* ---------------- Goals parsing (spec §11) ---------------- */

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20 }
const THIS_YEAR = new Date().getFullYear()

const sentenceCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

const cleanTitle = (clause) =>
  sentenceCase(
    clause
      .replace(/^(i['’]d like to|i['’]d love to|i want to|i hope to|i plan to|we['’]d like to|we want to|and|also)\s+/i, '')
      .replace(/\s+for (?:about|around)?\s*\$?\d[\w,.]*/i, '')
      .replace(/\s+in about .*$/i, '')
      .replace(/\s+(?:by|in)\s+\d{4}.*$/i, '')
      .replace(/[.?!]\s*$/, '')
      .trim()
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
