import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { uploadImage } from '../../api/images'

export default function ImageUploader({
  value,           // URL actual de la imagen
  onChange,        // función que recibe la nueva URL
  folder = 'general',
  label = 'Imagen',
  aspectRatio = 'aspect-video', // 'aspect-square' | 'aspect-video'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [preview, setPreview] = useState(value || null)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera el límite máximo de 10MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    // Preview inmediato
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setLoading(true)
    setError(null)
    try {
      const res = await uploadImage(file, folder)
      onChange(res.data.url)
      setPreview(res.data.url)
    } catch (err) {
      const serverErrors = err?.response?.data?.errors
      let errorMsg = 'Error al subir la imagen, intenta de nuevo.'
      if (serverErrors) {
        const firstField = Object.keys(serverErrors)[0]
        if (firstField && Array.isArray(serverErrors[firstField]) && serverErrors[firstField][0]) {
          errorMsg = serverErrors[firstField][0]
        }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setError(errorMsg)
      setPreview(value || null)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="w-full font-sans">
      {label && (
        <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider mb-2">
          {label}
        </p>
      )}

      <div
        style={{ backgroundColor: 'var(--theme-subcard-bg, #D8DDE6)' }}
        className={`relative ${aspectRatio} w-full rounded-xl overflow-hidden
                   border-2 border-dashed transition-all duration-200
                   ${preview
                     ? 'border-theme-border-subtle'
                     : 'border-theme-border-subtle hover:border-brand-500/40 hover:bg-brand-600/5 cursor-pointer'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !preview && inputRef.current?.click()}
      >
        {/* Preview de imagen */}
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay con acciones */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100
                           transition-opacity duration-200 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="bg-white/10 hover:bg-brand-600 border border-white/20
                           rounded-xl px-3 py-2 text-theme-text text-xs font-medium
                           flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Upload size={14} /> Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove() }}
                className="bg-white/10 hover:bg-red-600 border border-white/20
                           rounded-xl px-3 py-2 text-theme-text text-xs font-medium
                           flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <X size={14} /> Quitar
              </button>
            </div>
          </>
        ) : (
          /* Estado vacío */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {loading ? (
              <>
                <Loader2 size={24} className="text-brand-400 animate-spin" />
                <p className="text-theme-text-muted text-xs">Subiendo imagen...</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-500/20
                               flex items-center justify-center">
                  <ImageIcon size={20} className="text-brand-400" />
                </div>
                <p className="text-theme-text-muted text-xs text-center">
                  Haz clic o arrastra una imagen aquí
                </p>
                <p className="text-theme-text-muted text-[10px]">JPG, PNG o WebP · Máx. 10MB</p>
              </>
            )}
          </div>
        )}

        {/* Loading overlay sobre imagen existente */}
        {loading && preview && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={24} className="text-brand-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}
