const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request(method, path, body, { params } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  }
  const qs = query.toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`

  let response
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?')
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload?.error || response.statusText, payload?.details)
  return payload
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body ?? {}, options),
  put: (path, body, options) => request('PUT', path, body ?? {}, options),
  patch: (path, body, options) => request('PATCH', path, body ?? {}, options),
  del: (path, options) => request('DELETE', path, undefined, options),
}

export const endpoints = {
  config: () => api.get('/api/config'),
  me: () => api.get('/api/auth/me'),
  googleLogin: (credential) => api.post('/api/auth/google', { credential }),
  logout: () => api.post('/api/auth/logout'),

  listBoards: () => api.get('/api/boards'),
  createBoard: (data) => api.post('/api/boards', data),
  getBoard: (id, token) => api.get(`/api/boards/${id}`, { params: { token } }),
  updateBoard: (id, data) => api.patch(`/api/boards/${id}`, data),
  deleteBoard: (id) => api.del(`/api/boards/${id}`),

  addShareEmails: (id, emails) => api.post(`/api/boards/${id}/share/emails`, { emails }),
  removeShareEmail: (id, email) => api.del(`/api/boards/${id}/share/emails/${encodeURIComponent(email)}`),
  setLinkSharing: (id, data) => api.post(`/api/boards/${id}/share/link`, data),

  createWish: (boardId, data) => api.post(`/api/boards/${boardId}/wishes`, data),
  updateWish: (id, data) => api.patch(`/api/wishes/${id}`, data),
  deleteWish: (id) => api.del(`/api/wishes/${id}`),

  sharedBoard: (token) => api.get(`/api/share/${token}`),
  linkPreview: (url) => api.get('/api/meta/preview', { params: { url } }),
}
