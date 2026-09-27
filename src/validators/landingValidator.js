import { z } from 'zod'

const currentYear = new Date().getFullYear()

/**
 * Validador de archivo para imágenes de la landing (portada principal y carrusel).
 * Reglas:
 * - Tamaño máximo: 3MB (3 * 1024 * 1024 bytes)
 * - Tipos MIME permitidos: image/jpeg, image/png, image/webp
 */
export const validateLandingImageFile = (file) => {
  if (!file) return { isValid: true }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const validExtensions = /\.(jpe?g|png|webp)$/i
  const fileName = file.name || ''

  if (!validTypes.includes(file.type) && !validExtensions.test(fileName)) {
    return {
      isValid: false,
      error: 'Solo se permiten imágenes en formato JPG, PNG o WEBP.'
    }
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'El archivo es demasiado pesado. Máximo 10MB.'
    }
  }

  return { isValid: true }
}

/**
 * Esquema Zod para Portada Principal (Hero)
 * - hero_title: Obligatorio, .trim(), min 3, max 100 caracteres.
 * - hero_slogan: Opcional, .trim(), max 150 caracteres.
 * - enable_carousel: boolean.
 * - carousel_images: Si enable_carousel es true, arreglo entre 2 y 6 imágenes.
 */
export const heroSectionSchema = z.object({
  hero_title: z.string({ required_error: 'El título de la portada es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título de la portada es obligatorio.' })
    .refine(v => v.length >= 3, { message: 'El título debe tener al menos 3 caracteres.' })
    .refine(v => v.length <= 100, { message: 'El título no puede exceder los 100 caracteres.' }),

  hero_slogan: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 150, { message: 'El eslogan no puede exceder los 150 caracteres.' }),

  enable_carousel: z.boolean().default(false),

  carousel_images: z.array(z.any()).optional().default([])
}).superRefine((data, ctx) => {
  if (data.enable_carousel) {
    const count = Array.isArray(data.carousel_images) ? data.carousel_images.length : 0
    if (count < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El carrusel debe contener al menos 2 imágenes.',
        path: ['carousel_images']
      })
    } else if (count > 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El carrusel no puede exceder las 6 imágenes.',
        path: ['carousel_images']
      })
    }
  }
})

/**
 * Validador helper para Portada Principal
 */
export const validateHeroSection = (data) => {
  const result = heroSectionSchema.safeParse(data)
  if (result.success) {
    return { isValid: true, errors: {}, data: result.data }
  }

  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return { isValid: false, errors, firstError: Object.values(errors)[0] }
}

/**
 * Esquema individual para una característica (Feature)
 * - icon: Obligatorio (Star, Heart, Gem, Leaf, ChefHat, etc.)
 * - title: Obligatorio, .trim(), max 50 caracteres
 * - description: Obligatorio, .trim(), max 150 caracteres
 */
