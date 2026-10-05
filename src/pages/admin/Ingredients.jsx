import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Search, X, Package, AlertTriangle,
  Pencil, Trash2, Check,
  Leaf, Users, FolderOpen, Download, FileText
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Dropdown from '../../components/ui/Dropdown'
import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Table from '../../components/ui/Table'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  adminGetIngredients,
  adminGetIngredientCategories,
  adminCreateIngredientCategory,
  adminCreateIngredient,
  adminUpdateIngredient,
  adminDeleteIngredient,
  adminGetSuppliers
} from '../../api/ingredients'
import { validateIngredient } from '../../validators/ingredientValidator'

const ITEMS_PER_PAGE = 8

const DEFAULT_UNITS = ['kg', 'g', 'L', 'ml', 'piezas', 'cajas', 'bolsas', 'latas']

const defaultForm = {
  name: '',
  category_id: '',
  category: '',
  unit_of_measure: 'kg',
  unit: 'kg',
  supplier_id: '',
  min_stock: '0',
  notes: ''
}

export default function Ingredients() {
  const { user } = useAuth()
  const { bgCard, bgSubcard, bgTable, bgInput, colorPrimario, borderSubtle, cardShadow } = useTheme()
  const esGerente = user?.role === 'gerente'

  // Data states from backend
  const [ingredients, setIngredients] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [resumen, setResumen] = useState({
    total: 0,
    categorias_activas: 0,
    proveedores_vinculados: 0
  })
  const [loading, setLoading] = useState(true)

  // Categories & Suppliers from backend
  const [categoriesList, setCategoriesList] = useState([])
  const [suppliersList, setSuppliersList] = useState([])

  // Toast feedback
  const [toast, setToast] = useState(null)

  // Filter & Search states
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)

  // Validation states
  const [touched, setTouched] = useState({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Dynamic Category & Unit creation inside modal
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [creatingCatLoading, setCreatingCatLoading] = useState(false)

  const [unitsList, setUnitsList] = useState(DEFAULT_UNITS)
  const [isCreatingUnit, setIsCreatingUnit] = useState(false)
  const [newUnitInput, setNewUnitInput] = useState('')

  // Validation calculation
  const validation = useMemo(() => {
    return validateIngredient(form, isCreatingCategory, newCategoryInput, isCreatingUnit, newUnitInput)
  }, [form, isCreatingCategory, newCategoryInput, isCreatingUnit, newUnitInput])

  const errors = validation.errors
  const isFormValid = validation.isValid

  // Delete confirmation & submitting state
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // 1. Debounce search input (400ms) con .trim() y mínimo 3 caracteres
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = (search || '').trim()
      if (trimmed.length === 0) {
        setDebouncedSearch('')
      } else if (trimmed.length >= 3) {
        setDebouncedSearch(trimmed)
      } else {
        // Menos de 3 caracteres: no disparar consulta para cadenas incompletas
        setDebouncedSearch('')
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  // 2. Fetch main ingredients list
  const fetchIngredientsData = async () => {
    try {
      setLoading(true)
      const params = {}
      const trimmedSearch = (debouncedSearch || '').trim()
      if (trimmedSearch.length >= 3) {
        params.search = trimmedSearch
      }

      const res = await adminGetIngredients(params)
      if (res.data) {
        setIngredients(res.data.ingredients || [])
        if (res.data.resumen) {
          setResumen(res.data.resumen)
        }
      }
    } catch (err) {
      console.error("Error al cargar ingredientes:", err)
      setToast({ message: "Error al cargar la lista de ingredientes desde el servidor", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIngredientsData()
  }, [debouncedSearch])

  // 3. Fetch categories from backend
  const fetchCategories = async () => {
    try {
      const res = await adminGetIngredientCategories()
      if (res.data && Array.isArray(res.data.categories)) {
        setCategoriesList(res.data.categories)
        return res.data.categories
      }
    } catch (err) {
      console.error("Error al cargar categorías de ingredientes:", err)
    }
    return []
  }

  // 4. Fetch active suppliers from backend
  const fetchSuppliers = async () => {
    try {
      const res = await adminGetSuppliers({ estado: 'activo' })
      if (res.data && Array.isArray(res.data.suppliers)) {
        setSuppliersList(res.data.suppliers)
      }
    } catch (err) {
      console.error("Error al cargar proveedores:", err)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchSuppliers()
  }, [])

  // Open Modal Handler (New / Edit)
  const handleOpenModal = (item = null) => {
    setTouched({})
    setHasSubmitted(false)
    if (item) {
      setEditingItem(item)
      let initialCatId = item.category_id || ''
      if (!initialCatId && item.category && Array.isArray(categoriesList)) {
        const found = categoriesList.find(c => (typeof c === 'object' && c !== null ? c.name : c) === item.category)
        if (found && typeof found === 'object' && found.id) {
          initialCatId = found.id
        }
      }

      const initialMinStock = item.min_stock !== undefined && item.min_stock !== null
        ? String(item.min_stock)
        : (item.stock_minimo !== undefined && item.stock_minimo !== null ? String(item.stock_minimo) : '0')

      setForm({
        name: item.name || '',
        category_id: initialCatId,
        category: item.category || '',
        unit_of_measure: item.unit_of_measure || item.unit || 'kg',
        unit: item.unit_of_measure || item.unit || 'kg',
        supplier_id: item.supplier_id ? String(item.supplier_id) : '',
        min_stock: initialMinStock,
        notes: item.notes || ''
      })

      fetchCategories().then((cats) => {
        if (cats && Array.isArray(cats) && item.category) {
          const found = cats.find(c => (typeof c === 'object' && c !== null ? c.name : c) === item.category)
          if (found && typeof found === 'object' && found.id) {
            setForm(prev => prev.category_id ? prev : { ...prev, category_id: found.id })
          }
        }
      })
    } else {
      setEditingItem(null)
      setForm({
        ...defaultForm,
        category_id: '',
        category: '',
        unit_of_measure: 'kg',
        unit: 'kg',
        min_stock: '0'
      })
      fetchCategories()
    }
    setIsCreatingCategory(false)
    setNewCategoryInput('')
    setIsCreatingUnit(false)
    setNewUnitInput('')
    setShowModal(true)
    fetchSuppliers()
  }

  // Create category directly via button inside modal
  const handleCreateCategoryInline = async () => {
    const nameTrimmed = newCategoryInput.trim()
    if (!nameTrimmed) return

    try {
      setCreatingCatLoading(true)
      const res = await adminCreateIngredientCategory({ name: nameTrimmed })
      const createdCategory = res.data?.category
      const createdName = typeof createdCategory === 'object' && createdCategory !== null 
        ? createdCategory.name 
        : (createdCategory || nameTrimmed)
      const createdId = typeof createdCategory === 'object' && createdCategory !== null 
        ? createdCategory.id 
        : null

      setToast({ message: `Categoría "${createdName}" creada con éxito`, type: "success" })

      // Reload categories list and set form with numeric category_id
      const updatedCategories = await fetchCategories()
      const foundInList = (updatedCategories || []).find(c => (typeof c === 'object' && c !== null ? c.name : c) === createdName)
      const targetId = createdId || (foundInList && typeof foundInList === 'object' ? foundInList.id : '')

      setForm(p => ({ 
        ...p, 
        category_id: targetId,
        category: createdName 
      }))
      setTouched(p => ({ ...p, category: true }))
      setIsCreatingCategory(false)
      setNewCategoryInput('')
    } catch (err) {
      console.error("Error al crear categoría:", err)
      const msg = err.response?.data?.message || (err.response?.data?.errors?.name?.[0]) || "No se pudo crear la categoría"
      setToast({ message: msg, type: "error" })
    } finally {
      setCreatingCatLoading(false)
    }
  }

  // Add custom unit inline
  const handleAddUnitInline = () => {
    const unitTrimmed = newUnitInput.trim()
    if (!unitTrimmed) return

    if (!unitsList.includes(unitTrimmed)) {
      setUnitsList(prev => [...prev, unitTrimmed])
    }
    setForm(p => ({ ...p, unit: unitTrimmed, unit_of_measure: unitTrimmed }))
    setTouched(p => ({ ...p, unit: true }))
    setIsCreatingUnit(false)
    setNewUnitInput('')
  }

  // Save / Update Ingredient Handler
  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setHasSubmitted(true)

    const check = validateIngredient(form, isCreatingCategory, newCategoryInput, isCreatingUnit, newUnitInput)
    if (!check.isValid) {
      const firstError = Object.values(check.errors)[0]
      setToast({ message: firstError || "Por favor corrige los errores del formulario", type: "error" })
      return
    }

    let finalCategoryId = form.category_id
    if (isCreatingCategory && newCategoryInput.trim()) {
      try {
        const resCat = await adminCreateIngredientCategory({ name: newCategoryInput.trim() })
        const createdCat = resCat.data?.category
        const catId = typeof createdCat === 'object' && createdCat !== null ? createdCat.id : null
        const updatedList = await fetchCategories()
        if (catId) {
          finalCategoryId = catId
        } else {
          const found = (updatedList || []).find(c => (typeof c === 'object' && c !== null ? c.name : c) === newCategoryInput.trim())
          if (found && typeof found === 'object' && found.id) {
            finalCategoryId = found.id
          }
        }
      } catch (err) {
        console.error("Error creando categoría al guardar:", err)
      }
    }

    // Resolver ID numérico si aún viene sólo como nombre
    if ((!finalCategoryId || isNaN(Number(finalCategoryId))) && form.category && Array.isArray(categoriesList)) {
      const found = categoriesList.find(c => (typeof c === 'object' && c !== null ? c.name : c) === form.category)
      if (found && typeof found === 'object' && found.id) {
        finalCategoryId = found.id
      }
    }

    const numericCatId = Number(finalCategoryId)
    if (!numericCatId || isNaN(numericCatId)) {
      setToast({ message: "Debes seleccionar una categoría válida", type: "error" })
      return
    }

    let finalUnit = form.unit_of_measure || form.unit
    if (isCreatingUnit && newUnitInput.trim()) {
      finalUnit = newUnitInput.trim()
      if (!unitsList.includes(finalUnit)) {
        setUnitsList(prev => [...prev, finalUnit])
      }
    }

    const numericMinStock = form.min_stock !== '' && form.min_stock !== null && !isNaN(Number(form.min_stock))
      ? Math.max(0, Number(form.min_stock))
      : 0

    const payload = {
      name: form.name.trim(),
      category_id: numericCatId,
      unit_of_measure: finalUnit,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      min_stock: numericMinStock,
      notes: form.notes ? form.notes.trim() : null
    }

    console.log("Payload enviado a adminCreateIngredient:", payload)

    try {
      setSubmitting(true)
      if (editingItem) {
        const res = await adminUpdateIngredient(editingItem.id, payload)
        const updated = res.data?.ingredient
        setToast({ message: "Ingrediente actualizado correctamente", type: "success" })

        if (updated) {
          setIngredients(prev => prev.map(i => i.id === editingItem.id ? updated : i))
        } else {
          fetchIngredientsData()
        }
      } else {
        const res = await adminCreateIngredient(payload)
        const newIng = res.data?.ingredient
        setToast({ message: "Ingrediente creado correctamente", type: "success" })

        if (newIng) {
          setIngredients(prev => [newIng, ...prev])
        } else {
          fetchIngredientsData()
        }
      }

      setShowModal(false)
      setEditingItem(null)
      setForm(defaultForm)
      setTouched({})
      setHasSubmitted(false)
      setIsCreatingCategory(false)
      setIsCreatingUnit(false)
      fetchIngredientsData() // Sync resumen counts
    } catch (err) {
      console.error("Error al guardar ingrediente:", err)
      const serverMsg = err.response?.data?.message
      const validationErrs = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : null
      setToast({ message: serverMsg || validationErrs || "Error al guardar el ingrediente", type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Handler with 422 Error Catching
  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 4000)
      return
    }

    try {
      setDeletingId(id)
      await adminDeleteIngredient(id)
      setToast({ message: "Ingrediente eliminado correctamente", type: "success" })
      setIngredients(prev => prev.filter(i => i.id !== id))
      setConfirmDelete(null)
      fetchIngredientsData() // Sync resumen counts
    } catch (err) {
      console.error("Error al eliminar ingrediente:", err)
      const errorMsg = err.response?.data?.message || "No se pudo eliminar el ingrediente"
      setToast({ message: errorMsg, type: "error" })
      setConfirmDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  // Export functions (Excel, CSV, PDF)
  const hasIngredientsData = ingredients.length > 0

  // Pagination calculations
  const totalPages = Math.ceil(ingredients.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentIngredients = (Array.isArray(ingredients) ? ingredients : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = ingredients.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, ingredients.length)

  const handleExportExcel = () => {
    if (!hasIngredientsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const data = ingredients.map(item => ({
      'Ingrediente': item.name,
      'Categoría': item.category,
      'Unidad de Medida': item.unit,
      'Proveedor Principal': item.supplier_name || 'Sin proveedor',
      'Notas': item.notes || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ingredientes")
    XLSX.writeFile(workbook, `ingredientes_${new Date().toISOString().split('T')[0]}.xlsx`)
    setToast({ message: "Catálogo de ingredientes exportado a Excel correctamente", type: "success" })
  }

  const handleExportCSV = () => {
    if (!hasIngredientsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const headers = ["Ingrediente", "Categoría", "Unidad de Medida", "Proveedor Principal", "Notas"]
    const rows = ingredients.map(item => [
      item.name,
      item.category,
      item.unit,
      item.supplier_name || 'Sin proveedor',
      item.notes || ''
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const text = String(val ?? '').replace(/"/g, '""')
        return text.includes(',') || text.includes('\n') || text.includes('"') ? `"${text}"` : text
      }).join(","))
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ingredientes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ message: "Catálogo de ingredientes exportado a CSV correctamente", type: "success" })
  }

  const handlePrintPDF = () => {
    if (!hasIngredientsData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }
    window.print()
  }

  // Skeletons
  const SkeletonCard = () => (
    <div className="border border-theme-border-subtle rounded-2xl p-5 space-y-3 animate-pulse" style={{ backgroundColor: bgSubcard }}>
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 rounded" style={{ backgroundColor: bgInput }} />
        <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: bgInput }} />
      </div>
      <div className="h-8 w-16 rounded" style={{ backgroundColor: bgInput }} />
      <div className="h-3 w-36 rounded" style={{ backgroundColor: bgInput }} />
    </div>
  )

  const SkeletonRow = () => (
    <tr className="border-b border-theme-border-subtle animate-pulse">
      <td className="py-4 px-5"><div className="h-4 w-36 bg-theme-input rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-24 bg-theme-input rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-16 bg-theme-input rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-32 bg-theme-input rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-20 bg-theme-input rounded ml-auto" /></td>
    </tr>
  )

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-theme-text">
      
      {/* Header con botón Nuevo Ingrediente */}
      <PageHeader
        title="Ingredientes"
        description="Catálogo Maestro de insumos e ingredientes de la cocina."
        action={
          <button
            onClick={() => handleOpenModal(null)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400
                       text-theme-text text-sm font-semibold px-4 py-2.5 rounded-xl
                       shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-600/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <Plus size={16}/> <span>Nuevo ingrediente</span>
          </button>
        }
      />

      {/* 3 KPI Cards alimentadas desde resumen */}
      <div className="rounded-2xl p-6 max-md:p-3 border transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <MetricCardsLayout cols={3} gap="gap-4">
          {loading ? (
            <>
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
              <div className="animate-shimmer rounded-xl h-24 w-full" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Ingredientes"
                value={resumen.total ?? ingredients.length ?? 0}
                subtitle="Ingredientes registrados"
                icon={Leaf}
                color="blue"
              />
              <StatCard
                title="Stock Bajo"
                value={resumen.stock_bajo ?? ingredients.filter(i => (i.current_stock ?? i.stock ?? 0) <= (i.min_stock ?? 0) && (i.current_stock ?? i.stock ?? 0) > 0).length}
                subtitle="Requieren reabastecimiento"
                icon={AlertTriangle}
                color="red"
              />
              <StatCard
                title="Sin Stock"
                value={resumen.agotados ?? ingredients.filter(i => (i.current_stock ?? i.stock ?? 0) <= 0).length}
                subtitle="Sin existencias disponibles"
                icon={Package}
                color="darkRed"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* Tabla con Buscador Integrado (Estructura Oficial de Tablas) */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        <div className="flex flex-col space-y-4 max-md:space-y-3">
          
          {/* Encabezado de Sección */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-md:gap-3">
            <div>
              <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Catálogo de Ingredientes</h2>
              <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Gestión y control de insumos del restaurante</p>
            </div>
          </div>

          {/* Row 1: Buscador y Exportación */}
          <div className="flex flex-col md:flex-row max-md:flex-col items-center gap-3 max-md:gap-3 w-full">
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
              <input
                type="text"
                maxLength={100}
                placeholder="Buscar por nombre, categoría o proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl pl-10 pr-9 py-2.5 text-xs text-theme-text placeholder-theme-text-muted/60 transition-all outline-none w-full font-medium"
              />
              {search && (
                <button 
                  onClick={() => {
                    setSearch('')
                    setDebouncedSearch('')
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-col w-full md:w-auto items-end max-md:items-start gap-1.5 print:hidden self-end md:self-auto">
              <div className="flex items-center gap-2 max-md:flex-wrap max-md:gap-1.5 w-full">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100 shrink-0 max-md:flex-1"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100 shrink-0 max-md:flex-1"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex justify-center items-center gap-1.5 text-xs opacity-100 shrink-0 max-md:flex-1"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
              <span className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider">
                Exporta la lista filtrada a Excel, CSV o PDF
              </span>
            </div>
          </div>
          <div className="space-y-4 mt-6 max-md:mt-4">
            {loading ? (
              <div className="space-y-2.5">
                <div className="animate-shimmer rounded-lg h-12 w-full" />
                <div className="animate-shimmer rounded-lg h-12 w-full" />
                <div className="animate-shimmer rounded-lg h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[900px]" shadow="shadow-none" headers={['Nombre del Ingrediente', 'Categoría', 'Unidad de Medida', 'Stock Actual', 'Proveedor Principal', 'Acciones']}>
                {currentIngredients.length === 0 ? (
                  <tr key="empty-state" className="h-96 transition-colors duration-150" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <td colSpan={6} className="px-6 py-12 text-center text-theme-text-muted border-none">
                      <div className="flex flex-col items-center justify-center">
                        <Package size={40} className="mb-4 text-theme-text-muted/30" />
                        <EmptyState
                          title="No hay ingredientes registrados"
                          description="El catálogo maestro de cocina está vacío."
                          iconType="default"
                        />
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentIngredients.map((item, index) => {
                    const delayClass = `delay-${Math.min(index + 1, 5)}`
                    const stockActual = item.current_stock ?? item.stock ?? item.stock_actual
                    const stockMinimo = item.min_stock ?? item.stock_minimo ?? 0

                    return (
                      <tr 
                        key={item.id}
                        className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                      >
                        {/* Nombre e instructivo de notas */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-theme-text font-semibold text-sm group-hover:text-brand-300 transition-colors">
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-theme-text-muted text-xs mt-0.5 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-theme-input text-theme-text border border-theme-border-subtle font-medium">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {item.unit}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-sm ${
                              stockActual <= 0 
                                ? 'text-red-500' 
                                : stockActual <= stockMinimo 
                                  ? 'text-amber-500' 
                                  : 'text-emerald-500'
                            }`}>
                              {stockActual ?? 0}
                            </span>
                            {stockMinimo > 0 && (
                              <span className="text-theme-text-muted text-[10px] uppercase font-bold">
                                (Min: {stockMinimo})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-theme-text font-medium text-xs">
                            {item.supplier_name || <span className="text-theme-text-muted italic">No asignado</span>}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              type="button"
                              onClick={() => handleOpenModal(item)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors cursor-pointer border border-blue-200/50 dark:border-blue-500/20"
                              title="Editar Ingrediente"
                            >
                              <Pencil size={15}/>
                            </button>
                            {confirmDelete === item.id ? (
                              <button 
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="animate-scaleIn text-xs bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg px-2.5 py-1.5 hover:bg-red-500/30 shadow-xs transition-all cursor-pointer font-bold"
                                title="Confirmar eliminación"
                              >
                                {deletingId === item.id ? '...' : '¿Eliminar?'}
                              </button>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer border border-red-200/50 dark:border-red-500/20"
                                title="Eliminar Ingrediente"
                              >
                                <Trash2 size={15}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </Table>
            </div>
            )}

            {/* Paginación */}
              {!loading && ingredients.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
                  <div className="text-xs font-medium text-theme-text-muted">
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, ingredients.length)} de {ingredients.length} ingredientes
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle, color: 'var(--theme-text)' }}
                    >
                      Anterior
                    </button>
                    <div className="px-3 py-1 text-xs font-bold font-mono rounded-lg bg-theme-input text-theme-text">
                      {currentPage} / {Math.ceil(ingredients.length / ITEMS_PER_PAGE)}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(ingredients.length / ITEMS_PER_PAGE)))}
                      disabled={currentPage >= Math.ceil(ingredients.length / ITEMS_PER_PAGE)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      style={{ backgroundColor: colorPrimario, color: '#fff' }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Modal Crear / Editar Ingrediente */}
      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn flex flex-col max-h-[70vh] md:max-h-[90vh] overflow-hidden text-left"
            style={{ backgroundColor: bgCard }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between px-6 max-md:px-4 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                {editingItem ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={16}/>
              </button>
            </div>

            {/* Form Body */}
            <form 
              onSubmit={handleSave} 
              className="flex-1 flex flex-col min-h-0 border-x border-b border-theme-border-subtle rounded-b-2xl overflow-hidden"
              style={{ borderColor: borderSubtle }}
            >
             <div className="px-6 max-md:px-4 py-5 space-y-4 max-md:space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-theme-border-subtle scrollbar-track-transparent">

              {/* 1. Campo Nombre del Ingrediente */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Nombre del Ingrediente <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-[10px] font-semibold ${(form.name || '').length > 90 ? 'text-amber-500' : 'text-theme-text-muted'}`}>
                    {(form.name || '').length}/100
                  </span>
                </div>
                <input 
                  type="text" 
                  maxLength={100}
                  value={form.name}
                  onBlur={() => {
                    setTouched(p => ({ ...p, name: true }))
                    setForm(p => ({ ...p, name: (p.name || '').trim() }))
                  }}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. Ribeye Angus, Tomate Bola, Leche Entera..."
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-theme-text text-xs w-full focus:outline-none placeholder-theme-text-muted transition-all font-medium ${
                    (hasSubmitted || touched.name) && errors.name
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.name) && errors.name && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* 2. Campo Proveedor Principal (Opcional) */}
              <div>
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Proveedor Principal (Opcional)
                </label>
                <Dropdown
                  options={[
                    { value: '', label: 'Sin proveedor principal' },
                    ...suppliersList.map(s => ({ value: String(s.id), label: s.company_name || s.name }))
                  ]}
                  value={form.supplier_id || ''}
                  onChange={val => setForm(p => ({ ...p, supplier_id: val }))}
                  placeholder="Sin proveedor principal"
                  className="w-full text-xs"
                  buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* 3. Campo Categoría (Carga desde BD + Botón "+ Crear nueva") */}
              <div>
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Categoría <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(!isCreatingCategory)
                      setNewCategoryInput('')
                    }}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline cursor-pointer"
                  >
                    {isCreatingCategory ? 'Elegir existente' : '+ Crear nueva'}
                  </button>
                </div>

                {isCreatingCategory ? (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        placeholder="Nombre de la nueva categoría..."
                        className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-3 py-2 text-theme-text text-xs flex-1 focus:outline-none ${
                          (hasSubmitted || touched.category) && errors.category
                            ? '!border-rose-500 ring-1 ring-rose-500/20'
                            : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                        }`}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateCategoryInline()
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!newCategoryInput.trim() || creatingCatLoading}
                        onClick={handleCreateCategoryInline}
                        className="bg-brand-600 hover:bg-brand-500 text-theme-text text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        {creatingCatLoading ? "..." : "Guardar"}
                      </button>
                    </div>
                    {(hasSubmitted || touched.category) && errors.category && (
                      <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                        {errors.category}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Dropdown
                      options={categoriesList.map(c => ({
                        value: typeof c === 'object' && c !== null ? c.id : c,
                        label: typeof c === 'object' && c !== null ? (c.name || c.nombre) : c
                      }))}
                      value={form.category_id || ''}
                      onChange={val => {
                        const selected = categoriesList.find(c => (typeof c === 'object' && c !== null ? c.id : c) === val)
                        const categoryName = typeof selected === 'object' && selected !== null ? (selected.name || selected.nombre) : selected
                        setForm(p => ({ 
                          ...p, 
                          category_id: typeof val === 'number' || !isNaN(Number(val)) ? Number(val) : val,
                          category: categoryName || val
                        }))
                        setTouched(p => ({ ...p, category: true }))
                      }}
                      placeholder="Seleccionar categoría..."
                      className="w-full text-xs"
                      hasError={Boolean((hasSubmitted || touched.category) && errors.category)}
                      buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />
                    {(hasSubmitted || touched.category) && errors.category && (
                      <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                        {errors.category}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Campo Unidad de Medida (Default 'kg', selector + "+ Crear nueva") */}
              <div>
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Unidad de Medida <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingUnit(!isCreatingUnit)
                      setNewUnitInput('')
                    }}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline cursor-pointer"
                  >
                    {isCreatingUnit ? 'Elegir existente' : '+ Crear nueva'}
                  </button>
                </div>

                {isCreatingUnit ? (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newUnitInput}
                        onChange={e => setNewUnitInput(e.target.value)}
                        placeholder="Ej. docena, bolsa, atado..."
                        className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-3 py-2 text-theme-text text-xs flex-1 focus:outline-none ${
                          (hasSubmitted || touched.unit) && errors.unit
                            ? '!border-rose-500 ring-1 ring-rose-500/20'
                            : 'border-gray-200 dark:border-white/10 focus:border-brand-500/50'
                        }`}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddUnitInline()
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!newUnitInput.trim()}
                        onClick={handleAddUnitInline}
                        className="bg-brand-600 hover:bg-brand-500 text-theme-text text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        Agregar
                      </button>
                    </div>
                    {(hasSubmitted || touched.unit) && errors.unit && (
                      <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                        {errors.unit}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Dropdown
                      options={unitsList.map(u => ({ value: u, label: u }))}
                      value={form.unit_of_measure || form.unit}
                      onChange={val => {
                        setForm(p => ({ ...p, unit: val, unit_of_measure: val }))
                        setTouched(p => ({ ...p, unit: true }))
                      }}
                      placeholder="Seleccionar unidad..."
                      className="w-full text-xs"
                      hasError={Boolean((hasSubmitted || touched.unit) && errors.unit)}
                      buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />
                    {(hasSubmitted || touched.unit) && errors.unit && (
                      <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                        {errors.unit}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Campo Stock Mínimo (Alerta de Existencias) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Stock Mínimo (Alerta de Existencias) <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20 font-mono">
                    Unidad: {form.unit_of_measure || form.unit || 'kg'}
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any"
                    min="0"
                    max="999999.99"
                    value={form.min_stock}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault()
                      }
                    }}
                    onBlur={() => {
                      setTouched(p => ({ ...p, min_stock: true }))
                      const val = form.min_stock
                      if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                        setForm(p => ({ ...p, min_stock: '0' }))
                      }
                    }}
                    onChange={e => {
                      const val = e.target.value.replace(/-/g, '')
                      setForm(p => ({ ...p, min_stock: val }))
                      setTouched(p => ({ ...p, min_stock: true }))
                    }}
                    placeholder="0"
                    className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl pl-4 pr-16 py-3 text-theme-text text-xs w-full focus:outline-none placeholder-theme-text-muted transition-all font-medium font-mono ${
                      (hasSubmitted || touched.min_stock) && errors.min_stock
                        ? '!border-rose-500 ring-1 ring-rose-500/20'
                        : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-theme-text-muted font-mono">
                    {form.unit_of_measure || form.unit || ''}
                  </div>
                </div>
                <p className="text-[10px] text-theme-text-muted mt-1 leading-tight">
                  Umbral de alerta: Cuando la existencia en Stock sea menor o igual a este valor, el sistema marcará el ingrediente con estado "Stock bajo".
                </p>
                {(hasSubmitted || touched.min_stock) && errors.min_stock && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.min_stock}
                  </p>
                )}
              </div>

              {/* 6. Notas opcionales */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                    Notas / Observaciones (Opcional)
                  </label>
                  <span className={`text-[10px] font-semibold ${(form.notes || '').length >= 240 ? 'text-amber-500' : 'text-theme-text-muted'}`}>
                    {(form.notes || '').length}/250
                  </span>
                </div>
                <textarea 
                  rows={2}
                  maxLength={250}
                  value={form.notes || ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ej. Producto de importación, requiere congelación a -18°C..."
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-2.5 text-theme-text text-xs w-full focus:outline-none placeholder-theme-text-muted transition-all resize-none ${
                    (hasSubmitted || touched.notes) && errors.notes
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.notes) && errors.notes && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.notes}
                  </p>
                )}
              </div>
             </div>

              {/* Botones de acción (Sticky Footer) */}
              <div className="flex gap-3 justify-end px-6 max-md:px-4 py-4 shrink-0 bg-slate-50 dark:bg-white/5 border-t border-theme-border-subtle rounded-b-2xl">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-theme-input hover:bg-theme-surface border border-theme-border-subtle text-theme-text-muted hover:text-theme-text rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer max-md:flex-1"
                >
                  Cancelar
                </button>

                <button 
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-theme-text text-xs font-bold px-5 py-2 rounded-xl shadow-lg shadow-brand-600/30 transition-all disabled:opacity-40 cursor-pointer flex justify-center items-center gap-1.5 max-md:flex-1"
                >
                  {submitting ? "Guardando..." : (editingItem ? 'Guardar' : 'Agregar')}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Alert Feedback */}
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
