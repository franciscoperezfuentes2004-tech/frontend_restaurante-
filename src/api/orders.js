import client from './client'

export const getOrders      = (params)        => client.get('/admin/orders', { params })
export const getOrder       = (id)            => client.get(`/admin/orders/${id}`)
export const updateOrderStatus = (id, status) => client.patch(`/admin/orders/${id}/status`, { status })

// Para la vista de cocina
export const getKitchenOrders       = (params)      => client.get('/kitchen/orders', { params: params || { status: 'pending,preparing,ready' } })
export const updateKitchenOrderStatus = (id, status) => client.patch(`/kitchen/orders/${id}/status`, { status })
