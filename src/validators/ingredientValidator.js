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
  category: z.string({ required_error: 'La categoría es obligatoria' })
    .trim()
    .min(1, 'Debes seleccionar una categoría'),
  unit: z.string({ required_error: 'La unidad de medida es obligatoria' })
    .trim()
    .min(1, 'Debes seleccionar una unidad de medida'),
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
  const categoryVal = isCreatingCategory ? newCategoryInput.trim() : (form?.category || form?.category_id || '').trim()
  const unitVal = isCreatingUnit ? newUnitInput.trim() : (form?.unit || form?.unit_of_measure || '').trim()

  const payload = {
    name: (form?.name || '').trim(),
    supplier_id: form?.supplier_id || null,
    category: categoryVal,
    unit: unitVal,
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
