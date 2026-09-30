const ORDER = ['psnr', 'ssim', 'sam', 'ergas']
const DIGITS = { psnr: 2, ssim: 4, sam: 3, ergas: 3, edge_ratio: 3, hf_snr: 2 }

function Table({ block, info, methods, labels }) {
  const rows = methods.filter((m) => block[m])
  const edge = block.edge || {}
  const hasEdge = rows.every((m) => edge[m])
  const best = {}
  for (const k of ORDER) {
    const vals = rows.map((m) => block[m][k])
    best[k] = info[k].better === 'higher' ? Math.max(...vals) : Math.min(...vals)
  }
  if (hasEdge) {
    best.hf_snr = Math.max(...rows.map((m) => edge[m].hf_snr))
    best.edge_ratio = rows.map((m) => edge[m].edge_ratio).reduce((a, b) => (Math.abs(b - 1) < Math.abs(a - 1) ? b : a))
  }
  return (
    <div className="table-wrap">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Method</th>
            {ORDER.map((k) => (
              <th key={k}>{info[k].label}{info[k].unit ? ` (${info[k].unit})` : ''}<small>{info[k].better === 'higher' ? '↑' : '↓'}</small></th>
            ))}
            {hasEdge && <th title="mean |gradient| of SR / reference">Edge ratio<small>→ 1</small></th>}
            {hasEdge && <th title="detail-band signal-to-error ratio">HF-SNR (dB)<small>↑</small></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m}>
              <th scope="row">{labels[m] || m}</th>
              {ORDER.map((k) => (
                <td key={k} className={block[m][k] === best[k] ? 'best' : ''}>{Number(block[m][k]).toFixed(DIGITS[k])}</td>
              ))}
              {hasEdge && <td className={edge[m].edge_ratio === best.edge_ratio ? 'best' : ''}>{edge[m].edge_ratio.toFixed(3)}</td>}
              {hasEdge && <td className={edge[m].hf_snr === best.hf_snr ? 'best' : ''}>{edge[m].hf_snr.toFixed(2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Only numbers computed by the backend are displayed; unavailable validation is explained.
export default function MetricsPanel({ metrics }) {
  if (!metrics) return null
  const { info, labels = {}, methods = ['bicubic', 'edsr'] } = metrics
  const full = metrics.full_resolution
  const rr = metrics.reduced_resolution
  return (
    <section className="section">
      <h2>Accuracy</h2>

      <h3>10 m → 4 m (target resolution)</h3>
      {full?.available ? (
        <>
          <p className="muted small">{full.description} Reference: <span className="mono">{full.reference}</span> · {full.valid_pixels.toLocaleString('en-US')} valid pixels.</p>
          <Table block={full} info={info} methods={methods} labels={labels} />
        </>
      ) : (
        <p className="small"><strong>{full?.message || 'Validation unavailable — high-resolution reference required.'}</strong>{' '}
          <span className="muted">No co-registered 4 m reference exists for this scene, so accuracy at the target resolution cannot be measured.</span></p>
      )}

      {rr && (
        <>
          <h3>25 m → 10 m proxy (Wald protocol)</h3>
          {rr.available ? (
            <>
              <p className="muted small">{rr.description}</p>
              <Table block={rr} info={info} methods={methods} labels={labels} />
              <p className="muted small">Best value per column highlighted · {rr.valid_pixels.toLocaleString('en-US')} cloud-free pixels · Edge ratio = SR edge strength ÷ reference (1 = matches, &lt;1 smoother, &gt;1 over-sharpened) · HF-SNR = fidelity of the fine-detail band. These are proxy numbers, not 4 m ground-truth accuracy.</p>
            </>
          ) : (
            <p className="small muted">Unavailable: {rr.message}</p>
          )}
        </>
      )}
    </section>
  )
}
