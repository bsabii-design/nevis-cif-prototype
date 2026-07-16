/* Mock NLP for the capture bar: text in → draft cards out. No AI calls. */
import { INSTITUTIONS } from './data.js'
import { buildAsset, buildLiability } from './editors.jsx'

export const VOICE_TRANSCRIPT = "I've got a pension from my old job, not sure how much is in it"

export const isQuestion = (t) =>
  /\?\s*$/.test(t.trim()) ||
  /^(should|what|how|can|do i|does|is it|would|could)\b/i.test(t.trim())

const findInstitution = (text) =>
  INSTITUTIONS.find((n) => text.toLowerCase().includes(n.toLowerCase()))

const CRYPTO_PLATFORMS = ['Coinbase', 'Kraken', 'Gemini']

/* "2 million" → 2000000, "800k" → 800000, "4.8" → 4800000 (wealth-context
   bare numbers under 100 read as millions), "1,250,000" → as written. */
const extractAmount = (clause) => {
  const cleaned = clause.replace(/401\s*\(?k\)?/gi, '').replace(/,/g, '')
  const m = cleaned.match(/\$?\s*(\d+(?:\.\d+)?)\s*(million|mil\b|m\b|k\b|thousand|grand)?/i)
  if (!m) return null
  let n = parseFloat(m[1])
  const suf = (m[2] || '').toLowerCase()
  if (suf.startsWith('m')) n *= 1e6
  else if (suf) n *= 1e3
  else if (n < 100) n *= 1e6
  return Math.round(n)
}

const parseClause = (clause) => {
  const lower = clause.toLowerCase()
  const institution = findInstitution(clause)
  const value = extractAmount(clause)

  // Liabilities first: mortgage / loan / credit line / owe
  if (/(mortgage|loan|credit line|owe|debt)/i.test(lower)) {
    const type = /mortgage/i.test(lower) ? 'Mortgage' : /credit/i.test(lower) ? 'Credit line' : 'Loan'
    return { kind: 'liability', form: { type, lender: institution || '', balance: value, currency: 'USD' } }
  }

  // Real estate
  const reKw = lower.match(/\b(house|home|apartment|condo|townhouse|property|land)\b/)
  if (reKw) {
    const typeMap = { house: 'House', home: 'House', apartment: 'Apartment', condo: 'Condo', townhouse: 'Townhouse', property: 'House', land: 'Land' }
    let name = ''
    const inLoc = clause.match(/(?:house|home|apartment|condo|property|land)\s+in\s+([A-Z][\w]+)/i)
    const preLoc = clause.match(/([A-Z][a-z]+)\s+(house|home|apartment|condo)/)
    if (inLoc) name = `${inLoc[1][0].toUpperCase()}${inLoc[1].slice(1)} ${reKw[1]}`
    else if (preLoc) name = `${preLoc[1]} ${preLoc[2]}`
    return { kind: 'asset', category: 'realestate', form: { name, propertyType: typeMap[reKw[1]], value, currency: 'USD' } }
  }

  // Crypto
  if (/(crypto|bitcoin|ethereum|btc|eth)\b/i.test(lower) || CRYPTO_PLATFORMS.includes(institution)) {
    return { kind: 'asset', category: 'crypto', form: { whereHeld: institution || '', value, currency: 'USD' } }
  }

  // Investment (incl. pension)
  const accountType =
    /pension/i.test(lower) ? 'Pension' :
    /\bira\b/i.test(lower) ? 'IRA' :
    /401/.test(lower) ? '401(k)' : 'Brokerage account'
  if (institution || accountType !== 'Brokerage account' || /(brokerage|invest|stocks|account|savings)/i.test(lower)) {
    return { kind: 'asset', category: 'investment', form: { institution: institution || '', accountType, value, currency: 'USD' } }
  }

  return null
}

/* → { assets: [asset-shaped drafts], liabilities: [liability-shaped drafts] } */
export const parseCapture = (input) => {
  const clauses = input.split(/,\s*(?:and\s+)?|\s+and\s+|;\s*/i).map((c) => c.trim()).filter(Boolean)
  const assets = []
  const liabilities = []
  for (const clause of clauses) {
    const parsed = parseClause(clause)
    if (!parsed) continue
    if (parsed.kind === 'liability') liabilities.push(buildLiability(parsed.form))
    else assets.push(buildAsset(parsed.category, parsed.form))
  }
  if (assets.length === 0 && liabilities.length === 0) {
    // Never an error: one generic draft with the text as its name.
    assets.push(buildAsset('other', { description: input.trim(), currency: 'USD' }))
  }
  return { assets, liabilities }
}

/* ---- Batch statement mocks: deterministic patterns per file index ---- */

let batchSeq = 900
export const mockFileResults = (index, existingAssets) => {
  const mk = (institution, accountType, value) =>
    ({ id: ++batchSeq, institution, accountType, value, currency: 'USD' })
  switch (index % 4) {
    case 0:
      return { found: [mk('Fidelity', 'Brokerage account', 1850000), mk('Fidelity', '401(k)', 620000)] }
    case 1:
      return { found: [mk('Vanguard', 'IRA', 1100000), mk('Fidelity', 'Brokerage account', 1850000)] }
    case 2: {
      const rows = [mk('Morgan Stanley', 'Brokerage account', 2300000)]
      const coinbase = existingAssets.find((a) => a.title === 'Coinbase')
      const upd = mk('Coinbase', 'Brokerage account', 940000)
      if (coinbase) { upd.updateAssetId = coinbase.id; upd.updateTitle = coinbase.title }
      rows.push(upd)
      return { found: rows }
    }
    default:
      return { unreadable: true }
  }
}
