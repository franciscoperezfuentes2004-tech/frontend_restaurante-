import client from './client'

export const getDishes        = (params) => client.get('/public/dishes', { params }).catch(() => client.get('/dishes', { params }))
export const getPublicDishes  = (params) => client.get('/public/dishes', { params })
export const createDish       = (data)   => client.post('/admin/dishes', data)

/**
 * Actualiza un platillo sanitizando el payload en FormData para evitar enviar "undefined"
 * a PostgreSQL y aplicando method spoofing (_method: 'PUT') con client.post (multipart/form-data).
 */
export const updateDish = async (id, datosFormulario = {}, imagenArchivo = null) => {
  let formData

  if (datosFormulario instanceof FormData) {
    formData = datosFormulario
    if (!formData.has('_method')) {
      formData.append('_method', 'PUT')
    }
  } else {
    formData = new FormData()

    // 1. Strings normales
    const nombre = datosFormulario.nombre || datosFormulario.name
    if (nombre !== undefined && nombre !== null && nombre !== '') {
      formData.append('nombre', nombre)
      formData.append('name', nombre)
    }

    const descripcion = datosFormulario.descripcion !== undefined ? datosFormulario.descripcion : datosFormulario.description
    if (descripcion !== undefined && descripcion !== null) {
      formData.append('descripcion', descripcion)
      formData.append('description', descripcion)
    }

    const precio = datosFormulario.precio !== undefined ? datosFormulario.precio : datosFormulario.price
    if (precio !== undefined && precio !== null && precio !== '' && !isNaN(Number(precio))) {
      formData.append('precio', precio)
      formData.append('price', precio)
    }

    // 2. TRAMPA DE FORMDATA 1 (Llaves foráneas y Nulos):
    // Evitar enviar la palabra "null" o "undefined" a una columna BIGINT/INTEGER en PostgreSQL
    const categoriaId = datosFormulario.categoria_id !== undefined ? datosFormulario.categoria_id : datosFormulario.category_id
    if (categoriaId && String(categoriaId) !== 'null' && String(categoriaId) !== 'undefined' && String(categoriaId).trim() !== '') {
      const parsedCatId = parseInt(categoriaId, 10)
      if (!isNaN(parsedCatId)) {
        formData.append('categoria_id', parsedCatId)
        formData.append('category_id', parsedCatId)
      }
    }

    // 3. TRAMPA DE FORMDATA 2 (Booleanos que se vuelven texto):
    // Forzar 1 o 0 como entero en vez de 'true'/'false'
    const disponibleVal = datosFormulario.disponible !== undefined 
      ? datosFormulario.disponible 
      : (datosFormulario.available !== undefined ? datosFormulario.available : datosFormulario.is_available)
    if (disponibleVal !== undefined && disponibleVal !== null) {
      const boolInt = (disponibleVal === true || disponibleVal === 1 || disponibleVal === '1' || disponibleVal === 'true') ? 1 : 0
      formData.append('disponible', boolInt)
      formData.append('available', boolInt)
      formData.append('is_available', boolInt)
    }

    if (datosFormulario.allow_observations !== undefined && datosFormulario.allow_observations !== null) {
      const boolObs = (datosFormulario.allow_observations === true || datosFormulario.allow_observations === 1 || datosFormulario.allow_observations === '1' || datosFormulario.allow_observations === 'true') ? 1 : 0
      formData.append('allow_observations', boolObs)
    }

    if (datosFormulario.allow_spice_level !== undefined && datosFormulario.allow_spice_level !== null) {
      const boolSpice = (datosFormulario.allow_spice_level === true || datosFormulario.allow_spice_level === 1 || datosFormulario.allow_spice_level === '1' || datosFormulario.allow_spice_level === 'true') ? 1 : 0
      formData.append('allow_spice_level', boolSpice)
    }

    if (datosFormulario.image_url && typeof datosFormulario.image_url === 'string') {
      formData.append('image_url', datosFormulario.image_url)
    }

    // Arrays
    if (Array.isArray(datosFormulario.allergens)) {
      datosFormulario.allergens.forEach(a => {
        if (a !== undefined && a !== null) formData.append('allergens[]', a)
      })
    }
    if (Array.isArray(datosFormulario.alergenos)) {
      datosFormulario.alergenos.forEach(a => {
        if (a !== undefined && a !== null) formData.append('alergenos[]', a)
      })
    }
    if (Array.isArray(datosFormulario.ingredients)) {
      datosFormulario.ingredients.forEach(i => {
        if (i !== undefined && i !== null) formData.append('ingredients[]', i)
      })
    }
    if (Array.isArray(datosFormulario.ingredientes)) {
      datosFormulario.ingredientes.forEach(i => {
        if (i !== undefined && i !== null) formData.append('ingredientes[]', i)
      })
    }
    if (Array.isArray(datosFormulario.extras)) {
      datosFormulario.extras.forEach(e => {
        if (e !== undefined && e !== null) formData.append('extras[]', e)
      })
    }

    // 4. Archivos (Solo si el usuario seleccionó una imagen)
    const fileImg = imagenArchivo || (datosFormulario.image instanceof File ? datosFormulario.image : (datosFormulario.imagen instanceof File ? datosFormulario.imagen : (datosFormulario.image_file instanceof File ? datosFormulario.image_file : null)))
    if (fileImg instanceof File || fileImg instanceof Blob) {
      formData.append('imagen', fileImg)
      formData.append('image', fileImg)
    }

    // 5. Truco para Laravel: Forzar PUT internamente
    formData.append('_method', 'PUT')
  }

  try {
    // 6. CAMBIO OBLIGATORIO: Usar client.post en lugar de client.put
    const response = await client.post(`/admin/dishes/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response
  } catch (error) {
    console.error("Error al actualizar:", error)
    throw error
  }
}

// Alias de compatibilidad
export const actualizarPlatillo = updateDish

export const deleteDish       = (id)        => client.delete(`/admin/dishes/${id}`)
export const toggleDish       = (id)        => client.patch(`/admin/dishes/${id}/toggle`)
export const getDishRecipe    = (dishId)    => client.get(`/productos/${dishId}/receta`).catch(() => client.get(`/admin/dishes/${dishId}/receta`))
export const saveDishRecipe   = (dishId, data) => client.post(`/productos/${dishId}/receta`, data).catch(() => client.post(`/admin/dishes/${dishId}/receta`, data))
