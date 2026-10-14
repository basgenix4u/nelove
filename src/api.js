/** Typed API client — same-origin fetch, CSRF double-submit, normalized errors. */

function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)nelove_csrf=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export class ApiError extends Error {
  constructor(message, { code, status, fields } = {}) {
    super(message)
    this.code = code || 'ERROR'
    this.status = status || 0
    this.fields = fields || null
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'x-csrf-token': csrfToken() } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Network hiccup — check your connection and try again', { code: 'NETWORK' })
  }
  let data = null
  try { data = await res.json() } catch { /* non-json */ }
  if (!res.ok) {
    const e = data?.error || {}
    throw new ApiError(e.message || `Something went wrong (${res.status})`, {
      code: e.code || 'HTTP_' + res.status,
      status: res.status,
      fields: e.fields,
    })
  }
  return data
}

export const api = {
  /* storefront */
  home: () => request('/api/home'),
  catalog: () => request('/api/catalog'),
  product: (id) => request(`/api/products/${encodeURIComponent(id)}`),
  productReviews: (id) => request(`/api/products/${encodeURIComponent(id)}/reviews`),
  postReview: (id, body) => request(`/api/products/${encodeURIComponent(id)}/reviews`, { method: 'POST', body }),
  markHelpful: (productId, reviewId) => request(`/api/products/${encodeURIComponent(productId)}/reviews/${reviewId}/helpful`, { method: 'POST' }),
  validateDiscount: (code, subtotal) =>
    request(`/api/discounts/validate?code=${encodeURIComponent(code)}&subtotal=${Math.round(subtotal)}`),
  subscribe: (email) => request('/api/subscribe', { method: 'POST', body: { email } }),

  /* auth */
  me: () => request('/api/auth/me'),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  updateProfile: (body) => request('/api/auth/profile', { method: 'PATCH', body }),

  /* orders + payments */
  quote: (body) => request('/api/orders/quote', { method: 'POST', body }),
  placeOrder: (body) => request('/api/orders', { method: 'POST', body }),
  myOrders: () => request('/api/orders/mine'),
  payInitialize: (orderNumber) => request('/api/pay/initialize', { method: 'POST', body: { orderNumber } }),
  payVerify: (reference) => request(`/api/pay/verify?reference=${encodeURIComponent(reference)}`),

  /* admin */
  admin: {
    stats: () => request('/api/admin/stats'),
    products: (q = '') => request(`/api/admin/products${q ? `?search=${encodeURIComponent(q)}` : ''}`),
    product: (id) => request(`/api/admin/products/${encodeURIComponent(id)}`),
    createProduct: (body) => request('/api/admin/products', { method: 'POST', body }),
    updateProduct: (id, body) => request(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'PUT', body }),
    archiveProduct: (id) => request(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createCategory: (body) => request('/api/admin/categories', { method: 'POST', body }),
    updateCategory: (slug, body) => request(`/api/admin/categories/${encodeURIComponent(slug)}`, { method: 'PUT', body }),
    deleteCategory: (slug) => request(`/api/admin/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
    orders: ({ status = '', search = '' } = {}) =>
      request(`/api/admin/orders${status || search ? `?status=${status}&search=${encodeURIComponent(search)}` : ''}`),
    order: (id) => request(`/api/admin/orders/${id}`),
    setOrderStatus: (id, status, note) => request(`/api/admin/orders/${id}/status`, { method: 'PUT', body: { status, note } }),
    customers: () => request('/api/admin/customers'),
    subscribers: () => request('/api/admin/subscribers'),
    reviews: (status = '') => request(`/api/admin/reviews${status ? `?status=${status}` : ''}`),
    moderateReview: (id, status) => request(`/api/admin/reviews/${id}`, { method: 'PUT', body: { status } }),
    deleteReview: (id) => request(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
    discounts: () => request('/api/admin/discounts'),
    createDiscount: (body) => request('/api/admin/discounts', { method: 'POST', body }),
    updateDiscount: (code, body) => request(`/api/admin/discounts/${encodeURIComponent(code)}`, { method: 'PUT', body }),
    deactivateDiscount: (code) => request(`/api/admin/discounts/${encodeURIComponent(code)}`, { method: 'DELETE' }),
    saveContent: (body) => request('/api/admin/content', { method: 'PUT', body }),
    saveSettings: (body) => request('/api/admin/settings', { method: 'PUT', body }),
    uploadsConfig: () => request('/api/admin/uploads/config'),
    cloudinarySignature: () => request('/api/admin/uploads/signature'),
  },
}

/** Upload one image file — signed Cloudinary when configured, otherwise local disk. */
export async function uploadImage(file, config = { provider: 'local' }) {
  if (config.provider === 'cloudinary') {
    const sig = await api.admin.cloudinarySignature()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', sig.timestamp)
    fd.append('folder', sig.folder)
    fd.append('signature', sig.signature)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new ApiError(data?.error?.message || 'Cloudinary upload failed', { code: 'UPLOAD' })
    return data.secure_url
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'x-csrf-token': csrfToken() },
    body: fd,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error?.message || 'Upload failed', { code: data?.error?.code || 'UPLOAD' })
  return data.url
}
