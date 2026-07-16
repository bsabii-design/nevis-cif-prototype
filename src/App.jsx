import { useRef, useState } from 'react'
import { TopBar, AssetGroups, SummaryPanel, EmptyAssets, LiabilityCard } from './components.jsx'
import { AssetEditor, LiabilityEditor, ImportResult } from './editors.jsx'
import { FOUND_ACCOUNTS, blankLiabilities, seedProfile, uid } from './data.js'
import { useSavedFlash } from './hooks.js'

const initial = seedProfile()

export default function App() {
  const [assets, setAssets] = useState(initial.assets)
  const [liabilities, setLiabilities] = useState(initial.liabilities)
  /* editing: null | {kind:'asset'|'liability', id: number|null} — id null means a new card */
  const [editing, setEditing] = useState(null)
  const [importStage, setImportStage] = useState(null) // null | 'processing' | 'result'
  const [foundAccounts, setFoundAccounts] = useState([])
  const [toast, setToast] = useState(null) // {msg, undo}
  const [tick, setTick] = useState(0)
  const [highlightId, setHighlightId] = useState(null)
  const saved = useSavedFlash(tick)
  const fileRef = useRef(null)
  const oweRef = useRef(null)
  const toastTimer = useRef(null)
  const touch = () => setTick((t) => t + 1)

  const showToast = (msg, undo) => {
    clearTimeout(toastTimer.current)
    setToast({ msg, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }
  const handleUndo = () => {
    toast?.undo()
    clearTimeout(toastTimer.current)
    setToast(null)
    touch()
  }

  /* ---- assets ---- */

  const commitAsset = (built, { mortgage } = {}) => {
    setAssets((list) =>
      list.some((a) => a.id === built.id)
        ? list.map((a) => (a.id === built.id ? { ...a, ...built } : a))
        : [...list, built]
    )
    if (mortgage && !liabilities.items.some((l) => l.linkedAssetId === built.id)) {
      // Draft mortgage linked to the property; completed under What you owe.
      setLiabilities((l) => ({
        ...l,
        explicitNone: false,
        items: [...l.items, {
          id: uid(), type: 'Mortgage', lender: '',
          balance: null, currency: 'USD', interestRate: null,
          linkedAssetId: built.id, draft: true,
        }],
      }))
    }
    setEditing(null)
    touch()
  }

  const removeAsset = (id) => {
    const index = assets.findIndex((a) => a.id === id)
    const item = assets[index]
    setAssets((list) => list.filter((a) => a.id !== id))
    setEditing(null)
    showToast(`${item.title} removed`, () =>
      setAssets((list) => {
        const next = [...list]
        next.splice(Math.min(index, next.length), 0, item)
        return next
      })
    )
    touch()
  }

  /* ---- liabilities ---- */

  const commitLiability = (built) => {
    setLiabilities((l) => ({
      ...l,
      explicitNone: false,
      items: l.items.some((it) => it.id === built.id)
        ? l.items.map((it) => (it.id === built.id ? { ...it, ...built, draft: false } : it))
        : [...l.items, built],
    }))
    setEditing(null)
    touch()
  }

  const removeLiability = (id) => {
    const index = liabilities.items.findIndex((it) => it.id === id)
    const item = liabilities.items[index]
    setLiabilities((l) => ({ ...l, items: l.items.filter((it) => it.id !== id) }))
    setEditing(null)
    showToast(`${item.type} removed`, () =>
      setLiabilities((l) => {
        const next = [...l.items]
        next.splice(Math.min(index, next.length), 0, item)
        return { ...l, items: next }
      })
    )
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
    setEditing(null); setImportStage(null); setToast(null)
    touch()
  }
  const blankStart = () => {
    setAssets([]); setLiabilities(blankLiabilities())
    setEditing(null); setImportStage(null); setToast(null)
    touch()
  }

  const properties = assets.filter((a) => a.category === 'realestate')
  const editingAsset = editing?.kind === 'asset' ? editing.id : undefined
  const editingLiability = editing?.kind === 'liability' ? editing.id : undefined

  const assetEditorFor = (asset) => (
    <AssetEditor
      asset={asset}
      onCommit={commitAsset}
      onDiscard={() => setEditing(null)}
      onRemove={asset ? () => removeAsset(asset.id) : undefined}
    />
  )

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

            {assets.length === 0 && editingAsset === undefined ? (
              <EmptyAssets onAdd={() => setEditing({ kind: 'asset', id: null })} />
            ) : (
              <AssetGroups
                assets={assets}
                editingId={editingAsset}
                onOpen={(id) => setEditing({ kind: 'asset', id })}
                renderEditor={assetEditorFor}
                highlightId={highlightId}
              />
            )}

            {editingAsset === null ? (
              assetEditorFor(null)
            ) : (
              assets.length > 0 && (
                <button className="add-row" onClick={() => setEditing({ kind: 'asset', id: null })}>
                  + Add an asset
                </button>
              )
            )}
          </section>

          {/* ---------- What you owe ---------- */}
          <section className="block" ref={oweRef}>
            <div className="block-head">
              <h2 className="block-title">What you owe</h2>
            </div>

            {liabilities.items.length > 0 && (
              <div className="group">
                {liabilities.items.map((l) =>
                  l.id === editingLiability ? (
                    <LiabilityEditor
                      key={l.id} liability={l} properties={properties}
                      onCommit={commitLiability}
                      onDiscard={() => setEditing(null)}
                      onRemove={() => removeLiability(l.id)}
                    />
                  ) : (
                    <LiabilityCard
                      key={l.id} liability={l} assets={assets}
                      onOpen={() => setEditing({ kind: 'liability', id: l.id })}
                    />
                  )
                )}
              </div>
            )}

            {liabilities.explicitNone && (
              <p className="owe-none">
                No liabilities — this counts as $0 in your net worth.{' '}
                <button className="link" onClick={() => setEditing({ kind: 'liability', id: null })}>
                  Actually, add a liability
                </button>
              </p>
            )}

            {editingLiability === null ? (
              <LiabilityEditor
                properties={properties}
                onCommit={commitLiability}
                onDiscard={() => setEditing(null)}
              />
            ) : (
              !liabilities.explicitNone && (
                <div className="owe-actions">
                  <button className="add-row" onClick={() => setEditing({ kind: 'liability', id: null })}>
                    + Add a liability
                  </button>
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
      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg} ·</span>
          <button className="link" onClick={handleUndo}>Undo</button>
        </div>
      )}
    </>
  )
}