export const historyFeatureSchema = z.object({
  icon: z.string({ required_error: 'Debes seleccionar un ícono.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'Debes seleccionar un ícono.' }),

  title: z.string({ required_error: 'El título de la característica es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título de la característica es obligatorio.' })
    .refine(v => v.length <= 50, { message: 'El título no puede exceder los 50 caracteres.' }),

  description: z.string({ required_error: 'La descripción de la característica es obligatoria.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción de la característica es obligatoria.' })
    .refine(v => v.length <= 150, { message: 'La descripción no puede exceder los 150 caracteres.' })
})

/**
 * Esquema Zod para Sección Nuestra Historia
 * - history_title: Obligatorio, .trim(), max 100 caracteres.
 * - history_description: Obligatorio, .trim(), max 300 caracteres.
 * - foundation_year: Numérico, obligatorio, min 1900, max año actual.
 * - features: Array de exactamente 3 objetos.
 */
export const historySectionSchema = z.object({
  history_title: z.string({ required_error: 'El título de la sección es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título de la sección es obligatorio.' })
    .refine(v => v.length <= 100, { message: 'El título no puede exceder los 100 caracteres.' }),

  history_description: z.string({ required_error: 'La descripción es obligatoria.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción es obligatoria.' })
    .refine(v => v.length <= 300, { message: 'La descripción no puede exceder los 300 caracteres.' }),

  foundation_year: z.union([z.string(), z.number()], { required_error: 'El año de fundación es obligatorio.' })
    .refine(v => {
      const s = String(v ?? '').trim()
      return s.length > 0 && !isNaN(Number(s))
    }, { message: 'El año de fundación es obligatorio.' })
    .transform(v => Number(v))
    .refine(v => v >= 1900, { message: 'El año de fundación no puede ser menor a 1900.' })
    .refine(v => v <= currentYear, { message: `El año de fundación no puede ser mayor a ${currentYear}.` }),

  features: z.array(historyFeatureSchema, {
    required_error: 'Debes configurar las 3 características destacadas.'
  }).length(3, 'Debes configurar exactamente 3 características destacadas.')
})

/**
 * Validador helper para Sección Nuestra Historia
 */
export const validateHistorySection = (data) => {
  // Normalizar los campos de features por si vienen como { icono, titulo, descripcion }
  const normalizedData = {
    ...data,
    features: Array.isArray(data?.features)
      ? data.features.map(f => ({
          icon: f.icon || f.icono || '',
          title: f.title || f.titulo || '',
          description: f.description || f.descripcion || ''
        }))
      : []
  }

  const result = historySectionSchema.safeParse(normalizedData)
  if (result.success) {
    return { isValid: true, errors: {}, featureErrors: [{}, {}, {}], data: result.data }
  }

  const errors = {}
  const featureErrors = [{}, {}, {}]

  for (const issue of result.error.issues) {
    if (issue.path[0] === 'features' && typeof issue.path[1] === 'number') {
      const idx = issue.path[1]
      const field = issue.path[2]
      const cardNum = idx + 1
      let dynamicMsg = issue.message
      if (field === 'title') {
        dynamicMsg = `La característica ${cardNum} requiere un título válido (máx. 50 caracteres).`
      } else if (field === 'description') {
        dynamicMsg = `La característica ${cardNum} requiere una descripción válida (máx. 150 caracteres).`
      } else if (field === 'icon') {
        dynamicMsg = `La característica ${cardNum} requiere seleccionar un ícono válido.`
      }

      if (featureErrors[idx] && field && !featureErrors[idx][field]) {
        featureErrors[idx][field] = dynamicMsg
      }
      if (!errors[`feature_${cardNum}`]) {
        errors[`feature_${cardNum}`] = dynamicMsg
      }
    } else {
      const key = issue.path[0]
      if (key && !errors[key]) {
        errors[key] = issue.message
      }
    }
  }

  return {
    isValid: false,
    errors,
    featureErrors,
    firstError: Object.values(errors)[0] || 
      featureErrors.flatMap(f => Object.values(f))[0]
  }
}

/**
 * Esquema Zod para Sección Platillos Destacados
 * - subtitle / labelSuperior: max 100 caracteres, .trim()
 * - title / tituloPrincipal: max 100 caracteres, .trim()
 * - button_text / textoDebajoBoton: max 150 caracteres, .trim()
 * - featured_categories: arreglo de IDs, máximo 4 elementos.
 * - featured_dishes: arreglo de IDs.
 */
export const featuredDishesSectionSchema = z.object({
  subtitle: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 100, { message: 'El subtítulo no puede exceder los 100 caracteres.' }),

  title: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 100, { message: 'El título no puede exceder los 100 caracteres.' }),

  button_text: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 150, { message: 'El texto del botón no puede exceder los 150 caracteres.' }),

  featured_categories: z.array(z.union([z.number(), z.string()]))
    .max(4, 'Puedes seleccionar un máximo de 4 categorías.')
    .default([]),

  featured_dishes: z.array(z.union([z.number(), z.string()]))
    .default([])
})

/**
 * Validador helper para Sección Platillos Destacados
 */
export const validateFeaturedDishesSection = (data) => {
  const normalizedData = {
    subtitle: data?.subtitle ?? data?.labelSuperior ?? '',
    title: data?.title ?? data?.tituloPrincipal ?? '',
    button_text: data?.button_text ?? data?.textoDebajoBoton ?? '',
    featured_categories: data?.featured_categories ?? data?.selected_categories ?? [],
    featured_dishes: data?.featured_dishes ?? data?.selected_dishes ?? []
  }

  const result = featuredDishesSectionSchema.safeParse(normalizedData)
  if (result.success) {
    return { isValid: true, errors: {}, data: result.data }
  }

  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return { isValid: false, errors, firstError: Object.values(errors)[0] }
}

/**
 * Esquema individual para un Servicio Exclusivo
 * - icon: Obligatorio -> "Debes seleccionar un ícono representativo."
 * - title: Obligatorio, .trim(), min 3, max 50 caracteres.
 * - description: Obligatorio, .trim(), max 150 caracteres.
 */
