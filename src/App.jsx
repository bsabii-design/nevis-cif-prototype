import { useCallback, useEffect, useRef, useState } from 'react'
import { assetTitle, blankProfile, loadState, requiredComplete, saveState, seedProfile } from './model.js'
import { Dialog } from './ui.jsx'
import { Sidebar, TopBar } from './components.jsx'
import { AssetPanel, LiabilityModal } from './forms.jsx'
import { Goals, NetWorth, Personal, Welcome, Work } from './screens.jsx'
import { InputLab } from './inputlab.jsx'
import { useSavedFlash } from './hooks.js'

const LEAVE_COPY = {
  asset: { title: 'Leave without adding this asset?', body: 'Your entries will be lost.' },
  'asset-edit': { title: 'Leave without saving changes?', body: 'Your changes will be lost.' },
  extract: { title: 'Leave without adding these accounts?', body: 'Your changes will be lost.', stay: 'Keep reviewing' },
}

const NAV_KEY_FOR_ROUTE = {
  personal: 'personal', work: 'work', goals: 'goals', networth: 'networth',
}

/* Sequential bottom navigation per section. */
const FOOTER_NAV = {
  personal: { next: 'work' },
  work: { back: 'personal', next: 'goals' },
  goals: { back: 'work', next: 'networth' },
  networth: { back: 'goals' },
}

const MAIN_SECTIONS = ['personal', 'work', 'goals', 'networth']

