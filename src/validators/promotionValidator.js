import { z } from 'zod'

/**
 * Mapeo dinámico de esquemas según el Tipo de Promoción
 */
export const PROMO_SCHEMA_OPTIONS = {
  '2x1': [
    { value: '2x1', label: '2x1' },
    { value: '3x2', label: '3x2' },
    { value: '4x2', label: '4x2' },
    { value: '4x3', label: '4x3' },
    { value: 'custom', label: 'Personalizado' },
  ],
  fixed: [
    { value: '$50', label: '$50 de descuento' },
    { value: '$100', label: '$100 de descuento' },
    { value: '$150', label: '$150 de descuento' },
    { value: '10%', label: '10% de descuento' },
    { value: '15%', label: '15% de descuento' },
    { value: '20%', label: '20% de descuento' },
    { value: 'custom', label: 'Personalizado' },
  ],
  combo: [
    { value: '$149', label: 'Combo Individual ($149)' },
    { value: '$199', label: 'Combo Dúo ($199)' },
    { value: '$249', label: 'Combo Trío ($249)' },
    { value: '$299', label: 'Combo Especial ($299)' },
    { value: '$399', label: 'Combo Familiar ($399)' },
    { value: 'custom', label: 'Personalizado' },
  ],
}

/**
 * Convierte un string HH:mm a minutos desde media noche
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Esquema de validación Zod para Promociones
 */
export const promotionSchema = z.object({
  name: z.string({ required_error: 'El nombre de la promoción es obligatorio' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  type: z.string({ required_error: 'El tipo es obligatorio' })
    .min(1, 'El tipo es obligatorio'),
  schema: z.string({ required_error: 'El esquema es obligatorio' })
    .trim()
    .min(1, 'El esquema es obligatorio'),
  applicable_products: z.array(z.any(), { required_error: 'Debes seleccionar al menos 1 producto' })
    .min(1, 'Debes seleccionar al menos 1 producto aplicable'),
  valid_days: z.array(z.string(), { required_error: 'Debes seleccionar al menos un día de vigencia' })
    .min(1, 'Debes seleccionar al menos un día de vigencia'),
  has_date_range: z.boolean().default(false),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  has_time_range: z.boolean().default(false),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // Validación de Rango de Fechas
  if (data.has_date_range) {
    if (!data.start_date || !data.start_date.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de inicio es obligatoria',
        path: ['start_date'],
      })
    }
    if (!data.end_date || !data.end_date.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin es obligatoria',
        path: ['end_date'],
      })
    }
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
        path: ['end_date'],
      })
    }
  }

  // Validación de Horario de Aplicación
  if (data.has_time_range) {
    if (!data.start_time || !data.start_time.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La hora de inicio es obligatoria',
        path: ['start_time'],
      })
    }
    if (!data.end_time || !data.end_time.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La hora de fin es obligatoria',
        path: ['end_time'],
      })
    }
    if (data.start_time && data.end_time) {
      if (timeToMinutes(data.end_time) <= timeToMinutes(data.start_time)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La hora de fin debe ser lógicamente posterior a la hora de inicio',
          path: ['end_time'],
        })
      }
    }
  }
})

/**
 * Función validadora para usar en tiempo real en los componentes React
 */
export function validatePromotionForm(form) {
  const payload = {
    name: (form?.name || '').trim(),
    type: form?.type || '',
    schema: (form?.value || '').trim(),
    applicable_products: form?.selectedDishes || [],
    valid_days: form?.days || [],
    has_date_range: !!form?.hasDateFilter,
    start_date: form?.startDate || '',
    end_date: form?.endDate || '',
    has_time_range: !!form?.hasTimeFilter,
    start_time: form?.timeStart || '',
    end_time: form?.timeEnd || '',
  }

  const result = promotionSchema.safeParse(payload)
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
