import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, Copy, Check, Utensils, AlertCircle } from 'lucide-react'
import Dropdown from '../../components/ui/Dropdown'
import { useAuth } from '../../context/AuthContext'

import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import ImageUploader from '../../components/ui/ImageUploader'
import EmptyState from '../../components/ui/EmptyState'
import { getDishes, createDish, updateDish, deleteDish, toggleDish } from '../../api/dishes'
import { getCategories } from '../../api/categories'
import { getExtras, createExtra, updateExtra } from '../../api/extras'
import { useTheme } from '../../context/ThemeContext'
import ConstructorReceta from '../../components/ui/ConstructorReceta'

const getDishTheme = (index) => {
  const themes = [
    { hoverBorder: 'hover:border-brand-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-brand-600/25', titleHover: 'group-hover:text-brand-400', btnHover: 'hover:bg-brand-600/20 hover:text-brand-400 hover:shadow-brand-600/20' },
    { hoverBorder: 'hover:border-emerald-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-emerald-500/25', titleHover: 'group-hover:text-emerald-400', btnHover: 'hover:bg-emerald-600/20 hover:text-emerald-400 hover:shadow-emerald-600/20' },
    { hoverBorder: 'hover:border-blue-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-blue-500/25', titleHover: 'group-hover:text-blue-400', btnHover: 'hover:bg-blue-600/20 hover:text-blue-400 hover:shadow-blue-600/20' },
    { hoverBorder: 'hover:border-yellow-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-yellow-500/25', titleHover: 'group-hover:text-yellow-400', btnHover: 'hover:bg-yellow-600/20 hover:text-yellow-400 hover:shadow-yellow-600/20' },
    { hoverBorder: 'hover:border-rose-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-rose-500/25', titleHover: 'group-hover:text-rose-400', btnHover: 'hover:bg-rose-600/20 hover:text-rose-400 hover:shadow-rose-600/20' },
    { hoverBorder: 'hover:border-orange-500/40', hoverShadow: 'hover:shadow-2xl hover:shadow-orange-500/25', titleHover: 'group-hover:text-orange-400', btnHover: 'hover:bg-orange-600/20 hover:text-orange-400 hover:shadow-orange-600/20' },
  ]
  return themes[index % themes.length]
}

