import client from './client'

/**
 * GET /admin/permisos/{rol}
 * Obtener permisos del rol especificado
 */
export async function getRolePermissions(roleId) {
  try {
    return await client.get(`/admin/permisos/${roleId}`)
  } catch (err) {
    if (err.response?.status === 404) {
      return await client.get(`/permisos/${roleId}`)
    }
    throw err
  }
}

/**
 * PUT /admin/permisos/{rol}
 * Actualizar permisos del rol especificado
 */
export async function updateRolePermissions(roleId, permissionsData) {
  try {
    return await client.put(`/admin/permisos/${roleId}`, { permissions: permissionsData })
  } catch (err) {
    if (err.response?.status === 404) {
      return await client.put(`/permisos/${roleId}`, { permissions: permissionsData })
    }
    throw err
  }
}

/**
 * GET /admin/permisos/{rol}/usuarios
 * Obtener usuarios asignados al rol con sus excepciones
 */
export async function getRoleUsers(roleId) {
  try {
    return await client.get(`/admin/permisos/${roleId}/usuarios`)
  } catch (err) {
    if (err.response?.status === 404) {
      return await client.get(`/permisos/${roleId}/usuarios`)
    }
    throw err
  }
}

/**
 * GET /admin/permisos/usuario/{id}
 * Obtener permisos extra/excepciones de un usuario específico
 */
export async function getUserExtraPermissions(userId) {
  try {
    return await client.get(`/admin/permisos/usuario/${userId}`)
  } catch (err) {
    if (err.response?.status === 404) {
      return await client.get(`/permisos/usuario/${userId}`)
    }
    throw err
  }
}

/**
 * PUT /admin/permisos/usuario/{id}
 * Actualizar permisos extra/excepciones de un usuario específico
 */
export async function updateUserExtraPermissions(userId, permissionsData) {
  try {
    return await client.put(`/admin/permisos/usuario/${userId}`, { extra_permissions: permissionsData, permissions: permissionsData })
  } catch (err) {
    if (err.response?.status === 404) {
      return await client.put(`/permisos/usuario/${userId}`, { extra_permissions: permissionsData, permissions: permissionsData })
    }
    throw err
  }
}
