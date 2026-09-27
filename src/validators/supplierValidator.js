import { z } from 'zod'

/**
 * Esquema de validación Zod para Proveedores (Modal Nuevo / Editar Proveedor)
 */
export const supplierSchema = z.object({
  company_name: z.string({ required_error: 'El nombre de la empresa es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  contact_name: z.string()
    .max(100, 'El nombre de contacto no puede exceder 100 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  specialty: z.string({ required_error: 'La especialidad es obligatoria' })
    .trim()
    .min(1, 'Debes seleccionar una especialidad del catálogo'),
  phone: z.string({ required_error: 'El teléfono es obligatorio' })
    .trim()
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos numéricos'),
  email: z.string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val.trim() === '') return true
      return /^\S+@\S+\.\S+$/.test(val.trim())
    }, {
      message: 'Ingresa un correo electrónico válido'
    }),
  delivery_days: z.array(z.string(), { required_error: 'Selecciona al menos un día de entrega' })
    .min(1, 'Debes seleccionar al menos un día de entrega programado'),
  active: z.boolean().default(true)
})

/**
 * Validador helper para ejecutar safeParse sobre el formulario
 */
export const validateSupplier = (form, isCreatingSpecialty = false, newSpecialtyInput = '') => {
  const specialtyVal = isCreatingSpecialty ? newSpecialtyInput.trim() : (form?.specialty || '').trim()

  const payload = {
    company_name: (form?.company_name || '').trim(),
    contact_name: (form?.contact_name || '').trim(),
    specialty: specialtyVal,
    phone: (form?.phone || '').replace(/\D/g, '').trim(),
    email: (form?.email || '').trim(),
    delivery_days: Array.isArray(form?.delivery_days) ? form.delivery_days : [],
    active: typeof form?.active === 'boolean' ? form.active : true
  }

  const result = supplierSchema.safeParse(payload)
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
