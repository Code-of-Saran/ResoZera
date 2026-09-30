import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import logo from '../assets/landing/logo.png'
import ProcessingStages from '../components/ProcessingStages.jsx'
import ComparisonViewer from '../components/ComparisonViewer.jsx'
import InspectionPanel from '../components/InspectionPanel.jsx'
import MetricsPanel from '../components/MetricsPanel.jsx'
import MapView from '../components/MapView.jsx'
import ModelSelector from '../components/ModelSelector.jsx'
import ModelInfo from '../components/ModelInfo.jsx'
import UncertaintyPanel from '../components/UncertaintyPanel.jsx'
import '../styles/demo.css'

function ErrorBox({ error, onClose }) {
  if (!error) return null
  return (
    <div className="notice notice-error" role="alert">
      <div><strong>{error.message}</strong>{error.hint && <p className="small">{error.hint}</p>}</div>
      {onClose && <button className="link" onClick={onClose}>Dismiss</button>}
    </div>
  )
}

function specLine(m) {
  if (!m) return 'Input 10 m · Bands B02 B03 B04 B08'
  const blocks = `${m.residual_blocks} residual${m.attention_blocks ? ` + ${m.attention_blocks} attention` : ''} blocks`
  return `Input ${m.input_resolution_m} m · Bands ${m.bands.join(' ')} · Model ${m.name} · ${blocks}` +
    (m.uncertainty && m.uncertainty !== 'none' ? ` · ${m.uncertainty}` : '')
}

