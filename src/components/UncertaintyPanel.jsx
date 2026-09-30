import ComparisonViewer from './ComparisonViewer.jsx'

const fmt = (v) => Number(v).toFixed(4)

export default function UncertaintyPanel({ res }) {
  const u = res.uncertainty
  if (!res.models?.swin_mvp?.output_tag) return null
  return (
    <section className="section">
      <div className="card-head">
        <h2>Reconstruction Uncertainty</h2>
        <span className="muted small">ResoZera MVP · {u.method}{u.available ? ` · ${u.passes} stochastic passes` : ''}</span>
      </div>
      {!u.available ? (
        <div className="notice">
          <strong>Uncertainty unavailable.</strong>{' '}
          {u.message || 'MC Dropout was disabled for this run (0 passes). Select ResoZera MVP with ≥ 2 passes.'}
        </div>
      ) : (
        <>
          <p className="small">Higher uncertainty indicates regions where the model has lower confidence in reconstructed fine-scale details.</p>
          <ComparisonViewer
            aspect={res.input.width / res.input.height}
            panels={[
              { key: 'mvp', title: 'ResoZera MVP', subtitle: `SR mean of ${u.passes} passes · ~${res.output.resolution_m} m`, src: res.urls.png_mvp_rgb },
              { key: 'unc', title: 'Uncertainty', subtitle: 'MC Dropout standard deviation', src: res.urls.png_uncertainty },
            ]}
          />
          <div className="legend">
            <span className="small">Lower uncertainty</span>
            <span className="legend-bar" style={{ background: `linear-gradient(90deg, ${u.colormap.join(', ')})` }} />
            <span className="small">Higher uncertainty</span>
          </div>
          <p className="small muted legend-scale mono">
            scale 0 → {fmt(u.scale_max)} (99th percentile) · reflectance std-dev, mean of 4 bands
          </p>
          <dl className="kv">
            <div><dt>Mean std-dev</dt><dd className="mono">{fmt(u.mean)}</dd></div>
            <div><dt>Median</dt><dd className="mono">{fmt(u.median)}</dd></div>
            <div><dt>Max</dt><dd className="mono">{fmt(u.max)}</dd></div>
            {u.edge_correlation != null && (
              <div><dt>Uncertainty vs. local edge strength</dt>
                <dd>r = <span className="mono">{u.edge_correlation.toFixed(2)}</span> (higher at roads, boundaries, buildings if positive)</dd></div>
            )}
            {u.error_correlation_reduced_resolution != null && (
              <div><dt>Uncertainty vs. actual error</dt>
                <dd>Pearson r = <span className="mono">{u.error_correlation_reduced_resolution.toFixed(2)}</span> on the reduced-resolution check</dd></div>
            )}
          </dl>
          <p className="small muted">
            Uncertainty is the spread of the model's own predictions, not a measure of accuracy, and low uncertainty
            does not prove a reconstruction is correct. The correlation above compares it with the real error where a
            reference exists (the 25 m → 10 m check); values near 0 would mean it carries little information about error.
          </p>
        </>
      )}
    </section>
  )
}
