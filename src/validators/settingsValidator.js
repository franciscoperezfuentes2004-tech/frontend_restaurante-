import { z } from 'zod'

/**
 * Esquema de validación Zod para Información del Restaurante (Configuración General)
 */
export const restaurantSettingsSchema = z.object({
  business_name: z.string({ required_error: 'El nombre del negocio es obligatorio.' })
    .trim()
    .min(1, 'El nombre del negocio es obligatorio.')
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),
  primary_color: z.string({ required_error: 'Ingresa un código HEX válido (ej. #0e33c8).' })
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Ingresa un código HEX válido (ej. #0e33c8).'),
  active_delivery: z.boolean().default(false),
  fixed_delivery_fee: z.union([z.string(), z.number()]).optional(),
  free_delivery_threshold: z.union([z.string(), z.number()]).optional()
}).superRefine((data, ctx) => {
  if (data.active_delivery) {
    const feeStr = data.fixed_delivery_fee !== undefined && data.fixed_delivery_fee !== null ? String(data.fixed_delivery_fee).trim() : ''
    if (!feeStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Este campo es obligatorio si el delivery está activo.',
        path: ['fixed_delivery_fee']
      })
    } else {
      const num = Number(feeStr)
      if (isNaN(num) || num < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El costo no puede ser negativo.',
          path: ['fixed_delivery_fee']
        })
      }
    }

    const freeStr = data.free_delivery_threshold !== undefined && data.free_delivery_threshold !== null ? String(data.free_delivery_threshold).trim() : ''
    if (!freeStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Este campo es obligatorio si el delivery está activo.',
        path: ['free_delivery_threshold']
      })
    } else {
      const num = Number(freeStr)
      if (isNaN(num) || num < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El costo no puede ser negativo.',
          path: ['free_delivery_threshold']
        })
      }
    }
  }
})

/**
 * Validador de archivo para logotipo
 */
export const validateLogoFile = (file) => {
  if (!file) return { isValid: true }
  
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  const fileName = file.name || ''
  const validExtensions = /\.(png|jpe?g|webp)$/i

  if (!validTypes.includes(file.type) && !validExtensions.test(fileName)) {
    return { isValid: false, error: 'Solo se permiten formatos PNG, JPG o WEBP.' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'El archivo es demasiado pesado. Máximo 10MB.' }
  }

  return { isValid: true }
}

/**
 * Helper para validar formulario completo
 */
export const validateRestaurantSettings = (form) => {
  const result = restaurantSettingsSchema.safeParse(form)
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
 * 1. Esquema de validación para Métodos de Pago
 */
export const paymentMethodsSchema = z.object({
  cash: z.boolean(),
  card: z.boolean(),
  transfer: z.boolean()
}).refine(data => data.cash || data.card || data.transfer, {
  message: 'Debe mantener al menos un método de pago activo.',
  path: ['payment_methods']
})

export const validatePaymentMethods = (data) => {
  const result = paymentMethodsSchema.safeParse(data)
  if (result.success) {
    return { isValid: true, errors: {} }
  }
  const errors = {}
  for (const issue of result.error.issues) {
    errors[issue.path[0] || 'general'] = issue.message
  }
  return { isValid: false, errors, message: result.error.issues[0]?.message }
}

/**
 * 2. Esquema de validación para Credenciales Administrativas
 */
export const adminCredentialsSchema = z.object({
  admin_email: z.string({ required_error: 'Ingresa un correo electrónico válido.' })
    .trim()
    .min(1, 'Ingresa un correo electrónico válido.')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Ingresa un correo electrónico válido.'),
  admin_phone: z.string({ required_error: 'El teléfono debe contener exactamente 10 números.' })
    .regex(/^\d{10}$/, 'El teléfono debe contener exactamente 10 números.'),
  password: z.string({ required_error: 'La contraseña es requerida.' })
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-z]/, 'Al menos una letra minúscula')
    .regex(/[A-Z]/, 'Al menos una letra mayúscula')
    .regex(/[0-9]/, 'Al menos un número')
    .regex(/[^a-zA-Z0-9\s]/, 'Al menos un símbolo')
    .refine(val => !/\s/.test(val), 'Sin espacios'),
  password_confirmation: z.string({ required_error: 'La confirmación es requerida.' })
}).refine(data => data.password === data.password_confirmation && data.password.length > 0, {
  message: 'Las contraseñas coinciden',
  path: ['password_confirmation']
})

export const validateAdminCredentials = (data) => {
  const result = adminCredentialsSchema.safeParse(data)
  if (result.success) {
    return { isValid: true, errors: {} }
  }
  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return { isValid: false, errors }
}

/**
 * 3. Esquema de validación para Zona de Entrega
 */
export const deliveryZoneSchema = z.object({
  city: z.string({ required_error: 'Este campo es obligatorio y requiere mínimo 2 letras.' })
    .trim()
    .min(2, 'Este campo es obligatorio y requiere mínimo 2 letras.'),
  municipality: z.string({ required_error: 'Este campo es obligatorio y requiere mínimo 2 letras.' })
    .trim()
    .min(2, 'Este campo es obligatorio y requiere mínimo 2 letras.'),
  state: z.string({ required_error: 'Este campo es obligatorio y requiere mínimo 2 letras.' })
    .trim()
    .min(2, 'Este campo es obligatorio y requiere mínimo 2 letras.'),
  street: z.string({ required_error: 'Este campo es obligatorio y requiere mínimo 2 letras.' })
    .trim()
    .min(2, 'Este campo es obligatorio y requiere mínimo 2 letras.'),
  zip_code: z.string({ required_error: 'El código postal debe ser de 5 dígitos.' })
    .regex(/^\d{5}$/, 'El código postal debe ser de 5 dígitos.')
})

export const validateDeliveryZone = (data) => {
  const result = deliveryZoneSchema.safeParse(data)
  if (result.success) {
    return { isValid: true, errors: {} }
  }
  const errors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return { isValid: false, errors }
}
