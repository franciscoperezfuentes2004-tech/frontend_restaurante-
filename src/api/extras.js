import client from './client'

export const getExtras  = ()         => client.get('/admin/extras')
export const createExtra = (data)    => client.post('/admin/extras', data)
export const updateExtra = (id, data)=> client.put(`/admin/extras/${id}`, data)
export const deleteExtra = (id)      => client.delete(`/admin/extras/${id}`)
