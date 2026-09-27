import client from './client'

export async function adminGetPayments(params = {}) {
  return client.get('/admin/payments', { params })
}

export async function adminGetPaymentDetail(id) {
  return client.get(`/admin/payments/${id}`)
}
