import client from './client'

export async function adminGetReports(params = {}) {
  return client.get('/admin/reports', { params })
}

export async function adminGetReportDetail(id) {
  return client.get(`/admin/reports/${id}`)
}

export async function adminGenerateReport(data) {
  return client.post('/admin/reports/generate', data)
}

export async function adminSendReport(id, data) {
  return client.post(`/admin/reports/${id}/send`, data)
}

export async function adminDeleteReport(id) {
  return client.delete(`/admin/reports/${id}`)
}

/* ── Reportes Programados ── */
export async function adminGetScheduledReports() {
  return client.get('/admin/reports/scheduled')
}

export async function adminCreateScheduledReport(data) {
  return client.post('/admin/reports/scheduled', data)
}

export async function adminUpdateScheduledReport(id, data) {
  return client.put(`/admin/reports/scheduled/${id}`, data)
}

export async function adminDeleteScheduledReport(id) {
  return client.delete(`/admin/reports/scheduled/${id}`)
}

export async function adminToggleScheduledReport(id) {
  return client.patch(`/admin/reports/scheduled/${id}/toggle`)
}
