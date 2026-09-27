import React from 'react'
import { Utensils, Edit2, Trash2 } from 'lucide-react'

export default function DishCard({
  dish,
  categoryName = 'SIN CATEGORÍA',
  variant = 'public',
  onClick,
  onEdit,
  onDelete,
  onToggleAvailable,
  isGerente = false,
  confirmDelete = null,
  setConfirmDelete,
  imageHeight = 'h-48 md:h-56'
}) {
  const isAvail = dish?.is_available ?? dish?.available ?? true
  const dishImg = dish?.image_url || dish?.image || dish?.imagen || ''
  const dishName = dish?.name || dish?.nombre || 'Platillo'
  const dishDesc = dish?.description || dish?.descripcion || ''
  const dishPrice = (typeof dish?.price === 'number' ? dish.price : parseFloat(dish?.price) || 0).toFixed(2)

  const rawIngredients = dish?.ingredients
  const ingredientsText = Array.isArray(rawIngredients)
    ? rawIngredients.filter(Boolean).join(', ')
    : (typeof rawIngredients === 'string' ? rawIngredients.trim() : '')

  const displayText = dishDesc || ingredientsText

  // ==========================================
  // MODO PÚBLICO (LANDING PAGE / MENÚ PÚBLICO)
  // ==========================================
  if (variant === 'public') {
    return (
      <div
        onClick={onClick}
        className="w-full bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text)] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer flex flex-col justify-between text-left"
      >
        {/* Imagen del Platillo (Aspect Ratio Uniforme sin distorsión) */}
        <div className={`relative ${imageHeight} w-full overflow-hidden bg-[var(--theme-bg)] flex items-center justify-center shrink-0`}>
          {dishImg ? (
            <img
              src={dishImg}
              alt={dishName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              draggable={false}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 select-none text-[var(--theme-text-muted)]">
              <div className="w-10 h-10 rounded-xl border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-primary)]">
                <Utensils size={20} />
              </div>
              <span className="text-[9px] font-semibold tracking-wider uppercase">Sin imagen</span>
            </div>
          )}
        </div>

        {/* Contenido (Jerarquía Limpia y Contraste Óptimo) */}
        <div className="p-4 flex flex-col gap-1 justify-between flex-1 text-left">
          <div>
            {/* Categoría con Color Primario */}
            <span 
              className="text-xs font-bold uppercase tracking-wider mb-1 block text-[var(--theme-primary)]"
            >
              {categoryName}
            </span>

            {/* Título del Platillo */}
            <h3 className="text-lg font-bold leading-tight mb-1 capitalize text-[var(--theme-text)]">
              {dishName}
            </h3>

            {/* Ingredientes / Descripción */}
            {displayText && (
              <p className="text-sm font-medium line-clamp-2 leading-relaxed text-[var(--theme-text-muted)]">
                {displayText}
              </p>
            )}
          </div>

          {/* Precio Destacado con Color Primario */}
          <span 
            className="text-lg font-bold mt-3 block text-[var(--theme-primary)]"
          >
            ${dishPrice} MXN
          </span>
        </div>
      </div>
    )
  }

  // ==========================================
  // MODO ADMIN (GESTIÓN EN PANEL INTERNO)
  // ==========================================
  const rawAllergens = dish?.allergens
  const allergensList = Array.isArray(rawAllergens)
    ? rawAllergens.filter(Boolean)
    : (typeof rawAllergens === 'string' && rawAllergens.trim() !== ''
        ? rawAllergens.split(',').map(s => s.trim()).filter(Boolean)
        : [])

  return (
    <div
      onClick={onClick}
      className={`w-full rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group border border-[var(--theme-border-subtle)] ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
      style={{
        backgroundColor: 'var(--theme-card, var(--theme-surface))'
      }}
    >
      <div className={`relative ${imageHeight} max-xl:h-40 w-full overflow-hidden bg-[var(--theme-bg)] border-b border-[var(--theme-border-subtle)] flex items-center justify-center`}>
        {dishImg ? (
          <img
            src={dishImg}
            alt={dishName}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            draggable={false}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 select-none text-[var(--theme-text-muted)]">
            <div className="w-10 h-10 rounded-xl border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-primary)]">
              <Utensils size={20} />
            </div>
            <span className="text-[9px] font-semibold tracking-wider uppercase">Sin imagen</span>
          </div>
        )}

        {/* Badge de Disponibilidad (Admin) */}
        <div className="absolute top-2.5 right-2.5 z-20">
          {isAvail ? (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white border border-emerald-700/80 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              <span>Disponible</span>
            </span>
          ) : (
            <span className="bg-rose-600/90 backdrop-blur-xs text-white border border-rose-700/80 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span>No disponible</span>
            </span>
          )}
        </div>
      </div>

      <div className="bg-[var(--theme-subcard-bg)] rounded-b-xl p-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider block text-[var(--theme-primary)]">
              {categoryName}
            </span>
            <h3 className="text-sm font-bold leading-tight text-gray-900 dark:text-white capitalize">
              {dishName}
            </h3>
            {dishDesc && (
              <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">
                {dishDesc}
              </p>
            )}
            <div className="text-base font-bold pt-0.5 text-[var(--theme-primary)]">
              ${dishPrice} MXN
            </div>
          </div>

          <div
            className="space-y-2 border rounded-xl p-2.5 shadow-2xs text-left"
            style={{
              backgroundColor: 'rgba(var(--theme-primary-rgb, 201, 168, 76), 0.08)',
              borderColor: 'rgba(var(--theme-primary-rgb, 201, 168, 76), 0.2)'
            }}
          >
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 text-[var(--theme-primary)]">
                Alérgenos
              </div>
              {allergensList.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {allergensList.map((allergen, idx) => (
                    <span
                      key={idx}
                      className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] font-semibold italic text-gray-500 dark:text-gray-400">
                  Sin alérgenos
                </div>
              )}
            </div>

            {ingredientsText && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 text-[var(--theme-primary)]">
                  Ingredientes
                </div>
                <div className="text-[11px] font-semibold leading-snug text-gray-800 dark:text-gray-200 line-clamp-2">
                  {ingredientsText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Admin */}
        <div className="border-t border-[var(--theme-border-subtle)] pt-2 mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Disponible</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!isGerente && onToggleAvailable) onToggleAvailable(dish)
              }}
              disabled={isGerente}
              style={isAvail ? { backgroundColor: 'var(--theme-primary)' } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
              className={`relative w-8 h-4 rounded-full transition-all duration-300 shrink-0 ${
                isGerente ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${isAvail ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {!isGerente && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onEdit) onEdit(dish)
                }}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer text-gray-700 dark:text-gray-200"
                title="Editar"
              >
                <Edit2 size={13} />
              </button>

              {confirmDelete === dish.id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onDelete) onDelete(dish.id)
                  }}
                  className="animate-scaleIn text-[9px] bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 rounded-lg px-2 py-0.5 hover:bg-rose-500/30 transition-all font-bold cursor-pointer"
                >
                  ¿Confirmar? ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (setConfirmDelete) {
                      setConfirmDelete(dish.id)
                      setTimeout(() => {
                        setConfirmDelete(prev => prev === dish.id ? null : prev)
                      }, 3000)
                    }
                  }}
                  className="p-1 rounded-lg hover:bg-rose-500/15 transition-all duration-200 cursor-pointer text-gray-700 dark:text-gray-200"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
