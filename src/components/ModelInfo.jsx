// Expandable technical panel; every value comes from /api/models (model config + checkpoint).
function Rows({ m }) {
  const rows = [
    ['Architecture', m.architecture],
    ['Input', `${m.in_channels} bands (${m.bands.join(', ')})`],
    ['Features', m.features],
    [m.phase === 2 ? 'CNN Residual Blocks' : 'Residual Blocks', m.residual_blocks],
    ['Attention Blocks', m.attention_blocks || 'none'],
    ...(m.phase === 2 ? [['Window / heads', `${m.window_size}×${m.window_size} · ${m.heads} heads`],
                          ['Residual expansion', `×${m.residual_expansion}`]] : []),
    ['Uncertainty', m.uncertainty === 'none' ? 'none' : `${m.uncertainty} (${m.mc_passes_default} passes default, p = ${m.dropout})`],
    ['Upsampling', `×${m.scale} (${m.input_resolution_m} m → ~${m.output_resolution_m} m)`],
    ['Parameters', m.parameters.toLocaleString('en-US')],
    ['Loss', `L1 ×${m.loss.lambda_l1} + spectral ×${m.loss.lambda_spectral} + gradient ×${m.loss.lambda_gradient}`],
    ['Checkpoint', m.available
      ? `${m.checkpoint_path} · epoch ${m.checkpoint.epoch}/${m.checkpoint.epochs_configured ?? '?'} · val loss ${Number(m.checkpoint.best_val_loss).toFixed(5)} · trained on ${m.checkpoint.trained_on} pairs`
      : `missing (${m.checkpoint_path})`],
  ]
  return (
    <dl className="kv">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

export default function ModelInfo({ models }) {
  if (!models) return null
  return (
    <details className="card model-info">
      <summary><h2>Model information</h2><span className="muted small">Technical details read from the backend</span></summary>
      {['swin_mvp', 'edsr'].filter((k) => models[k]).map((k) => (
        <div key={k} className="model-info-block">
          <h3>{models[k].name} <span className="badge">Phase {models[k].phase}</span></h3>
          <Rows m={models[k]} />
        </div>
      ))}
    </details>
  )
}
