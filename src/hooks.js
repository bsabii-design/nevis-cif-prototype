import { useEffect, useRef, useState } from 'react'

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Animates numeric changes (count-up / count-down). null passes through. */
export function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (target == null || from == null || from === target || reducedMotion()) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    let raf
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(from + (target - from) * ease(p)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

/* Briefly true after each bump — drives the quiet "Saved" indicator. */
export function useSavedFlash(tick) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (tick === 0) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [tick])
  return visible
}