export default function Demo() {
  const [models, setModels] = useState(null)
  const [modelKey, setModelKey] = useState('swin_mvp')
  const [mcPasses, setMcPasses] = useState(10)
  const [scenes, setScenes] = useState([])
  const [tab, setTab] = useState('demo')
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])
  const [reference, setReference] = useState(null)
  const [boaOffset, setBoaOffset] = useState('auto')
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const [composite, setComposite] = useState('rgb')
  const pollRef = useRef(null)
  const resultsRef = useRef(null)

  useEffect(() => {
    document.title = 'ResoZera — Satellite Super-Resolution'
    api.models().then((r) => {
      setModels(r.models)
      setModelKey(r.default)
      if (r.models.swin_mvp?.mc_passes_default != null) setMcPasses(r.models.swin_mvp.mc_passes_default)
    }).catch(setError)
    api.scenes().then((r) => {
      setScenes(r.scenes)
      if (r.scenes.length) setSelected(r.scenes[0].id)
    }).catch(setError)
    return () => clearTimeout(pollRef.current)
  }, [])

  const running = job && (job.status === 'queued' || job.status === 'running')

  const poll = (id, failures = 0) => {
    api.job(id).then((j) => {
      setJob(j)
      if (j.status === 'error') setError(j.error)
      if (j.status === 'queued' || j.status === 'running') pollRef.current = setTimeout(() => poll(id), 600)
      if (j.status === 'done') setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }).catch((e) => {
      if (failures < 4) pollRef.current = setTimeout(() => poll(id, failures + 1), 1500)
      else { setError(e); setJob((j) => j && { ...j, status: 'error' }) }
    })
  }

  const run = async () => {
    setError(null)
    clearTimeout(pollRef.current)
    setJob({ status: 'queued', stages: [] })
    try {
      const opts = { model: modelKey, mcPasses: modelKey === 'swin_mvp' ? mcPasses : 0 }
      const { job_id } = tab === 'demo'
        ? await api.startDemo(selected, opts)
        : await api.startUpload(files, reference, boaOffset, opts)
      poll(job_id)
    } catch (e) {
      setError(e)
      setJob(null)
    }
  }

  const res = job?.status === 'done' ? job.result : null
  const panels = useMemo(() => {
    if (!res) return []
    const u = res.urls
    const lbl = (k) => res.models?.[k]
    return [
      { key: 'orig', title: 'Original', subtitle: `${res.input.resolution_m} m Sentinel-2`, src: u[`png_original_${composite}`] },
      { key: 'bic', title: 'Bicubic', subtitle: 'baseline', src: u[`png_bicubic_${composite}`] },
      ...(u[`png_edsr_${composite}`] ? [{ key: 'edsr', title: 'EDSR', subtitle: lbl('edsr')?.short_note || 'Phase 1 architecture', src: u[`png_edsr_${composite}`] }] : []),
      ...(u[`png_mvp_${composite}`] ? [{ key: 'mvp', title: 'ResoZera MVP', subtitle: `CNN + Swin${res.uncertainty.available ? ' · MC mean' : ''}`, src: u[`png_mvp_${composite}`] }] : []),
    ]
  }, [res, composite])

  const canRun = !running && (tab === 'demo' ? !!selected : files.length > 0)
  const model = models?.[modelKey]
  const noModel = models && !Object.values(models).some((m) => m.available)

  return (
    <div className="demo">
      <header className="top">
        <Link to="/" aria-label="Back to ResoZera home"><img src={logo} alt="ResoZera" className="logo" /></Link>
      </header>

      <main className="page">
        <section className="intro">
          <h1>ResoZera — Satellite Super-Resolution</h1>
          <p>Transform medium-resolution Sentinel-2 imagery into AI-enhanced fine-scale products for geospatial analysis.</p>
          <p className="muted small">{specLine(model)}</p>
        </section>

        {noModel && <ErrorBox error={{ message: 'No trained model checkpoint found.', hint: model?.checkpoint_error?.hint }} />}

        <section className="section">
          <div className="row between">
            <h2>Input</h2>
            <div className="seg">
              <button className={tab === 'demo' ? 'on' : ''} onClick={() => setTab('demo')}>Demo scenes</button>
              <button className={tab === 'upload' ? 'on' : ''} onClick={() => setTab('upload')}>Upload</button>
            </div>
          </div>

          {tab === 'demo' ? (
            <>
              <p className="muted small">Demo Dataset: real Sentinel-2 L2A subsets (Copernicus, via AWS Open Data). No 4 m reference exists for them.</p>
              {scenes.length === 0 && <p className="muted">No demo scenes found. Run <code>python -m resozera.fetch_regions --groups demo</code>.</p>}
              <div className="scenes">
                {scenes.map((s) => (
                  <button key={s.id} className={`scene ${selected === s.id ? 'on' : ''}`} onClick={() => setSelected(s.id)} disabled={running}>
                    <img src={api.previewUrl(s.id)} alt="" loading="lazy" />
                    <span>
                      <strong>{s.name}</strong>
                      <span className="muted small">{s.application} · {s.acquired?.slice(0, 10)} · cloud {Number(s.cloud_cover).toFixed(2)}%</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="upload">
              <label className="field">
                <span>Sentinel-2 L2A bands</span>
                <input type="file" multiple accept=".tif,.tiff,.jp2,.xml,.json" onChange={(e) => setFiles([...e.target.files])} disabled={running} />
                <span className="small muted">One GeoTIFF stacked B02, B03, B04, B08 (optional SCL as band 5), or separate files named with B02 / B03 / B04 / B08 (optional SCL). Add MTD_MSIL2A.xml to detect the reflectance offset.</span>
              </label>
              <label className="field">
                <span>Reflectance offset (BOA_ADD_OFFSET)</span>
                <select value={boaOffset} onChange={(e) => setBoaOffset(e.target.value)} disabled={running}>
                  <option value="auto">Auto-detect from MTD_MSIL2A.xml (else 0)</option>
                  <option value="-1000">−1000 · processing baseline ≥ 04.00 (from 25 Jan 2022)</option>
                  <option value="0">0 · processing baseline &lt; 04.00</option>
                </select>
              </label>
              <label className="field">
                <span>High-resolution reference (optional)</span>
                <input type="file" accept=".tif,.tiff" onChange={(e) => setReference(e.target.files[0] || null)} disabled={running} />
                <span className="small muted">Real 4-band (B, G, R, NIR) image of the same area; enables 4 m accuracy metrics.</span>
              </label>
              {files.length > 0 && <p className="small mono">{files.map((f) => f.name).join(', ')}</p>}
            </div>
          )}

          <ModelSelector models={models} value={modelKey} onChange={setModelKey}
                         mcPasses={mcPasses} onMcPasses={setMcPasses} disabled={running} />

          <div className="row">
            <button className="btn" onClick={run} disabled={!canRun}>{running ? 'Running…' : 'Run super-resolution'}</button>
            <span className="muted small">10 m → ~4 m (×2.5), 4 bands</span>
          </div>
        </section>

        <ErrorBox error={error} onClose={() => setError(null)} />
        {job && job.stages?.length > 0 && <ProcessingStages job={job} />}

        {res && (
          <div ref={resultsRef}>
            <section className="section">
              <div className="row between">
                <h2>Comparison</h2>
                <div className="seg">
                  <button className={composite === 'rgb' ? 'on' : ''} onClick={() => setComposite('rgb')}>True colour</button>
                  <button className={composite === 'cir' ? 'on' : ''} onClick={() => setComposite('cir')}>False colour (NIR)</button>
                </div>
              </div>
              <p className="muted small">
                {res.input.width}×{res.input.height} px at {res.input.resolution_m} m → {res.output.width}×{res.output.height} px at ~{res.output.resolution_m} m ·
                featured: {res.model.name} ({res.model.parameters.toLocaleString('en-US')} params) · {res.processing.device.toUpperCase()} · {job.elapsed_s.toFixed(1)} s
              </p>
              {res.fallback && <div className="notice notice-warn small">ResoZera MVP was unavailable, so the featured result is EDSR. See notes below.</div>}
              <ComparisonViewer key={panels.length} panels={panels} aspect={res.input.width / res.input.height} />
              <p className="muted small">All panels share one contrast stretch computed from the input; no sharpening or other filtering is applied for display. Reconstructed detail is learned from data and is not information the 10 m sensor recorded.</p>
            </section>

            <InspectionPanel res={res} panels={panels} />
            <MetricsPanel metrics={res.metrics} />
            <UncertaintyPanel res={res} />
            <MapView geo={res.geo} urls={res.urls} />

            <section className="section">
              <h2>Downloads</h2>
              <div className="cols">
                <div>
                  <h3>GeoTIFF (geospatial product)</h3>
                  <ul>
                    {res.urls.geotiff_mvp && <li><a href={res.urls.geotiff_mvp} download>ResoZera MVP ~4 m{res.uncertainty.available ? ' (MC mean)' : ''}</a></li>}
                    {res.urls.geotiff_edsr && <li><a href={res.urls.geotiff_edsr} download>EDSR ~4 m</a></li>}
                    {res.urls.geotiff_uncertainty && <li><a href={res.urls.geotiff_uncertainty} download>Uncertainty (MC std-dev, float32)</a></li>}
                    <li><a href={res.urls.geotiff_bicubic} download>Bicubic ~4 m</a></li>
                    <li><a href={res.urls.geotiff_input} download>Input 10 m (masked)</a></li>
                  </ul>
                  <p className="small muted">4 bands B02 B03 B04 B08, uint16 L2A DN, CRS and geotransform preserved, nodata 0.</p>
                </div>
                <div>
                  <h3>Visualization (PNG) and reports</h3>
                  <ul>
                    {res.urls.png_mvp_rgb && <li><a href={res.urls.png_mvp_rgb} target="_blank" rel="noreferrer">MVP true colour</a></li>}
                    {res.urls.png_edsr_rgb && <li><a href={res.urls.png_edsr_rgb} target="_blank" rel="noreferrer">EDSR true colour</a></li>}
                    {res.urls.png_uncertainty && <li><a href={res.urls.png_uncertainty} target="_blank" rel="noreferrer">Uncertainty heatmap</a></li>}
                    <li><a href={res.urls.metrics_json} target="_blank" rel="noreferrer">metrics.json</a> · <a href={res.urls.result_json} target="_blank" rel="noreferrer">result.json</a></li>
                  </ul>
                </div>
              </div>
              {res.notes?.length > 0 && (
                <details className="notes">
                  <summary className="small">Processing notes ({res.notes.length})</summary>
                  <ul className="small">{res.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                </details>
              )}
            </section>
          </div>
        )}

        <ModelInfo models={models} />
      </main>

      <footer className="foot small muted">ResoZera · SIH26142</footer>
    </div>
  )
}
