import client from './client'

export const getPromotions    = ()          => client.get('/admin/promotions')
export const createPromotion  = (data)      => client.post('/admin/promotions', data)
export const updatePromotion  = (id, data)  => client.put(`/admin/promotions/${id}`, data)
export const deletePromotion  = (id)        => client.delete(`/admin/promotions/${id}`)
export const togglePromotion  = (id)        => client.patch(`/admin/promotions/${id}/toggle`)
