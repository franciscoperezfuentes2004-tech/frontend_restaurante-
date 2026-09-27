import client from './client'

export async function adminGetCosts() {
  return client.get('/admin/costs')
}
