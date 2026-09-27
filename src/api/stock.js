import client from './client'

export async function adminGetStock(params = {}) {
  return client.get('/admin/stock', { params })
}

export async function adminPostStockEntry(data) {
  return client.post('/admin/stock/entry', data)
}

export async function adminPostStockAdjustment(data) {
  return client.post('/admin/stock/adjustment', data)
}

export async function adminPatchStockMin(ingredientId, data) {
  return client.patch(`/admin/stock/${ingredientId}/min`, data)
}

export async function adminGetStockMovements(params = {}) {
  return client.get('/admin/stock/movements', { params })
}

export async function adminGetStockMetrics() {
  return client.get('/admin/stock/metrics')
}
