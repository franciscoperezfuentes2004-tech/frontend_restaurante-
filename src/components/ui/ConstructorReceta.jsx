import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, ChefHat } from 'lucide-react'
import { adminGetIngredients } from '../../api/ingredients'
import { getDishRecipe, saveDishRecipe } from '../../api/dishes'
import { useTheme } from '../../context/ThemeContext'
import Dropdown from './Dropdown'
import Toast from './Toast'

export default function ConstructorReceta({ platilloId, onSaved = null }) {
  const { bgSubcard, colorPrimario, borderSubtle, textColor, textMuted, isLight } = useTheme()

  // Lista temporal de ingredientes que conforman la receta
  const [receta, setReceta] = useState([])
  
  // Catálogo de ingredientes disponibles desde la BD
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)

  // Controles para agregar una nueva fila
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // 1. Cargar ingredientes disponibles desde la BD
  useEffect(() => {
    const fetchIngs = async () => {
      try {
        setLoadingIngredients(true)
        const res = await adminGetIngredients()
        const rawList = res?.data?.ingredients || (Array.isArray(res?.data) ? res.data : [])
        const mapped = (Array.isArray(rawList) ? rawList : []).map(i => ({
          id: i.id,
          nombre: i.name || i.nombre || ('Ingrediente #' + i.id),
          unidad: i.unit || i.unidad_medida || i.unidad || 'unidad',
        }))
        setIngredientesDisponibles(mapped)
      } catch (err) {
        console.error('Error al cargar ingredientes disponibles:', err)
      } finally {
        setLoadingIngredients(false)
      }
    }
    fetchIngs()
  }, [])

  // 2. Cargar receta existente del platillo si ya existe en la BD
  useEffect(() => {
    if (!platilloId) return
    const fetchCurrentRecipe = async () => {
      try {
        const res = await getDishRecipe(platilloId)
        const data = res?.data
        const rawItems = data?.ingredientes || data?.recipe || (Array.isArray(data) ? data : [])
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const parsed = rawItems.map(item => ({
            id: item.id || item.ingredient_id,
            nombre: item.nombre || item.name || item.ingredient?.name || item.ingredient?.nombre || 'Ingrediente',
            unidad: item.unidad || item.unit || item.ingredient?.unit || item.ingredient?.unidad_medida || 'unidad',
            cantidad: parseFloat(item.cantidad ?? item.cantidad_requerida ?? item.pivot?.cantidad_requerida ?? 0)
          }))
          setReceta(parsed)
        }
      } catch (err) {
        // Sin receta previa
      }
    }
    fetchCurrentRecipe()
  }, [platilloId])

  // 3. Añadir ingrediente a la lista visual
  const agregarIngrediente = () => {
    if (!ingredienteSeleccionado || !cantidad) {
      setToast({ message: 'Selecciona un ingrediente y escribe la cantidad.', type: 'error' })
      return
    }

    const parsedQty = parseFloat(cantidad)
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setToast({ message: 'La cantidad debe ser mayor a 0.', type: 'error' })
      return
    }

    const info = ingredientesDisponibles.find(i => i.id === parseInt(ingredienteSeleccionado, 10))
    if (!info) return

    // Evitar duplicados
    if (receta.find(item => item.id === info.id)) {
      setToast({ message: 'Este ingrediente ya está en la receta.', type: 'error' })
      return
    }

    setReceta(prev => [
      ...prev,
      {
        id: info.id,
        nombre: info.nombre,
        unidad: info.unidad,
        cantidad: parsedQty,
      }
    ])

    // Limpiar inputs
    setIngredienteSeleccionado('')
    setCantidad('')
  }

  // 4. Guardar receta en BD en el formato que Laravel sync() necesita
  const guardarRecetaEnBD = async () => {
    if (!platilloId) {
      setToast({ message: 'Primero guarda el platillo para obtener su ID antes de guardar su receta.', type: 'error' })
      return
    }

    // Formato Laravel sync: { 1: { cantidad_requerida: 0.150 }, 2: { cantidad_requerida: 1 } }
    const payload = {}
    receta.forEach(item => {
      payload[item.id] = { cantidad_requerida: item.cantidad }
    })

    setSaving(true)
    try {
      await saveDishRecipe(platilloId, { ingredientes: payload })
      setToast({ message: '¡Receta guardada con éxito!', type: 'success' })
      if (onSaved) onSaved(receta)
    } catch (error) {
      console.error('Error al guardar receta:', error)
      const msg = error.response?.data?.message || 'Error al guardar la receta en el servidor.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div 
      className="p-5 rounded-2xl border transition-all duration-200"
      style={{ 
        backgroundColor: bgSubcard, 
        borderColor: borderSubtle 
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b" style={{ borderColor: borderSubtle }}>
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${colorPrimario || '#3b82f6'}18`, color: colorPrimario || '#3b82f6' }}
        >
          <ChefHat size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: textColor }}>
            Construir Receta
          </h3>
          <p className="text-[11px] font-medium" style={{ color: textMuted }}>
            Insumos requeridos para descontar del stock en cada venta
          </p>
        </div>
      </div>

      {/* 1. Formulario para agregar ingrediente */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-5 items-end">
        {/* Selector de ingrediente */}
        <div className="sm:col-span-6 w-full">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
            Ingrediente
          </label>
          <Dropdown
            options={ingredientesDisponibles.map(ing => ({
              value: ing.id,
              label: `${ing.nombre} (${ing.unidad})`
            }))}
            value={ingredienteSeleccionado}
            onChange={(val) => setIngredienteSeleccionado(val)}
            placeholder={loadingIngredients ? 'Cargando insumos...' : 'Selecciona ingrediente...'}
            className="w-full"
            searchable={true}
          />
        </div>

        {/* Input de cantidad */}
        <div className="sm:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>
            Cantidad
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                agregarIngrediente()
              }
            }}
            placeholder="Ej. 0.150"
            className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none transition-all border"
            style={{
              backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)',
              color: textColor,
              borderColor: borderSubtle,
            }}
          />
        </div>

        {/* Boton Añadir */}
        <div className="sm:col-span-3">
          <button
            type="button"
            onClick={agregarIngrediente}
            className="w-full rounded-xl py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 shadow-xs"
            style={{
              backgroundColor: colorPrimario || 'var(--theme-primary, #3b82f6)',
              color: 'var(--theme-primary-contrast, #ffffff)',
            }}
          >
            <Plus size={14} />
            <span>Añadir</span>
          </button>
        </div>
      </div>

      {/* 2. Lista de la receta actual */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
            Ingredientes en la Receta ({receta.length})
          </span>
        </div>

        {receta.length === 0 ? (
          <div 
            className="p-4 rounded-xl border text-center text-xs font-medium italic"
            style={{ 
              backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)',
              borderColor: borderSubtle, 
              color: textMuted 
            }}
          >
            No hay ingredientes asignados a esta receta.
          </div>
        ) : (
          <div 
            className="rounded-xl border divide-y overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
            style={{ 
              backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)',
              borderColor: borderSubtle 
            }}
          >
            {receta.map((item, index) => (
              <div 
                key={item.id ?? index} 
                className="p-3 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: borderSubtle }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold truncate" style={{ color: textColor }}>
                    {item.nombre}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border"
                    style={{
                      backgroundColor: `${colorPrimario || '#3b82f6'}15`,
                      borderColor: `${colorPrimario || '#3b82f6'}30`,
                      color: colorPrimario || 'var(--theme-primary, #3b82f6)',
                    }}
                  >
                    {item.cantidad} {item.unidad}
                  </span>

                  <button
                    type="button"
                    onClick={() => setReceta(prev => prev.filter(i => i.id !== item.id))}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title="Quitar ingrediente"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Boton Guardar */}
      {platilloId ? (
        <button
          type="button"
          disabled={receta.length === 0 || saving}
          onClick={guardarRecetaEnBD}
          className="w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98"
          style={{
            backgroundColor: colorPrimario || 'var(--theme-primary, #3b82f6)',
            color: 'var(--theme-primary-contrast, #ffffff)',
          }}
        >
          {saving ? (
            <span>Guardando Receta...</span>
          ) : (
            <>
              <Check size={14} />
              <span>Guardar Receta en Sistema</span>
            </>
          )}
        </button>
      ) : (
        <p className="text-[11px] text-center italic" style={{ color: textMuted }}>
          Guarda primero el platillo para poder registrar su receta en el sistema.
        </p>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
