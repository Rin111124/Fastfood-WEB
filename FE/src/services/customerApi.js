import apiFetch from './apiClient'

const parseJson = async (response) => {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'He thong dang ban. Vui long thu lai sau.'
        : 'Khong the thuc hien yeu cau. Vui long kiem tra lai.')
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body?.data ?? null
}

const get = (url) => apiFetch(url).then(parseJson)

const post = (url, payload) =>
  apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(parseJson)

const patch = (url, payload) =>
  apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(parseJson)

export const customerApi = {
  getDashboard: () => get('/api/customer/dashboard'),
  listProducts: (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.categoryId) query.set('categoryId', params.categoryId)
    if (params.limit) query.set('limit', params.limit)
    return get(`/api/customer/products${query.toString() ? `?${query.toString()}` : ''}`)
  },
  getProfile: () => get('/api/customer/me'),
  updateProfile: (payload) => patch('/api/customer/me', payload),
  listOrders: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    return get(`/api/customer/orders${query.toString() ? `?${query.toString()}` : ''}`)
  },
  getOrder: (orderId) => get(`/api/customer/orders/${orderId}`),
  createOrder: (payload) => post('/api/customer/orders', payload),
  cancelOrder: (orderId) => post(`/api/customer/orders/${orderId}/cancel`, {})
}

export default customerApi
