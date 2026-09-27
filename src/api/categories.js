import client from './client'

export const getCategories         = ()         => client.get('/public/categories').catch(() => client.get('/categories'))
export const getPublicCategories   = ()         => client.get('/public/categories')
export const getCategoryIndicators = ()         => client.get('/admin/categories/indicators')
export const createCategory        = (data)     => client.post('/admin/categories', data)
export const updateCategory        = (id, data) => client.put(`/admin/categories/${id}`, data)
export const deleteCategory        = (id)       => client.delete(`/admin/categories/${id}`)
export const toggleCategory        = (id)       => client.patch(`/admin/categories/${id}/toggle`)
