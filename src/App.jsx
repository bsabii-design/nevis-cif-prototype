import { useCallback, useEffect, useRef, useState } from 'react'
import { assetTitle, blankProfile, loadState, missingCount, missingPersonalFields, missingWorkFields, saveState, sectionState, seedProfile, uid } from './model.js'
import { Dialog } from './ui.jsx'
import { Sidebar, TopBar } from './components.jsx'
import { AssetPanel, LiabilityPanel } from './forms.jsx'
import { Goals, NetWorth, Personal, Welcome, Work } from './screens.jsx'
import { InputLab } from './inputlab.jsx'
import { useSavedFlash } from './hooks.js'

const LEAVE_COPY = {
  asset: { title: 'Leave without adding this asset?', body: 'Your entries will be lost.' },
  liability: { title: 'Leave without adding this liability?', body: 'Your entries will be lost.' },
  extract: { title: 'Leave without adding these accounts?', body: 'Your changes will be lost.', stay: 'Keep reviewing' },
}

const NAV_KEY_FOR_ROUTE = {
  personal: 'personal', work: 'work', goals: 'goals', networth: 'networth',
}

const MAIN_SECTIONS = ['personal', 'work', 'goals', 'networth']

/* Share moment = the one honest scene of validation: the mirror always
   opens, names exactly what's missing, and links straight to it. Only
   required identity/work details block; everything else is information.
   The CTA is never disabled — pressing Share with gaps leads to the
   first of them instead. */
