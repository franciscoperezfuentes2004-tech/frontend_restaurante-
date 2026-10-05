import { z } from 'zod'

/**
 * Esquema de validación Zod para Ingredientes (Modal Nuevo / Editar Ingrediente)
 */
export const ingredientSchema = z.object({
  name: z.string({ required_error: 'El nombre del ingrediente es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  supplier_id: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
  category: z.union([z.string(), z.number()], { required_error: 'La categoría es obligatoria' })
    .refine(val => String(val).trim().length > 0, 'Debes seleccionar una categoría'),
  unit: z.union([z.string(), z.number()], { required_error: 'La unidad de medida es obligatoria' })
    .refine(val => String(val).trim().length > 0, 'Debes seleccionar una unidad de medida'),
  min_stock: z.union([z.string(), z.number()])
    .optional()
    .nullable()
    .refine(val => {
      if (val === undefined || val === null || val === '') return true
      const num = Number(val)
      return !isNaN(num) && num >= 0
    }, 'El stock mínimo debe ser mayor o igual a 0')
    .refine(val => {
      if (val === undefined || val === null || val === '') return true
      const num = Number(val)
      return num <= 999999.99
    }, 'El stock mínimo no puede superar 999,999.99'),
  notes: z.string()
    .max(250, 'Las notas no pueden exceder 250 caracteres')
    .optional()
    .nullable()
    .or(z.literal(''))
})

/**
 * Validador helper para ejecutar safeParse sobre el formulario
 */
export const validateIngredient = (form, isCreatingCategory = false, newCategoryInput = '', isCreatingUnit = false, newUnitInput = '') => {
  const categoryVal = isCreatingCategory 
    ? newCategoryInput.trim() 
    : (form?.category_id !== undefined && form?.category_id !== '' && form?.category_id !== null ? String(form.category_id).trim() : (form?.category || '').trim())
  const unitVal = isCreatingUnit 
    ? newUnitInput.trim() 
    : (form?.unit_of_measure || form?.unit || '').trim()

  const payload = {
    name: (form?.name || '').trim(),
    supplier_id: form?.supplier_id || null,
    category: categoryVal,
    unit: unitVal,
    min_stock: form?.min_stock !== undefined ? form.min_stock : '',
    notes: form?.notes || '',
  }

  const result = ingredientSchema.safeParse(payload)
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
