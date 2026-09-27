import client from './client'

export async function adminGetSuppliers(params = {}) {
  return client.get('/admin/suppliers', { params })
}

export async function adminGetSupplierSpecialties() {
  return client.get('/admin/suppliers/specialties')
}

export async function adminCreateSupplierSpecialty(data) {
  return client.post('/admin/suppliers/specialties', data)
}

export async function adminCreateSupplier(data) {
  return client.post('/admin/suppliers', data)
}

export async function adminUpdateSupplier(id, data) {
  return client.put(`/admin/suppliers/${id}`, data)
}

export async function adminDeleteSupplier(id) {
  return client.delete(`/admin/suppliers/${id}`)
}

export async function adminToggleSupplierStatus(id) {
  return client.patch(`/admin/suppliers/${id}/toggle`)
}
