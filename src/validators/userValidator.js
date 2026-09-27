import { z } from 'zod'

/**
 * Esquema de validación Zod para Usuarios (Modal Registrar / Editar Usuario)
 */
export const userSchema = z.object({
  name: z.string({ required_error: 'El nombre completo es obligatorio.' })
    .trim()
    .min(1, 'El nombre completo es obligatorio.')
    .min(3, 'El nombre debe contener al menos 3 caracteres.')
    .max(100, 'El nombre es demasiado largo (máximo 100 caracteres).'),
  phone: z.string({ required_error: 'El número de teléfono es obligatorio' })
    .trim()
    .regex(/^\d{10}$/, 'El número de teléfono debe tener exactamente 10 dígitos numéricos'),
  email: z.string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .regex(/^\S+@\S+\.\S+$/, 'Ingrese un formato de correo electrónico válido (ejemplo: usuario@dominio.com)'),
  role: z.string({ required_error: 'Debe seleccionar un rol o nivel de acceso válido' })
    .trim()
    .min(1, 'Debe seleccionar un rol o nivel de acceso válido')
    .refine(val => val !== 'null' && val !== 'undefined' && val !== '', {
      message: 'Debe seleccionar un rol o nivel de acceso válido'
    })
})

/**
 * Validador helper para ejecutar safeParse
 */
export const validateUser = (form) => {
  const payload = {
    name: (form?.name || '').trim(),
    phone: (form?.phone || '').replace(/\D/g, '').trim(),
    email: (form?.email || '').trim().toLowerCase(),
    role: (form?.role || '').trim()
  }

  const result = userSchema.safeParse(payload)
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
