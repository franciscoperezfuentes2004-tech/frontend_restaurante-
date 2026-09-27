import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, Puzzle, Search, X, ChevronDown, Check, AlertCircle } from 'lucide-react'

import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import { getExtras, createExtra, updateExtra, deleteExtra } from '../../api/extras'
import ScrollHint from '../../components/ui/ScrollHint'
import { useTheme } from '../../context/ThemeContext'

function AssignedDishes({ dishes }) {
  const [expanded, setExpanded] = useState(false)
  const [dishesScrolled, setDishesScrolled] = useState(false)
  const panelRef = useRef(null)

  if (!dishes || dishes.length === 0) {
    return <span className="text-theme-text-muted text-xs italic">Sin platillos asignados</span>
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity bg-brand-600/15 text-brand-300 border border-brand-500/20 rounded-full px-2.5 py-1 font-medium cursor-pointer"
      >
        <span>
          {dishes.length} platillo{dishes.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown size={12} className={`text-theme-text-muted transition-transform duration-200
                                          ${expanded ? 'rotate-180' : ''}`}/>
      </button>

      {expanded && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fadeIn">
          {/* Clickable backdrop overlay to close */}
          <div className="absolute inset-0 cursor-default" onClick={() => setExpanded(false)} />
          
          <div 
            ref={panelRef}
            className="relative z-10 w-[240px] bg-theme-surface border border-theme-border-subtle rounded-xl shadow-2xl shadow-black/90 p-3.5 animate-scaleIn"
          >
            <p className="text-theme-text-muted text-[10px] uppercase tracking-wider px-2 py-1 select-none font-bold">
              Platillos asignados
            </p>
            <div className="relative">
              <div
                onScroll={e => setDishesScrolled(e.currentTarget.scrollTop > 8)}
                className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent mt-1"
              >
                {dishes.map(d => {
                  const displayName = typeof d === 'object' ? d.name : d
                  const dishId = typeof d === 'object' ? d.id : d
                  return (
                    <div key={dishId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg
                                               hover:bg-theme-input transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0"/>
                      <span className="text-white/70 text-xs truncate" title={displayName}>{displayName}</span>
                    </div>
                  )
                })}
              </div>
              <ScrollHint visible={!dishesScrolled} bgFrom="#1e1c2e" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Extras() {
  const { bgCard, bgSubcard, bgInput, borderSubtle, cardShadow, textColor, textMuted, colorPrimario, primaryBtnText, isLight } = useTheme()
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Micro-interactions states
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states & validations
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)
  const [price, setPrice] = useState('')
  const [priceError, setPriceError] = useState(null)
  const [isFree, setIsFree] = useState(false)

  const validateExtraName = (val) => {
    const trimmed = (val || '').trim()
    if (!trimmed) return 'El nombre del extra es obligatorio.'
    if (trimmed.length < 2 || trimmed.length > 50) return 'El nombre debe tener entre 2 y 50 caracteres.'
    return null
  }

  const validateExtraPrice = (val, freeState = isFree) => {
    if (freeState) return null
    if (val === '' || val === null || val === undefined) return 'El precio es obligatorio si el extra no es gratis.'
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return 'El precio debe ser mayor a 0.'
    return null
  }

  const handleNameBlur = () => {
    const trimmed = name.trim()
    setName(trimmed)
    setNameError(validateExtraName(trimmed))
  }

  const handleNameChange = (e) => {
    const val = e.target.value
    setName(val)
    if (nameError) {
      setNameError(validateExtraName(val))
    }
  }

  const handlePriceBlur = () => {
    setPriceError(validateExtraPrice(price, isFree))
  }

  const handlePriceChange = (e) => {
    const val = e.target.value
    setPrice(val)
    if (priceError) {
      setPriceError(validateExtraPrice(val, isFree))
    }
  }

  const handleToggleFree = (checked) => {
    setIsFree(checked)
    if (checked) {
      setPrice('0.00')
      setPriceError(null)
    } else {
      setPrice('')
      setPriceError(validateExtraPrice('', false))
    }
  }

  const trimmedName = name.trim()
  const parsedPriceNum = parseFloat(price)
  const isPriceValid = isFree || (!isNaN(parsedPriceNum) && parsedPriceNum > 0)

  const isFormValid =
    trimmedName.length >= 2 &&
    trimmedName.length <= 50 &&
    isPriceValid &&
    !nameError &&
    (!isFree ? !priceError : true)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState('all') // 'all' | 'free' | 'paid'

  // Filter logic
  const filteredExtras = (Array.isArray(extras) ? extras : []).filter(extra =>
    (extra?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const priceFilteredExtras = filteredExtras.filter(extra => {
    const extraPrice = typeof extra.price === 'number' ? extra.price : parseFloat(extra.price) || 0
    const extraIsFree = !!extra.is_free || extraPrice === 0
    if (priceFilter === 'free') return extraIsFree
    if (priceFilter === 'paid') return !extraIsFree && extraPrice > 0
    return true
  })

  // Fetch extras list
  const fetchExtrasData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getExtras()
      const rawExtras = res?.data
      const extrasList = rawExtras?.extras || (Array.isArray(rawExtras) ? rawExtras : (rawExtras?.data || []))
      setExtras(Array.isArray(extrasList) ? extrasList : [])
    } catch (err) {
      console.error(err)
      setError('Error al cargar la lista de extras')
      setExtras([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExtrasData()
  }, [fetchExtrasData])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setName('')
    setNameError(null)
    setPrice('')
    setPriceError(null)
    setIsFree(false)
    setIsOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setName(item.name || '')
    setNameError(null)
    const isFreeVal = !!item.is_free || (parseFloat(item.price) === 0 && item.price !== undefined)
    setIsFree(isFreeVal)
    setPrice(isFreeVal ? '0.00' : (item.price ?? 0).toString())
    setPriceError(null)
    setIsOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteExtra(id)
      setConfirmDelete(null)
      setExtras(prev => (Array.isArray(prev) ? prev.filter(e => e.id !== id) : []))
      setToast({ message: 'Extra eliminado con éxito', type: 'success' })
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'No se pudo eliminar el extra.'
      setToast({ message: msg, type: 'error' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmed = name.trim()
    setName(trimmed)

    const nErr = validateExtraName(trimmed)
    const pErr = validateExtraPrice(price, isFree)

    if (nErr || pErr) {
      setNameError(nErr)
      setPriceError(pErr)
      setToast({ message: nErr || pErr, type: 'error' })
      return
    }

    setSubmitting(true)

    const parsedPrice = isFree ? 0 : (parseFloat(price) || 0)
    const payload = {
      name: trimmed,
      is_free: isFree,
      price: parsedPrice
    }

    try {
      if (editingItem) {
        const res = await updateExtra(editingItem.id, payload)
        const updatedExtra = res?.data
        if (updatedExtra && updatedExtra.id) {
          setExtras(prev => (Array.isArray(prev) ? prev : []).map(e => e.id === editingItem.id ? updatedExtra : e))
        } else {
          fetchExtrasData()
        }
        setToast({ message: 'Extra actualizado con éxito', type: 'success' })
      } else {
        const res = await createExtra(payload)
        const newExtra = res?.data
        if (newExtra && newExtra.id) {
          setExtras(prev => [newExtra, ...(Array.isArray(prev) ? prev : [])])
        } else {
          fetchExtrasData()
        }
        setToast({ message: 'Extra creado con éxito', type: 'success' })
      }
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      const serverMsg = err.response?.data?.message
      const validationErrors = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      const msg = serverMsg || validationErrors || 'Error al guardar el extra.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const actionButton = (
    <button 
      onClick={handleOpenCreate}
      className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 rounded-xl px-5 py-2.5 text-sm font-medium text-theme-text flex items-center gap-2 cursor-pointer"
    >
      <Plus size={16} />
      <span>Nuevo Extra</span>
    </button>
  )

  if (loading && extras.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-64 bg-theme-input animate-shimmer rounded-xl" />
          <div className="h-10 w-48 bg-theme-input animate-shimmer rounded-xl" />
        </div>
        <div className="space-y-3">
          <div className="animate-shimmer rounded-xl h-16 w-full" />
          <div className="animate-shimmer rounded-xl h-16 w-full" />
          <div className="animate-shimmer rounded-xl h-16 w-full" />
          <div className="animate-shimmer rounded-xl h-16 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-md:space-y-4 animate-fadeIn p-4 max-md:p-3 md:p-6 lg:p-8 font-sans">
      <PageHeader 
        title="Extras" 
        description="Gestiona ingredientes adicionales o especificaciones y asígnalos a los platillos del menú."
        action={actionButton}
      />

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
          {error}
        </div>
      )}

      {/* List Layout of Extras wrapped in bgCard container */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
                {/* Search & Filter row */}
          <div className="flex flex-wrap items-center gap-4 max-md:gap-3 w-full mb-4 max-md:mb-3">
            <div className="relative flex-1 min-w-[250px] max-md:w-full border rounded-xl transition-all duration-200" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none shrink-0"/>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar extra por nombre..."
              className="w-full bg-transparent text-theme-text text-sm pl-10 pr-9 py-2.5 focus:outline-none placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white/50 transition-colors cursor-pointer">
                <X size={14}/>
              </button>
            )}
          </div>

          {/* Price filter tabs (Sin contenedor de fondo, compactos, badges circulares) */}
          <div className="flex items-center gap-2 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-2 hide-scrollbar w-full sm:w-auto shrink-0">
            {[
              { key: 'all',  label: 'Todos', count: (Array.isArray(extras) ? extras : []).length },
              { key: 'free', label: 'Gratis', count: (Array.isArray(extras) ? extras : []).filter(e => e.is_free || (parseFloat(e.price) || 0) === 0).length },
              { key: 'paid', label: 'Con costo', count: (Array.isArray(extras) ? extras : []).filter(e => !e.is_free && (parseFloat(e.price) || 0) > 0).length },
            ].map(opt => {
              const active = priceFilter === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPriceFilter(opt.key)}
                  style={{
                    backgroundColor: active ? (colorPrimario || '#dc2626') : (colorPrimario ? `${colorPrimario}18` : 'rgba(220, 38, 38, 0.12)'),
                    color: active ? '#ffffff' : (colorPrimario || '#b91c1c'),
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs flex items-center gap-1.5 hover:opacity-90"
                >
                  <span>{opt.label}</span>
                  <span
                    style={{
                      backgroundColor: active ? 'rgba(255, 255, 255, 0.25)' : (colorPrimario ? `${colorPrimario}25` : 'rgba(220, 38, 38, 0.2)'),
                      color: active ? '#ffffff' : (colorPrimario || '#b91c1c')
                    }}
                    className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono"
                  >
                    {opt.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          {priceFilteredExtras.map((extra, index) => {
            const extraPrice = typeof extra.price === 'number' ? extra.price : parseFloat(extra.price) || 0
            const isExtraFree = !!extra.is_free || extraPrice === 0
            const delayClass = `delay-${Math.min(index + 1, 5)}`
            
              return (
                <div 
                  key={extra.id} 
                  style={{ 
                    backgroundColor: bgSubcard, 
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: borderSubtle,
                    borderLeftColor: isExtraFree ? '#10B981' : colorPrimario,
                    borderLeftWidth: '4px',
                    boxShadow: cardShadow
                  }}
                  className={`rounded-xl px-5 py-4 max-md:px-3 max-md:py-3 transition-all duration-300 flex max-md:flex-col items-center max-md:items-start justify-between gap-4 max-md:gap-2 group animate-fadeInUp hover:translate-x-1 hover:-translate-y-0.5 hover:shadow-lg ${delayClass}`}
                >
                  <div className="flex items-center max-md:items-start gap-4 max-md:gap-3 flex-1 min-w-0 w-full">
                    {/* Puzzle Icon badge */}
                    <div 
                      style={isExtraFree ? {} : { backgroundColor: `${colorPrimario}18`, color: colorPrimario }}
                      className={`w-9 h-9 max-md:w-7 max-md:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isExtraFree ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      <Puzzle size={16} className="max-md:w-4 max-md:h-4" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1 min-w-0">
                      <span className="font-bold truncate text-sm sm:text-base transition-colors" style={{ color: textColor }}>
                        {extra.name}
                      </span>
                      
                      {/* Price Badge */}
                      <div className="shrink-0">
                        {isExtraFree ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1 text-xs font-extrabold">
                            🎁 Gratis
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              backgroundColor: `${colorPrimario}18`, 
                              color: colorPrimario, 
                              borderColor: `${colorPrimario}30` 
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold border tracking-wide shadow-2xs shrink-0"
                          >
                            ✦ +${extraPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Assigned Dishes list */}
                      <div className="shrink-0 z-10">
                        <AssignedDishes dishes={extra.dishes} />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons with hover shadows */}
                  <div className="flex items-center gap-1 shrink-0 max-md:w-full max-md:justify-end max-md:mt-1">
                    <button 
                      onClick={() => handleOpenEdit(extra)}
                      style={{ color: textColor }}
                      className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={14} style={{ color: textColor }} />
                    </button>
                  
                  {confirmDelete === extra.id ? (
                    <button 
                      onClick={() => handleDelete(extra.id)}
                      className="animate-scaleIn text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2.5 py-1.5 hover:bg-red-500/30 transition-all font-bold cursor-pointer"
                    >
                      ¿Confirmar? ✓
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setConfirmDelete(extra.id)
                        setTimeout(() => {
                          setConfirmDelete(prev => prev === extra.id ? null : prev)
                        }, 3000)
                      }}
                      className="p-2 rounded-lg hover:bg-red-600/20 text-theme-text-muted hover:text-red-400 hover:shadow-md hover:shadow-red-600/20 transition-all duration-200 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {priceFilteredExtras.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="Aún no tienes extras"
                description="Agrega extras como salsas o ingredientes adicionales para tus platillos."
                iconType="extras"
                actionLabel="Agregar Extra"
                onAction={handleOpenCreate}
              />
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <Modal 
          title={editingItem ? 'Editar Extra' : 'Nuevo Extra'} 
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                className="border rounded-xl px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer h-11 flex items-center justify-center hover:opacity-80"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="extraForm"
                disabled={submitting || !isFormValid}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText || '#ffffff' }}
                className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-md cursor-pointer h-11 flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id="extraForm" onSubmit={handleSubmit} className="space-y-4 pb-2">
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Nombre del extra *
                </label>
                <input 
                  type="text" 
                  required
                  maxLength={50}
                  placeholder="Ej. Queso Extra, Salsa verde..."
                  value={name} 
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  style={{ 
                    backgroundColor: bgSubcard, 
                    borderColor: nameError ? '#EF4444' : borderSubtle, 
                    color: textColor 
                  }}
                  className={`input-subcard border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 w-full font-medium ${
                    nameError ? 'ring-2 ring-red-500/20' : ''
                  }`}
                />
                {nameError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                  Precio ($) {!isFree && '*'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={isFree ? '0.00' : price}
                      onChange={handlePriceChange}
                      onBlur={handlePriceBlur}
                      onWheel={e => e.target.blur()}
                      disabled={isFree}
                      placeholder="0.00"
                      style={{
                        backgroundColor: isFree 
                          ? (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)') 
                          : bgSubcard,
                        borderColor: (!isFree && priceError) ? '#EF4444' : borderSubtle,
                        color: isFree ? textMuted : textColor
                      }}
                      className={`input-subcard border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200 w-full font-semibold disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        (!isFree && priceError) ? 'ring-2 ring-red-500/20' : ''
                      }`}
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 py-1">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => handleToggleFree(e.target.checked)}
                      style={{ accentColor: colorPrimario }}
                      className="w-5 h-5 rounded border-theme-border-subtle cursor-pointer"
                    />
                    <span className="text-sm font-semibold select-none" style={{ color: textColor }}>
                      Es gratis
                    </span>
                  </label>
                </div>
                {!isFree && priceError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{priceError}</span>
                  </p>
                )}
              </div>
            </div>

          </form>
        </Modal>
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
