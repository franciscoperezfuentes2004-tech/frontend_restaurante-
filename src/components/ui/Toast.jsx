import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideInRight">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl ${
        type === 'success' 
          ? 'bg-green-500/10 border-green-500/20 text-green-455 text-green-400' 
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        <span className="font-bold">{type === 'success' ? '✓' : '✕'}</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}
