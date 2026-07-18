/* Shared UI primitives. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CURRENCIES, INSTITUTIONS, institutionAvatar, parseAmount } from './model.js'

export function Field({ label, helper, required, error, children }) {
  return (
    <label className={'field' + (error ? ' field-missing' : '')}>
      <span className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </span>
      {children}
      {error ? <span className="field-error">{typeof error === 'string' ? error : 'Required'}</span>
             : helper && <span className="field-helper">{helper}</span>}
    </label>
  )
}

export function TextInput({ value, onChange, ...rest }) {
  return <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select className="input select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}

/* Compact currency select + amount, thousands separators as you type. */
export function MoneyInput({ amount, currency = 'USD', onAmount, onCurrency, autoFocus }) {
  const [text, setText] = useState(amount == null ? '' : amount.toLocaleString('en-US'))
  const inputRef = useRef(null)
  const caretDigits = useRef(null)

  useEffect(() => {
    // reflect external clears ("I don't know this yet")
    if (amount == null && text !== '') setText('')
  }, [amount]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = inputRef.current
    if (caretDigits.current == null || !el) return
    let pos = 0, seen = 0
    while (pos < el.value.length && seen < caretDigits.current) {
      if (/\d/.test(el.value[pos])) seen++
      pos++
    }
    el.setSelectionRange(pos, pos)
    caretDigits.current = null
  }, [text])

  const handleChange = (e) => {
    const el = e.target
    caretDigits.current = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length
    const n = parseAmount(el.value)
    setText(n == null ? '' : n.toLocaleString('en-US'))
    onAmount(n)
  }

  return (
    <div className="money">
      <select className="input select money-cur" value={currency} aria-label="Currency"
        onChange={(e) => onCurrency(e.target.value)}>
        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input ref={inputRef} className="input" value={text} inputMode="numeric" autoFocus={autoFocus} onChange={handleChange} />
    </div>
  )
}

/* Searchable editable combobox; free text always allowed.
   Prefix matches rank first; unmatched input offers Use "…". */
export function InstitutionCombobox({ value, onChange, placeholder, autoFocus, options = INSTITUTIONS }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const query = (value || '').trim().toLowerCase()
  const matches = options
    .filter((n) => n.toLowerCase().includes(query))
    .sort((a, b) => {
      const ap = a.toLowerCase().startsWith(query) ? 0 : 1
      const bp = b.toLowerCase().startsWith(query) ? 0 : 1
      return ap - bp || a.localeCompare(b)
    })
    .slice(0, 8)
  const exact = options.some((n) => n.toLowerCase() === query)
  const items = [...matches]
  if (query && !exact) items.push({ use: true, name: value.trim() })

  const pick = (name) => { onChange(name); setOpen(false); setActive(-1) }
  const avatar = institutionAvatar(value)

  return (
    <div className="combo">
      {avatar && (
        <span className="avatar avatar-sm combo-avatar" style={{ background: avatar.color }} aria-hidden="true">
          {avatar.letter}
        </span>
      )}
      <input
        className={'input' + (avatar ? ' combo-input-avatar' : '')}
        role="combobox"
        aria-expanded={open && items.length > 0}
        value={value || ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1) }}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length) }
          if (e.key === 'Enter' && active >= 0) {
            e.preventDefault()
            const it = items[active]
            pick(typeof it === 'string' ? it : it.name)
          }
          if (e.key === 'Escape') { setOpen(false); setActive(-1) }
        }}
      />
      {open && items.length > 0 && (
        <ul className="combo-list" role="listbox">
          {items.map((item, i) => {
            const isUse = typeof item !== 'string'
            const name = isUse ? item.name : item
            const av = isUse ? null : institutionAvatar(name)
            return (
              <li key={isUse ? '__use' : name} role="option" aria-selected={i === active}
                className={'combo-item' + (i === active ? ' combo-item-active' : '')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(name)}>
                {av && <span className="avatar avatar-sm" style={{ background: av.color }}>{av.letter}</span>}
                {isUse ? <>Use “{name}”</> : name}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* Grouped custom select (product-styled dropdown, not the native menu). */
export function GroupedSelect({ value, onChange, groups, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="combo" ref={ref}>
      <button type="button" className="input select gsel-trigger"
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <span className={value ? '' : 'gsel-placeholder'}>{value || placeholder}</span>
      </button>
      {open && (
        <ul className="combo-list" role="listbox">
          {groups.map((g) => (
            <li key={g.label} className="gsel-section">
              <span className="gsel-group">{g.label}</span>
              {g.options.map((o) => (
                <button key={o} type="button" role="option" aria-selected={o === value}
                  className={'combo-item gsel-option' + (o === value ? ' combo-item-active' : '')}
                  onClick={() => { onChange(o); setOpen(false) }}>
                  {o}
                </button>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* Single-choice pill group (employment status). Not a toggle. */
export function RadioRow({ options, value, onChange, name }) {
  return (
    <div className="radio-row" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={value === o}
          className={'radio-pill' + (value === o ? ' radio-pill-on' : '')}
          onClick={() => onChange(value === o ? '' : o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

/* Confirmation dialog (leave-without-saving, remove). */
export function Dialog({ title, body, cancelLabel, confirmLabel, danger, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-body">{body}</p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* Date input with light MM/DD/YYYY masking. */
export function DateInput({ value, onChange, className = '', onBlur }) {
  const format = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 8)
    if (d.length <= 2) return d
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
  }
  return (
    <input className={'input ' + className} value={value || ''} placeholder="MM / DD / YYYY" inputMode="numeric"
      onChange={(e) => onChange(format(e.target.value))} onBlur={onBlur} />
  )
}

/* US phone input with light (XXX) XXX-XXXX masking. */
export function PhoneInput({ value, onChange }) {
  const format = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 10)
    if (d.length === 0) return ''
    if (d.length <= 3) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return (
    <input className="input" value={value || ''} placeholder="(415) 555-0172" inputMode="tel"
      onChange={(e) => onChange(format(e.target.value))} />
  )
}
