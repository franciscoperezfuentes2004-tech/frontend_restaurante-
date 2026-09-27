import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Download, FileText, Calendar, Eye, X, ArrowRight, ShieldCheck, User, Clock, Globe } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import EmptyState from '../../components/ui/EmptyState'
import Dropdown from '../../components/ui/Dropdown'
import Table from '../../components/ui/Table'
import { useTheme } from '../../context/ThemeContext'
import { adminGetAuditLogs, adminExportAuditLogs } from '../../api/audit'

const MODULE_GROUPS = [
  "General",
  "Menú",
  "Operaciones",
  "Marketing",
  "Inventario",
  "Finanzas",
  "Administración",
  "Configuración"
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'Todos los registros' },
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: '7days', label: 'Últimos 7 días' },
  { value: '30days', label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
]

export default function Audit() {
  const { bgCard, bgSubcard, bgTable, bgInput, borderSubtle, cardShadow, colorPrimario } = useTheme()
  const [auditTrail, setAuditTrail] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')

  // Dynamic filter options from backend
  const [modulesList, setModulesList] = useState([])
  const [usersList, setUsersList] = useState([])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 8

  // Toast & UI State
  const [toast, setToast] = useState(null)

  // Modal / Detail Panel State
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // 1. Debounce search query (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, dateRange, moduleFilter, userFilter])

  // 2. Fetch Audit Logs from backend
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
      }

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (dateRange !== 'all') params.date_range = dateRange
      if (moduleFilter !== 'all') params.modulo = moduleFilter
      if (userFilter !== 'all') params.usuario = userFilter

      const res = await adminGetAuditLogs(params)
      const data = res?.data

      if (data) {
        setAuditTrail(data.audit_logs || [])
        setTotalRecords(data.total || 0)
        setTotalPages(data.last_page || 1)

        if (Array.isArray(data.modulos) && data.modulos.length > 0) {
          setModulesList(data.modulos)
        }
        if (Array.isArray(data.usuarios) && data.usuarios.length > 0) {
          setUsersList(data.usuarios)
        }
      }
    } catch (err) {
      console.error('Error al cargar la bitácora de auditoría:', err)
      setToast({ message: 'Error al sincronizar los registros de auditoría', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, dateRange, moduleFilter, userFilter])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const hasData = auditTrail.length > 0

  // 3. Export Handler
  const handleExport = async (format) => {
    if (!hasData) {
      setToast({ message: 'No hay datos disponibles para exportar', type: 'error' })
      return
    }

    try {
      const params = {}
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (dateRange !== 'all') params.date_range = dateRange
      if (moduleFilter !== 'all') params.modulo = moduleFilter
      if (userFilter !== 'all') params.usuario = userFilter

      const fmtLower = format.toLowerCase()
      if (fmtLower === 'pdf') {
        window.print()
        setToast({ message: 'Vista de impresión PDF activada', type: 'success' })
        return
      }

      const res = await adminExportAuditLogs(fmtLower, params)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `aurum_bitacora_${dateStr}.${fmtLower === 'excel' ? 'csv' : 'csv'}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setToast({ message: `Bitácora exportada a ${format} correctamente`, type: 'success' })
    } catch (err) {
      console.error('Error al exportar la bitácora:', err)
      setToast({ message: 'Error al generar la exportación de bitácora', type: 'error' })
    }
  }

  // Open Detail Modal
  const handleOpenDetail = (audit) => {
    setSelectedAudit(audit)
    setDetailModalOpen(true)
  }

  // Helper for role badge styles
  const getRolStyle = (rol) => {
    const norm = (rol || '').toLowerCase().replace('-', '_')
    const styles = {
      'super_admin': 'bg-red-100 text-red-700 border border-red-300',
      'admin':       'bg-orange-100 text-orange-700 border border-orange-300',
      'gerente':     'bg-blue-100 text-blue-700 border border-blue-300',
      'mesero':      'bg-green-100 text-green-700 border border-green-300',
      'cocina':      'bg-purple-100 text-purple-700 border border-purple-300',
      'repartidor':  'bg-teal-100 text-teal-700 border border-teal-300',
    }
    return styles[norm] || styles[rol] || 'bg-red-100 text-red-700 border border-red-300'
  }

  // Helper for action badge styles
  const getAccionStyle = (accion) => {
    const raw = (accion || '').toUpperCase()
    const labelMap = {
      CREATE: 'CREÓ',
      UPDATE: 'MODIFICÓ',
      DELETE: 'ELIMINÓ',
      LOGIN: 'ACCEDIÓ',
      LOGOUT: 'CERRÓ SESIÓN',
      EXPORT: 'EXPORTÓ',
      REJECT: 'RECHAZÓ',
      RESTORE: 'RESTAURÓ',
    }
    const label = labelMap[raw] || raw

    const styles = {
      'ACCEDIÓ':      'text-blue-600 dark:text-blue-400',
      'CERRÓ SESIÓN': 'text-gray-600 dark:text-gray-400',
      'MODIFICÓ':     'text-amber-600 dark:text-amber-400',
      'CREÓ':         'text-emerald-600 dark:text-emerald-400',
      'ELIMINÓ':      'text-red-600 dark:text-red-400',
      'EXPORTÓ':      'text-purple-600 dark:text-purple-400',
      'RECHAZÓ':      'text-rose-600 dark:text-rose-400',
      'RESTAURÓ':     'text-teal-600 dark:text-teal-400',
    }
    return {
      label,
      style: styles[label] || 'text-gray-600 dark:text-gray-400'
    }
  }

  // Action badge renderer
  const renderActionBadge = (action) => {
    const { label, style } = getAccionStyle(action)

    return (
      <span className={`text-sm font-semibold tracking-wide ${style}`}>
        {label}
      </span>
    )
  }

  // Helper to format values for comparative display
  const formatVal = (val) => {
    if (val === null || val === undefined) return <span className="text-theme-text-muted italic">null</span>
    if (typeof val === 'boolean') return val ? 'true' : 'false'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans text-left print:bg-white print:p-0">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header (Hides on print) */}
      <div className="print:hidden">
        <PageHeader 
          title="Bitácora de Auditoría" 
          description="Registro inalterable de todas las acciones, modificaciones y accesos de los usuarios en el sistema."
        />
      </div>

      <div 
        className="rounded-2xl p-6 max-md:p-3 transition-colors duration-200 animate-fadeInUp space-y-4 max-md:space-y-3 bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 shadow-sm"
        style={{ backgroundColor: bgCard, borderColor: borderSubtle, boxShadow: cardShadow }}
      >
        
        {/* Encabezado de Sección */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-md:gap-2">
          <div>
            <h2 className="text-sm font-bold text-theme-text tracking-wide uppercase">BITÁCORA DE AUDITORÍA Y SEGURIDAD</h2>
            <p className="text-theme-text-muted text-[10px] mt-0.5 font-bold uppercase tracking-wider">REGISTRO DETALLADO DE ACCIONES, MODIFICACIONES Y EVENTOS DEL SISTEMA</p>
          </div>
        </div>

        {/* Search filter for audits (Hides on print) */}
        <div className="flex flex-wrap items-center gap-3 w-full print:hidden">
          <div className="relative flex-1 min-w-[250px] text-gray-400 focus-within:text-[var(--theme-primary)] transition-colors">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por módulo, acción, usuario o detalle..."
              className="w-full bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 max-md:py-2 text-xs placeholder-gray-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-all"
              style={{ backgroundColor: bgInput || 'var(--theme-input)', borderColor: borderSubtle }}
            />
          </div>

          {/* Exports Legend and Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider text-right max-md:text-left">
              EXPORTAR LA LISTA FILTRADA A EXCEL, CSV O PDF
            </span>
            <div className="flex items-center gap-2 max-md:flex-wrap">
              <button
                onClick={() => handleExport('Excel')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <Download size={14} /> <span className="max-md:hidden">Excel</span><span className="md:hidden">XLS</span>
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() => handleExport('PDF')}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 max-md:px-3 py-2.5 max-md:py-1.5 rounded-2xl max-md:rounded-xl shadow-md transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs opacity-100"
              >
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Audit Controls & Filters (Hides on print) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 print:hidden">

          {/* Rango de Fechas (Dropdown) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Período de Tiempo</label>
            <Dropdown
              options={DATE_RANGE_OPTIONS}
              value={dateRange}
              onChange={setDateRange}
              icon={<Calendar size={13} className="text-theme-text-muted" />}
              className="w-full text-xs"
            />
          </div>

          {/* Filtrar por Módulo */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Filtrar por Módulo</label>
            <Dropdown
              options={[
                { value: 'all', label: 'Todos los grupos' },
                ...MODULE_GROUPS.map(g => ({ value: g, label: g }))
              ]}
              value={moduleFilter}
              onChange={setModuleFilter}
              className="w-full text-xs"
            />
          </div>

          {/* Filtrar por Usuario */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Filtrar por Usuario</label>
            <Dropdown
              options={[
                { value: 'all', label: 'Todos los usuarios' },
                ...usersList.map(u => ({ value: u, label: u }))
              ]}
              value={userFilter}
              onChange={setUserFilter}
              className="w-full text-xs"
            />
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <div className="overflow-x-auto w-full shadow-sm rounded-xl border border-slate-200">
          <Table className="min-w-[900px]" shadow="shadow-none" headers={[ 
              'Fecha', 
              'Usuario', 
              'Módulo', 
              'Acción', 
              'Detalle del Evento', 
              { label: 'Inspeccionar', align: 'center' }
            ]}
          >
            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <tr key={`shimmer-${idx}`} className="h-16 border-b border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)', borderColor: borderSubtle }}>
                  <td colSpan="6" className="p-4">
                    <div className="animate-shimmer rounded-xl h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : auditTrail.length === 0 ? (
              <tr className="bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <td colSpan="6" className="p-0 border-none text-center py-12">
                  <EmptyState
                    title="No se encontraron registros de auditoría"
                    description="No hay eventos en la bitácora de seguridad con los filtros aplicados actualmente."
                    iconType="default"
                  />
                </td>
              </tr>
            ) : (
              auditTrail.map(audit => (
                <tr 
                  key={audit.id} 
                  onClick={() => handleOpenDetail(audit)}
                  className="h-16 border-b transition-colors duration-150 bg-white dark:bg-[var(--theme-surface)] hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-800/60 cursor-pointer animate-fadeInUp"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: borderSubtle
                  }}
                >
                  <td className="px-5 py-3.5 font-mono text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {audit.created_at || audit.date}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-sm whitespace-nowrap text-gray-900 dark:text-white">
                    {audit.user_name || audit.user || 'Sistema'}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {audit.modulo || audit.module}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-left whitespace-nowrap">
                    {renderActionBadge(audit.accion || audit.action)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium max-w-md leading-relaxed truncate text-gray-700 dark:text-gray-300" title={audit.descripcion || audit.detail}>
                    {audit.descripcion || audit.detail}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-center print:hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetail(audit)
                      }}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer inline-flex items-center justify-center bg-transparent border-0 outline-none shadow-none"
                      style={{ background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
                      title="Ver comparativa de cambios"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!loading && auditTrail.length > 0 && Array.from({ length: itemsPerPage - auditTrail.length }).map((_, i) => (
              <tr key={`empty-audit-${i}`} className="h-16 border-b border-transparent bg-white dark:bg-[var(--theme-surface)]" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <td colSpan="6"></td>
              </tr>
            ))}
          </Table>
          </div>

          {/* Componente de Paginación Fijo (Siempre Visible) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden" style={{ borderColor: borderSubtle }}>
            <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
              Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords} registros
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalRecords === 0 || loading}
                style={currentPage > 1 && totalRecords > 0 && !loading ? {
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: borderSubtle,
                  color: 'var(--theme-text)',
                  cursor: 'pointer'
                } : {
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: borderSubtle,
                  color: 'var(--theme-text)',
                  opacity: 0.4,
                  cursor: 'not-allowed'
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
              >
                Anterior
              </button>

              <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--theme-text)' }}>
                {totalRecords === 0 ? 1 : currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalRecords === 0 || loading}
                style={currentPage < totalPages && totalRecords > 0 && !loading ? {
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Comparative Panel: Detalle del Evento y Diff de Valores */}
      {detailModalOpen && selectedAudit && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setDetailModalOpen(false)}
        >
          <div 
            className="rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-scaleIn text-left"
            style={{ backgroundColor: 'var(--theme-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER */}
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b"
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    Detalle del Evento de Auditoría
                  </h2>
                  <p className="text-xs opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                    Evento #{selectedAudit.id}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer text-lg font-bold"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                ✕
              </button>
            </div>

            <div 
              className="p-6 border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              {/* TARJETA DE DATOS — 2 filas de 2 columnas (Tono 2) */}
              <div 
                className="bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4"
                style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
              >
              
              {/* Fila 1 */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                
                {/* Usuario */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider">
                    Usuario
                  </span>
                  <span className="text-theme-text text-sm font-semibold truncate" title={selectedAudit.user_name || selectedAudit.user || 'Sistema'}>
                    {selectedAudit.user_name || selectedAudit.user || 'Sistema'}
                  </span>
                  <span className="text-[var(--theme-primary)] border border-[var(--theme-primary)] rounded-full px-2 py-0.5 text-xs font-semibold w-fit bg-transparent">
                    {(selectedAudit.role || 'SUPER ADMIN').replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Fecha / Hora */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider">
                    Fecha / Hora
                  </span>
                  <span className="text-theme-text text-sm font-mono">
                    {selectedAudit.created_at || selectedAudit.date}
                  </span>
                </div>

              </div>

              {/* Divisor */}
              <div className="border-t border-gray-200 dark:border-gray-700 mb-4" style={{ borderColor: borderSubtle }} />

              {/* Fila 2 */}
              <div className="grid grid-cols-2 gap-6">

                {/* Módulo / Acción */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider">
                    Módulo / Acción
                  </span>
                  <span className="text-theme-text text-sm font-semibold">
                    {selectedAudit.modulo || selectedAudit.module}
                  </span>
                  <span className="w-fit">
                    {renderActionBadge(selectedAudit.accion || selectedAudit.action)}
                  </span>
                </div>

                {/* Dirección IP */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider">
                    Dirección IP
                  </span>
                  <span className="text-theme-text text-sm font-mono">
                    {selectedAudit.ip_address || '127.0.0.1'}
                  </span>
                </div>

              </div>
            </div>

            {/* DESCRIPCIÓN (Tono 2) */}
            <div className="mb-4">
              <p className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider mb-2">
                Descripción del Evento
              </p>
              <div 
                className="bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
              >
                <p className="text-theme-text text-sm leading-relaxed">
                  {selectedAudit.descripcion || selectedAudit.detail}
                </p>
              </div>
            </div>

            {/* COMPARATIVA (Tono 2) */}
            <div className="mb-6">
              <p className="text-theme-text-muted text-xs uppercase font-semibold tracking-wider mb-2">
                Comparativa de Atributos (Antes vs Después)
              </p>
              <div 
                className="bg-gray-50 dark:bg-[var(--theme-bg)] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
              >
                {(!selectedAudit.valores_antes && !selectedAudit.valores_despues) ? (
                  <p className="text-theme-text-muted text-sm text-center">
                    Evento de sistema o autenticación (sin atributos modificados en base de datos).
                  </p>
                ) : (
                  <div 
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-[var(--theme-surface)] text-left"
                    style={{ borderColor: borderSubtle, backgroundColor: 'var(--theme-surface)' }}
                  >
                    <div 
                      className="grid grid-cols-12 bg-gray-50 dark:bg-[var(--theme-bg)] border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-[10px] font-bold text-theme-text-muted uppercase tracking-wider"
                      style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                    >
                      <div className="col-span-4">Atributo</div>
                      <div className="col-span-4 text-rose-500 dark:text-rose-400">Valor Anterior</div>
                      <div className="col-span-4 text-emerald-600 dark:text-emerald-400">Valor Nuevo</div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800/60 max-h-48 overflow-y-auto font-mono text-[11px]" style={{ borderColor: borderSubtle }}>
                      {(() => {
                        const before = selectedAudit.valores_antes || {}
                        const after = selectedAudit.valores_despues || {}
                        const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))

                        if (allKeys.length === 0) {
                          return (
                            <div className="p-4 text-center text-theme-text-muted">Sin atributos registrados</div>
                          )
                        }

                        return allKeys.map((key) => {
                          const valBefore = before[key]
                          const valAfter = after[key]

                          return (
                            <div 
                              key={key} 
                              className="grid grid-cols-12 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors items-center bg-white dark:bg-[var(--theme-surface)]"
                              style={{ backgroundColor: 'var(--theme-surface)' }}
                            >
                              <div className="col-span-4 font-semibold text-theme-text truncate" title={key}>{key}</div>
                              <div className="col-span-4 text-rose-600 dark:text-rose-400 break-words pr-2">
                                {formatVal(valBefore)}
                              </div>
                              <div className="col-span-4 text-emerald-600 dark:text-emerald-400 break-words pl-2 flex items-center gap-1.5">
                                {selectedAudit.accion === 'update' && <ArrowRight size={10} className="text-theme-text-muted shrink-0" />}
                                <span>{formatVal(valAfter)}</span>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end pt-4">
              <button 
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-[var(--theme-primary)] hover:text-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}



