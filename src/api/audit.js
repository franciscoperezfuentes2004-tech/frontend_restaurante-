import client from './client'

/**
 * Fetch paginated audit logs with optional filters
 * GET /admin/bitacora
 */
export async function adminGetAuditLogs(params = {}) {
  return client.get('/admin/bitacora', { params })
}

/**
 * Export audit logs in Excel / CSV / PDF format
 * GET /admin/bitacora/export/{format}
 */
export async function adminExportAuditLogs(format = 'excel', params = {}) {
  return client.get(`/admin/bitacora/export/${format}`, {
    params,
    responseType: 'blob',
  })
}
