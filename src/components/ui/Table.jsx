import { useTheme } from '../../context/ThemeContext'

export default function Table({ 
  headers = [], 
  children, 
  bg = 'transparent', 
  headerBg,
  className = '',
  shadow = 'shadow-md'
}) {
  const { bgSubcard, border, borderSubtle, textMuted, isLight } = useTheme()
  const activeBorder = border || borderSubtle || (isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)')

  return (
    <div 
      className={`rounded-2xl border-[1.5px] transition-all duration-200 overflow-x-auto max-lg:whitespace-nowrap w-full scrollbar-thin ${shadow} bg-transparent ${className}`}
      style={{ backgroundColor: bg || 'transparent', borderColor: activeBorder }}
    >
      <table className="w-full text-left border-collapse min-w-[900px] bg-transparent">
        <thead style={{ backgroundColor: headerBg || bgSubcard, borderBottom: `1.5px solid ${activeBorder}` }}>
          <tr>
            {headers.map((header, index) => {
              const isObj = typeof header === 'object' && header !== null
              const title = isObj ? header.label : header
              const isAcciones = typeof title === 'string' && title.toLowerCase() === 'acciones'
              const align = isObj ? (header.align || (isAcciones ? 'center' : 'left')) : (isAcciones ? 'center' : 'left')
              const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

              return (
                <th 
                  key={index} 
                  className={`py-3.5 px-5 text-xs font-bold uppercase tracking-wider ${alignClass}`}
                  style={{ color: textMuted }}
                >
                  {title}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y bg-transparent" style={{ borderColor: activeBorder }}>
          {children}
        </tbody>
      </table>
    </div>
  )
}
