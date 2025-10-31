import { clearSession, readSession } from '../lib/session'

const trimTrailingSlashes = (value) => String(value).replace(/\/+$/, '')

const DEV_SERVER_PORTS = new Set(['5173', '5174', '4173', '4174'])
const FALLBACK_DEV_BACKEND_PORT = String(import.meta?.env?.VITE_API_DEV_PORT || 3000)

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return trimTrailingSlashes(window.__API_BASE_URL__)
  }

  const envValue = import.meta?.env?.VITE_API_BASE_URL
  if (envValue) {
    return trimTrailingSlashes(envValue)
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol = 'http:', hostname = 'localhost', port = '' } = window.location
    const normalizedHost = hostname || 'localhost'
    const normalizedPort = port || ''
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(normalizedHost)

    if (isLocalHost && DEV_SERVER_PORTS.has(normalizedPort)) {
      const guessedOrigin = `${protocol}//${normalizedHost}:${FALLBACK_DEV_BACKEND_PORT}`
      return trimTrailingSlashes(guessedOrigin)
    }

    const origin = `${protocol}//${normalizedHost}${normalizedPort ? `:${normalizedPort}` : ''}`
    return trimTrailingSlashes(origin)
  }

  return 'http://localhost:3000'
}

const API_BASE_URL = resolveBaseUrl()

const isAbsoluteUrl = (input) => /^https?:\/\//i.test(input)

const buildUrl = (input) => {
  if (!input) return API_BASE_URL
  if (isAbsoluteUrl(input)) return input
  if (input.startsWith('/')) {
    return `${API_BASE_URL}${input}`
  }
  return `${API_BASE_URL}/${input}`
}

const apiFetch = async (input, init = {}) => {
  const session = readSession()
  const headers = new Headers(init.headers || {})

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `${session.tokenType || 'Bearer'} ${session.token}`)
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const response = await fetch(buildUrl(input), {
    ...init,
    headers
  })

  if (response.status === 401) {
    clearSession()
  }

  return response
}

export default apiFetch
