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

// Multipart upload: no content-type header, so the browser sets the boundary itself.
async function upload(path, file, { onProgress } = {}) {
  const form = new FormData()
  form.append('file', file)

  // XHR rather than fetch, because it reports progress for large images.
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${BASE}${path}`)
    request.withCredentials = true
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      let payload = null
      try {
        payload = JSON.parse(request.responseText)
      } catch {
        payload = null
      }
      if (request.status >= 200 && request.status < 300) resolve(payload)
      else reject(new ApiError(request.status, payload?.error || 'Upload failed', payload?.details))
    }
    request.onerror = () => reject(new ApiError(0, 'Cannot reach the server. Is the API running?'))
    request.onabort = () => reject(new ApiError(0, 'Upload cancelled'))
    request.send(form)
  })
}

export const api = {
  get: (path, options) => request('GET', path, undefined, options),
  post: (path, body, options) => request('POST', path, body ?? {}, options),
  put: (path, body, options) => request('PUT', path, body ?? {}, options),
  patch: (path, body, options) => request('PATCH', path, body ?? {}, options),
  del: (path, options) => request('DELETE', path, undefined, options),
  upload,
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
  setShareEmails: (id, emails) => api.put(`/api/boards/${id}/share/emails`, { emails }),
  removeShareEmail: (id, email) => api.del(`/api/boards/${id}/share/emails/${encodeURIComponent(email)}`),
  setLinkSharing: (id, data) => api.post(`/api/boards/${id}/share/link`, data),

  createWish: (boardId, data) => api.post(`/api/boards/${boardId}/wishes`, data),
  updateWish: (id, data) => api.patch(`/api/wishes/${id}`, data),
  deleteWish: (id) => api.del(`/api/wishes/${id}`),

  sharedBoard: (token) => api.get(`/api/share/${token}`),

  listInvitations: () => api.get('/api/invitations'),
  acceptInvitation: (id) => api.post(`/api/invitations/${id}/accept`),
  declineInvitation: (id) => api.post(`/api/invitations/${id}/decline`),
  leaveBoard: (id) => api.del(`/api/invitations/${id}`),
  linkPreview: (url) => api.get('/api/meta/preview', { params: { url } }),
  uploadImage: (file, options) => api.upload('/api/uploads', file, options),
}