export default function App() {
  const [state] = useState(() => loadState())
  const [profile, setProfile] = useState(() => state?.profile ?? seedProfile())
  const [seenWelcome, setSeenWelcome] = useState(() => state?.seenWelcome ?? true)
  const [route, setRoute] = useState(() => {
    if (!(state?.seenWelcome ?? true)) return { name: 'welcome' }
    const last = state?.lastSection
    return MAIN_SECTIONS.includes(last)
      ? (last === 'networth' ? { name: 'networth', tab: 'assets' } : { name: last })
      : { name: 'personal' }
  })
  const [tick, setTick] = useState(0)
  const [leaveDialog, setLeaveDialog] = useState(null)   // {kind, to}
  const [objectModal, setObjectModal] = useState(null)   // liabilities: {category, id|null}
  const [assetPanel, setAssetPanel] = useState(null)     // side panel: {category|null, id|null}
  const [panelCat, setPanelCat] = useState(null)         // category the open panel is targeting (live)
  const [selectedCats, setSelectedCats] = useState(() => state?.selectedCats ?? { assets: [], liabilities: [] })
  const [removeDialog, setRemoveDialog] = useState(null) // {kind, item}
  const [shareDialog, setShareDialog] = useState(false)
  const [shareAttempted, setShareAttempted] = useState(false)
  const [toast, setToast] = useState(null)
  const saved = useSavedFlash(tick)
  const guardRef = useRef(null)
  const toastTimer = useRef(null)
  const touch = () => setTick((t) => t + 1)

  /* Persist profile, welcome flag and last visited section. */
  useEffect(() => {
    const section = NAV_KEY_FOR_ROUTE[route.name]
    saveState({ profile, seenWelcome, lastSection: section, selectedCats })
  }, [profile, seenWelcome, route, selectedCats])

  const setGuard = useCallback((g) => { guardRef.current = g }, [])

  /* All navigation goes through here so open forms can intercept it. */
  const navigate = (to) => {
    if (guardRef.current) {
      setLeaveDialog({ kind: guardRef.current.kind, to })
      return
    }
    setAssetPanel(null)
    setRoute(to)
    window.scrollTo(0, 0)
  }
  const forceNavigate = (to) => {
    guardRef.current = null
    setLeaveDialog(null)
    setAssetPanel(null)
    setRoute(to)
    window.scrollTo(0, 0)
  }
  const goSection = (key) => navigate(key === 'networth' ? { name: 'networth', tab: 'assets' } : { name: key })

  const updateProfile = (next) => { setProfile(next); touch() }

  /* ---- share (spec update §4–6) ---- */

  const requestShare = () => {
    if (requiredComplete(profile)) {
      setShareDialog(true)
    } else {
      setShareAttempted(true)
      navigate({ name: 'personal' })
    }
  }

  const confirmShare = () => {
    setShareDialog(false)
    setProfile((p) => ({ ...p, shared: true }))
    touch()
    clearTimeout(toastTimer.current)
    setToast({ title: 'Shared with Sarah', body: 'She can now view this profile and any updates you make.' })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  /* Opening a different asset while the panel holds unsaved data asks first. */
  const openAssetPanel = (next) => {
    setPanelCat(next?.category ?? null)
    if (assetPanel && guardRef.current) {
      setLeaveDialog({ kind: guardRef.current.kind, panelTo: next })
      return
    }
    setAssetPanel(next)
  }

  /* ---- financial objects: explicit commits ---- */

  const commitAsset = (asset) => {
    setProfile((p) => ({
      ...p,
      assets: p.assets.some((a) => a.id === asset.id)
        ? p.assets.map((a) => (a.id === asset.id ? asset : a))
        : [...p.assets, asset],
    }))
    touch()
    guardRef.current = null
    setAssetPanel(null)
  }

  const commitLiability = (liability) => {
    setProfile((p) => ({
      ...p,
      liabilitiesExplicitlyNone: false,
      liabilities: p.liabilities.some((l) => l.id === liability.id)
        ? p.liabilities.map((l) => (l.id === liability.id ? liability : l))
        : [...p.liabilities, liability],
    }))
    touch()
    setObjectModal(null)
  }

  const commitExtracted = (accounts) => {
    setProfile((p) => ({
      ...p,
      assets: [
        ...p.assets,
        ...accounts.map((a) => ({
          id: a.id, category: a.accountType.includes('IRA') || ['401(k)', 'Pension'].includes(a.accountType) ? 'retirement' : 'investment',
          subtype: a.accountType, name: a.title,
          institutionOrProvider: a.institution, address: '',
          currency: a.currency, value: a.value ?? null,
        })),
      ],
    }))
    touch()
    guardRef.current = null
    setAssetPanel(null)
  }

  const confirmRemove = () => {
    const { kind, item } = removeDialog
    if (kind === 'asset') {
      setProfile((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== item.id) }))
      if (assetPanel?.id === item.id) { guardRef.current = null; setAssetPanel(null) }
    } else {
      setProfile((p) => ({ ...p, liabilities: p.liabilities.filter((l) => l.id !== item.id) }))
    }
    setRemoveDialog(null)
    touch()
  }

  const toggleCat = (kind, key) => {
    const hasRecords = kind === 'assets'
      ? profile.assets.some((a) => a.category === key)
      : profile.liabilities.some((l) => l.category === key)
    if (hasRecords) return // records are removed individually, never via a bubble
    setSelectedCats((sc) => ({
      ...sc,
      [kind]: sc[kind].includes(key) ? sc[kind].filter((k) => k !== key) : [...sc[kind], key],
    }))
  }

  const answerNoLiabilities = () => {
    setProfile((p) => ({ ...p, liabilitiesExplicitlyNone: true, liabilities: [] }))
    setSelectedCats((sc) => ({ ...sc, liabilities: [] }))
    touch()
  }

  /* ---- demo controls ---- */

  const resetAll = (nextProfile, welcome, to) => {
    guardRef.current = null
    setProfile(nextProfile)
    setSeenWelcome(!welcome)
    setLeaveDialog(null); setRemoveDialog(null); setShareDialog(false)
    setShareAttempted(false); setToast(null)
    setObjectModal(null); setAssetPanel(null); setSelectedCats({ assets: [], liabilities: [] })
    forceNavigate(to)
    touch()
  }
  const resetDemo = () => resetAll(seedProfile(), false, { name: 'personal' })
  const blankStart = () => resetAll(blankProfile(), true, { name: 'welcome' })

  /* ---- render ---- */

  const r = route
  const leaveTo = (tab) => navigate({ name: 'networth', tab })

  return (
    <>
      <TopBar
        saved={saved}
        showNav={r.name !== 'welcome'}
        shared={profile.shared}
        onShare={requestShare}
      />
      <div className="app-body">
        <div className="shell">
          {r.name !== 'welcome' && (
            <Sidebar activeKey={NAV_KEY_FOR_ROUTE[r.name]} onNav={goSection} clientName="Jonathan Reeves" />
          )}
          <main className={'page' + (r.name === 'welcome' ? ' page-centered' : '')}>
            {r.name === 'welcome' && (
              <Welcome onStart={() => { setSeenWelcome(true); forceNavigate({ name: 'personal' }) }} />
            )}
            {r.name === 'personal' && (
              <Personal profile={profile} onChange={updateProfile} onNav={goSection} shareAttempted={shareAttempted} />
            )}
            {r.name === 'work' && <Work profile={profile} onChange={updateProfile} onNav={goSection} />}
            {r.name === 'goals' && <Goals profile={profile} onChange={updateProfile} onNav={goSection} />}
            {r.name === 'inputlab' && <InputLab />}
            {r.name === 'networth' && (
              <NetWorth
                profile={profile}
                tab={r.tab || 'assets'}
                onTab={(tab) => navigate({ name: 'networth', tab })}
                selectedCats={selectedCats}
                onToggleCat={toggleCat}
                onAddAsset={(category) => openAssetPanel({ category, id: null })}
                onAddLiability={(category) => setObjectModal({ kind: 'liability', category, id: null })}
                onEditAsset={(a) => openAssetPanel({ category: a.category, id: a.id })}
                onRemoveAsset={(a) => setRemoveDialog({ kind: 'asset', item: a })}
                onEditLiability={(l) => setObjectModal({ kind: 'liability', category: l.category, id: l.id })}
                onRemoveLiability={(l) => setRemoveDialog({ kind: 'liability', item: l })}
                onAnswerNone={answerNoLiabilities}
                panelOpen={!!assetPanel}
                panelTarget={assetPanel ? { category: panelCat, id: assetPanel.id } : null}
              />
            )}
            {FOOTER_NAV[r.name] && (
              <div className="content-footer">
                {FOOTER_NAV[r.name].back && (
                  <button className="btn btn-secondary" onClick={() => goSection(FOOTER_NAV[r.name].back)}>Back</button>
                )}
                {FOOTER_NAV[r.name].next && (
                  <button className="btn btn-secondary ml-auto" onClick={() => goSection(FOOTER_NAV[r.name].next)}>Continue</button>
                )}
              </div>
            )}
          </main>
          {assetPanel && r.name === 'networth' && (
            <AssetPanel
              key={assetPanel.id ?? assetPanel.category ?? 'new'}
              category={assetPanel.category}
              onCategoryChange={setPanelCat}
              asset={assetPanel.id ? profile.assets.find((a) => a.id === assetPanel.id) : null}
              onCommitAsset={commitAsset}
              onCommitAccounts={commitExtracted}
              onRemove={assetPanel.id ? () => {
                const item = profile.assets.find((a) => a.id === assetPanel.id)
                if (item) setRemoveDialog({ kind: 'asset', item })
              } : undefined}
              onClose={() => { guardRef.current = null; setAssetPanel(null) }}
              setGuard={setGuard}
            />
          )}
        </div>

      </div>

      <footer className="footer">
        <button className="footer-link" onClick={resetDemo}>Reset demo</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={blankStart}>Blank start</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={() => setRoute({ name: 'inputlab' })}>Input lab</button>
      </footer>

      {objectModal?.kind === 'liability' && (
        <LiabilityModal
          category={objectModal.category}
          liability={objectModal.id ? profile.liabilities.find((l) => l.id === objectModal.id) : null}
          onCommit={commitLiability}
          onClose={() => setObjectModal(null)}
        />
      )}

      {shareDialog && (
        <Dialog
          title="Share with Sarah?"
          body="Sarah will be able to view everything you've added so far and any updates you make later."
          cancelLabel="Cancel"
          confirmLabel="Share"
          onCancel={() => setShareDialog(false)}
          onConfirm={confirmShare}
        />
      )}

      {leaveDialog && (
        <Dialog
          title={LEAVE_COPY[leaveDialog.kind].title}
          body={LEAVE_COPY[leaveDialog.kind].body}
          cancelLabel={LEAVE_COPY[leaveDialog.kind].stay || 'Keep editing'}
          confirmLabel="Leave"
          danger
          onCancel={() => setLeaveDialog(null)}
          onConfirm={() => {
            if (leaveDialog.panelTo !== undefined) {
              guardRef.current = null
              setLeaveDialog(null)
              setAssetPanel(leaveDialog.panelTo)
            } else {
              forceNavigate(leaveDialog.to)
            }
          }}
        />
      )}

      {removeDialog && (
        <Dialog
          title={removeDialog.kind === 'asset' ? `Remove ${assetTitle(removeDialog.item)}?` : 'Remove this liability?'}
          body={removeDialog.kind === 'asset'
            ? 'This asset will no longer be included in your financial picture.'
            : 'This liability will no longer be included in your financial picture.'}
          cancelLabel="Cancel"
          confirmLabel={removeDialog.kind === 'asset' ? 'Remove asset' : 'Remove liability'}
          danger
          onCancel={() => setRemoveDialog(null)}
          onConfirm={confirmRemove}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-title">{toast.title}</span>
          <span className="toast-body">{toast.body}</span>
        </div>
      )}
    </>
  )
}