function ShareDialog({ profile, onCancel, onConfirm, onGoto }) {
  const goals = profile.goals.length
  const assets = profile.assets.length
  const liabs = profile.liabilities.length
  const pMiss = missingCount(missingPersonalFields(profile))
  const wMiss = missingCount(missingWorkFields(profile))
  const req = (n, section) => ({ link: `${n} required detail${n > 1 ? 's' : ''} missing`, section })
  const rows = [
    { label: 'Personal', ...(pMiss ? req(pMiss, 'personal') : { state: 'Details added' }) },
    { label: 'Work & income', ...(wMiss ? req(wMiss, 'work') : { state: 'Details added' }) },
    goals
      ? { label: 'Goals', state: `${goals} goal${goals > 1 ? 's' : ''}` }
      /* Asked for, never required: one tap of a chip is enough. */
      : { label: 'Goals', link: 'No goals yet — even one helps Sarah prepare', section: 'goals' },
    {
      label: 'Net worth',
      state: [
        assets ? `${assets} asset${assets > 1 ? 's' : ''}` : 'no assets yet',
        liabs ? `${liabs} liabilit${liabs > 1 ? 'ies' : 'y'}` : profile.liabilitiesExplicitlyNone ? 'no liabilities' : 'liabilities not answered yet',
      ].join(' · '),
      muted: !assets,
    },
  ]
  const firstMissing = pMiss ? 'personal' : wMiss ? 'work' : null
  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog share-dialog" role="alertdialog" aria-modal="true" aria-label="Share with Sarah">
        <h3 className="dialog-title">Share with Sarah</h3>
        <p className="dialog-body">
          She will see your profile as it is now — and any updates you make later.
        </p>
        <div className="share-checklist">
          {rows.map((r) => (
            <div className="share-check-row" key={r.label}>
              <span className="share-check-label">{r.label}</span>
              {r.link ? (
                <button className="share-check-link" onClick={() => onGoto(r.section)}>{r.link}</button>
              ) : (
                <span className={'share-check-state' + (r.muted ? ' share-check-muted' : '')}>{r.state}</span>
              )}
            </div>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Continue editing</button>
          <button className="btn btn-primary"
            onClick={() => (firstMissing ? onGoto(firstMissing) : onConfirm())}>
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [assetPanel, setAssetPanel] = useState(null)     // side panel: {category|null, id|null}
  const [panelCat, setPanelCat] = useState(null)         // category the open panel is targeting (live)
  const [selectedCats, setSelectedCats] = useState(() => state?.selectedCats ?? { assets: [], liabilities: [] })
  const [removeDialog, setRemoveDialog] = useState(null) // {kind, item}
  const [shareDialog, setShareDialog] = useState(false)
  const [shareAttempted, setShareAttempted] = useState(false)
  const [toast, setToast] = useState(null)
  const saved = useSavedFlash(tick)
  const guardRef = useRef(null)
  const panelKeyRef = useRef(0)   // bumps on every (re)open so the panel remounts fresh
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

  /* Share ALWAYS opens the mirror — validation lives there, not on the way. */
  const requestShare = () => setShareDialog(true)

  /* A jump from the mirror counts as an attempt: from here the missing
     fields highlight in place and the sidebar marks unfinished sections. */
  const gotoFromShare = (section) => {
    setShareDialog(false)
    setShareAttempted(true)
    forceNavigate(section === 'networth' ? { name: 'networth', tab: 'assets' } : { name: section })
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
    // panelCat follows the panel's own category (via onCategoryChange), so a
    // cancelled switch keeps the correct highlight instead of a stale one.
    if (assetPanel && guardRef.current) {
      setLeaveDialog({ kind: guardRef.current.kind, panelTo: next })
      return
    }
    setAssetPanel({ ...next, k: ++panelKeyRef.current })
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

  /* Live edits: the object already exists — update in place, keep the panel open. */
  const liveUpdateAsset = (a) => {
    setProfile((p) => ({ ...p, assets: p.assets.map((x) => (x.id === a.id ? a : x)) }))
    touch()
  }
  const liveUpdateLiability = (l) => {
    setProfile((p) => ({ ...p, liabilities: p.liabilities.map((x) => (x.id === l.id ? l : x)) }))
    touch()
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
    guardRef.current = null
    setAssetPanel(null)
  }

  const commitExtracted = (accounts) => {
    setProfile((p) => ({
      ...p,
      assets: [
        ...p.assets,
        ...accounts.map((a) => ({
          id: a.id,
          category: ['Checking', 'Savings', 'Money market', 'Certificate of deposit'].includes(a.accountType) ? 'cash'
            : a.accountType.includes('IRA') || ['401(k)', '403(b)', '457(b)', 'Pension'].includes(a.accountType) ? 'retirement'
            : 'investment',
          subtype: a.accountType, name: (a.nickname || '').trim() || a.title,
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
      if (assetPanel?.id === item.id) { guardRef.current = null; setAssetPanel(null) }
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
    setAssetPanel(null); setSelectedCats({ assets: [], liabilities: [] })
    forceNavigate(to)
    touch()
  }
  const resetDemo = () => resetAll(seedProfile(), false, { name: 'personal' })
  const blankStart = () => resetAll(blankProfile(), true, { name: 'welcome' })

  /* ---- Loop demo: assets add themselves on the Net worth page, then the
     list clears and the cycle repeats — for screen-recording the motion.
     The pre-loop profile is restored on stop. ---- */
  const LOOP_ASSETS = [
    { category: 'cash', subtype: 'Checking', institutionOrProvider: 'Chase', name: 'Personal', value: 420000, currency: 'USD', address: '' },
    { category: 'investment', subtype: 'Brokerage account', institutionOrProvider: 'Fidelity', name: 'Family Portfolio', value: 1240500, currency: 'USD', address: '' },
    { category: 'retirement', subtype: '401(k)', institutionOrProvider: 'Empower', name: 'Executive Plan', value: 480000, currency: 'USD', address: '' },
    { category: 'realestate', subtype: 'House', institutionOrProvider: '', name: 'Aspen residence', value: 2500000, currency: 'USD', address: '' },
    { category: 'crypto', subtype: 'Bitcoin', institutionOrProvider: 'Coinbase', name: '', value: 190000, currency: 'USD', address: '' },
  ]
  const LOOP_LIABILITY = { category: 'mortgage', name: 'Aspen residence', lender: 'Chase', outstandingBalance: 520000, interestRate: 4.25, currency: 'USD' }
  const [looping, setLooping] = useState(false)
  const loopSnapshot = useRef(null)
  const startLoop = () => {
    loopSnapshot.current = profile
    guardRef.current = null
    setAssetPanel(null)
    forceNavigate({ name: 'networth', tab: 'assets' })
    setLooping(true)
  }
  const stopLoop = () => {
    setLooping(false)
    if (loopSnapshot.current) { setProfile(loopSnapshot.current); loopSnapshot.current = null }
  }
  useEffect(() => {
    if (!looping) return
    let alive = true
    let timer = null
    /* Start from 'no debts yet' so the figure counts up from the first asset. */
    const clearNW = () => setProfile((p) => ({ ...p, assets: [], liabilities: [], liabilitiesExplicitlyNone: true }))
    const schedule = (fn, ms) => { if (alive) timer = setTimeout(fn, ms) }
    let i = 0
    const step = () => {
      if (!alive) return
      if (i < LOOP_ASSETS.length) {
        const a = LOOP_ASSETS[i]
        i += 1
        setProfile((p) => ({ ...p, assets: [...p.assets, { ...a, id: uid() }] }))
        schedule(step, 1100)
      } else if (i === LOOP_ASSETS.length) {
        i += 1
        setProfile((p) => ({ ...p, liabilities: [{ ...LOOP_LIABILITY, id: uid() }] }))
        schedule(step, 1500)
      } else {
        schedule(() => { clearNW(); i = 0; schedule(step, 900) }, 2800)
      }
    }
    clearNW()
    schedule(step, 800)
    return () => { alive = false; clearTimeout(timer) }
  }, [looping]) // eslint-disable-line react-hooks/exhaustive-deps

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
            <Sidebar activeKey={NAV_KEY_FOR_ROUTE[r.name]} onNav={goSection} clientName="Jonathan Reeves" sections={sectionState(profile)}
              attention={{
                personal: shareAttempted && missingCount(missingPersonalFields(profile)) > 0,
                work: shareAttempted && missingCount(missingWorkFields(profile)) > 0,
              }} />
          )}
          <main className={'page' + (r.name === 'welcome' ? ' page-centered' : '')}>
            {r.name === 'welcome' && (
              <Welcome onStart={() => { setSeenWelcome(true); forceNavigate({ name: 'personal' }) }} />
            )}
            {r.name === 'personal' && (
              <Personal profile={profile} onChange={updateProfile} onNav={goSection} shareAttempted={shareAttempted} />
            )}
            {r.name === 'work' && <Work profile={profile} onChange={updateProfile} onNav={goSection} shareAttempted={shareAttempted} />}
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
                onAddLiability={(category) => openAssetPanel({ kind: 'liability', category, id: null })}
                onEditAsset={(a) => openAssetPanel({ category: a.category, id: a.id })}
                onRemoveAsset={(a) => setRemoveDialog({ kind: 'asset', item: a })}
                onEditLiability={(l) => openAssetPanel({ kind: 'liability', category: l.category, id: l.id })}
                onRemoveLiability={(l) => setRemoveDialog({ kind: 'liability', item: l })}
                onAnswerNone={answerNoLiabilities}
                panelOpen={!!assetPanel}
                panelTarget={assetPanel ? { category: panelCat, id: assetPanel.id } : null}
              />
            )}
          </main>
          {assetPanel && r.name === 'networth' && (assetPanel.kind === 'liability' ? (
            <LiabilityPanel
              key={assetPanel.k}
              category={assetPanel.category}
              propertyOptions={profile.assets
                .filter((a) => a.category === 'realestate')
                .map((a) => ({ name: a.name || a.subtype, value: a.value, currency: a.currency }))
                .filter((p) => p.name)}
              onCreateProperty={(name) => {
                setProfile((p) => ({
                  ...p,
                  assets: [...p.assets, { id: uid(), category: 'realestate', subtype: '', name, institutionOrProvider: '', address: '', currency: 'USD', value: null }],
                }))
                touch()
              }}
              onCategoryChange={setPanelCat}
              liability={assetPanel.id ? profile.liabilities.find((l) => l.id === assetPanel.id) : null}
              onCommit={commitLiability}
              onCommitLiabilities={(records) => {
                setProfile((p) => ({
                  ...p,
                  liabilitiesExplicitlyNone: false,
                  liabilities: [...p.liabilities, ...records.map((r) => ({
                    id: r.id, category: r.category, name: '', lender: r.lender,
                    currency: r.currency, outstandingBalance: r.outstandingBalance ?? null,
                    interestRate: r.interestRate ?? null,
                  }))],
                }))
                touch()
                guardRef.current = null
                setAssetPanel(null)
              }}
              onLiveChange={liveUpdateLiability}
              onRemove={assetPanel.id ? () => {
                const item = profile.liabilities.find((l) => l.id === assetPanel.id)
                if (item) setRemoveDialog({ kind: 'liability', item })
              } : undefined}
              onClose={() => { guardRef.current = null; setAssetPanel(null) }}
              setGuard={setGuard}
            />
          ) : (
            <AssetPanel
              key={assetPanel.k}
              category={assetPanel.category}
              onCategoryChange={setPanelCat}
              asset={assetPanel.id ? profile.assets.find((a) => a.id === assetPanel.id) : null}
              onCommitAsset={commitAsset}
              onLiveChange={liveUpdateAsset}
              onCommitAccounts={commitExtracted}
              onRemove={assetPanel.id ? () => {
                const item = profile.assets.find((a) => a.id === assetPanel.id)
                if (item) setRemoveDialog({ kind: 'asset', item })
              } : undefined}
              onClose={() => { guardRef.current = null; setAssetPanel(null) }}
              setGuard={setGuard}
            />
          ))}
        </div>

      </div>

      <footer className="footer">
        <button className="footer-link" onClick={resetDemo}>Reset demo</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={blankStart}>Blank start</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={() => setRoute({ name: 'inputlab' })}>Input lab</button>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={looping ? stopLoop : startLoop}>
          {looping ? 'Stop loop' : 'Loop demo'}
        </button>
      </footer>

      {shareDialog && (
        <ShareDialog profile={profile} onCancel={() => setShareDialog(false)} onConfirm={confirmShare} onGoto={gotoFromShare} />
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
              setAssetPanel({ ...leaveDialog.panelTo, k: ++panelKeyRef.current })
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
