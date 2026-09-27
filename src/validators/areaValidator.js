import { z } from 'zod'

/**
 * Esquema de validación Zod para Área (Modal Nueva Área / Editar Área)
 */
export const areaSchema = z.object({
  name: z.string({ required_error: 'El nombre del área es obligatorio.' })
    .trim()
    .min(1, 'El nombre del área es obligatorio.')
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(50, 'El nombre no puede exceder los 50 caracteres.'),
  capacity: z.string({ required_error: 'Ingresa la capacidad máxima.' })
    .trim()
    .min(1, 'Ingresa la capacidad máxima.')
    .refine((val) => {
      const num = Number(val)
      return !isNaN(num) && Number.isInteger(num)
    }, { message: 'La capacidad debe ser un número entero.' })
    .refine((val) => {
      const num = Number(val)
      return num >= 1
    }, { message: 'La capacidad debe ser de al menos 1 persona.' }),
  tables_count: z.string({ required_error: 'Ingresa el número de mesas.' })
    .trim()
    .min(1, 'Ingresa el número de mesas.')
    .refine((val) => {
      const num = Number(val)
      return !isNaN(num) && Number.isInteger(num)
    }, { message: 'El número de mesas debe ser un número entero.' })
    .refine((val) => {
      const num = Number(val)
      return num >= 0
    }, { message: 'El número no puede ser negativo.' })
})

/**
 * Validador helper para ejecutar safeParse
 */
export const validateArea = (form) => {
  const payload = {
    name: (form?.name || '').trim(),
    capacity: form?.capacity !== undefined && form?.capacity !== null ? String(form.capacity).trim() : '',
    tables_count: form?.tables_count !== undefined && form?.tables_count !== null ? String(form.tables_count).trim() : ''
  }

  const result = areaSchema.safeParse(payload)
  if (result.success) {
    return {
      isValid: true,
      errors: {},
      data: {
        name: result.data.name,
        capacity: parseInt(result.data.capacity, 10),
        tables_count: parseInt(result.data.tables_count, 10)
      }
    }
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
