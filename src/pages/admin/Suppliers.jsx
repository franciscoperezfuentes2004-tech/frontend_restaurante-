import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Search, X, Building2, Phone, MessageSquare,
  Calendar, Pencil, Trash2, Check, AlertTriangle, User,
  Mail, Truck, Download, FileText
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Dropdown from '../../components/ui/Dropdown'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import MetricCardsLayout from '../../components/ui/MetricCardsLayout'
import Table from '../../components/ui/Table'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  adminGetSuppliers,
  adminGetSupplierSpecialties,
  adminCreateSupplierSpecialty,
  adminCreateSupplier,
  adminUpdateSupplier,
  adminDeleteSupplier,
  adminToggleSupplierStatus
} from '../../api/suppliers'
import { validateSupplier } from '../../validators/supplierValidator'

const ITEMS_PER_PAGE = 8

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const defaultForm = {
  company_name: '',
  contact_name: '',
  specialty: '',
  phone: '',
  email: '',
  delivery_days: [],
  active: true
}

export default function Suppliers() {
  const { user } = useAuth()
  const { bgCard, bgSubcard, bgTable, bgInput, colorPrimario, borderSubtle, cardShadow } = useTheme()
  const esGerente = user?.role === 'gerente'

  const [suppliers, setSuppliers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [resumen, setResumen] = useState({
    total: 0,
    activos: 0,
    entregas_hoy: 0,
    dia_semana_hoy: 'Lun'
  })
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [specialtiesList, setSpecialtiesList] = useState([])
  const [isCreatingSpecialty, setIsCreatingSpecialty] = useState(false)
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('')
  const [creatingSpecialtyLoading, setCreatingSpecialtyLoading] = useState(false)
  const [toast, setToast] = useState(null) // { message, type }

  // Real-time validation effect once submitted
  useEffect(() => {
    if (hasSubmitted) {
      const { errors: newErrors } = validateSupplier(form, isCreatingSpecialty, newSpecialtyInput)
      setErrors(newErrors)
    }
  }, [form, isCreatingSpecialty, newSpecialtyInput, hasSubmitted])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 1. Debounce search input (400ms)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, specialtyFilter, statusFilter])

  // 2. Fetch specialties list
  const fetchSpecialties = async () => {
    try {
      const res = await adminGetSupplierSpecialties()
      if (res.data?.specialties) {
        setSpecialtiesList(res.data.specialties)
      }
    } catch (err) {
      console.error("Error cargando especialidades:", err)
    }
  }

  // 3. Fetch suppliers list & summary
  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const params = {}
      if (debouncedSearch) params.search = debouncedSearch
      if (specialtyFilter !== 'all') params.especialidad = specialtyFilter
      if (statusFilter !== 'all') params.estado = statusFilter

      const res = await adminGetSuppliers(params)
      if (res.data) {
        setSuppliers(res.data.suppliers || [])
        if (res.data.resumen) {
          setResumen(res.data.resumen)
        }
      }
    } catch (err) {
      console.error("Error cargando proveedores:", err)
      setToast({ message: "No se pudieron cargar los proveedores", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchSpecialties()
  }, [])

  // Fetch when filters change
  useEffect(() => {
    fetchSuppliers()
  }, [debouncedSearch, specialtyFilter, statusFilter])

  // Options for Dropdowns
  const specialtyOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todas las Especialidades' },
      ...specialtiesList.map(s => ({ value: s, label: s }))
    ]
  }, [specialtiesList])

  const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' }
  ]

  // Handlers
  const handleOpenCreate = () => {
    fetchSpecialties()
    setEditingItem(null)
    setForm(defaultForm)
    setErrors({})
    setTouched({})
    setHasSubmitted(false)
    setIsCreatingSpecialty(false)
    setNewSpecialtyInput('')
    setShowModal(true)
  }

  const handleEdit = (sup) => {
    fetchSpecialties()
    setEditingItem(sup)
    setForm({
      company_name: sup.company_name,
      contact_name: sup.contact_name || '',
      specialty: sup.specialty,
      phone: sup.phone,
      email: sup.email || '',
      delivery_days: sup.delivery_days || [],
      active: sup.active
    })
    setErrors({})
    setTouched({})
    setHasSubmitted(false)
    setIsCreatingSpecialty(false)
    setNewSpecialtyInput('')
    setShowModal(true)
  }

  const handleToggleStatus = async (sup) => {
    try {
      const res = await adminToggleSupplierStatus(sup.id)
      if (res.data?.supplier) {
        const updated = res.data.supplier
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
        setResumen(prev => ({
          ...prev,
          activos: updated.active ? prev.activos + 1 : Math.max(0, prev.activos - 1)
        }))
        setToast({ message: `Proveedor ${updated.active ? 'activado' : 'desactivado'} correctamente`, type: "success" })
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err)
      setToast({ message: "No se pudo cambiar el estado del proveedor", type: "error" })
    }
  }

  const handleDelete = async (id) => {
    try {
      await adminDeleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s.id !== id))
      setResumen(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        activos: Math.max(0, prev.activos - 1)
      }))
      setToast({ message: "Proveedor eliminado correctamente", type: "success" })
    } catch (err) {
      console.error("Error al eliminar proveedor:", err)
      const msg = err.response?.data?.message || "No se pudo eliminar el proveedor"
      setToast({ message: msg, type: "error" })
    } finally {
      setConfirmDelete(null)
    }
  }

  const toggleDeliveryDay = (day) => {
    setForm(prev => {
      const exists = prev.delivery_days.includes(day)
      return {
        ...prev,
        delivery_days: exists
          ? prev.delivery_days.filter(d => d !== day)
          : [...prev.delivery_days, day]
      }
    })
  }

  const handleCreateSpecialtyInline = async () => {
    if (!newSpecialtyInput.trim()) return
    try {
      setCreatingSpecialtyLoading(true)
      const res = await adminCreateSupplierSpecialty({ name: newSpecialtyInput.trim() })
      const createdName = res.data?.specialty || newSpecialtyInput.trim()
      
      if (!specialtiesList.includes(createdName)) {
        setSpecialtiesList(prev => [...prev, createdName])
      }
      setForm(prev => ({ ...prev, specialty: createdName }))
      setIsCreatingSpecialty(false)
      setNewSpecialtyInput('')
      setToast({ message: `Especialidad "${createdName}" creada`, type: "success" })
    } catch (err) {
      console.error("Error creando especialidad:", err)
      const msg = err.response?.data?.message || "No se pudo crear la especialidad"
      setToast({ message: msg, type: "error" })
    } finally {
      setCreatingSpecialtyLoading(false)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setHasSubmitted(true)

    const { isValid, errors: validationErrors } = validateSupplier(form, isCreatingSpecialty, newSpecialtyInput)
    if (!isValid) {
      setErrors(validationErrors)
      const firstErr = Object.values(validationErrors)[0]
      if (firstErr) setToast({ message: firstErr, type: "error" })
      return
    }

    try {
      setSubmitting(true)
      
      // If user typed a custom specialty without clicking inline create
      let finalSpecialty = form.specialty
      if (isCreatingSpecialty && newSpecialtyInput.trim()) {
        const specRes = await adminCreateSupplierSpecialty({ name: newSpecialtyInput.trim() })
        finalSpecialty = specRes.data?.specialty || newSpecialtyInput.trim()
        if (!specialtiesList.includes(finalSpecialty)) {
          setSpecialtiesList(prev => [...prev, finalSpecialty])
        }
      }

      const payload = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name ? form.contact_name.trim() : null,
        specialty: finalSpecialty,
        phone: form.phone.replace(/\D/g, '').trim(),
        email: form.email && form.email.trim() ? form.email.trim() : null,
        delivery_days: form.delivery_days,
        active: Boolean(form.active)
      }

      if (editingItem) {
        const res = await adminUpdateSupplier(editingItem.id, payload)
        if (res.data?.supplier) {
          const updated = res.data.supplier
          setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
          setToast({ message: "Proveedor actualizado correctamente", type: "success" })
        }
      } else {
        const res = await adminCreateSupplier(payload)
        if (res.data?.supplier) {
          const created = res.data.supplier
          setSuppliers(prev => [created, ...prev])
          setResumen(prev => ({
            ...prev,
            total: prev.total + 1,
            activos: created.active ? prev.activos + 1 : prev.activos
          }))
          setToast({ message: "Proveedor registrado correctamente", type: "success" })
        }
      }

      setShowModal(false)
      setForm(defaultForm)
      setEditingItem(null)
      setIsCreatingSpecialty(false)
      setNewSpecialtyInput('')
      setErrors({})
      setTouched({})
      setHasSubmitted(false)
    } catch (err) {
      console.error("Error guardando proveedor:", err)
      const msg = err.response?.data?.message || "No se pudo guardar el proveedor"
      setToast({ message: msg, type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  // Export functions (Excel, CSV, PDF)
  const hasSuppliersData = suppliers.length > 0

  // Pagination calculations
  const totalPages = Math.ceil(suppliers.length / ITEMS_PER_PAGE) || 1
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE
  const currentSuppliers = (Array.isArray(suppliers) ? suppliers : []).slice(indexOfFirstItem, indexOfLastItem)
  const startItem = suppliers.length === 0 ? 0 : indexOfFirstItem + 1
  const endItem = Math.min(indexOfLastItem, suppliers.length)

  const handleExportExcel = () => {
    if (!hasSuppliersData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const data = suppliers.map(item => ({
      'Empresa': item.company_name,
      'Contacto': item.contact_name || 'N/A',
      'Especialidad': item.specialty,
      'Teléfono': item.phone,
      'Correo Electrónico': item.email || 'N/A',
      'Días de Entrega': (item.delivery_days || []).join(', ') || 'No programados',
      'Estado': item.active ? 'Activo' : 'Inactivo'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores")
    XLSX.writeFile(workbook, `proveedores_${new Date().toISOString().split('T')[0]}.xlsx`)
    setToast({ message: "Directorio de proveedores exportado a Excel correctamente", type: "success" })
  }

  const handleExportCSV = () => {
    if (!hasSuppliersData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }

    const headers = ["Empresa", "Contacto", "Especialidad", "Teléfono", "Correo Electrónico", "Días de Entrega", "Estado"]
    const rows = suppliers.map(item => [
      item.company_name,
      item.contact_name || 'N/A',
      item.specialty,
      item.phone,
      item.email || 'N/A',
      (item.delivery_days || []).join(', ') || 'No programados',
      item.active ? 'Activo' : 'Inactivo'
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
    link.setAttribute("download", `proveedores_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast({ message: "Directorio de proveedores exportado a CSV correctamente", type: "success" })
  }

  const handlePrintPDF = () => {
    if (!hasSuppliersData) {
      setToast({ message: "No hay datos disponibles para exportar", type: "error" })
      return
    }
    window.print()
  }

  return (
    <div className="space-y-6 max-md:space-y-4 pb-12 max-md:pb-6 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans">
      
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-2 animate-slideUp ${
          toast.type === 'error'
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16}/> : <Check size={16}/>}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between max-md:flex-col max-md:gap-3">
        <div>
          <h1 className="text-3xl max-md:text-2xl font-bold text-theme-text">Directorio de Proveedores</h1>
          <p className="text-theme-text-muted text-sm mt-1">
            Gestión de socios comerciales, especialidades y programación de días de entrega.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer max-md:w-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* 3 KPI Cards con Contenedor de Fondo Nivel 1 */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 overflow-hidden" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
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
                title="Total Registrados"
                value={resumen.total || suppliers.length || 0}
                subtitle="Proveedores en base de datos"
                icon={Building2}
                color="blue"
              />
              <StatCard
                title="Proveedores Activos"
                value={resumen.activos || suppliers.filter(s => s.active !== false).length || 0}
                subtitle="Operando y surtiendo actualmente"
                icon={Check}
                color="green"
              />
              <StatCard
                title="Proveedores Inactivos"
                value={resumen.inactivos || suppliers.filter(s => s.active === false).length || 0}
                subtitle="Pausados o dados de baja"
                icon={X}
                color="red"
              />
            </>
          )}
        </MetricCardsLayout>
      </div>

      {/* Tabla de Proveedores (Estructura Oficial de Tablas con Filtros) */}
      <div className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-4 max-md:space-y-3" style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}`, boxShadow: cardShadow }}>
        
        {/* Encabezado de Sección */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-md:gap-3">
          <div>
            <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">Directorio de Proveedores</h2>
            <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">Gestión de socios comerciales, especialidades y programación de días de entrega</p>
          </div>
        </div>

        {/* Controles: Buscador, Filtros y Exportación */}
        <div className="flex flex-wrap items-center gap-3 max-md:gap-2 w-full mb-6 max-md:mb-4 print:hidden">
          
          {/* Barra de Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-md:w-full max-md:flex-none">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de proveedor..."
              style={{ backgroundColor: bgInput }}
              className="w-full border border-transparent hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl pl-10 pr-10 py-2.5 text-xs text-theme-text placeholder-theme-text-muted/60 transition-all outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex gap-3 max-md:gap-2 max-md:flex-col max-md:w-full">
            <Dropdown
              options={specialtyOptions}
              value={specialtyFilter}
              onChange={setSpecialtyFilter}
              className="w-full sm:w-60 text-xs"
            />

            <Dropdown
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-48 text-xs"
              />
            </div>

            {/* Bloque Derecho (Botones Exportar Excel, CSV, PDF) */}
            <div className="flex items-center gap-2 max-md:gap-1.5 max-md:w-full max-md:justify-between">
              <button
                onClick={handleExportExcel}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <Download size={14} /> Excel
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={handlePrintPDF}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <FileText size={14} /> PDF
              </button>
            </div>

          </div>

        <div className="space-y-4 mt-6">
          {loading ? (
            <div className="space-y-2.5">
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
              <div className="animate-shimmer rounded-lg h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
              <Table className="min-w-[900px]" shadow="shadow-none" headers={['Empresa / Contacto', 'Especialidad', 'Teléfono', 'Correo Electrónico', 'Días de Entrega', 'Estado', 'Acciones']}>
              {currentSuppliers.map((sup, index) => {
                const delayClass = `delay-${Math.min(index + 1, 5)}`
                return (
                  <tr 
                    key={sup.id} 
                    className={`h-16 border-b transition-colors duration-150 animate-fadeInUp text-xs ${delayClass}`}
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}
                  >
                    {/* Empresa y Contacto */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {sup.company_name ? sup.company_name.slice(0, 2).toUpperCase() : 'PR'}
                        </div>
                        <div>
                          <p className="text-theme-text font-semibold text-sm leading-tight">{sup.company_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-theme-text-muted font-medium text-xs">
                            <User size={12} className="shrink-0 text-theme-text-muted" />
                            <span className="font-medium text-theme-text-muted">{sup.contact_name || <span className="italic text-theme-text-muted">N/A</span>}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Especialidad */}
                    <td className="px-4 py-4 text-sm text-theme-text font-normal">
                      <span className="bg-brand-500/10 border border-brand-500/20 text-brand-400 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                        {sup.specialty}
                      </span>
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-4 text-sm text-theme-text font-extrabold font-mono tracking-wide">
                      {sup.phone}
                    </td>

                    {/* Correo Electrónico */}
                    <td className="px-4 py-4 text-sm text-theme-text font-bold">
                      {sup.email ? (
                        <span className="flex items-center gap-2">
                          <Mail size={15} className="text-theme-text shrink-0" />
                          <span className="truncate max-w-[220px] font-bold text-theme-text text-sm" title={sup.email}>{sup.email}</span>
                        </span>
                      ) : (
                        <span className="text-theme-text-muted text-xs italic">N/A</span>
                      )}
                    </td>

                    {/* Días de Entrega */}
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {(!sup.delivery_days || sup.delivery_days.length === 0) ? (
                          <span className="text-theme-text-muted text-xs italic">No programados</span>
                        ) : sup.delivery_days.map(day => (
                          <span key={day} className="bg-brand-600/10 text-brand-400 border border-brand-500/20 text-[10px] px-2 py-0.5 rounded-lg font-bold">
                            {day}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Estado (Badge con Toggle) */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(sup)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full select-none inline-flex items-center gap-1.5 cursor-pointer transition-all outline-none ${
                          sup.active
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25'
                        }`}
                        title="Haz clic para conmutar el estado del proveedor"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sup.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                        {sup.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5 text-right print:hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Contact */}
                        {sup.phone && (
                          <a 
                            href={`https://wa.me/${sup.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs transition-all duration-200 flex items-center justify-center cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </a>
                        )}
                        
                        {/* Editar */}
                        <button 
                          onClick={() => handleEdit(sup)}
                          className="p-1.5 rounded-lg border border-theme-border-subtle bg-theme-input hover:bg-theme-surface text-theme-text hover:text-brand-600 dark:hover:text-brand-400 shadow-xs hover:shadow transition-all duration-200 flex items-center justify-center cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={14}/>
                        </button>

                        {/* Eliminar */}
                        {!esGerente && (
                          confirmDelete === sup.id ? (
                            <button 
                              onClick={() => handleDelete(sup.id)}
                              className="animate-scaleIn text-xs bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg px-2.5 py-1 hover:bg-red-500/30 shadow-xs transition-all cursor-pointer font-bold"
                            >
                              ¿Confirmar?
                            </button>
                          ) : (
                            <button 
                              onClick={() => setConfirmDelete(sup.id)}
                              className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 shadow-xs transition-all duration-200 flex items-center justify-center cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={14}/>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {currentSuppliers.length > 0 && Array.from({ length: ITEMS_PER_PAGE - currentSuppliers.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-16 border-b border-transparent" style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan={7}></td>
                </tr>
              ))}
              {(!Array.isArray(suppliers) || suppliers.length === 0) && (
                <tr style={{ backgroundColor: 'var(--theme-surface)' }}>
                  <td colSpan={7} className="p-0 border-none" style={{ backgroundColor: 'var(--theme-surface)' }}>
                    <div className="h-[32rem] flex items-center justify-center" style={{ backgroundColor: 'var(--theme-surface)' }}>
                      <EmptyState
                        title={search || specialtyFilter !== 'all' || statusFilter !== 'all' ? "Sin resultados para la búsqueda" : "Sin proveedores registrados"}
                        description={search || specialtyFilter !== 'all' || statusFilter !== 'all' ? "No se encontraron proveedores que coincidan con los filtros aplicados." : "Aún no tienes proveedores registrados en tu catálogo."}
                        iconType="default"
                        actionLabel={!search && specialtyFilter === 'all' && statusFilter === 'all' ? "Nuevo proveedor" : undefined}
                        onAction={!search && specialtyFilter === 'all' && statusFilter === 'all' ? () => handleOpenModal(null) : undefined}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </Table>
          </div>
          )}

          {/* Footer de Paginación */}
          {!loading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: borderSubtle }}>
              {/* Lado izquierdo: Conteo */}
              <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {suppliers.length === 0 ? (
                  <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>0</span> registros</span>
                ) : (
                  <span>Mostrando <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{startItem}</span> a <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{endItem}</span> de <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>{suppliers.length}</span> registros</span>
                )}
              </div>

              {/* Lado derecho: Botones Anterior / Siguiente */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || suppliers.length === 0}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={currentPage > 1 && suppliers.length > 0 ? {
                    backgroundColor: 'var(--theme-primary)',
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                >
                  <span>Anterior</span>
                </button>

                <div className="px-3 py-1 text-xs font-bold font-mono rounded-xl" style={{ backgroundColor: 'var(--theme-input)', color: 'var(--theme-text)' }}>
                  {suppliers.length === 0 ? 1 : currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || suppliers.length === 0}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={currentPage < totalPages && suppliers.length > 0 ? {
                    backgroundColor: 'var(--theme-primary)',
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    cursor: 'pointer'
                  } : {
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle,
                    color: 'var(--theme-text)',
                    opacity: 0.4,
                    cursor: 'not-allowed'
                  }}
                >
                  <span>Siguiente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-sm animate-fadeIn"
             onClick={() => setShowModal(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md animate-fadeInUp flex flex-col max-h-[90vh] overflow-hidden"
               style={{ backgroundColor: bgCard }}
               onClick={e => e.stopPropagation()}>
            
            {/* Header modal */}
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <h3 className="font-bold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                {editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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

            {/* Formulario scrollable */}
            <form 
              onSubmit={handleSave} 
              className="flex flex-col flex-1 min-h-0 overflow-hidden border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              <div className="px-6 py-5 max-md:px-4 max-md:py-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-theme-border-subtle scrollbar-track-transparent">

              {/* Nombre de la Empresa */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Nombre de la Empresa / Distribuidor <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.company_name}
                  onBlur={() => {
                    setTouched(p => ({ ...p, company_name: true }))
                    setForm(p => ({ ...p, company_name: (p.company_name || '').trim() }))
                  }}
                  onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="Ej. Distribuidora Carnes del Norte"
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-theme-text text-sm w-full focus:outline-none placeholder-theme-text-muted transition-all font-sans font-medium ${
                    (hasSubmitted || touched.company_name) && errors.company_name
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.company_name) && errors.company_name && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.company_name}
                  </p>
                )}
              </div>

              {/* Persona de Contacto */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Persona de Contacto (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.contact_name}
                  onBlur={() => {
                    setTouched(p => ({ ...p, contact_name: true }))
                    setForm(p => ({ ...p, contact_name: (p.contact_name || '').trim() }))
                  }}
                  onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder="Ej. Juan Pérez (Agente de Ventas)"
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-theme-text text-sm w-full focus:outline-none placeholder-theme-text-muted transition-all font-sans font-medium ${
                    (hasSubmitted || touched.contact_name) && errors.contact_name
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.contact_name) && errors.contact_name && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.contact_name}
                  </p>
                )}
              </div>

              {/* Especialidad */}
              <div>
                <div className="flex items-center justify-between mb-1.5 select-none">
                  <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider block">
                    Especialidad / Ramo <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isCreatingSpecialty
                      setIsCreatingSpecialty(nextState)
                      if (!nextState) {
                        setForm(p => ({ ...p, specialty: '' }))
                      }
                    }}
                    className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline cursor-pointer"
                  >
                    {isCreatingSpecialty ? 'Elegir existente' : '+ Crear nueva'}
                  </button>
                </div>

                {isCreatingSpecialty ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={100}
                      value={newSpecialtyInput}
                      onChange={e => setNewSpecialtyInput(e.target.value)}
                      placeholder="Nombre de la nueva especialidad (ej. Mariscos)"
                      className="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50 rounded-xl px-3.5 py-2.5 text-theme-text text-xs flex-1 focus:outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      disabled={creatingSpecialtyLoading || !newSpecialtyInput.trim()}
                      onClick={handleCreateSpecialtyInline}
                      className="bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-theme-text text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer transition-all shrink-0"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <Dropdown
                    options={specialtiesList.map(s => ({ value: s, label: s }))}
                    value={form.specialty || ''}
                    onChange={val => {
                      setTouched(p => ({ ...p, specialty: true }))
                      setForm(p => ({ ...p, specialty: val }))
                    }}
                    placeholder="Seleccionar especialidad..."
                    className="w-full text-sm"
                    hasError={(hasSubmitted || touched.specialty) && Boolean(errors.specialty)}
                    buttonClassName="input-subcard bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                  />
                )}
                {(hasSubmitted || touched.specialty) && errors.specialty && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.specialty}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Teléfono de Contacto / Pedidos <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onKeyDown={(e) => {
                    // Permitir teclas de control/navegación y dígitos únicamente
                    if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm(p => ({ ...p, phone: digits }))
                  }}
                  onBlur={() => setTouched(p => ({ ...p, phone: true }))}
                  placeholder="Ej. 5512345678 (10 dígitos)"
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-theme-text text-sm w-full focus:outline-none placeholder-theme-text-muted transition-all font-sans font-medium ${
                    (hasSubmitted || touched.phone) && errors.phone
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.phone) && errors.phone && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  maxLength={100}
                  value={form.email}
                  onBlur={() => {
                    setTouched(p => ({ ...p, email: true }))
                    setForm(p => ({ ...p, email: (p.email || '').trim() }))
                  }}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Ej. pedidos@proveedor.com"
                  className={`input-subcard bg-slate-100 dark:bg-white/5 border rounded-xl px-4 py-3 text-theme-text text-sm w-full focus:outline-none placeholder-theme-text-muted transition-all font-sans font-medium ${
                    (hasSubmitted || touched.email) && errors.email
                      ? '!border-rose-500 ring-1 ring-rose-500/20'
                      : 'border-gray-200 dark:border-white/10 hover:border-brand-500/50 focus:border-brand-500/50'
                  }`}
                />
                {(hasSubmitted || touched.email) && errors.email && (
                  <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 animate-fadeIn">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Días de Entrega */}
              <div>
                <label className="text-xs font-medium text-theme-text-muted uppercase tracking-wider mb-2 block">
                  Días de Entrega Programados <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = form.delivery_days.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setTouched(p => ({ ...p, delivery_days: true }))
                          toggleDeliveryDay(day)
                        }}
                        style={
                          isSelected
                            ? { backgroundColor: colorPrimario, color: '#ffffff' }
                            : { backgroundColor: `${colorPrimario}15`, color: colorPrimario }
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-xs border-none"
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                {(hasSubmitted || touched.delivery_days) && errors.delivery_days && (
                  <p className="text-rose-500 text-[11px] mt-1.5 flex items-center gap-1 animate-fadeIn">
                    {errors.delivery_days}
                  </p>
                )}
              </div>

              {/* Estado Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-theme-border-subtle">
                <div>
                  <p className="text-sm text-theme-text font-medium">Estado del Proveedor</p>
                  <p className="text-xs text-theme-text-muted mt-0.5">Permite realizar pedidos e ingresar stock de este socio</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className={`relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer ${form.active ? 'bg-emerald-600' : 'bg-theme-input border border-theme-border-subtle'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${form.active ? 'translate-x-5' : 'translate-x-0'}`}/>
                </button>
              </div>

              </div>

              {/* Botones al final del scroll */}
              <div className="flex gap-3 justify-end p-4 max-md:p-3 shrink-0 border-t border-theme-border-subtle" style={{ backgroundColor: bgCard }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setForm(defaultForm)
                    setEditingItem(null)
                    setIsCreatingSpecialty(false)
                    setErrors({})
                    setTouched({})
                    setHasSubmitted(false)
                  }}
                  className="bg-theme-input hover:bg-theme-surface border border-theme-border-subtle text-theme-text-muted hover:text-theme-text rounded-xl px-4 py-2 text-sm transition-all cursor-pointer max-md:flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 text-theme-text text-sm font-medium px-5 py-2 rounded-xl shadow-lg shadow-brand-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer max-md:flex-1"
                >
                  {submitting ? 'Guardando...' : (editingItem ? 'Guardar Cambios' : 'Agregar Proveedor')}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
