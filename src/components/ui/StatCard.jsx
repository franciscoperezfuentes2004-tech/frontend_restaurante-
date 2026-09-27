import { useTheme } from '../../context/ThemeContext'

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'brand', 
  delay = '', 
  chartType, 
  accentColor = 'text-brand-400',
  className = ''
}) {
  const { bgCard, bgSubcard, borderSubtle, cardShadow, textColor, textMuted, textSubtle, colorPrimario, isLight } = useTheme()

  const cardStyles = {
    brand: {
      iconBgStyle: { backgroundColor: `${colorPrimario}18`, borderColor: `${colorPrimario}35`, color: colorPrimario },
      topBorderColor: colorPrimario,
      activeColor: colorPrimario
    },
    purple: {
      iconBgStyle: { backgroundColor: 'rgba(168, 85, 247, 0.18)', borderColor: 'rgba(168, 85, 247, 0.35)', color: '#A855F7' },
      topBorderColor: '#A855F7',
      activeColor: '#A855F7'
    },
    amber: {
      iconBgStyle: { backgroundColor: 'rgba(217, 119, 6, 0.18)', borderColor: 'rgba(217, 119, 6, 0.4)', color: '#D97706' },
      topBorderColor: '#D97706',
      activeColor: '#D97706'
    },
    orange: {
      iconBgStyle: { backgroundColor: 'rgba(234, 88, 12, 0.18)', borderColor: 'rgba(234, 88, 12, 0.4)', color: '#EA580C' },
      topBorderColor: '#EA580C',
      activeColor: '#EA580C'
    },
    yellow: {
      iconBgStyle: { backgroundColor: 'rgba(217, 119, 6, 0.18)', borderColor: 'rgba(217, 119, 6, 0.4)', color: '#D97706' },
      topBorderColor: '#D97706',
      activeColor: '#D97706'
    },
    red: {
      iconBgStyle: { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#EF4444' },
      topBorderColor: '#EF4444',
      activeColor: '#EF4444'
    },
    rose: {
      iconBgStyle: { backgroundColor: 'rgba(244, 63, 94, 0.18)', borderColor: 'rgba(244, 63, 94, 0.35)', color: '#F43F5E' },
      topBorderColor: '#F43F5E',
      activeColor: '#F43F5E'
    },
    green: {
      iconBgStyle: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#10B981' },
      topBorderColor: '#10B981',
      activeColor: '#10B981'
    },
    emerald: {
      iconBgStyle: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#10B981' },
      topBorderColor: '#10B981',
      activeColor: '#10B981'
    },
    blue: {
      iconBgStyle: { backgroundColor: 'rgba(59, 130, 246, 0.18)', borderColor: 'rgba(59, 130, 246, 0.35)', color: '#3B82F6' },
      topBorderColor: '#3B82F6',
      activeColor: '#3B82F6'
    },
    gray: {
      iconBgStyle: { backgroundColor: 'rgba(100, 116, 139, 0.18)', borderColor: 'rgba(100, 116, 139, 0.35)', color: textSubtle },
      topBorderColor: textSubtle,
      activeColor: textSubtle
    },
    slate: {
      iconBgStyle: { backgroundColor: 'rgba(100, 116, 139, 0.18)', borderColor: 'rgba(100, 116, 139, 0.35)', color: textSubtle },
      topBorderColor: textSubtle,
      activeColor: textSubtle
    }
  }

  const s = cardStyles[color] || cardStyles.brand

  return (
    <div 
      style={{ 
        backgroundColor: bgSubcard, 
        borderTop: `2px solid ${s.topBorderColor}`,
        borderRight: `1px solid ${borderSubtle}`,
        borderBottom: `1px solid ${borderSubtle}`,
        borderLeft: `1px solid ${borderSubtle}`,
        boxShadow: cardShadow,
        color: textColor
      }}
      className={`card-primary-hover rounded-2xl px-4.5 py-3.5 sm:px-5 sm:py-3.5 flex flex-col justify-between min-h-[125px] sm:min-h-[128px] gap-2 relative overflow-hidden group ${delay} ${className}`}
    >
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

      <div className="flex items-start justify-between relative z-10">
        <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
          {title}
        </div>
        {Icon && (
          <div 
            className="w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-xs"
            style={s.iconBgStyle}
          >
            <Icon size={14} />
          </div>
        )}
      </div>
      
      <div className="relative z-10 my-0.5">
        <div className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: textColor }}>
          {value}
        </div>
      </div>

      {subtitle && (
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold relative z-10 border-t pt-2 mt-0.5" style={{ borderColor: borderSubtle, color: textSubtle }}>
          <span className="truncate">{subtitle}</span>
        </div>
      )}

      {/* Subtle glowing watermark background icon tinted with active color */}
      {Icon && (
        <div 
          className="absolute bottom-2 right-2 opacity-[0.20] group-hover:opacity-[0.35] pointer-events-none z-0 group-hover:scale-110 transition-all duration-500 ease-out" 
          style={{ 
            color: s.activeColor,
            filter: `drop-shadow(0 0 8px ${s.activeColor}80)`
          }}
        >
          <Icon size={38} />
        </div>
      )}
    </div>
  )
}
