import { useState } from 'react'
import ComparisonViewer from './ComparisonViewer.jsx'

// Detail inspection: the same window (chosen from the 10 m INPUT by edge density) is shown for
// every method at 2x or 4x. Images are the unmodified output PNGs, nearest-neighbour, no filters.
export default function InspectionPanel({ res, panels }) {
  const crops = res.inspection?.crops || []
  const [ci, setCi] = useState(0)
  const [zoom, setZoom] = useState(4)
  if (!crops.length) return null
  const W = res.input.width
  const H = res.input.height
  const c = crops[Math.min(ci, crops.length - 1)]
  // zoom = viewer magnification relative to the full-scene view; window = W / zoom around the crop centre
  const size = Math.min(Math.round(W / zoom), W, H)
  const cx = Math.min(Math.max(c.x + c.size / 2 - size / 2, 0), W - size)
  const cy = Math.min(Math.max(c.y + c.size / 2 - size / 2, 0), H - size)
  const s = zoom
  const initialView = { s, x: -(cx / W) * s, y: -(cy / H) * s }
  const km = (size * res.input.resolution_m / 1000).toFixed(2)
  return (
    <section className="section">
      <h2>Detail inspection</h2>
      <p className="muted small">
        Windows are picked automatically from the 10 m input by edge density (land-cover hint from NDVI/NDWI, heuristic).
        The same window is used for every method.
      </p>
      <div className="row wrap">
        <div className="seg" role="tablist" aria-label="Inspection window">
          {crops.map((cr, i) => (
            <button key={i} className={i === ci ? 'on' : ''} onClick={() => setCi(i)}>{i + 1} · {cr.hint}</button>
          ))}
        </div>
        <div className="seg" role="tablist" aria-label="Zoom">
          {[2, 4, 8].map((z) => <button key={z} className={z === zoom ? 'on' : ''} onClick={() => setZoom(z)}>{z}×</button>)}
        </div>
      </div>
      <p className="muted small mono">window {size}×{size} input px ({km} × {km} km) at x={Math.round(cx)}, y={Math.round(cy)}</p>
      <ComparisonViewer
        key={`${ci}-${zoom}-${panels.map((p) => p.src).join()}`}
        panels={panels}
        aspect={W / H}
        initialView={initialView}
        hint="Opens on the selected window; drag / scroll to explore, Reset returns to the window."
      />
    </section>
  )
}
