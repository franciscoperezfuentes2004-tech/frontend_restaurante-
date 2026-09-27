import client from './client'

export async function adminGetIngredients(params = {}) {
  return client.get('/admin/ingredients', { params })
}

export async function adminGetIngredientCategories() {
  return client.get('/admin/ingredients/categories')
}

export async function adminCreateIngredientCategory(data) {
  return client.post('/admin/ingredients/categories', data)
}

export async function adminCreateIngredient(data) {
  return client.post('/admin/ingredients', data)
}

export async function adminUpdateIngredient(id, data) {
  return client.put(`/admin/ingredients/${id}`, data)
}

export async function adminDeleteIngredient(id) {
  return client.delete(`/admin/ingredients/${id}`)
}

export async function adminGetSuppliers() {
  return client.get('/admin/suppliers')
}
