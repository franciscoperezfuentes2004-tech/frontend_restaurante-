import client from './client'

// Delivery Monitoring Endpoints
export const getDeliveryOrders         = (params)     => client.get('/admin/delivery/orders', { params })
export const getDeliveryOrderDetail    = (id)         => client.get(`/admin/delivery/orders/${id}`)
export const getDeliveryQr             = (orderId)    => client.get(`/admin/delivery/qr/${orderId}`)
export const updateDeliveryOrderStatus = (id, status) => client.patch(`/admin/delivery/orders/${id}/status`, { status })
export const scanDriverQr              = (data)       => client.post('/driver/scan-qr', data)
export const getDeliveryPerformance    = (filtro = 'mes') => {
  const filterParam = typeof filtro === 'object' ? (filtro?.filtro || 'mes') : (filtro || 'mes')
  return client.get(`/reportes/kpis-rendimiento?filtro=${filterParam}`)
    .catch(() => client.get(`/admin/delivery/performance?filtro=${filterParam}`))
    .catch(() => client.get('/admin/delivery/performance'))
}
export const getIngresosDelivery       = (filtro = 'mes') => client.get(`/reportes/ingresos-delivery?filtro=${filtro}`).catch(() => client.get(`/admin/reportes/ingresos-delivery?filtro=${filtro}`))

// Deliveries legacy
export const getDeliveries             = (params)     => client.get('/admin/deliveries', { params })
export const updateDelivery           = (id, data)   => client.patch(`/admin/deliveries/${id}`, data)

// Drivers
export const getDrivers                = (params)     => client.get('/admin/drivers', { params })
export const createDriver             = (data)       => client.post('/admin/drivers', data)
export const updateDriver             = (id, data)   => client.put(`/admin/drivers/${id}`, data)
export const deleteDriver             = (id)         => client.delete(`/admin/drivers/${id}`)
export const toggleDriver             = (id)         => client.patch(`/admin/drivers/${id}/toggle`)

// Zones
export const getZones                  = ()           => client.get('/admin/zones')
export const createZone                = (data)       => client.post('/admin/zones', data)
export const updateZone                = (id, data)   => client.put(`/admin/zones/${id}`, data)
export const deleteZone                = (id)         => client.delete(`/admin/zones/${id}`)
