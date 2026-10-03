import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/shared/Sidebar'
import Topbar from '../components/shared/Topbar'
import DefaultCredentialsAlert from '../components/ui/DefaultCredentialsAlert'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Bell, X, Send, Sparkles } from 'lucide-react'

export default function AdminLayout() {
  const { user } = useAuth()
  const { bgBody, bgCard, bgInput, textColor, textMuted, colorPrimario, borderSubtle, modalShadow } = useTheme()
  const userRole = typeof user?.role === 'string' ? user.role : (Array.isArray(user?.roles) ? user.roles[0] : '')
  const esGerente = userRole === 'gerente' || (Array.isArray(user?.roles) && user.roles.includes('gerente'))
  const location = useLocation()
  
  // Estado para controlar el menú flotante en tablet/móvil
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Cerrar el menú automáticamente al cambiar de ruta
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const handleSendNotification = (e) => {
    e.preventDefault()
    if (!asunto.trim() || !mensaje.trim()) return

    setShowNotifyModal(false)
    setAsunto('')
    setMensaje('')
    
    setToastMessage('✓ Notificación enviada al administrador')
    setTimeout(() => setToastMessage(''), 3500)
  }

  return (
    <div
      className="admin-layout flex flex-col h-screen overflow-hidden select-none relative text-theme-text bg-theme-bg"
      style={{ backgroundColor: 'var(--theme-subcard-bg)' }}
    >
      <DefaultCredentialsAlert />
      <Topbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Overlay (Fondo oscuro): Aparece detrás del menú flotante para destacar el sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 hidden max-xl:block"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main 
          className="flex-1 overflow-y-auto p-8 max-xl:p-6 max-md:p-4 pb-32 max-md:pb-32 relative min-h-0 bg-theme-bg"
          style={{ backgroundColor: 'var(--theme-subcard-bg)' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Botón flotante para el Gerente */}
      {esGerente && (
        <button
          onClick={() => setShowNotifyModal(true)}
          className="fixed bottom-6 right-6 max-md:bottom-4 max-md:right-4 z-40 bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-3 max-md:px-3 max-md:py-2.5 max-md:rounded-full rounded-full shadow-2xl flex items-center gap-2 max-md:gap-1.5 cursor-pointer transition-all duration-200 border border-orange-500/20 text-xs shadow-orange-600/10 hover:scale-105 active:scale-95"
        >
          <Bell size={14} className="animate-pulse max-md:w-3 max-md:h-3" />
          <span className="max-md:hidden">Notificar al admin</span>
        </button>
      )}

      {/* Modal Enviar Notificación */}
      {showNotifyModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <form 
            onSubmit={handleSendNotification}
            className="rounded-2xl p-5 max-w-sm w-full animate-scaleIn space-y-4 text-xs bg-theme-surface text-theme-text"
          >
            <div className="flex justify-between items-start pb-2 border-b border-theme-border-subtle">
              <div>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Ayuda / Soporte</span>
                <h3 className="text-md font-bold mt-0.5 text-theme-text">Enviar notificación al admin</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="p-1 rounded hover:bg-theme-input cursor-pointer transition-all text-theme-text-muted"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Asunto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Stock agotado, duda de permisos..."
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-medium bg-theme-input border border-theme-border-subtle text-theme-text"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Mensaje</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe el detalle aquí..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-medium resize-none bg-theme-input border border-theme-border-subtle text-theme-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="rounded-xl py-2.5 font-bold transition-all cursor-pointer text-center bg-theme-input border border-theme-border-subtle text-theme-text-muted hover:bg-theme-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-2.5 font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Send size={12} />
                <span>Enviar notificación</span>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Toast Panel */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 bg-orange-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-orange-500/20 flex items-center gap-2 text-xs font-bold animate-fadeInUp z-50">
          <Sparkles size={14} className="animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
