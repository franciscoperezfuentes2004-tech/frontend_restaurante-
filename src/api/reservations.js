import client from './client'

export const getReservations         = (params)        => client.get('/admin/reservations', { params })
export const createReservation       = (data)          => client.post('/admin/reservations', data)
export const updateReservation       = (id, data)      => client.put(`/admin/reservations/${id}`, data)
export const updateReservationStatus = (id, status)    => client.patch(`/admin/reservations/${id}/status`, { status })
export const deleteReservation       = (id)            => client.delete(`/admin/reservations/${id}`)
