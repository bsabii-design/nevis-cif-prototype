import { useRef, useState } from 'react'
import { TopBar, AssetGroups, SummaryPanel, EmptyAssets, LiabilityCard } from './components.jsx'
import { InlineAssetEditor, InlineLiabilityEditor, ImportResult } from './editors.jsx'
import { FOUND_ACCOUNTS, blankLiabilities, seedProfile, uid } from './data.js'
import { useSavedFlash } from './hooks.js'

const initial = seedProfile()

export default function App() {
  const [assets, setAssets] = useState(initial.assets)
  const [liabilities, setLiabilities] = useState(initial.liabilities)
  const [addingAsset, setAddingAsset] = useState(false)
  const [addingLiability, setAddingLiability] = useState(false)
  const [importStage, setImportStage] = useState(null) // null | 'processing' | 'result'
  const [foundAccounts, setFoundAccounts] = useState([])
  const [tick, setTick] = useState(0)
  const [highlightId, setHighlightId] = useState(null)
  const saved = useSavedFlash(tick)
  const fileRef = useRef(null)
  const oweRef = useRef(null)
  const touch = () => setTick((t) => t + 1)

  /* ---- assets ---- */

  const changeValue = (id, value) => {
    setAssets((list) => list.map((a) => (a.id === id ? { ...a, value } : a)))
    touch()
  }

  const saveAsset = (asset, { mortgage } = {}) => {
    setAssets((list) => [...list, asset])
    if (mortgage) {
      // Draft mortgage linked to the property; completed under What you owe.
      setLiabilities((l) => ({
        ...l,
        explicitNone: false,
        items: [...l.items, {
          id: uid(), type: 'Mortgage', lender: '',
          balance: null, currency: 'USD', interestRate: null,
          linkedAssetId: asset.id, draft: true,
        }],
      }))
    }
    setAddingAsset(false)
    touch()
  }

  /* ---- liabilities ---- */

  const changeBalance = (id, balance) => {
    setLiabilities((l) => ({
      ...l,
      items: l.items.map((it) => (it.id === id ? { ...it, balance } : it)),
    }))
    touch()
  }

  const saveLiability = (item) => {
    setLiabilities((l) => ({ ...l, explicitNone: false, items: [...l.items, item] }))
    setAddingLiability(false)
    touch()
  }

  const answerNone = () => {
    setLiabilities({ explicitNone: true, items: [] })
    touch()
  }

  /* ---- statement import ---- */

  const startImport = () => {
    setImportStage('processing')
    setTimeout(() => {
      setFoundAccounts(FOUND_ACCOUNTS())
      setImportStage('result')
    }, 1600)
  }

  const setAccount = (id, k, v) =>
    setFoundAccounts((list) => list.map((a) => (a.id === id ? { ...a, [k]: v } : a)))

  const addFoundAccounts = () => {
    setAssets((list) => [
      ...list,
      ...foundAccounts.map((a) => ({
        id: a.id, category: 'investment',
        title: a.institution || 'Investment account', subtitle: a.accountType,
        institution: a.institution, accountType: a.accountType,
        value: a.value ?? null, currency: a.currency || 'USD',
      })),
    ])
    setImportStage(null)
    touch()
  }

  /* ---- misc ---- */

  const showMissing = () => {
    const first = assets.find((a) => a.value == null)
    if (!first) return
    setHighlightId(first.id)
    document.getElementById('asset-' + first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightId(null), 1800)
  }

  const goToLiabilities = () =>
    oweRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const resetDemo = () => {
    const fresh = seedProfile()
    setAssets(fresh.assets)
    setLiabilities(fresh.liabilities)
    setAddingAsset(false); setAddingLiability(false); setImportStage(null)
    touch()
  }
  const blankStart = () => {
    setAssets([]); setLiabilities(blankLiabilities())
    setAddingAsset(false); setAddingLiability(false); setImportStage(null)
    touch()
  }

  const properties = assets.filter((a) => a.category === 'realestate')

  return (
    <>
      <TopBar saved={saved} clientName="Jonathan Reeves" />
      <main className="content">
        <div className="main-col">
          <h1 className="page-title">Your net worth</h1>

          {/* ---------- What you own ---------- */}
          <section className="block">
            <div className="block-head">
              <h2 className="block-title">What you own</h2>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                Import statement
              </button>
              <input ref={fileRef} type="file" accept=".pdf" hidden onChange={startImport} />
            </div>
            <p className="block-helper">
              Statements save typing — we'll read account names and balances for you.
            </p>

            {importStage === 'processing' && (
              <div className="processing">
                <span className="spinner" aria-hidden="true" />
                <span className="processing-text">Reading your statement…</span>
              </div>
            )}
            {importStage === 'result' && (
              <ImportResult
                accounts={foundAccounts} setAccount={setAccount}
                onAdd={addFoundAccounts} onDiscard={() => setImportStage(null)}
              />
            )}

            {assets.length === 0 && !addingAsset ? (
              <EmptyAssets onAdd={() => setAddingAsset(true)} />
            ) : (
              <AssetGroups assets={assets} onChangeValue={changeValue} highlightId={highlightId} />
            )}

            {addingAsset ? (
              <InlineAssetEditor onSave={saveAsset} onCancel={() => setAddingAsset(false)} />
            ) : (
              assets.length > 0 && (
                <button className="add-row" onClick={() => setAddingAsset(true)}>+ Add an asset</button>
              )
            )}
          </section>

          {/* ---------- What you owe ---------- */}
          <section className="block" ref={oweRef}>
            <div className="block-head">
              <h2 className="block-title">What you owe</h2>
            </div>

            {liabilities.items.length > 0 && (
              <div className="groups">
                <div className="group">
                  {liabilities.items.map((l) => (
                    <LiabilityCard
                      key={l.id} liability={l} assets={assets}
                      onChangeBalance={(v) => changeBalance(l.id, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {liabilities.explicitNone && (
              <p className="owe-none">
                No liabilities — this counts as $0 in your net worth.{' '}
                <button className="link" onClick={() => setAddingLiability(true)}>
                  Actually, add a liability
                </button>
              </p>
            )}

            {addingLiability ? (
              <InlineLiabilityEditor
                properties={properties}
                onSave={saveLiability} onCancel={() => setAddingLiability(false)}
              />
            ) : (
              !liabilities.explicitNone && (
                <div className="owe-actions">
                  <button className="add-row" onClick={() => setAddingLiability(true)}>+ Add a liability</button>
                  {liabilities.items.length === 0 && (
                    <button className="btn btn-secondary" onClick={answerNone}>
                      I don't have any liabilities
                    </button>
                  )}
                </div>
              )
            )}
          </section>
        </div>

        <SummaryPanel
          assets={assets} liabilities={liabilities}
          onShowMissing={showMissing} onGoToLiabilities={goToLiabilities}
        />
      </main>
      <footer className="footer">
        <button className="footer-link" onClick={resetDemo}>Reset demo</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={blankStart}>Blank start</button>
      </footer>
    </>
  )
}
