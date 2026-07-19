/* Input explorations — a throwaway comparison screen (input-explorations branch).
   Same fields rendered three ways so the treatments can be felt side by side. */
import { useState } from 'react'

/* Local, demo-only field renderers so the real form system stays untouched. */

function TopField({ label, helper, required, variant, children }) {
  return (
    <label className="lab-field">
      <span className="field-label">
        {label}{required && <span className="field-required"> *</span>}
      </span>
      {children}
      {helper && <span className="field-helper">{helper}</span>}
    </label>
  )
}

function RowField({ label, desc, required, children }) {
  return (
    <div className="lab-row">
      <div className="lab-row-head">
        <span className="lab-row-label">{label}{required && <span className="field-required"> *</span>}</span>
        {desc && <span className="lab-row-desc">{desc}</span>}
      </div>
      <div className="lab-row-control">{children}</div>
    </div>
  )
}

/* Four representative fields, reused across variants. inputClass swaps the skin. */
function Fields({ inputClass, Wrapper, wide }) {
  const [name, setName] = useState('Jonathan Reeves')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [country, setCountry] = useState('United States')
  return (
    <>
      <Wrapper label="Full name" desc="Your legal name" helper="Your legal name" required>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Wrapper>
      <Wrapper label="Work email" desc="We'll send the summary here" helper="We'll send the summary here" required>
        <input className={inputClass} value={email} placeholder="you@company.com" onChange={(e) => setEmail(e.target.value)} />
      </Wrapper>
      <Wrapper label="Title" desc="Your job title or role" helper="Your job title or role">
        <input className={inputClass} value={title} placeholder="Software engineer" onChange={(e) => setTitle(e.target.value)} />
      </Wrapper>
      <Wrapper label="Country of residence" desc="Where you currently live" helper="Where you currently live">
        <select className={inputClass + ' select'} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option>United States</option>
          <option>United Kingdom</option>
          <option>Switzerland</option>
        </select>
      </Wrapper>
    </>
  )
}

export function InputLab() {
  return (
    <div className="screen lab">
      <div className="title-block">
        <h1 className="page-title">Input explorations</h1>
        <p className="page-copy">
          The same fields in three treatments. Click into each to feel the focus behaviour.<br />
          Not wired into the product — a comparison sandbox.
        </p>
      </div>

      <section className="lab-variant">
        <div className="lab-variant-head">
          <span className="lab-variant-tag">A</span>
          <div>
            <h2 className="lab-variant-title">Current — top-aligned, bordered</h2>
            <p className="lab-variant-note">What the prototype uses now. Label above, white field, hard black border on focus.</p>
          </div>
        </div>
        <div className="lab-stack">
          <Fields inputClass="input" Wrapper={TopField} />
        </div>
      </section>

      <section className="lab-variant">
        <div className="lab-variant-head">
          <span className="lab-variant-tag">B</span>
          <div>
            <h2 className="lab-variant-title">Row — label &amp; description left, control right</h2>
            <p className="lab-variant-note">Settings-style. Same anatomy as the asset rows. Best in a wide column and for review.</p>
          </div>
        </div>
        <div className="lab-rows">
          <Fields inputClass="input" Wrapper={RowField} wide />
        </div>
      </section>

      <section className="lab-variant">
        <div className="lab-variant-head">
          <span className="lab-variant-tag">C</span>
          <div>
            <h2 className="lab-variant-title">Top-aligned — filled + soft focus</h2>
            <p className="lab-variant-note">Subtle grey fill at rest; on focus it lifts to a clean white field with a crisp border — no halo.</p>
          </div>
        </div>
        <div className="lab-stack">
          <Fields inputClass="input input-filled" Wrapper={TopField} />
        </div>
      </section>
    </div>
  )
}
