import { useState } from 'react'
import { TopBar, AssetGroups, SummaryPanel, EmptyState } from './components.jsx'
import { AddAssetsDrawer } from './drawers.jsx'
import { seedAssets, seedLiabilities, blankLiabilities, uid } from './data.js'
import { useSavedFlash } from './hooks.js'

export default function App() {
  const [assets, setAssets] = useState(seedAssets)
  const [liabilities, setLiabilities] = useState(() => seedLiabilities())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [highlightId, setHighlightId] = useState(null)
  const saved = useSavedFlash(tick)
  const touch = () => setTick((t) => t + 1)

  const changeValue = (id, value) => {
    setAssets((list) => list.map((a) => (a.id === id ? { ...a, value } : a)))
    touch()
  }

  const saveAsset = (asset, { mortgage } = {}) => {
    setAssets((list) => [...list, asset])
    if (mortgage) {
      // Draft mortgage linked to the property; completed on the Liabilities screen.
      setLiabilities((l) => ({
        ...l,
        items: [...l.items, {
          id: uid(), type: 'Mortgage', lender: '',
          balance: null, interestRate: null,
          linkedAssetId: asset.id, draft: true,
        }],
      }))
    }
    setDrawerOpen(false)
    touch()
  }

  const addAccounts = (items) => {
    setAssets((list) => [...list, ...items])
    setDrawerOpen(false)
    touch()
  }

  const showMissing = () => {
    const first = assets.find((a) => a.value == null)
    if (!first) return
    setHighlightId(first.id)
    document.getElementById('asset-' + first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightId(null), 1800)
  }

  const resetDemo = () => {
    const a = seedAssets()
    setAssets(a)
    setLiabilities(seedLiabilities(a))
    touch()
  }
  const blankStart = () => { setAssets([]); setLiabilities(blankLiabilities()); touch() }

  return (
    <>
      <TopBar saved={saved} clientName="Jonathan Reeves" />
      <main className="content">
        <div className="main-col">
          <div className="main-head">
            <h1 className="page-title">Your assets</h1>
            {assets.length > 0 && (
              <button className="btn btn-primary" onClick={() => setDrawerOpen(true)}>
                Add assets
              </button>
            )}
          </div>
          {assets.length === 0 ? (
            <EmptyState onAdd={() => setDrawerOpen(true)} />
          ) : (
            <AssetGroups assets={assets} onChangeValue={changeValue} highlightId={highlightId} />
          )}
        </div>
        <SummaryPanel assets={assets} liabilities={liabilities} onShowMissing={showMissing} />
      </main>
      <footer className="footer">
        <button className="footer-link" onClick={resetDemo}>Reset demo</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={blankStart}>Blank start</button>
      </footer>
      {drawerOpen && (
        <AddAssetsDrawer
          onSaveAsset={saveAsset}
          onAddAccounts={addAccounts}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  )
}
