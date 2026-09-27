import client from './client'

/**
 * GET /admin/usuarios/stats
 * Devuelve las estadísticas de usuarios (total_cuentas, activos, inactivos)
 */
export async function adminGetUsersStats() {
  return client.get('/admin/usuarios/stats')
}

/**
 * GET /admin/usuarios
 * Devuelve la lista paginada de usuarios con filtros (search, role, page, per_page)
 */
export async function adminGetUsers(params = {}) {
  return client.get('/admin/usuarios', { params })
}

/**
 * POST /admin/usuarios
 * Crear nuevo usuario
 */
export async function adminCreateUser(data) {
  return client.post('/admin/usuarios', data)
}

/**
 * PUT /admin/usuarios/{id}
 * Actualizar usuario existente (nombre, teléfono, correo, rol, etc.)
 */
export async function adminUpdateUser(id, data) {
  return client.put(`/admin/usuarios/${id}`, data)
}

/**
 * DELETE /admin/usuarios/{id}
 * Eliminar usuario
 */
export async function adminDeleteUser(id) {
  return client.delete(`/admin/usuarios/${id}`)
}

/**
 * PATCH /admin/usuarios/{id}/toggle
 * Alternar estado activo/inactivo del usuario
 */
export async function adminToggleUserStatus(id, newStatus = null) {
  try {
    return await client.patch(`/admin/usuarios/${id}/toggle`, { status: newStatus })
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return await client.put(`/admin/usuarios/${id}`, { status: newStatus })
    }
    throw err
  }
}

/**
 * PATCH /admin/usuarios/{id}/reset-password
 * Resetear contraseña de un usuario (solo admin y super_admin)
 */
export async function adminResetUserPassword(id, data = {}) {
  return client.patch(`/admin/usuarios/${id}/reset-password`, data)
}
