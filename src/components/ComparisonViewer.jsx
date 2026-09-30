import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_ZOOM = 40

// Synchronized zoom/pan across panels. All images cover the same ground extent, so a
// single transform (in panel-relative units) keeps them geographically aligned.
function useSyncedView(initial) {
  const start = initial || { s: 1, x: 0, y: 0 }
  const [view, setView] = useState(start) // x,y in fractions of panel size
  const clamp = (v) => {
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s))
    const min = 1 - s
    return { s, x: Math.min(0, Math.max(min, v.x)), y: Math.min(0, Math.max(min, v.y)) }
  }
  const zoomAt = useCallback((fx, fy, factor) => {
    setView((v) => {
      const s = Math.min(MAX_ZOOM, Math.max(1, v.s * factor))
      const k = s / v.s
      return clamp({ s, x: fx - (fx - v.x) * k, y: fy - (fy - v.y) * k })
    })
  }, [])
  const panBy = useCallback((dx, dy) => setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy })), [])
  const reset = useCallback(() => setView(start), [start.s, start.x, start.y])
  return { view, zoomAt, panBy, reset }
}

function Interactive({ children, onZoom, onPan, className }) {
  const ref = useRef(null)
  const drag = useRef(null)
  useEffect(() => {
    const el = ref.current
    const wheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      onZoom((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.deltaY < 0 ? 1.2 : 1 / 1.2)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [onZoom])
  return (
    <div
      ref={ref}
      className={className}
      onPointerDown={(e) => {
        if (e.target.closest('.swipe-handle')) return
        drag.current = { x: e.clientX, y: e.clientY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const r = ref.current.getBoundingClientRect()
        onPan((e.clientX - drag.current.x) / r.width, (e.clientY - drag.current.y) / r.height)
        drag.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={(e) => {
        const r = ref.current.getBoundingClientRect()
        onZoom((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 2)
      }}
    >
      {children}
    </div>
  )
}

const imgStyle = (view) => ({
  transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.s})`,
})

export default function ComparisonViewer({ panels, aspect = 1, initialView, hint }) {
  const { view, zoomAt, panBy, reset } = useSyncedView(initialView)
  const [mode, setMode] = useState('side')
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(panels.length - 1)
  const [split, setSplit] = useState(0.5)
  const swipeRef = useRef(null)

  const startSwipe = (e) => {
    e.stopPropagation()
    const el = swipeRef.current
    const move = (ev) => {
      const r = el.getBoundingClientRect()
      setSplit(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)))
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="viewer">
      <div className="viewer-toolbar">
        <div className="seg" role="tablist" aria-label="Comparison mode">
          <button className={mode === 'side' ? 'on' : ''} onClick={() => setMode('side')}>Side by side (synced)</button>
          <button className={mode === 'swipe' ? 'on' : ''} onClick={() => setMode('swipe')}>Before / after swipe</button>
        </div>
        <div className="viewer-zoom">
          <button onClick={() => zoomAt(0.5, 0.5, 1 / 1.5)} aria-label="Zoom out">−</button>
          <span className="mono">{view.s.toFixed(1)}×</span>
          <button onClick={() => zoomAt(0.5, 0.5, 1.5)} aria-label="Zoom in">+</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>
      <p className="muted small">{hint || 'Scroll or double-click to zoom, drag to pan. Pixels are shown unsmoothed (nearest neighbour), so the true 10 m and 4 m grids are visible.'}</p>

      {mode === 'side' ? (
        <div className="viewer-grid" style={{ '--n': panels.length }}>
          {panels.map((p) => (
            <figure key={p.key} className="viewer-panel">
              <figcaption><strong>{p.title}</strong><span>{p.subtitle}</span></figcaption>
              <Interactive className="viewer-frame" onZoom={zoomAt} onPan={panBy}>
                <div className="viewer-ar" style={{ aspectRatio: aspect }}>
                  <img src={p.src} alt={p.title} draggable="false" style={imgStyle(view)} />
                </div>
              </Interactive>
            </figure>
          ))}
        </div>
      ) : (
        <div className="swipe">
          <div className="swipe-pickers">
            <label>Left <select value={left} onChange={(e) => setLeft(+e.target.value)}>
              {panels.map((p, i) => <option key={p.key} value={i}>{p.title}</option>)}
            </select></label>
            <label>Right <select value={right} onChange={(e) => setRight(+e.target.value)}>
              {panels.map((p, i) => <option key={p.key} value={i}>{p.title}</option>)}
            </select></label>
          </div>
          <Interactive className="viewer-frame swipe-frame" onZoom={zoomAt} onPan={panBy}>
            <div className="viewer-ar" ref={swipeRef} style={{ aspectRatio: aspect }}>
              <img src={panels[right].src} alt={panels[right].title} draggable="false" style={imgStyle(view)} />
              <div className="swipe-top" style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}>
                <img src={panels[left].src} alt={panels[left].title} draggable="false" style={imgStyle(view)} />
              </div>
              <span className="swipe-label swipe-label-l">{panels[left].title}</span>
              <span className="swipe-label swipe-label-r">{panels[right].title}</span>
              <div className="swipe-handle" style={{ left: `${split * 100}%` }} onPointerDown={startSwipe}
                   role="slider" aria-label="Swipe position" aria-valuenow={Math.round(split * 100)} tabIndex={0}
                   onKeyDown={(e) => {
                     if (e.key === 'ArrowLeft') setSplit((v) => Math.max(0, v - 0.05))
                     if (e.key === 'ArrowRight') setSplit((v) => Math.min(1, v + 0.05))
                   }}>
                <span />
              </div>
            </div>
          </Interactive>
        </div>
      )}
    </div>
  )
}
