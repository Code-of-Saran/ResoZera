// Thin client for the ResoZera FastAPI backend (proxied at /api in dev).
const BASE = import.meta.env.VITE_API_BASE || ''

async function parse(res) {
  let body = null
  try { body = await res.json() } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = body?.error?.message || body?.detail || `HTTP ${res.status}`
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    err.hint = body?.error?.hint
    throw err
  }
  return body
}

async function request(path, opts) {
  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch {
    const err = new Error('Cannot reach the ResoZera backend.')
    err.hint = 'Start it with: uvicorn backend.main:app --port 8000'
    throw err
  }
  return parse(res)
}

function appendOpts(fd, { model, mcPasses } = {}) {
  if (model) fd.append('model', model)
  if (mcPasses != null) fd.append('mc_passes', String(mcPasses))
}

export const api = {
  health: () => request('/api/health'),
  model: () => request('/api/model'),
  models: () => request('/api/models'),
  scenes: () => request('/api/scenes'),
  previewUrl: (id) => `${BASE}/api/scenes/${id}/preview`,
  startDemo: (sceneId, opts = {}) => {
    const fd = new FormData()
    fd.append('scene_id', sceneId)
    appendOpts(fd, opts)
    return request('/api/jobs', { method: 'POST', body: fd })
  },
  startUpload: (files, reference, boaOffset = 'auto', opts = {}) => {
    const fd = new FormData()
    fd.append('boa_offset', boaOffset)
    appendOpts(fd, opts)
    for (const f of files) fd.append('files', f)
    if (reference) fd.append('reference', reference)
    return request('/api/jobs', { method: 'POST', body: fd })
  },
  job: (id) => request(`/api/jobs/${id}`),
  url: (p) => BASE + p,
}
