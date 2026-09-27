import client from './client'

export const uploadImage = (file, folder = 'general') => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('folder', folder)

  return client.post('/admin/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const deleteImage = (path) =>
  client.delete('/admin/images/delete', { data: { path } })
