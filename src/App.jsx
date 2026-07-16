import { useState } from 'react'
import { TopBar, AssetGroups, SummaryPanel, EmptyState } from './components.jsx'
import { AddAssetDrawer, UploadDrawer } from './drawers.jsx'
import { seedAssets, seedLiabilities, blankLiabilities } from './data.js'
import { useSavedFlash } from './hooks.js'

export default function App() {
  const [assets, setAssets] = useState(seedAssets)
  const [liabilities, setLiabilities] = useState(seedLiabilities)
  const [drawer, setDrawer] = useState(null) // 'add' | 'upload' | null
  const [tick, setTick] = useState(0)
  const [highlightId, setHighlightId] = useState(null)
  const saved = useSavedFlash(tick)
  const touch = () => setTick((t) => t + 1)

  const changeValue = (id, value) => {
    setAssets((list) => list.map((a) => (a.id === id ? { ...a, value } : a)))
    touch()
  }
  const addAssets = (items) => {
    setAssets((list) => [...list, ...items])
    setDrawer(null)
    touch()
  }
  const showMissing = () => {
    const first = assets.find((a) => a.value == null)
    if (!first) return
    setHighlightId(first.id)
    document.getElementById('asset-' + first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightId(null), 1800)
  }

  const resetDemo = () => { setAssets(seedAssets()); setLiabilities(seedLiabilities()); touch() }
  const blankStart = () => { setAssets([]); setLiabilities(blankLiabilities()); touch() }

  return (
    <>
      <TopBar saved={saved} clientName="Jonathan Reeves" />
      <main className="content">
        <div className="main-col">
          <div className="main-head">
            <h1 className="page-title">Your assets</h1>
            {assets.length > 0 && (
              <div className="main-actions">
                <button className="btn btn-secondary" onClick={() => setDrawer('upload')}>
                  Upload statement
                </button>
                <button className="btn btn-primary" onClick={() => setDrawer('add')}>
                  Add asset
                </button>
              </div>
            )}
          </div>
          {assets.length === 0 ? (
            <EmptyState onAdd={() => setDrawer('add')} onUpload={() => setDrawer('upload')} />
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
      {drawer === 'add' && <AddAssetDrawer onSave={(a) => addAssets([a])} onClose={() => setDrawer(null)} />}
      {drawer === 'upload' && <UploadDrawer onAdd={addAssets} onClose={() => setDrawer(null)} />}
    </>
  )
}
