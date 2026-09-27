import client from './client'

export const getDashboard = (from, to, filter) =>
  client.get('/admin/dashboard', { 
    params: { 
      from, 
      to, 
      ...(filter ? { filter, range: filter } : {}) 
    } 
  })
