const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export function saveToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export function isLoggedIn() {
  return !!getToken()
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

async function requestForm(method, path, formData) {
  // Let the browser set Content-Type (includes multipart boundary)
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData })

  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

export const api = {
  get:      (path)             => request('GET',    path),
  post:     (path, body)       => request('POST',   path, body),
  postForm: (path, formData)   => requestForm('POST', path, formData),
  patch:    (path, body)       => request('PATCH',  path, body),
  delete:   (path)             => request('DELETE', path),
}
