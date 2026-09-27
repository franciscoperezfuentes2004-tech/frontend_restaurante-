import client from './client'

export const getNotifications = () =>
  client.get('/admin/notifications')

export const markNotificationAsRead = (id) =>
  client.post(`/admin/notifications/${id}/read`)

export const markAllNotificationsAsRead = () =>
  client.post('/admin/notifications/read-all')

export const clearAllNotifications = () =>
  client.delete('/admin/notifications')
