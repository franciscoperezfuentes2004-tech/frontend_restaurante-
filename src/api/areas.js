import client from './client'

export const getAreas  = ()          => client.get('/admin/areas')
export const createArea = (data)     => client.post('/admin/areas', data)
export const updateArea = (id, data) => client.put(`/admin/areas/${id}`, data)
export const deleteArea = (id)       => client.delete(`/admin/areas/${id}`)

export const toggleAreaStatus = (id, active) => {
  return client.patch(`/admin/areas/${id}/toggle`, { active })
    .catch(() => client.put(`/admin/areas/${id}`, { active: active ? 1 : 0 }))
}

export const createAreaTable = (areaId, data) => client.post(`/admin/areas/${areaId}/tables`, data)
export const updateAreaTable = (areaId, tableId, data) => client.put(`/admin/areas/${areaId}/tables/${tableId}`, data)
export const deleteAreaTable = (areaId, tableId) => client.delete(`/admin/areas/${areaId}/tables/${tableId}`)

export const getMesasByArea = (areaId) => client.get(`/admin/areas/${areaId}/mesas`)
export const getAllMesas = () => client.get('/admin/areas').then(async (res) => {
  const areas = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.areas)
        ? res.data.areas
        : []
  const mesasPorArea = await Promise.all(
    areas.map(area => 
      client.get(`/admin/areas/${area.id}/mesas`)
        .then(r => {
          const mesas = Array.isArray(r.data)
            ? r.data
            : Array.isArray(r.data?.mesas)
              ? r.data.mesas
              : Array.isArray(r.data?.data)
                ? r.data.data
                : []
          return mesas.map(m => ({
            id:       m.id,
            numero:   m.numero_mesa,
            capacidad: m.capacidad,
            estado:   m.estado ?? (m.is_active ? 'libre' : 'inactiva'),
            area:     area.nombre ?? area.name ?? '',
            area_id:  area.id,
            pedido:   m.orden_activa ?? null,
          }))
        })
        .catch(() => [])
    )
  )
  return { data: mesasPorArea.flat() }
})
