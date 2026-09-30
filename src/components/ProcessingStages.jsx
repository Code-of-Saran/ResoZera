// Shows the backend's real pipeline stage (no fabricated percentages).
export default function ProcessingStages({ job }) {
  if (!job) return null
  const stages = job.stages || []
  return (
    <section className="card processing" aria-live="polite">
      <div className="card-head">
        <h2>Processing</h2>
        <span className="muted mono">{job.elapsed_s != null ? `${job.elapsed_s.toFixed(1)} s elapsed` : ''}</span>
      </div>
      {job.status === 'queued' && <p className="muted">Queued — waiting for the GPU worker…</p>}
      <ol className="stages">
        {stages.map((s) => (
          <li key={s.key} className={`stage stage-${s.state}`}>
            <span className="stage-icon" aria-hidden="true">
              {s.state === 'done' ? '✓' : s.state === 'failed' ? '✕' : s.state === 'active' ? <span className="spinner" /> : '•'}
            </span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