export const serviceItemSchema = z.object({
  icon: z.string({ required_error: 'Debes seleccionar un ícono representativo.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'Debes seleccionar un ícono representativo.' }),

  title: z.string({ required_error: 'El título del servicio es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título del servicio es obligatorio.' })
    .refine(v => v.length >= 3, { message: 'El título debe tener al menos 3 caracteres.' })
    .refine(v => v.length <= 50, { message: 'El título no puede exceder los 50 caracteres.' }),

  description: z.string({ required_error: 'La descripción es obligatoria.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción es obligatoria.' })
    .refine(v => v.length <= 150, { message: 'Límite máximo de 150 caracteres alcanzado.' })
})

/**
 * Esquema Zod para Sección Servicios Exclusivos (arreglo estricto de 3 elementos)
 */
export const servicesSectionSchema = z.array(serviceItemSchema, {
  required_error: 'Debes configurar los 3 servicios exclusivos.'
}).length(3, 'Debes configurar exactamente 3 servicios exclusivos.')

/**
 * Validador helper para Sección Servicios Exclusivos
 */
export const validateServicesSection = (data) => {
  const rawList = Array.isArray(data) ? data : (data?.services || data?.servicios || data?.servicios_config || [])
  const normalizedData = rawList.map(s => ({
    icon: s?.icon || s?.icono || '',
    title: s?.title || s?.titulo || '',
    description: s?.description || s?.descripcion || ''
  }))

  const result = servicesSectionSchema.safeParse(normalizedData)
  if (result.success) {
    return { isValid: true, errors: {}, serviceErrors: [{}, {}, {}], data: result.data }
  }

  const errors = {}
  const serviceErrors = [{}, {}, {}]

  for (const issue of result.error.issues) {
    if (typeof issue.path[0] === 'number') {
      const idx = issue.path[0]
      const field = issue.path[1]
      const cardNum = idx + 1
      let dynamicMsg = issue.message

      if (field === 'title') {
        dynamicMsg = issue.message || `El título del servicio es obligatorio.`
      } else if (field === 'description') {
        dynamicMsg = issue.message || `La descripción es obligatoria.`
      } else if (field === 'icon') {
        dynamicMsg = issue.message || `Debes seleccionar un ícono representativo.`
      }

      if (serviceErrors[idx] && field && !serviceErrors[idx][field]) {
        serviceErrors[idx][field] = dynamicMsg
      }
      if (!errors[`service_${cardNum}_${field}`]) {
        errors[`service_${cardNum}_${field}`] = `Característica ${cardNum}: ${dynamicMsg}`
      }
    } else {
      const key = issue.path[0] || 'services'
      if (!errors[key]) {
        errors[key] = issue.message
      }
    }
  }

  return {
    isValid: false,
    errors,
    serviceErrors,
    firstError: Object.values(errors)[0] || 
      serviceErrors.flatMap(s => Object.values(s))[0]
  }
}

/**
 * Esquema Zod para Banner de Descuento por Reserva (Condicional)
 * - Solo valida campos si active / activo es true.
 * - discount_percentage: obligatorio si activo, entero entre 1 y 100.
 * - validity_badge: obligatorio si activo, max 50 caracteres.
 * - title: obligatorio si activo, max 100 caracteres.
 * - description: obligatorio si activo, max 200 caracteres.
 * - button_text: obligatorio si activo, max 50 caracteres.
 * - button_subtext: obligatorio si activo, max 100 caracteres.
 */
export const discountBannerSchema = z.object({
  active: z.boolean().default(true),
  discount_percentage: z.union([z.number(), z.string()]).optional().nullable(),
  validity_badge: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  button_text: z.string().optional().nullable(),
  button_subtext: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (!data.active) return // Si está apagado, no se exige validación

  // Validar porcentaje de descuento
  const rawPct = data.discount_percentage
  const strPct = String(rawPct ?? '').trim()
  if (strPct === '' || isNaN(Number(strPct))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa el porcentaje de descuento.',
      path: ['discount_percentage']
    })
  } else {
    const num = Number(strPct)
    if (!Number.isInteger(num) || num < 1 || num > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El descuento debe ser un valor entre 1 y 100.',
        path: ['discount_percentage']
      })
    }
  }

  // Helper para validar campos de texto obligatorios cuando activo
  const validateTextField = (val, path, maxLen, maxMsg) => {
    const clean = (val ?? '').trim()
    if (clean.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Este campo es obligatorio cuando el banner está activo.',
        path: [path]
      })
    } else if (clean.length > maxLen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: maxMsg,
        path: [path]
      })
    }
  }

  validateTextField(data.validity_badge, 'validity_badge', 50, 'El badge de vigencia no puede exceder los 50 caracteres.')
  validateTextField(data.title, 'title', 100, 'El título no puede exceder los 100 caracteres.')
  validateTextField(data.description, 'description', 200, 'La descripción no puede exceder los 200 caracteres.')
  validateTextField(data.button_text, 'button_text', 50, 'El texto del botón no puede exceder los 50 caracteres.')
  validateTextField(data.button_subtext, 'button_subtext', 100, 'El texto bajo el botón no puede exceder los 100 caracteres.')
})

/**
 * Validador helper para Banner de Descuento por Reserva
 */
export const validateDiscountBanner = (data) => {
  const isActivo = data?.activo ?? data?.active ?? true
  const normalizedData = {
    active: Boolean(isActivo),
    discount_percentage: data?.discount_percentage ?? data?.porcentaje ?? '',
    validity_badge: data?.validity_badge ?? data?.badgeVigencia ?? '',
    title: data?.title ?? data?.tituloDescuento ?? data?.titulo ?? '',
    description: data?.description ?? data?.descripcion ?? '',
    button_text: data?.button_text ?? data?.textoBoton ?? '',
    button_subtext: data?.button_subtext ?? data?.textoBotonSub ?? ''
  }

  const result = discountBannerSchema.safeParse(normalizedData)
  if (result.success) {
    return { isValid: true, errors: {}, data: result.data }
  }

  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }

  // Alias mapeados para el frontend
  if (errors.discount_percentage) errors.porcentaje = errors.discount_percentage
  if (errors.validity_badge) errors.badgeVigencia = errors.validity_badge
  if (errors.title) errors.tituloDescuento = errors.title
  if (errors.description) errors.descripcion = errors.description
  if (errors.button_text) errors.textoBoton = errors.button_text
  if (errors.button_subtext) errors.textoBotonSub = errors.button_subtext

  return { isValid: false, errors, firstError: Object.values(errors)[0] }
}

