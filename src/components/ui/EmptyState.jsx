import React from 'react'
import { Plus } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function EmptyState({ 
  title, 
  description, 
  iconType = 'default', 
  icon: CustomIcon,
  actionLabel, 
  onAction 
}) {
  const { colorPrimario, textColor, textMuted, textSubtle, borderSubtle, bgSubcard, isLight } = useTheme()

  // Compute a softer version of the primary color for glows/fills
  const primarySoft = `${colorPrimario}25`
  const primaryMedium = `${colorPrimario}40`

  // Unique gradient IDs to avoid SVG ID collisions when multiple EmptyStates render
  const uid = React.useId?.() || React.useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const glowId = `glow-${uid}`
  const bodyId = `body-${uid}`
  const visorId = `visor-${uid}`
  const plateId = `plate-${uid}`

  // Gradients using dynamic colorPrimario
  const renderGradients = () => (
    <defs>
      <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={colorPrimario} />
        <stop offset="100%" stopColor={colorPrimario} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={bodyId} x1="60" y1="25" x2="60" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={colorPrimario} stopOpacity="0.15" />
        <stop offset="100%" stopColor={colorPrimario} stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={visorId} x1="60" y1="45" x2="60" y2="77" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={colorPrimario} stopOpacity="0.4" />
        <stop offset="100%" stopColor={colorPrimario} stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id={plateId} x1="25" y1="85" x2="95" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={colorPrimario} stopOpacity="0.2" />
        <stop offset="100%" stopColor={colorPrimario} stopOpacity="0.06" />
      </linearGradient>
    </defs>
  )

  const iconStroke = colorPrimario

  const renderIcon = () => {
    if (CustomIcon) {
      return (
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ 
            backgroundColor: `${colorPrimario}15`, 
            border: `1px solid ${colorPrimario}25`,
            color: colorPrimario 
          }}
        >
          <CustomIcon size={32} className="stroke-[1.75]" />
        </div>
      )
    }
    switch (iconType) {
      case 'drivers':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <path d="M 60,25 C 40,25 28,37 28,57 C 28,68 33,76 39,81 L 39,90 C 39,93 42,95 45,95 L 75,95 C 78,95 81,93 81,90 L 81,81 C 87,76 92,68 92,57 C 92,37 80,25 60,25 Z" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 35,53 C 35,53 45,45 60,45 C 75,45 85,53 85,53 C 87,55 88,59 86,62 L 81,72 C 79,75 75,77 71,77 L 49,77 C 45,77 41,75 39,72 L 34,62 C 32,59 33,55 35,53 Z" fill={`url(#${visorId})`} stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 45,52 C 50,50 55,49 60,49" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <path d="M 60,25 L 60,37" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" />
            <path d="M 45,95 L 45,91" stroke={iconStroke} strokeWidth="2" />
            <path d="M 75,95 L 75,91" stroke={iconStroke} strokeWidth="2" />
          </svg>
        )
      case 'categories':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <rect x="36" y="34" width="56" height="42" rx="8" fill="none" stroke={iconStroke} strokeWidth="2" strokeDasharray="3 3" opacity="0.4" transform="rotate(-6 64 55)"/>
            <path d="M34 44C34 40.7 36.7 38 40 38H56L64 46H88C91.3 46 94 48.7 94 52V82C94 85.3 91.3 88 88 88H40C36.7 88 34 85.3 34 82V44Z" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M46 60H82M46 70H70" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </svg>
        )
      case 'dishes':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <path d="M25 85H95C98 85 99 87 97 89C94 92 88 95 60 95C32 95 26 92 23 89C21 87 22 85 25 85Z" fill={`url(#${plateId})`} stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 80C30 50 43 40 60 40C77 40 90 50 90 80H30Z" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="60" cy="35" r="5" fill={`url(#${visorId})`} stroke={iconStroke} strokeWidth="2" />
            <path d="M 45,65 C 50,60 55,58 60,58 C 65,58 70,60 75,65" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
          </svg>
        )
      case 'extras':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <path d="M 60,23 L 62,31 L 70,33 L 62,35 L 60,43 L 58,35 L 50,33 L 58,31 Z" fill={colorPrimario} opacity="0.4"/>
            <path d="M 85,41 L 86.5,46 L 91.5,47.5 L 86.5,49 L 85,54 L 83.5,49 L 78.5,47.5 L 83.5,46 Z" fill={colorPrimario} opacity="0.3"/>
            <rect x="35" y="45" width="50" height="42" rx="10" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M 60,58 L 60,74 M 52,66 L 68,66" stroke={`url(#${visorId})`} strokeWidth="3" strokeLinecap="round" />
          </svg>
        )
      case 'reservations':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <rect x="32" y="32" width="56" height="56" rx="10" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M32 48H88" stroke={iconStroke} strokeWidth="2" strokeLinecap="round"/>
            <path d="M46 25V35M74 25V35" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="44" cy="60" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="56" cy="60" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="68" cy="60" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="76" cy="60" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="44" cy="72" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="56" cy="72" r="2.5" fill={colorPrimario} opacity="0.5"/>
            <circle cx="72" cy="76" r="14" fill={`url(#${visorId})`} stroke={iconStroke} strokeWidth="1.5" />
            <path d="M72 70V76H78" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )
      case 'peakHours':
      case 'hours':
      case 'time':
      case 'schedule':
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <circle cx="60" cy="62" r="30" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" />
            <circle cx="60" cy="62" r="24" stroke={iconStroke} strokeWidth="1.5" opacity="0.25" strokeDasharray="3 3" />
            <path d="M60 62 L60 44" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 62 L73 62" stroke={`url(#${visorId})`} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="60" cy="62" r="3" fill={colorPrimario} />
            <path d="M78 28 C78 28 83 33 83 38 C83 42 79.5 45 76 45 C72.5 45 69 42 69 38 C69 35 72 31 72 31 C72 31 74.5 34 76 34 C77.5 34 78 28 78 28 Z" fill="#F59E0B" opacity="0.85" />
          </svg>
        )
      case 'orders':
      default:
        return (
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderGradients()}
            <circle cx="60" cy="60" r="45" fill={`url(#${glowId})`} opacity="0.15" />
            <path d="M 60,30 L 90,45 L 90,75 L 60,90 L 30,75 L 30,45 Z" fill={`url(#${bodyId})`} stroke={iconStroke} strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M 30,45 L 60,60 L 90,45" stroke={iconStroke} strokeWidth="2" strokeLinejoin="round"/>
            <path d="M 60,60 L 60,90" stroke={iconStroke} strokeWidth="2"/>
            <path d="M 52,38 L 68,46" stroke={`url(#${visorId})`} strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
          </svg>
        )
    }
  }

  return (
    <div 
      className="sticky left-0 w-full flex flex-col items-center justify-center py-16 px-6 text-center transition-colors duration-200"
    >
      <div 
        className="w-24 h-24 mb-6 flex items-center justify-center"
        style={{ color: colorPrimario }}
      >
        {renderIcon()}
      </div>
      <h4 className="text-base font-bold" style={{ color: textColor }}>{title}</h4>
      <p className="text-xs max-w-sm mt-2 leading-relaxed" style={{ color: textSubtle }}>
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{ 
            backgroundColor: colorPrimario, 
            color: isLight ? '#FFFFFF' : '#FFFFFF',
            boxShadow: `0 4px 14px -3px ${colorPrimario}40`
          }}
        >
          <Plus size={14} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}