export default function Dishes() {
  const { user } = useAuth()
  const esGerente = user?.role === 'gerente'
  const { bgCard, bgSubcard, bgModal, bgInput, borderSubtle, cardShadow, textColor, textMuted, textSubtle, colorPrimario, primaryBtnText, isLight } = useTheme()

  const [dishes, setDishes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Micro-interactions states
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Form states & validations
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceError, setPriceError] = useState(null)
  const [image, setImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryError, setCategoryError] = useState(null)
  const [available, setAvailable] = useState(true)

  // Validaciones del formulario
  const validateDishName = (val) => {
    const trimmed = (val || '').trim()
    if (!trimmed) return 'El nombre del platillo es obligatorio.'
    if (trimmed.length < 3 || trimmed.length > 100) return 'El nombre debe tener entre 3 y 100 caracteres.'
    return null
  }

  const validateDishPrice = (val) => {
    if (val === '' || val === null || val === undefined) return 'El precio es obligatorio.'
    const num = parseFloat(val)
    if (isNaN(num) || num < 0.01) return 'El precio debe ser un número mayor a 0 (mínimo $0.01).'
    return null
  }

  const validateDishCategory = (val) => {
    if (!val) return 'Debes seleccionar una categoría.'
    const num = parseInt(val, 10)
    if (isNaN(num) || num <= 0) return 'La categoría seleccionada no es válida.'
    return null
  }

  const handleNameBlur = () => {
    const trimmed = name.trim()
    setName(trimmed)
    setNameError(validateDishName(trimmed))
  }

  const handleNameChange = (e) => {
    const val = e.target.value
    setName(val)
    if (nameError) {
      setNameError(validateDishName(val))
    }
  }

  const handlePriceChange = (e) => {
    const val = e.target.value
    setPrice(val)
    if (priceError) {
      setPriceError(validateDishPrice(val))
    }
  }

  const handlePriceKeyDown = (e) => {
    // Bloquear signo negativo (-), notación científica (e/E) y signo más (+)
    if (['-', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault()
    }
  }

  const handleCategoryChange = (e) => {
    const val = e.target.value
    setCategoryId(val)
    if (categoryError) {
      setCategoryError(validateDishCategory(val))
    }
  }

  const trimmedName = name.trim()
  const parsedPriceNum = parseFloat(price)
  const parsedCatId = parseInt(categoryId, 10)

  const isFormValid = 
    trimmedName.length >= 3 &&
    trimmedName.length <= 100 &&
    !isNaN(parsedPriceNum) &&
    parsedPriceNum >= 0.01 &&
    !isNaN(parsedCatId) &&
    parsedCatId > 0 &&
    !nameError &&
    !priceError &&
    !categoryError

  // Additional fields states
  const [allExtras, setAllExtras] = useState([])
  const [hasAllergens, setHasAllergens] = useState(false)
  const [availableAllergens, setAvailableAllergens] = useState(['Lácteos', 'Gluten', 'Mariscos', 'Frutos secos'])
  const [allergens, setAllergens] = useState([])
  const [newAllergenInput, setNewAllergenInput] = useState('')
  const [hasIngredients, setHasIngredients] = useState(false)
  const [ingredients, setIngredients] = useState('')
  const [selectedExtras, setSelectedExtras] = useState([])
  const [allowObservations, setAllowObservations] = useState(true)
  const [allowSpiceLevel, setAllowSpiceLevel] = useState(false)

  // Fetch categories and extras once
  // Fetch categories and extras
  const fetchCatsAndExtras = useCallback(async () => {
    try {
      const [catsResult, extrasResult] = await Promise.allSettled([
        getCategories(),
        getExtras()
      ])

      if (catsResult.status === 'fulfilled') {
        const rawCats = catsResult.value?.data
        const catList = rawCats?.categories || (Array.isArray(rawCats) ? rawCats : (rawCats?.data || []))
        setCategories(Array.isArray(catList) ? catList : [])
      } else {
        setCategories([])
      }

      if (extrasResult.status === 'fulfilled') {
        const rawExtras = extrasResult.value?.data
        const extrasList = rawExtras?.extras || (Array.isArray(rawExtras) ? rawExtras : (rawExtras?.data || []))
        setAllExtras(Array.isArray(extrasList) ? extrasList : [])
      } else {
        setAllExtras([])
      }
    } catch (err) {
      console.error("Error loading categories/extras:", err)
      setCategories([])
      setAllExtras([])
    }
  }, [])

  useEffect(() => {
    let isMounted = true;
    fetchCatsAndExtras().then(() => {
      if (!isMounted) return;
    });
    return () => { isMounted = false; };
  }, [fetchCatsAndExtras])

  // Fetch dishes
  const fetchDishesData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (searchQuery) params.search = searchQuery
      if (selectedCategory !== 'all') params.category_id = selectedCategory
      
      const res = await getDishes(params)
      const rawDishes = res?.data
      const dishList = rawDishes?.dishes || (Array.isArray(rawDishes) ? rawDishes : (rawDishes?.data || []))
      setDishes(Array.isArray(dishList) ? dishList : [])
    } catch (err) {
      console.error(err)
      setError('Error al cargar los platillos')
      setDishes([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDishesData()
  }, [fetchDishesData])

  const handleAddCustomAllergen = (e) => {
    if (e) e.preventDefault()
    const trimmed = newAllergenInput.trim()
    if (!trimmed) return

    if (!availableAllergens.includes(trimmed)) {
      setAvailableAllergens([...availableAllergens, trimmed])
    }
    if (!allergens.includes(trimmed)) {
      setAllergens([...allergens, trimmed])
    }
    setNewAllergenInput('')
  }

  const refreshExtras = () => {
    fetchCatsAndExtras()
  }

  const handleOpenCreate = () => {
    setName('')
    setNameError(null)
    setDescription('')
    setPrice('')
    setPriceError(null)
    setImage('')
    setCategoryId('')
    setCategoryError(null)
    setAvailable(true)
    
    setHasAllergens(false)
    setAvailableAllergens(['Lácteos', 'Gluten', 'Mariscos', 'Frutos secos'])
    setAllergens([])
    setNewAllergenInput('')
    setHasIngredients(false)
    setIngredients('')
    setSelectedExtras([])
    setAllowObservations(true)
    setAllowSpiceLevel(false)

    setEditingItem(null)
    setIsOpen(true)
    refreshExtras()
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setName(item.name || '')
    setNameError(null)
    setDescription(item.description || '')
    setPrice((item.price || 0).toString())
    setPriceError(null)
    setImage(item.image || item.image_url || '')
    setCategoryId(item.category_id || item.categoryId || '')
    setCategoryError(null)
    
    const isAvail = item.available ?? item.is_available ?? true
    setAvailable(!!isAvail)

    const itemAllergens = item.allergens || []
    setHasAllergens(itemAllergens.length > 0)
    
    const defaultAllergens = ['Lácteos', 'Gluten', 'Mariscos', 'Frutos secos']
    const combinedAllergens = Array.from(new Set([...defaultAllergens, ...itemAllergens]))
    setAvailableAllergens(combinedAllergens)
    setAllergens(itemAllergens)
    setNewAllergenInput('')

    const itemIngredients = item.ingredients || []
    setHasIngredients(itemIngredients.length > 0)
    setIngredients(itemIngredients.join(', '))

    const itemExtras = item.extras || []
    setSelectedExtras(itemExtras)

    setAllowObservations(item.allow_observations ?? true)
    setAllowSpiceLevel(!!(item.allow_spice_level ?? item.allowSpiceLevel ?? false))

    setIsOpen(true)
    refreshExtras()
  }

  const handleDelete = async (id) => {
    try {
      await deleteDish(id)
      setConfirmDelete(null)
      setDishes(prev => (Array.isArray(prev) ? prev.filter(d => d.id !== id) : []))
      setToast({ message: 'Platillo eliminado con éxito', type: 'success' })
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'No se pudo eliminar el platillo.'
      setToast({ message: msg, type: 'error' })
    }
  }

  const handleToggleAvailable = async (dish) => {
    const isAvail = dish?.is_available ?? dish?.available ?? true
    const nextVal = !isAvail
    
    // Optimistic UI update
    setDishes(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === dish.id ? { ...d, is_available: nextVal, available: nextVal } : d))

    try {
      const res = await toggleDish(dish.id)
      if (res?.data && res.data.id) {
        setDishes(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === dish.id ? { ...d, ...res.data } : d))
      }
      setToast({ message: 'Disponibilidad actualizada', type: 'success' })
    } catch (err) {
      console.error("Failed to toggle availability:", err)
      fetchDishesData()
      setToast({ message: 'Error al cambiar disponibilidad', type: 'error' })
    }
  }

  const toggleExtra = (extraId) => {
    setSelectedExtras(prev =>
      (Array.isArray(prev) ? prev : []).includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...(Array.isArray(prev) ? prev : []), extraId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedName = name.trim()
    setName(trimmedName)

    const nErr = validateDishName(trimmedName)
    const pErr = validateDishPrice(price)
    const cErr = validateDishCategory(categoryId)

    if (nErr || pErr || cErr) {
      setNameError(nErr)
      setPriceError(pErr)
      setCategoryError(cErr)
      setToast({ message: nErr || pErr || cErr, type: 'error' })
      return
    }

    setSubmitting(true)

    const parsedPrice = parseFloat(price) || 0
    const defaultImage = image.trim() || ''

    const listAllergens = hasAllergens ? allergens : []
    const listIngredients = hasIngredients 
      ? (typeof ingredients === 'string' ? ingredients.split('\n').map(i => i.trim()).filter(Boolean) : (Array.isArray(ingredients) ? ingredients : []))
      : []

    const payload = {
      name: trimmedName,
      description: description.trim(),
      price: parsedPrice,
      image_url: defaultImage,
      category_id: parseInt(categoryId, 10),
      is_available: available ? 1 : 0,
      available: available ? 1 : 0,
      allergens: listAllergens,
      ingredients: listIngredients,
      extras: selectedExtras,
      allow_observations: allowObservations ? 1 : 0,
      allow_spice_level: allowSpiceLevel ? 1 : 0
    }

    try {
      if (editingItem) {
        const res = await updateDish(editingItem.id, payload)
        const updatedDish = res?.data
        if (updatedDish && updatedDish.id) {
          setDishes(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === editingItem.id ? updatedDish : d))
        } else {
          fetchDishesData()
        }
        setToast({ message: 'Platillo guardado con éxito', type: 'success' })
      } else {
        const res = await createDish(payload)
        const newDish = res?.data
        if (newDish && newDish.id) {
          setDishes(prev => [newDish, ...(Array.isArray(prev) ? prev : [])])
        } else {
          fetchDishesData()
        }
        setToast({ message: 'Platillo creado con éxito', type: 'success' })
      }
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      const serverMsg = err.response?.data?.message
      const validationErrors = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      const msg = serverMsg || validationErrors || 'Error al guardar el platillo.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const actionButton = (
    <button
      onClick={handleOpenCreate}
      className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-theme-text cursor-pointer flex items-center gap-2"
    >
      <Plus size={16} />
      <span>Nuevo platillo</span>
    </button>
  )

  if (loading && dishes.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-64 bg-theme-input animate-shimmer rounded-xl" />
          <div className="h-10 w-48 bg-theme-input animate-shimmer rounded-xl" />
        </div>
        <div className="grid grid-cols-4 xl:grid-cols-5 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
          <div className="animate-shimmer rounded-2xl h-80 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-md:space-y-4 animate-fadeIn p-4 max-md:p-3 md:p-6 lg:p-8 font-sans">
      <PageHeader 
        title="Platillos" 
        description="Agrega, edita y administra los platillos disponibles en el menú de Aurum."
        action={!esGerente ? actionButton : (
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/10">
            👁 Modo solo lectura
          </span>
        )}
      />

      {/* 1. Filters Container */}
      <div className="rounded-2xl p-6 max-md:p-3 mb-6 max-md:mb-4 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <div className="flex flex-wrap items-center gap-4 max-md:gap-3 w-full">
          <div className="relative border rounded-xl transition-all duration-200 flex-1 min-w-[250px] max-md:w-full" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Buscar por nombre de platillo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-theme-text placeholder-gray-400 text-sm pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>
          
          <Dropdown
            options={[
              { value: 'all', label: 'Todas las categorías' },
              ...(Array.isArray(categories) ? categories : []).map(cat => ({ value: cat?.id, label: cat?.name || 'Categoría' }))
            ]}
            value={selectedCategory}
            onChange={setSelectedCategory}
            icon={<SlidersHorizontal size={14} className="text-theme-text-muted" />}
            className="min-w-[200px] max-md:w-full"
            dropdownClassName="w-56 mt-2 max-md:w-full"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl text-center font-medium animate-fadeIn">
          {error}
        </div>
      )}

      {/* 2. Grid of Dishes wrapped in container */}
        <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
          {loading ? (
            <div 
              className="grid gap-6 max-md:gap-4 items-start animate-fadeIn"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
            >
            <div className="animate-shimmer rounded-2xl h-80 w-full" />
            <div className="animate-shimmer rounded-2xl h-80 w-full" />
            <div className="animate-shimmer rounded-2xl h-80 w-full" />
          </div>
        ) : (
          <div 
            className="grid gap-6 max-md:gap-4 items-start"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
          >
            {(Array.isArray(dishes) ? dishes : []).map((dish, index) => {
              if (!dish) return null
              const isAvail = dish?.available ?? dish?.is_available ?? true
              const categoryName = dish?.category?.name ?? dish?.category ?? 'Sin categoría'
              const delayClass = `delay-${Math.min(index + 1, 5)}`
              const theme = getDishTheme(index)
              
              return (
                <div 
                  key={dish.id || index} 
                  style={{ backgroundColor: bgSubcard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}
                  className={`card-primary-hover w-full rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col group animate-fadeInUp ${delayClass}`}
                >
                  {/* Dish Image / Placeholder */}
                  <div 
                    style={{ 
                      backgroundColor: isLight ? '#CBD5E1' : 'rgba(0, 0, 0, 0.25)', 
                      borderColor: borderSubtle 
                    }}
                    className="relative w-full h-36 sm:h-38 md:h-36 lg:h-40 overflow-hidden border-b flex items-center justify-center bg-black/20"
                  >
                    {dish?.image_url || dish?.image ? (
                      <img 
                        src={dish?.image_url || dish?.image} 
                        alt={dish?.name || 'Platillo'} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 select-none" style={{ color: textMuted }}>
                        <div 
                          className="w-9 h-9 rounded-xl border flex items-center justify-center" 
                          style={{ backgroundColor: bgCard, borderColor: borderSubtle, color: colorPrimario }}
                        >
                          <Utensils size={18} style={{ color: colorPrimario }} />
                        </div>
                        <span className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: textSubtle }}>Sin imagen</span>
                      </div>
                    )}
                    
                    {/* Availability badge */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      {isAvail ? (
                        <span className="bg-emerald-600 text-white border border-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                          <span>Disponible</span>
                        </span>
                      ) : (
                        <span className="bg-rose-600 text-white border border-rose-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                          <span>No disponible</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content info */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                    <div className="space-y-2">
                      {/* Top row: Category and Price */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: colorPrimario }}>
                          {categoryName}
                        </span>
                        <span className="text-base font-black shrink-0" style={{ color: colorPrimario }}>
                          ${(typeof dish?.price === 'number' ? dish.price : parseFloat(dish?.price) || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Name */}
                      <h3 className="text-sm sm:text-base font-bold leading-tight" style={{ color: textColor }}>
                        {dish?.name}
                      </h3>

                      {/* Description */}
                      {dish?.description && (
                        <p className="text-[11px] sm:text-xs line-clamp-2 leading-relaxed" style={{ color: textMuted }}>
                          {dish.description}
                        </p>
                      )}

                      {/* Allergens and Ingredients container */}
                      <div 
                        className="space-y-1.5 border rounded-xl p-2.5 text-xs mt-1" 
                        style={{ backgroundColor: `${colorPrimario}0a`, borderColor: `${colorPrimario}20` }}
                      >
                        {/* Allergens */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider shrink-0" style={{ color: colorPrimario }}>
                            Alérgenos:
                          </span>
                          {dish?.allergens && (Array.isArray(dish.allergens) ? dish.allergens.length > 0 : String(dish.allergens).trim() !== '') ? (
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(dish.allergens) 
                                ? dish.allergens 
                                : String(dish.allergens).split(',').map(s => s.trim()).filter(Boolean)
                              ).map((allergen, idx) => (
                                <span key={idx} className="bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/25 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md">
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium italic" style={{ color: textSubtle }}>Sin alérgenos</span>
                          )}
                        </div>

                        {/* Ingredients */}
                        {((dish?.ingredients && Array.isArray(dish.ingredients) && dish.ingredients.length > 0) || 
                          (typeof dish?.ingredients === 'string' && dish.ingredients.trim() !== '')) && (
                          <div className="text-[10.5px] leading-snug pt-1 border-t border-dashed" style={{ borderColor: `${colorPrimario}20` }}>
                            <span className="font-extrabold uppercase tracking-wider text-[9.5px] mr-1" style={{ color: colorPrimario }}>
                              Ingredientes:
                            </span>
                            <span className="font-medium" style={{ color: textColor }}>
                              {Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : dish.ingredients}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="border-t pt-2 mt-2.5 flex items-center justify-between" style={{ borderColor: borderSubtle }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium" style={{ color: textMuted }}>Disponible</span>
                        {/* Styled Custom Toggle */}
                        <button 
                          onClick={() => !esGerente && handleToggleAvailable(dish)} 
                          disabled={esGerente}
                          style={isAvail ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                          className={`relative w-8 h-4 rounded-full transition-all duration-300 shrink-0 ${esGerente ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${isAvail ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {!esGerente && (
                        <div className="flex items-center gap-0.5">
                          <button 
                            onClick={() => handleOpenEdit(dish)}
                            style={{ color: textColor }}
                            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={13} style={{ color: textColor }} />
                          </button>
                          
                          {confirmDelete === dish.id ? (
                            <button 
                              onClick={() => handleDelete(dish.id)}
                              className="animate-scaleIn text-[9px] bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 rounded-lg px-2 py-0.5 hover:bg-rose-500/30 transition-all font-bold cursor-pointer"
                            >
                              ¿Confirmar? ✓
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setConfirmDelete(dish.id)
                                setTimeout(() => {
                                  setConfirmDelete(prev => prev === dish.id ? null : prev)
                                }, 3000)
                              }}
                              style={{ color: textColor }}
                              className="p-1 rounded-lg hover:bg-rose-500/15 transition-all duration-200 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={13} style={{ color: textColor }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {(!Array.isArray(dishes) || dishes.length === 0) && (
              <div className="col-span-full">
                <EmptyState
                  title="Aún no tienes platillos"
                  description="Agrega el primer platillo al menú para comenzar a vender."
                  iconType="dishes"
                  actionLabel="Agregar Platillo"
                  onAction={handleOpenCreate}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)}></div>

          {/* 2. CONTENEDOR DEL MODAL (Límite del 70% en móvil para no saturar, 85% en md) */}
          <div 
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-fadeInUp z-10"
          >
            {/* Cabecera (Congelada) */}
            <div 
              className="bg-blue-800 text-white p-4 shrink-0 flex justify-between items-center transition-colors"
              style={{ backgroundColor: colorPrimario || '#1e40af' }}
            >
              <h2 className="font-bold text-lg text-white">
                {editingItem ? 'Editar Platillo' : 'Nuevo Platillo'}
              </h2>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all duration-200 text-lg font-bold leading-none cursor-pointer text-white"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* 3. FORMULARIO (Área de scroll interno) */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-zinc-950">
                <div>
                  <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                    Nombre del platillo *
                  </label>
                  <input 
                    type="text" 
                    required
                    maxLength={100}
                    placeholder="Ej. Ribeye Angus Premium"
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold tracking-wider uppercase" style={{ color: textMuted }}>
                      Descripción
                    </label>
                    <span 
                      className={`text-[11px] font-mono ${(description || '').length >= 250 ? 'text-amber-500 font-bold' : ''}`} 
                      style={{ color: (description || '').length >= 250 ? undefined : textSubtle }}
                    >
                      {(description || '').length}/250
                    </span>
                  </div>
                  <textarea 
                    rows="3"
                    maxLength={250}
                    placeholder="Ingredientes, gramaje o términos de cocción..."
                    value={description} 
                    onChange={(e) => setDescription(e.target.value.slice(0, 250))}
                    style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                    className="input-subcard border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 w-full resize-none leading-relaxed font-medium"
                  />
                  <div className="flex justify-end mt-1">
                    <span 
                      className={`text-[11px] font-mono ${(description || '').length >= 250 ? 'text-amber-500 font-bold' : ''}`} 
                      style={{ color: (description || '').length >= 250 ? undefined : textSubtle }}
                    >
                      {(description || '').length}/250
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                      Precio ($) *
                    </label>
                    <input 
                      type="number" 
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="350.00"
                      value={price} 
                      onChange={handlePriceChange}
                      onBlur={() => setPriceError(validateDishPrice(price))}
                      onKeyDown={handlePriceKeyDown}
                      onWheel={(e) => e.target.blur()}
                      style={{ 
                        backgroundColor: bgSubcard, 
                        borderColor: priceError ? '#EF4444' : borderSubtle, 
                        color: textColor 
                      }}
                      className={`input-subcard border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200 w-full font-semibold ${
                        priceError ? 'ring-2 ring-red-500/20' : ''
                      }`}
                    />
                    {priceError && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{priceError}</span>
                      </p>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold tracking-wider mb-1.5 uppercase" style={{ color: textMuted }}>
                      Categoría *
                    </label>
                    <Dropdown
                      options={(Array.isArray(categories) ? categories : []).map(cat => ({
                        value: cat?.id,
                        label: cat?.name || 'Categoría'
                      }))}
                      value={categoryId}
                      onChange={(val) => {
                        setCategoryId(val)
                        if (categoryError) {
                          setCategoryError(validateDishCategory(val))
                        }
                      }}
                      placeholder="Selecciona una categoría"
                      className="w-full"
                      hasError={Boolean(categoryError)}
                      searchable={true}
                    />
                    {categoryError && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{categoryError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <ImageUploader
                  value={image}
                  onChange={(url) => setImage(url || '')}
                  folder="dishes"
                  label="Imagen del platillo"
                  aspectRatio="aspect-video"
                />

                {/* Alérgenos Toggle & checkboxes */}
                <div className="border rounded-2xl p-4 space-y-3" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-semibold" style={{ color: textColor }}>Alérgenos</label>
                      <p className="text-xs leading-normal" style={{ color: textMuted }}>
                        Indica si el platillo contiene ingredientes alérgenos comunes.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setHasAllergens(!hasAllergens)} 
                      style={hasAllergens ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                      className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${hasAllergens ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {hasAllergens && (
                    <div className="space-y-3 pt-3 border-t animate-fadeIn" style={{ borderColor: borderSubtle }}>
                      {/* Checklist Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {(Array.isArray(availableAllergens) ? availableAllergens : []).map(allergen => {
                          const isChecked = (Array.isArray(allergens) ? allergens : []).includes(allergen)
                          return (
                            <label key={allergen} className="flex items-center gap-2.5 text-xs cursor-pointer select-none py-1 group" style={{ color: textColor }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setAllergens((allergens || []).filter(a => a !== allergen))
                                  } else {
                                    setAllergens([...(allergens || []), allergen])
                                  }
                                }}
                                style={{ accentColor: colorPrimario }}
                                className="w-4 h-4 rounded transition-all cursor-pointer"
                              />
                              <span className="font-semibold group-hover:translate-x-0.5 transition-transform">{allergen}</span>
                            </label>
                          )
                        })}
                      </div>

                      {/* Add Custom Allergen Input */}
                      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: borderSubtle }}>
                        <input
                          type="text"
                          placeholder="Ej. Soya, Cacahuates..."
                          value={newAllergenInput}
                          onChange={(e) => setNewAllergenInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddCustomAllergen()
                            }
                          }}
                          style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                          className="input-subcard border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all duration-200 flex-1 font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomAllergen}
                          style={{ backgroundColor: colorPrimario }}
                          className="text-white rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ingredientes Toggle & textarea */}
                <div className="border rounded-2xl p-4 space-y-3" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-semibold" style={{ color: textColor }}>Ingredientes Informativos</label>
                      <p className="text-xs leading-normal" style={{ color: textMuted }}>
                        Lista visible para el cliente en el menú digital.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setHasIngredients(!hasIngredients)} 
                      style={hasIngredients ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                      className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${hasIngredients ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {hasIngredients && (
                    <div className="pt-3 border-t animate-fadeIn space-y-2" style={{ borderColor: borderSubtle }}>
                      <label className="block text-[10px] font-semibold tracking-wider uppercase" style={{ color: textMuted }}>
                        Lista de Ingredientes (uno por línea)
                      </label>
                      <textarea 
                        rows="3"
                        placeholder="Ej.&#10;Ribeye Angus&#10;Papas cambray&#10;Espárragos"
                        value={ingredients} 
                        onChange={(e) => setIngredients(e.target.value)}
                        style={{ backgroundColor: bgSubcard, borderColor: borderSubtle, color: textColor }}
                        className="input-subcard border rounded-xl px-4 py-3 text-xs focus:outline-none transition-all duration-200 w-full resize-none leading-relaxed font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Constructor de Recetas para Descuento Automático de Stock */}
                <ConstructorReceta platilloId={editingItem?.id} />

                {/* Extras disponibles para este platillo */}
                <div className="border rounded-2xl p-4 space-y-3" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: textMuted }}>
                      Extras permitidos ({selectedExtras.length} seleccionados)
                    </label>
                    <span className="text-[11px] font-medium" style={{ color: textSubtle }}>Opcional</span>
                  </div>
                  <p className="text-xs leading-normal" style={{ color: textMuted }}>
                    Selecciona qué opciones adicionales puede agregar el cliente a este platillo.
                  </p>

                  {(Array.isArray(allExtras) || []).length === 0 ? (
                    <p className="text-xs italic pt-1" style={{ color: textSubtle }}>No hay extras creados en el menú.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5 py-0.5 custom-scrollbar">
                      {(Array.isArray(allExtras) ? allExtras : []).map(extra => {
                        const checked = (selectedExtras || []).includes(extra.id)
                        return (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => toggleExtra(extra.id)}
                            style={{
                              backgroundColor: checked 
                                ? (isLight ? '#eff6ff' : 'color-mix(in srgb, var(--theme-primary, #3b82f6) 18%, #1C1917)') 
                                : (isLight ? '#FFFFFF' : 'var(--theme-card, #1C1917)'),
                              borderColor: checked 
                                ? (colorPrimario || '#3b82f6') 
                                : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)')
                            }}
                            className={`flex items-center justify-between w-full rounded-xl p-3 border transition-all duration-150 text-left cursor-pointer shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 ${
                              checked ? 'ring-1 ring-blue-500/30 shadow-sm' : 'hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox */}
                              <div 
                                style={{ 
                                  backgroundColor: checked 
                                    ? (colorPrimario || '#3b82f6') 
                                    : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.06)'),
                                  borderColor: checked 
                                    ? (colorPrimario || '#3b82f6') 
                                    : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)') 
                                }}
                                className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-150 shadow-2xs"
                              >
                                {checked && <Check size={12} className="text-white stroke-[3]"/>}
                              </div>
                              <span className={`text-sm truncate select-none ${checked ? 'font-bold' : 'font-medium'}`} style={{ color: textColor }}>
                                {extra?.name}
                              </span>
                            </div>

                            {/* Price Pill */}
                            <span 
                              style={{ 
                                backgroundColor: checked 
                                  ? (isLight ? '#dbeafe' : 'color-mix(in srgb, var(--theme-primary, #3b82f6) 25%, transparent)') 
                                  : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'), 
                                color: checked 
                                  ? (isLight ? '#1d4ed8' : '#93c5fd') 
                                  : (isLight ? '#475569' : textColor), 
                                borderColor: checked 
                                  ? (isLight ? '#bfdbfe' : 'color-mix(in srgb, var(--theme-primary, #3b82f6) 35%, transparent)') 
                                  : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)') 
                              }}
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full border tracking-wide shadow-2xs shrink-0 select-none ml-2"
                            >
                              {(extra?.price || 0) > 0 ? `+$${Number(extra.price).toFixed(2)}` : 'Gratis'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <p className="text-xs mt-2" style={{ color: textSubtle }}>
                    💡 ¿Necesitas un extra nuevo? Créalo primero desde la sección "Extras" del menú lateral.
                  </p>
                </div>

                {/* Switch: Permitir observaciones */}
                <div className="border rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Permitir observaciones</label>
                    <p className="text-xs leading-normal" style={{ color: textMuted }}>
                      Habilita notas de preparación (ej. sin cebolla, término medio, etc.).
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAllowObservations(!allowObservations)} 
                    style={allowObservations ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                    className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${allowObservations ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Switch: Permitir elegir nivel de picante */}
                <div className="border rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: bgSubcard, borderColor: borderSubtle }}>
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Permitir elegir nivel de picante</label>
                    <p className="text-xs leading-normal" style={{ color: textMuted }}>
                      Habilita el selector de nivel de picante (Sin picante / Medio / Muy picante) en el menú público.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAllowSpiceLevel(!allowSpiceLevel)} 
                    style={allowSpiceLevel ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                    className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${allowSpiceLevel ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Switch: Disponible para venta */}
                <div className="flex items-center justify-between py-2 border-t pt-4" style={{ borderColor: borderSubtle }}>
                  <span className="text-sm font-semibold" style={{ color: textColor }}>Disponible para venta</span>
                  <button 
                    type="button"
                    onClick={() => setAvailable(!available)} 
                    style={available ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(100, 116, 139, 0.25)' }}
                    className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${available ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Pie del modal con botones de guardar (Congelado) */}
              <div 
                className="bg-white dark:bg-zinc-900 p-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 flex justify-end gap-3"
                style={{ borderColor: borderSubtle }}
              >
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
                  disabled={submitting || !isFormValid}
                  style={{ backgroundColor: colorPrimario || '#1d4ed8', color: primaryBtnText || '#ffffff' }}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all cursor-pointer h-11 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Guardando...' : (editingItem ? 'Guardar Cambios' : 'Guardar Platillo')}
                </button>
              </div>
            </form>
          </div>
        </div>
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
