import { useCallback, useEffect, useRef, useState } from 'react'
import { assetTitle, blankProfile, loadState, requiredComplete, saveState, seedProfile } from './model.js'
import { Dialog } from './ui.jsx'
import { TopBar } from './components.jsx'
import { AssetForm, LiabilityForm, UploadFlow } from './forms.jsx'
import { Goals, NetWorth, Personal, Welcome, Work } from './screens.jsx'
import { useSavedFlash } from './hooks.js'

const LEAVE_COPY = {
  asset: { title: 'Leave without adding this asset?', body: 'Your entries will be lost.' },
  'asset-edit': { title: 'Leave without saving your changes?', body: 'Your changes will be lost.' },
  liability: { title: 'Leave without adding this liability?', body: 'Your entries will be lost.' },
  'liability-edit': { title: 'Leave without saving your changes?', body: 'Your changes will be lost.' },
  extract: { title: 'Leave without adding these accounts?', body: 'Your changes will be lost.', stay: 'Keep reviewing' },
}

const NAV_KEY_FOR_ROUTE = {
  personal: 'personal', work: 'work', goals: 'goals',
  networth: 'networth', 'asset-form': 'networth', 'liability-form': 'networth', upload: 'networth',
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
    saveState({ profile, seenWelcome, lastSection: section })
  }, [profile, seenWelcome, route])

  const setGuard = useCallback((g) => { guardRef.current = g }, [])

  /* All navigation goes through here so open forms can intercept it. */
  const navigate = (to) => {
    if (guardRef.current) {
      setLeaveDialog({ kind: guardRef.current.kind, to })
      return
    }
    setRoute(to)
    window.scrollTo(0, 0)
  }
  const forceNavigate = (to) => {
    guardRef.current = null
    setLeaveDialog(null)
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

  /* ---- financial objects: explicit commits ---- */

  const commitAsset = (asset) => {
    setProfile((p) => ({
      ...p,
      assets: p.assets.some((a) => a.id === asset.id)
        ? p.assets.map((a) => (a.id === asset.id ? asset : a))
        : [...p.assets, asset],
    }))
    touch()
    forceNavigate({ name: 'networth', tab: 'assets' })
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
    forceNavigate({ name: 'networth', tab: 'liabilities' })
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
    forceNavigate({ name: 'networth', tab: 'assets' })
  }

  const confirmRemove = () => {
    const { kind, item } = removeDialog
    if (kind === 'asset') {
      setProfile((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== item.id) }))
    } else {
      setProfile((p) => ({ ...p, liabilities: p.liabilities.filter((l) => l.id !== item.id) }))
    }
    setRemoveDialog(null)
    touch()
  }

  const answerNoLiabilities = () => {
    setProfile((p) => ({ ...p, liabilitiesExplicitlyNone: true, liabilities: [] }))
    touch()
  }

  /* ---- demo controls ---- */

  const resetAll = (nextProfile, welcome, to) => {
    guardRef.current = null
    setProfile(nextProfile)
    setSeenWelcome(!welcome)
    setLeaveDialog(null); setRemoveDialog(null); setShareDialog(false)
    setShareAttempted(false); setToast(null)
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
        activeKey={NAV_KEY_FOR_ROUTE[r.name]}
        onNav={goSection}
        saved={saved}
        clientName="Jonathan Reeves"
        showNav={r.name !== 'welcome'}
        shared={profile.shared}
        onShare={requestShare}
      />
      <main className="page">
        {r.name === 'welcome' && (
          <Welcome onStart={() => { setSeenWelcome(true); forceNavigate({ name: 'personal' }) }} />
        )}
        {r.name === 'personal' && (
          <Personal profile={profile} onChange={updateProfile} onNav={goSection} shareAttempted={shareAttempted} />
        )}
        {r.name === 'work' && <Work profile={profile} onChange={updateProfile} onNav={goSection} />}
        {r.name === 'goals' && <Goals profile={profile} onChange={updateProfile} onNav={goSection} />}
        {r.name === 'networth' && (
          <NetWorth
            profile={profile}
            tab={r.tab || 'assets'}
            onTab={(tab) => navigate({ name: 'networth', tab })}
            onNav={goSection}
            onAddAsset={(category) => navigate({ name: 'asset-form', category })}
            onEditAsset={(a) => navigate({ name: 'asset-form', assetId: a.id })}
            onRemoveAsset={(a) => setRemoveDialog({ kind: 'asset', item: a })}
            onAddLiability={(category) => navigate({ name: 'liability-form', category })}
            onEditLiability={(l) => navigate({ name: 'liability-form', liabilityId: l.id })}
            onRemoveLiability={(l) => setRemoveDialog({ kind: 'liability', item: l })}
            onUpload={() => navigate({ name: 'upload' })}
            onAnswerNone={answerNoLiabilities}
            onChange={updateProfile}
          />
        )}
        {r.name === 'asset-form' && (
          <AssetForm
            asset={r.assetId ? profile.assets.find((a) => a.id === r.assetId) : null}
            initialCategory={r.category}
            setGuard={setGuard}
            onCommit={commitAsset}
            onLeave={leaveTo}
          />
        )}
        {r.name === 'liability-form' && (
          <LiabilityForm
            liability={r.liabilityId ? profile.liabilities.find((l) => l.id === r.liabilityId) : null}
            initialCategory={r.category}
            setGuard={setGuard}
            onCommit={commitLiability}
            onLeave={leaveTo}
          />
        )}
        {r.name === 'upload' && (
          <UploadFlow setGuard={setGuard} onCommit={commitExtracted} onLeave={leaveTo} />
        )}
      </main>

      <footer className="footer">
        <button className="footer-link" onClick={resetDemo}>Reset demo</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={blankStart}>Blank start</button>
      </footer>

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

      {leaveDialog && (() => {
        const editing = (leaveDialog.kind === 'asset' && route.assetId) || (leaveDialog.kind === 'liability' && route.liabilityId)
        const copy = LEAVE_COPY[editing ? `${leaveDialog.kind}-edit` : leaveDialog.kind]
        return (
          <Dialog
            title={copy.title}
            body={copy.body}
            cancelLabel={copy.stay || 'Keep editing'}
            confirmLabel="Leave"
            danger
            onCancel={() => setLeaveDialog(null)}
            onConfirm={() => forceNavigate(leaveDialog.to)}
          />
        )
      })()}

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
