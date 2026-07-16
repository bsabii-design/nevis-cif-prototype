import { useRef, useState } from 'react'
import { TopBar, AssetGroups, SummaryPanel, LiabilityCard } from './components.jsx'
import { AssetEditor, LiabilityEditor } from './editors.jsx'
import { CaptureBar, BatchPanel } from './capture.jsx'
import { parseCapture } from './parse.js'
import { blankLiabilities, seedProfile, uid } from './data.js'
import { useSavedFlash } from './hooks.js'

const initial = seedProfile()

const focusFirstDraft = () =>
  setTimeout(() => {
    document.querySelector('.draft-zone .editor input, .draft-zone .editor select')?.focus()
  }, 80)

export default function App() {
  const [assets, setAssets] = useState(initial.assets)
  const [liabilities, setLiabilities] = useState(initial.liabilities)
  /* editing: null | {kind:'asset'|'liability', id: number|null} — id null means a new card */
  const [editing, setEditing] = useState(null)
  const [draftAssets, setDraftAssets] = useState([])
  const [draftLiabilities, setDraftLiabilities] = useState([])
  const [batchFiles, setBatchFiles] = useState(null)
  const [toast, setToast] = useState(null) // {msg, undo}
  const [tick, setTick] = useState(0)
  const [highlightId, setHighlightId] = useState(null)
  const saved = useSavedFlash(tick)
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

  /* ---- capture bar ---- */

  const handleCapture = (text) => {
    const parsed = parseCapture(text)
    if (parsed.assets.length) setDraftAssets((d) => [...d, ...parsed.assets])
    if (parsed.liabilities.length) setDraftLiabilities((d) => [...d, ...parsed.liabilities])
    focusFirstDraft()
  }

  const handleFiles = (names) => setBatchFiles(names.slice(0, 8))

  const applyBatch = (items) => {
    setAssets((list) => {
      let next = [...list]
      for (const item of items) {
        if (item.updateAssetId) {
          next = next.map((a) => (a.id === item.updateAssetId ? { ...a, value: item.value, currency: item.currency } : a))
        } else {
          next.push({
            id: item.id, category: 'investment',
            title: item.institution || 'Investment account', subtitle: item.accountType,
            institution: item.institution, accountType: item.accountType,
            value: item.value ?? null, currency: item.currency || 'USD',
          })
        }
      }
      return next
    })
    setBatchFiles(null)
    touch()
  }

  /* ---- drafts ---- */

  const updateDraftAsset = (built) =>
    setDraftAssets((list) => list.map((d) => (d.id === built.id ? built : d)))
  const updateDraftLiability = (built) =>
    setDraftLiabilities((list) => list.map((d) => (d.id === built.id ? built : d)))

  const maybeAddMortgageDraft = (asset, mortgage) => {
    if (mortgage && !liabilities.items.some((l) => l.linkedAssetId === asset.id)) {
      setLiabilities((l) => ({
        ...l, explicitNone: false,
        items: [...l.items, {
          id: uid(), type: 'Mortgage', lender: '', balance: null, currency: 'USD',
          interestRate: null, linkedAssetId: asset.id, draft: true,
        }],
      }))
    }
  }

  const commitDraftAsset = (built, { mortgage } = {}) => {
    setDraftAssets((list) => list.filter((d) => d.id !== built.id))
    setAssets((list) => [...list, built])
    maybeAddMortgageDraft(built, mortgage)
    touch()
  }
  const commitDraftLiability = (built) => {
    setDraftLiabilities((list) => list.filter((d) => d.id !== built.id))
    setLiabilities((l) => ({ ...l, explicitNone: false, items: [...l.items, built] }))
    touch()
  }

  const addAllAssets = () => {
    setAssets((list) => [...list, ...draftAssets])
    setDraftAssets([])
    touch()
  }
  const addAllLiabilities = () => {
    setLiabilities((l) => ({ ...l, explicitNone: false, items: [...l.items, ...draftLiabilities] }))
    setDraftLiabilities([])
    touch()
  }

  /* ---- assets ---- */

  const commitAsset = (built, { mortgage } = {}) => {
    setAssets((list) =>
      list.some((a) => a.id === built.id)
        ? list.map((a) => (a.id === built.id ? { ...a, ...built } : a))
        : [...list, built]
    )
    maybeAddMortgageDraft(built, mortgage)
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

  const clearTransient = () => {
    setEditing(null); setBatchFiles(null); setToast(null)
    setDraftAssets([]); setDraftLiabilities([])
  }
  const resetDemo = () => {
    const fresh = seedProfile()
    setAssets(fresh.assets)
    setLiabilities(fresh.liabilities)
    clearTransient()
    touch()
  }
  const blankStart = () => {
    setAssets([]); setLiabilities(blankLiabilities())
    clearTransient()
    touch()
  }

  const properties = assets.filter((a) => a.category === 'realestate')
  const editingAsset = editing?.kind === 'asset' ? editing.id : undefined
  const editingLiability = editing?.kind === 'liability' ? editing.id : undefined
  const showChips = assets.length + liabilities.items.length < 3

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
      <main
        className="content"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const names = [...(e.dataTransfer?.files || [])].map((f) => f.name)
          if (names.length) handleFiles(names)
        }}
      >
        <div className="main-col">
          <h1 className="page-title">Your net worth</h1>

          {/* ---------- What you own ---------- */}
          <section className="block">
            <div className="block-head">
              <h2 className="block-title">What you own</h2>
            </div>

            {editingAsset === null && assetEditorFor(null)}

            {draftAssets.length > 0 && (
              <div className="draft-zone">
                {draftAssets.length >= 2 && (
                  <div className="draft-actions">
                    <span className="draft-count">{draftAssets.length} ready to add</span>
                    <span className="editor-actions-spacer" />
                    <button className="btn btn-ghost" onClick={() => setDraftAssets([])}>Discard</button>
                    <button className="btn btn-secondary" onClick={addAllAssets}>Add all</button>
                  </div>
                )}
                {draftAssets.map((d) => (
                  <AssetEditor
                    key={d.id} asset={d} draft
                    onFormChange={updateDraftAsset}
                    onCommit={commitDraftAsset}
                    onDiscard={() => setDraftAssets((l) => l.filter((x) => x.id !== d.id))}
                    onRemove={() => setDraftAssets((l) => l.filter((x) => x.id !== d.id))}
                  />
                ))}
              </div>
            )}

            {assets.length === 0 && draftAssets.length === 0 && editingAsset === undefined ? (
              <p className="block-empty">What you own — nothing here yet. Use the bar below to get started.</p>
            ) : (
              <AssetGroups
                assets={assets}
                editingId={editingAsset}
                onOpen={(id) => setEditing({ kind: 'asset', id })}
                renderEditor={assetEditorFor}
                highlightId={highlightId}
              />
            )}
          </section>

          {/* ---------- What you owe ---------- */}
          <section className="block" ref={oweRef}>
            <div className="block-head">
              <h2 className="block-title">What you owe</h2>
            </div>

            {editingLiability === null && (
              <LiabilityEditor
                properties={properties}
                onCommit={commitLiability}
                onDiscard={() => setEditing(null)}
              />
            )}

            {draftLiabilities.length > 0 && (
              <div className="draft-zone">
                {draftLiabilities.length >= 2 && (
                  <div className="draft-actions">
                    <span className="draft-count">{draftLiabilities.length} ready to add</span>
                    <span className="editor-actions-spacer" />
                    <button className="btn btn-ghost" onClick={() => setDraftLiabilities([])}>Discard</button>
                    <button className="btn btn-secondary" onClick={addAllLiabilities}>Add all</button>
                  </div>
                )}
                {draftLiabilities.map((d) => (
                  <LiabilityEditor
                    key={d.id} liability={d} draft properties={properties}
                    onFormChange={updateDraftLiability}
                    onCommit={commitDraftLiability}
                    onDiscard={() => setDraftLiabilities((l) => l.filter((x) => x.id !== d.id))}
                    onRemove={() => setDraftLiabilities((l) => l.filter((x) => x.id !== d.id))}
                  />
                ))}
              </div>
            )}

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

            {liabilities.items.length === 0 && !liabilities.explicitNone &&
              draftLiabilities.length === 0 && editingLiability === undefined && (
              <>
                <p className="block-empty">What you owe — nothing here yet. Use the bar below to get started.</p>
                <button className="btn btn-secondary owe-none-btn" onClick={answerNone}>
                  I don't have any liabilities
                </button>
              </>
            )}
          </section>

          {batchFiles && (
            <BatchPanel
              key={batchFiles.join('|')}
              fileNames={batchFiles}
              assets={assets}
              onApply={applyBatch}
              onDiscard={() => setBatchFiles(null)}
            />
          )}

          <CaptureBar
            showChips={showChips}
            onSubmit={handleCapture}
            onFiles={handleFiles}
            onAddManually={() => setEditing({ kind: 'asset', id: null })}
          />
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
