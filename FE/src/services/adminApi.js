import apiFetch from './apiClient'

const parseJson = async (response) => {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.message ||
      (response.status >= 500
        ? 'May chu dang gap su co. Vui long thu lai sau.'
        : 'Khong the thuc hien yeu cau. Vui long kiem tra lai du lieu.')
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

const put = (url, payload) =>
  apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(parseJson)

const patch = (url, payload) =>
  apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(parseJson)

const del = (url, payload) =>
  apiFetch(url, {
    method: 'DELETE',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  }).then(parseJson)

export const adminApi = {
  // users
  listUsers: (params = {}) => {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', params.limit)
    const queryString = query.toString()
    return get(`/api/admin/users${queryString ? `?${queryString}` : ''}`)
  },
  createUser: (payload) => post('/api/admin/users', payload),
  updateUser: (userId, payload) => put(`/api/admin/users/${userId}`, payload),
  setUserStatus: (userId, status) => patch(`/api/admin/users/${userId}/status`, { status }),
  deleteUser: (userId, options = {}) => del(`/api/admin/users/${userId}`, options),
  restoreUser: (userId) => post(`/api/admin/users/${userId}/restore`),
  resetUserPassword: (userId) => post(`/api/admin/users/${userId}/reset-password`),
  sendResetPasswordEmail: (userId) => post(`/api/admin/users/${userId}/send-reset-email`),

  // staff
  listStaff: (limit = 100) => get(`/api/admin/staff?limit=${limit}`),

  // categories
  listCategories: () => get('/api/admin/categories'),
  createCategory: (payload) => post('/api/admin/categories', payload),
  updateCategory: (categoryId, payload) => put(`/api/admin/categories/${categoryId}`, payload),
  deleteCategory: (categoryId) => del(`/api/admin/categories/${categoryId}`),

  // products
  listProducts: (params = {}) => {
    const query = new URLSearchParams()
    if (params.includeInactive === false) {
      query.set('includeInactive', 'false')
    }
    if (params.includeDeleted === true) {
      query.set('includeDeleted', 'true')
    }
    return get(`/api/admin/products${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createProduct: (payload) => post('/api/admin/products', payload),
  updateProduct: (productId, payload) => put(`/api/admin/products/${productId}`, payload),
  setProductAvailability: (productId, payload = {}) =>
    patch(`/api/admin/products/${productId}/availability`, payload),
  toggleProduct: (productId) => patch(`/api/admin/products/${productId}/availability`, {}),
  deleteProduct: (productId) => del(`/api/admin/products/${productId}`),

  // product options
  listProductOptions: (params = {}) => {
    if (typeof params === 'number' || typeof params === 'string') {
      const query = params ? `?productId=${params}` : ''
      return get(`/api/admin/product-options${query}`)
    }
    const query = new URLSearchParams()
    if (params.productId) {
      query.set('productId', params.productId)
    }
    if (params.includeDeleted === true) {
      query.set('includeDeleted', 'true')
    }
    if (params.includeInactive === false) {
      query.set('includeInactive', 'false')
    }
    const queryString = query.toString()
    return get(`/api/admin/product-options${queryString ? `?${queryString}` : ''}`)
  },
  createProductOption: (payload) => post('/api/admin/product-options', payload),
  updateProductOption: (optionId, payload) => put(`/api/admin/product-options/${optionId}`, payload),
  setProductOptionAvailability: (optionId, payload = {}) =>
    patch(`/api/admin/product-options/${optionId}/availability`, payload),
  toggleProductOption: (optionId) => patch(`/api/admin/product-options/${optionId}/availability`, {}),
  deleteProductOption: (optionId) => del(`/api/admin/product-options/${optionId}`),

  // orders
  listOrders: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.limit) query.set('limit', params.limit)
    if (params.search) query.set('search', params.search)
    return get(`/api/admin/orders${query.toString() ? `?${query.toString()}` : ''}`)
  },
  assignOrder: (orderId, payload) => post(`/api/admin/orders/${orderId}/assign`, payload),
  updateOrderStatus: (orderId, status) => patch(`/api/admin/orders/${orderId}/status`, { status }),
  refundOrder: (orderId, payload = {}) => post(`/api/admin/orders/${orderId}/refund`, payload),

  // promotions
  listPromotions: () => get('/api/admin/promotions'),
  createPromotion: (payload) => post('/api/admin/promotions', payload),
  updatePromotion: (promotionId, payload) => put(`/api/admin/promotions/${promotionId}`, payload),
  togglePromotion: (promotionId) => post(`/api/admin/promotions/${promotionId}/toggle`),

  // reports
  getReportOverview: () => get('/api/admin/reports/overview'),

  // settings
  listSettings: () => get('/api/admin/settings'),
  upsertSettings: (entries) => post('/api/admin/settings', Array.isArray(entries) ? entries : [entries]),

  // logs
  listLogs: (limit = 100) => get(`/api/admin/logs?limit=${limit}`),

  // inventory
  listInventory: () => get('/api/admin/inventory'),
  upsertInventoryItem: (payload) => post('/api/admin/inventory', payload),

  // backups
  listBackups: () => get('/api/admin/backups'),
  createBackup: () => post('/api/admin/backups'),
  restoreBackup: (fileName) => post(`/api/admin/backups/${encodeURIComponent(fileName)}/restore`),

  // shifts
  listShifts: () => get('/api/admin/shifts'),
  scheduleShift: (payload) => post('/api/admin/shifts', payload)
}

export default adminApi
