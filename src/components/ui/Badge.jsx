const colors = {
  disponible:      'text-emerald-600 dark:text-emerald-400 font-bold',
  no_disponible:   'text-rose-600 dark:text-rose-400 font-bold',
  pendiente:       'text-amber-600 dark:text-amber-400 font-bold',
  en_preparacion:  'text-blue-600 dark:text-blue-400 font-bold',
  listo:           'text-emerald-600 dark:text-emerald-400 font-bold',
  entregado:       'text-violet-600 dark:text-violet-400 font-bold',
  confirmada:      'text-violet-600 dark:text-violet-400 font-bold',
  rechazada:       'text-rose-600 dark:text-rose-400 font-bold',
  cancelada:       'text-slate-600 dark:text-slate-400 font-bold',
  activa:          'text-emerald-600 dark:text-emerald-400 font-bold',
  inactiva:        'text-rose-600 dark:text-rose-400 font-bold',
  completada:      'text-emerald-600 dark:text-emerald-400 font-bold',
  no_asistio:      'text-amber-600 dark:text-amber-400 font-bold',
}

const labels = {
  disponible: 'Disponible',
  no_disponible: 'No disponible',
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  activa: 'Activa',
  inactiva: 'Inactiva',
  completada: 'Completada',
  no_asistio: 'No asistió',
}

export default function Badge({ status }) {
  return (
    <span className={`text-xs font-bold inline-flex items-center gap-1.5 ${colors[status] ?? 'text-gray-400'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{labels[status] ?? status}</span>
    </span>
  )
}