/**
 * Helper para convertir cualquier cadena de hora (12h o 24h) a formato 24h "HH:mm"
 */
export const to24HourFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return ''
  const trimmed = timeStr.trim().toUpperCase()
  
  // Match 12-hour format (ej: "1:00 PM", "11:30 AM", "12:00 AM", "12:00 PM", "1:00PM", "11PM")
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = match12[2] ? match12[2] : '00'
    const period = match12[3]

    if (hours < 1 || hours > 12) return ''
    if (period === 'AM') {
      hours = hours === 12 ? 0 : hours
    } else if (period === 'PM') {
      hours = hours === 12 ? 12 : hours + 12
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }

  // Match 24-hour format (ej: "13:00", "09:30", "23:45", "0:00")
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const hours = parseInt(match24[1], 10)
    const minutes = parseInt(match24[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  return ''
}

/**
 * Helper para convertir hora a formato 12h con AM/PM (ej: "13:00" -> "1:00 PM")
 */
export const to12HourFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return ''
  const time24 = to24HourFormat(timeStr)
  if (!time24) return timeStr.trim()
  const [hStr, mStr] = time24.split(':')
  let hours = parseInt(hStr, 10)
  const minutes = mStr || '00'
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${period}`
}

/**
 * Esquema Zod para Sección Reservaciones
 * - title: Obligatorio, .trim(), min 3, max 100 caracteres.
 * - subtitle: Obligatorio, .trim(), min 3, max 100 caracteres.
 * - description: Obligatorio, .trim(), min 10, max 300 caracteres.
 * - weekday_start, weekday_end, weekend_start, weekend_end: Obligatorios y formato válido.
 * - policies: Arreglo de exactamente 4 strings, obligatorios, max 100 caracteres cada uno.
 */
export const reservationsSectionSchema = z.object({
  title: z.string({ required_error: 'El título es obligatorio y no puede exceder 100 caracteres.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título es obligatorio y no puede exceder 100 caracteres.' })
    .refine(v => v.length >= 3, { message: 'El título debe tener al menos 3 caracteres.' })
    .refine(v => v.length <= 100, { message: 'El título es obligatorio y no puede exceder 100 caracteres.' }),

  subtitle: z.string({ required_error: 'El subtítulo es obligatorio y debe tener entre 3 y 100 caracteres.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El subtítulo es obligatorio y debe tener entre 3 y 100 caracteres.' })
    .refine(v => v.length >= 3, { message: 'El subtítulo debe tener al menos 3 caracteres.' })
    .refine(v => v.length <= 100, { message: 'El subtítulo no puede exceder los 100 caracteres.' }),

  description: z.string({ required_error: 'La descripción debe ser concisa, máximo 300 caracteres.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción es obligatoria.' })
    .refine(v => v.length >= 10, { message: 'La descripción debe tener al menos 10 caracteres.' })
    .refine(v => v.length <= 300, { message: 'La descripción debe ser concisa, máximo 300 caracteres.' }),

  weekday_start: z.string({ required_error: 'El horario de apertura entre semana es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El horario de apertura entre semana es obligatorio.' })
    .refine(v => Boolean(to24HourFormat(v)), { message: 'El horario de apertura debe ser una hora válida (ej. 1:00 PM o 13:00).' }),

  weekday_end: z.string({ required_error: 'El horario de cierre entre semana es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El horario de cierre entre semana es obligatorio.' })
    .refine(v => Boolean(to24HourFormat(v)), { message: 'El horario de cierre debe ser una hora válida (ej. 11:00 PM o 23:00).' }),

  weekend_start: z.string({ required_error: 'El horario de apertura de fin de semana es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El horario de apertura de fin de semana es obligatorio.' })
    .refine(v => Boolean(to24HourFormat(v)), { message: 'El horario de apertura debe ser una hora válida (ej. 12:00 PM o 12:00).' }),

  weekend_end: z.string({ required_error: 'El horario de cierre de fin de semana es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El horario de cierre de fin de semana es obligatorio.' })
    .refine(v => Boolean(to24HourFormat(v)), { message: 'El horario de cierre debe ser una hora válida (ej. 12:00 AM o 00:00).' }),

  policies: z.array(
    z.string({ required_error: 'La política es obligatoria.' })
      .transform(v => (v ?? '').trim())
      .refine(v => v.length > 0, { message: 'La política es obligatoria.' })
      .refine(v => v.length <= 100, { message: 'La política no puede exceder los 100 caracteres.' })
  ).length(4, 'Debes configurar exactamente 4 políticas.')
})

/**
 * Validador helper para Sección Reservaciones
 */
export const validateReservationsSection = (data) => {
  const horariosRaw = data?.horarios || {}
  const rawPolicies = Array.isArray(data?.politicas) 
    ? data.politicas 
    : (Array.isArray(data?.policies) ? data.policies : [])

  const normalizedData = {
    title: data?.title ?? data?.tituloPrincipal ?? data?.titulo ?? '',
    subtitle: data?.subtitle ?? data?.subtituloDorado ?? data?.subtitulo ?? '',
    description: data?.description ?? data?.textoDescriptivo ?? data?.descripcion ?? '',
    weekday_start: data?.weekday_start ?? horariosRaw.weekday_start ?? horariosRaw.lunesViernesInicio ?? '',
    weekday_end: data?.weekday_end ?? horariosRaw.weekday_end ?? horariosRaw.lunesViernesFin ?? '',
    weekend_start: data?.weekend_start ?? horariosRaw.weekend_start ?? horariosRaw.sabadoDomingoInicio ?? '',
    weekend_end: data?.weekend_end ?? horariosRaw.weekend_end ?? horariosRaw.sabadoDomingoFin ?? '',
    policies: [0, 1, 2, 3].map(i => (typeof rawPolicies[i] === 'string' ? rawPolicies[i] : ''))
  }

  const result = reservationsSectionSchema.safeParse(normalizedData)
  if (result.success) {
    const d = result.data
    const formattedData = {
      ...d,
      tituloPrincipal: d.title,
      subtituloDorado: d.subtitle,
      textoDescriptivo: d.description,
      horarios: {
        lunesViernesInicio: to12HourFormat(d.weekday_start),
        lunesViernesFin: to12HourFormat(d.weekday_end),
        sabadoDomingoInicio: to12HourFormat(d.weekend_start),
        sabadoDomingoFin: to12HourFormat(d.weekend_end),
        weekday_start: to24HourFormat(d.weekday_start),
        weekday_end: to24HourFormat(d.weekday_end),
        weekend_start: to24HourFormat(d.weekend_start),
        weekend_end: to24HourFormat(d.weekend_end),
        lunes_viernes_inicio_24h: to24HourFormat(d.weekday_start),
        lunes_viernes_fin_24h: to24HourFormat(d.weekday_end),
        sabado_domingo_inicio_24h: to24HourFormat(d.weekend_start),
        sabado_domingo_fin_24h: to24HourFormat(d.weekend_end)
      },
      politicas: d.policies,
      policies: d.policies
    }
    return { isValid: true, errors: {}, policyErrors: ['', '', '', ''], data: formattedData }
  }

  const errors = {}
  const policyErrors = ['', '', '', '']

  for (const issue of result.error.issues) {
    if (issue.path[0] === 'policies' && typeof issue.path[1] === 'number') {
      const idx = issue.path[1]
      policyErrors[idx] = issue.message
      if (!errors[`policy_${idx + 1}`]) {
        errors[`policy_${idx + 1}`] = `Política ${idx + 1}: ${issue.message}`
      }
    } else {
      const key = issue.path[0]
      if (key && !errors[key]) {
        errors[key] = issue.message
      }
    }
  }

  // Frontend aliases
  if (errors.title) errors.tituloPrincipal = errors.title
  if (errors.subtitle) errors.subtituloDorado = errors.subtitle
  if (errors.description) errors.textoDescriptivo = errors.description
  if (errors.weekday_start) errors.lunesViernesInicio = errors.weekday_start
  if (errors.weekday_end) errors.lunesViernesFin = errors.weekday_end
  if (errors.weekend_start) errors.sabadoDomingoInicio = errors.weekend_start
  if (errors.weekend_end) errors.sabadoDomingoFin = errors.weekend_end

  return {
    isValid: false,
    errors,
    policyErrors,
    firstError: Object.values(errors)[0] || policyErrors.find(Boolean)
  }
}

const GOOGLE_MAPS_REGEX = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|goo\.gl)\/.+/i
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Helper para sanitizar handle o URL de una red social (máx. 255 caracteres)
 */
export const sanitizeSocialHandle = (val) => {
  if (!val || typeof val !== 'string') return ''
  return val.trim().slice(0, 255)
}

/**
 * Esquema Zod para Sección Contacto (Encuéntranos)
 */
export const contactSectionSchema = z.object({
  title: z.string({ required_error: 'El título es obligatorio y no puede exceder los 100 caracteres.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título es obligatorio y no puede exceder los 100 caracteres.' })
    .refine(v => v.length <= 100, { message: 'El título es obligatorio y no puede exceder los 100 caracteres.' }),

  subtitle: z.string({ required_error: 'El subtítulo es obligatorio y no puede exceder los 100 caracteres.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El subtítulo es obligatorio y no puede exceder los 100 caracteres.' })
    .refine(v => v.length <= 100, { message: 'El subtítulo es obligatorio y no puede exceder los 100 caracteres.' }),

  events_text: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 300, { message: 'El texto de eventos especiales no puede exceder los 300 caracteres.' }),

  google_maps_url: z.string({ required_error: 'Ingresa una URL válida de Google Maps (debe iniciar con https://).' })
    .transform(v => (v ?? '').trim())
    .refine(v => !v.toLowerCase().includes('<iframe') && !v.includes('<'), { message: 'Ingresa una URL válida de Google Maps (debe iniciar con https://).' })
    .refine(v => {
      if (!v) return false
      try {
        const u = new URL(v)
        return (u.protocol === 'https:' || u.protocol === 'http:') && GOOGLE_MAPS_REGEX.test(v)
      } catch {
        return false
      }
    }, { message: 'Ingresa una URL válida de Google Maps (debe iniciar con https://).' }),

  contact_email: z.string({ required_error: 'Ingresa un correo electrónico válido.' })
    .transform(v => (v ?? '').trim().toLowerCase())
    .refine(v => v.length > 0 && EMAIL_REGEX.test(v), { message: 'Ingresa un correo electrónico válido.' }),

  public_phone: z.string({ required_error: 'El número debe contener exactamente 10 dígitos válidos.' })
    .transform(v => (v ?? '').replace(/\D/g, ''))
    .refine(v => {
      return v.length === 10 || (v.length === 12 && v.startsWith('52'))
    }, { message: 'El número debe contener exactamente 10 dígitos válidos.' }),

  whatsapp_number: z.string({ required_error: 'El número debe contener exactamente 10 dígitos válidos.' })
    .transform(v => (v ?? '').replace(/\D/g, ''))
    .refine(v => {
      return v.length === 10 || (v.length === 12 && v.startsWith('52'))
    }, { message: 'El número debe contener exactamente 10 dígitos válidos.' }),

  social_instagram: z.string()
    .optional()
    .nullable()
    .transform(v => sanitizeSocialHandle(v))
    .refine(v => !v || v.length <= 255, { message: 'El usuario o enlace de Instagram no puede exceder los 255 caracteres.' }),

  social_facebook: z.string()
    .optional()
    .nullable()
    .transform(v => sanitizeSocialHandle(v))
    .refine(v => !v || v.length <= 255, { message: 'El usuario o enlace de Facebook no puede exceder los 255 caracteres.' }),

  social_tiktok: z.string()
    .optional()
    .nullable()
    .transform(v => sanitizeSocialHandle(v))
    .refine(v => !v || v.length <= 255, { message: 'El usuario o enlace de TikTok no puede exceder los 255 caracteres.' })
})

/**
 * Validador helper para Sección Contacto
 */
export const validateContactSection = (data) => {
  const redes = data?.redesSociales || data?.social_networks || {}
  const normalizedData = {
    title: data?.title ?? data?.titulo ?? '',
    subtitle: data?.subtitle ?? data?.labelSuperior ?? data?.subtitulo ?? '',
    events_text: data?.events_text ?? data?.textoEventos ?? '',
    google_maps_url: data?.google_maps_url ?? data?.mapsLink ?? data?.maps_link ?? '',
    contact_email: data?.contact_email ?? data?.email ?? data?.correo ?? '',
    public_phone: data?.public_phone ?? data?.telefono ?? data?.phone ?? '',
    whatsapp_number: data?.whatsapp_number ?? data?.whatsapp ?? data?.numeroWhatsapp ?? '',
    social_instagram: data?.social_instagram ?? redes.instagram ?? data?.instagram ?? '',
    social_facebook: data?.social_facebook ?? redes.facebook ?? data?.facebook ?? '',
    social_tiktok: data?.social_tiktok ?? redes.tiktok ?? data?.tiktok ?? ''
  }

  const result = contactSectionSchema.safeParse(normalizedData)
  if (result.success) {
    const d = result.data
    const formattedData = {
      ...d,
      titulo: d.title,
      labelSuperior: d.subtitle,
      textoEventos: d.events_text,
      mapsLink: d.google_maps_url,
      email: d.contact_email,
      telefono: d.public_phone,
      whatsapp: d.whatsapp_number,
      redesSociales: {
        instagram: d.social_instagram || '',
        facebook: d.social_facebook || '',
        tiktok: d.social_tiktok || ''
      }
    }
    return { isValid: true, errors: {}, data: formattedData }
  }

  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }

  // Frontend aliases
  if (errors.title) errors.titulo = errors.title
  if (errors.subtitle) errors.labelSuperior = errors.subtitle
  if (errors.events_text) errors.textoEventos = errors.events_text
  if (errors.google_maps_url) errors.mapsLink = errors.google_maps_url
  if (errors.contact_email) errors.email = errors.contact_email
  if (errors.public_phone) errors.telefono = errors.public_phone
  if (errors.whatsapp_number) errors.whatsapp = errors.whatsapp_number
  if (errors.social_instagram) errors.instagram = errors.social_instagram
  if (errors.social_facebook) errors.facebook = errors.social_facebook
  if (errors.social_tiktok) errors.tiktok = errors.social_tiktok

  return {
    isValid: false,
    errors,
    firstError: Object.values(errors)[0]
  }
}

/**
 * Esquema Zod para una tarjeta de Beneficio en Delivery
 */
export const deliveryBenefitCardSchema = z.object({
  title: z.string({ required_error: 'El título del beneficio es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título del beneficio es obligatorio.' })
    .refine(v => v.length <= 50, { message: 'El título no puede exceder los 50 caracteres.' }),

  description: z.string({ required_error: 'La descripción del beneficio es obligatoria.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción del beneficio es obligatoria.' })
    .refine(v => v.length <= 100, { message: 'La descripción no puede exceder los 100 caracteres.' })
})

/**
 * Esquema Zod para un paso en "Cómo Ordenar" en Delivery
 */
export const deliveryStepCardSchema = z.object({
  title: z.string({ required_error: 'El título del paso es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título del paso es obligatorio.' })
    .refine(v => v.length <= 50, { message: 'El título no puede exceder los 50 caracteres.' }),

  subtitle: z.string({ required_error: 'El subtítulo del paso es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El subtítulo del paso es obligatorio.' })
    .refine(v => v.length <= 100, { message: 'El subtítulo no puede exceder los 100 caracteres.' })
})

/**
 * Esquema Zod para Sección Delivery (Servicio a Domicilio)
 */
export const deliverySectionSchema = z.object({
  subtitle: z.string({ required_error: 'El subtítulo de la sección es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El subtítulo de la sección es obligatorio.' })
    .refine(v => v.length <= 100, { message: 'El subtítulo no puede exceder los 100 caracteres.' }),

  title: z.string({ required_error: 'El título principal es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El título principal es obligatorio.' })
    .refine(v => v.length <= 100, { message: 'El título principal no puede exceder los 100 caracteres.' }),

  description: z.string({ required_error: 'La descripción es obligatoria.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'La descripción es obligatoria.' })
    .refine(v => v.length <= 250, { message: 'La descripción no puede exceder los 250 caracteres.' }),

  image_url: z.string().optional().nullable(),

  image_title: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 100, { message: 'El título sobre la imagen no puede exceder los 100 caracteres.' }),

  image_alt: z.string()
    .optional()
    .nullable()
    .transform(v => (v ?? '').trim())
    .refine(v => !v || v.length <= 100, { message: 'El texto alternativo (ALT) no puede exceder los 100 caracteres.' }),

  beneficios: z.array(deliveryBenefitCardSchema, {
    required_error: 'Debes definir las tarjetas de beneficios.',
    invalid_type_error: 'Las tarjetas de beneficios deben ser un arreglo.'
  }).length(4, { message: 'Debes definir exactamente 4 tarjetas de beneficios.' }),

  pasos: z.array(deliveryStepCardSchema, {
    required_error: 'Debes definir los pasos para ordenar.',
    invalid_type_error: 'Los pasos para ordenar deben ser un arreglo.'
  }).length(3, { message: 'Debes definir exactamente 3 pasos para ordenar.' }),

  whatsapp_number: z.string({ required_error: 'Ingresa el número de WhatsApp para pedidos.' })
    .transform(v => (v ?? '').replace(/\D/g, ''))
    .refine(v => v.length >= 10 && v.length <= 15, { message: 'El número de WhatsApp debe contener entre 10 y 15 dígitos numéricos.' }),

  button_subtext: z.string({ required_error: 'El texto bajo el botón es obligatorio.' })
    .transform(v => (v ?? '').trim())
    .refine(v => v.length > 0, { message: 'El texto bajo el botón es obligatorio.' })
    .refine(v => v.length <= 150, { message: 'El texto bajo el botón no puede exceder los 150 caracteres.' }),

  garantias: z.array(
    z.string({ required_error: 'El texto de garantía es obligatorio.' })
      .transform(v => (v ?? '').trim())
      .refine(v => v.length > 0, { message: 'El texto de garantía no puede estar vacío.' })
      .refine(v => v.length <= 100, { message: 'La garantía no puede exceder los 100 caracteres.' }),
    {
      required_error: 'Debes definir las garantías.',
      invalid_type_error: 'Las garantías deben ser un arreglo de textos.'
    }
  ).length(3, { message: 'Debes definir exactamente 3 garantías.' })
})

/**
 * Validador helper para Sección Delivery
 */
export const validateDeliverySection = (data) => {
  const rawBeneficios = Array.isArray(data?.beneficios) ? data.beneficios : (Array.isArray(data?.benefits) ? data.benefits : [])
  const rawPasos = Array.isArray(data?.pasos) ? data.pasos : (Array.isArray(data?.steps) ? data.steps : [])
  const rawGarantias = Array.isArray(data?.garantias) ? data.garantias : (Array.isArray(data?.guarantees) ? data.guarantees : [])

  const normalizedBeneficios = rawBeneficios.map(b => ({
    title: b?.title ?? b?.titulo ?? '',
    description: b?.description ?? b?.descripcion ?? ''
  }))

  const normalizedPasos = rawPasos.map(p => ({
    title: p?.title ?? p?.titulo ?? '',
    subtitle: p?.subtitle ?? p?.subtitulo ?? ''
  }))

  const normalizedGarantias = rawGarantias.map(g => (typeof g === 'string' ? g : (g?.texto || g?.text || '')))

  const normalizedData = {
    subtitle: data?.subtitle ?? data?.labelSuperior ?? data?.subtitulo ?? '',
    title: data?.title ?? data?.tituloPrincipal ?? data?.titulo ?? '',
    description: data?.description ?? data?.descripcion ?? '',
    image_url: data?.image_url ?? data?.imagen ?? data?.imagen_url ?? data?.delivery_image_url ?? '',
    image_title: data?.image_title ?? data?.imagenTitulo ?? data?.imagen_titulo ?? data?.delivery_image_title ?? '',
    image_alt: data?.image_alt ?? data?.imagenDescripcion ?? data?.imagen_descripcion ?? data?.delivery_image_description ?? '',
    beneficios: normalizedBeneficios,
    pasos: normalizedPasos,
    whatsapp_number: data?.whatsapp_number ?? data?.numeroWhatsapp ?? data?.whatsapp ?? '',
    button_subtext: data?.button_subtext ?? data?.textoBoton ?? data?.texto_boton ?? '',
    garantias: normalizedGarantias
  }

  const result = deliverySectionSchema.safeParse(normalizedData)
  if (result.success) {
    const d = result.data
    const formattedData = {
      ...d,
      labelSuperior: d.subtitle,
      tituloPrincipal: d.title,
      descripcion: d.description,
      imagen: d.image_url || '',
      imagen_url: d.image_url || '',
      imagenTitulo: d.image_title || '',
      imagenDescripcion: d.image_alt || '',
      beneficios: d.beneficios.map(b => ({ titulo: b.title, descripcion: b.description })),
      pasos: d.pasos.map(p => ({ titulo: p.title, subtitulo: p.subtitle })),
      numeroWhatsapp: d.whatsapp_number,
      textoBoton: d.button_subtext,
      garantias: d.garantias
    }
    return {
      isValid: true,
      errors: {},
      beneficiosErrors: [{}, {}, {}, {}],
      pasosErrors: [{}, {}, {}],
      garantiasErrors: ['', '', ''],
      data: formattedData
    }
  }

  const errors = {}
  const beneficiosErrors = [{}, {}, {}, {}]
  const pasosErrors = [{}, {}, {}]
  const garantiasErrors = ['', '', '']

  for (const issue of result.error.issues) {
    const path = issue.path
    const firstKey = path[0]

    if (firstKey === 'beneficios' && typeof path[1] === 'number') {
      const idx = path[1]
      const subfield = path[2] // 'title' or 'description'
      if (!beneficiosErrors[idx]) beneficiosErrors[idx] = {}
      if (subfield) {
        beneficiosErrors[idx][subfield] = issue.message
        if (subfield === 'title') beneficiosErrors[idx].titulo = issue.message
        if (subfield === 'description') beneficiosErrors[idx].descripcion = issue.message
      } else {
        errors.beneficios = issue.message
      }
    } else if (firstKey === 'pasos' && typeof path[1] === 'number') {
      const idx = path[1]
      const subfield = path[2] // 'title' or 'subtitle'
      if (!pasosErrors[idx]) pasosErrors[idx] = {}
      if (subfield) {
        pasosErrors[idx][subfield] = issue.message
        if (subfield === 'title') pasosErrors[idx].titulo = issue.message
        if (subfield === 'subtitle') pasosErrors[idx].subtitulo = issue.message
      } else {
        errors.pasos = issue.message
      }
    } else if (firstKey === 'garantias' && typeof path[1] === 'number') {
      const idx = path[1]
      garantiasErrors[idx] = issue.message
    } else if (firstKey && !errors[firstKey]) {
      errors[firstKey] = issue.message
    }
  }

  // Frontend aliases
  if (errors.subtitle) errors.labelSuperior = errors.subtitle
  if (errors.title) errors.tituloPrincipal = errors.title
  if (errors.description) errors.descripcion = errors.description
  if (errors.image_title) errors.imagenTitulo = errors.image_title
  if (errors.image_alt) errors.imagenDescripcion = errors.image_alt
  if (errors.whatsapp_number) errors.numeroWhatsapp = errors.whatsapp_number
  if (errors.button_subtext) errors.textoBoton = errors.button_subtext

  // Primer mensaje de error
  const firstTopError = Object.values(errors)[0]
  const firstBenError = beneficiosErrors.flatMap(b => Object.values(b))[0]
  const firstPasoError = pasosErrors.flatMap(p => Object.values(p))[0]
  const firstGarError = garantiasErrors.find(Boolean)
  const firstError = firstTopError || firstBenError || firstPasoError || firstGarError || 'Por favor corrige los errores en la sección Delivery.'

  return {
    isValid: false,
    errors,
    beneficiosErrors,
    pasosErrors,
    garantiasErrors,
    firstError
  }
}





