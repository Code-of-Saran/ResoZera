// MODEL  ○ EDSR — Phase 1   ● ResoZera MVP — CNN + Swin
export default function ModelSelector({ models, value, onChange, mcPasses, onMcPasses, disabled }) {
  if (!models) return null
  const order = ['edsr', 'swin_mvp']
  const mvp = models.swin_mvp
  return (
    <fieldset className="model-select" disabled={disabled}>
      <legend>Model</legend>
      <div className="model-options">
        {order.filter((k) => models[k]).map((k) => {
          const m = models[k]
          return (
            <label key={k} className={`model-option ${value === k ? 'on' : ''}`}>
              <input type="radio" name="model" value={k} checked={value === k} onChange={() => onChange(k)} />
              <span>
                <strong>{m.label}</strong>
                <span className="small muted">
                  {m.residual_blocks} residual blocks{m.attention_blocks ? ` · ${m.attention_blocks} attention blocks` : ''} · {(m.parameters / 1e6).toFixed(2)}M params
                  {m.uncertainty && m.uncertainty !== 'none' ? ` · ${m.uncertainty}` : ''}
                </span>
                {!m.available && <span className="small warn-text">Checkpoint missing — {k === 'edsr' ? 'unavailable' : 'will fall back to EDSR'}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {value === 'swin_mvp' && mvp && (
        <label className="mc-field small">
          MC Dropout passes
          <input type="number" min={0} max={50} value={mcPasses}
                 onChange={(e) => onMcPasses(Math.max(0, Math.min(50, parseInt(e.target.value || '0', 10))))} />
          <span className="muted">{mcPasses >= 2 ? 'uncertainty map enabled' : 'uncertainty off (0 = disabled; minimum 2)'}</span>
        </label>
      )}
      <p className="small muted">Both available models are always run on the scene for comparison; the selected one is the featured product.</p>
    </fieldset>
  )
}
