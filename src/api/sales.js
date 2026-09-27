import client from './client'

export async function adminGetSales(params = {}) {
  return client.get('/admin/sales', { params })
}
