import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike, ShoppingBag, Search, Plus, Minus, ShoppingCart, X, Trash2,
  CheckCircle, ArrowLeft, ChevronRight, ChevronLeft, Star, Clock, Sparkles,
  Heart, Tag, Flame, Info, Wine, Edit3, Check, Gift, Utensils, UtensilsCrossed, RotateCcw, AlertCircle,
  SlidersHorizontal
} from 'lucide-react'
import client from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { getConfiguracion } from '../api/settings'
import CategoryCarouselRow from '../components/CategoryCarouselRow'

const rangosPrecios = {
  menos100: (precio) => precio < 100,
  '100a200': (precio) => precio >= 100 && precio <= 200,
  '200a400': (precio) => precio >= 200 && precio <= 400,
  mas400:   (precio) => precio > 400,
}

// Diccionario de etiquetas descriptivas de restricciones
const restriccionesDict = {
  vegetariano: { label: 'Vegetariano', icon: '🌱', tooltip: 'Platillo apto para vegetarianos' },
  vegano:      { label: 'Vegano',      icon: '🌿', tooltip: '100% origen vegetal sin ingredientes animales' },
  sinGluten:   { label: 'Sin gluten',  icon: '🌾', tooltip: 'Platillo elaborado libre de gluten' },
  sinLacteos:  { label: 'Sin lácteos', icon: '🥛', tooltip: 'Sin leche, crema o derivados lácteos' },
  sinPicante:  { label: 'Sin picante', icon: '🌶️', tooltip: 'Platillo no picante' },
  conNueces:   { label: 'Contiene nueces', icon: '🥜', tooltip: 'Contiene frutos secos o nueces' },
  picante:     { label: 'Picante',     icon: '🌶️', tooltip: 'Platillo con toque de picante' },
}

// Diccionario de Expresiones Regulares Estrictas (Regex) para Validación de Checkout
const VALIDACIONES = {
  nombre: {
    regex: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,100}$/,
    mensaje: "Solo letras. Mínimo 3 caracteres."
  },
  telefono: {
    regex: /^[0-9]{10}$/,
    mensaje: "El teléfono debe tener exactamente 10 números."
  },
  cp: {
    regex: /^[0-9]{5}$/,
    mensaje: "El código postal debe ser de 5 dígitos."
  },
  textoSeguro: {
    // Permite letras, números, espacios, puntos, comas, guiones y el símbolo #
    // BLOQUEA ESTRICTAMENTE: < > = / \ { } (Evita inyección de código)
    regex: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#-]{2,200}$/,
    mensaje: "No se permiten caracteres especiales raros."
  }
}

// Fallback de respaldo en caso de base de datos vacía o primer despliegue
const MOCK_PLATILLOS_DEFAULT = [
  {
    id: 'p1',
    nombre: 'Cecina Guerrerense con Guarnición',
    descripcion: 'Fina cecina artesanal curada al sol, acompañada de queso fresco, frijoles refritos, aguacate y tortillas recién hechas.',
    precio: 260,
    precioOriginal: 290,
    imagen: '/promo_ribeye.png',
    categoria: 'cortes',
    disponible: true,
    stock: 15,
    badge: '⭐ Especialidad',
    destacado: true,
    promocion: true,
    ofertaEspecial: false,
    rating: 4.9,
    reviewsCount: 38,
    tiempoPrep: '20-25 min',
    ingredientes: ['Cecina de res', 'Queso fresco', 'Frijoles refritos', 'Aguacate', 'Tortillas a mano'],
    extras: ['Guacamole extra (+$45)', 'Queso asado (+$35)', 'Chicharrón de cerdo (+$30)'],
    restricciones: ['sinGluten']
  },
  {
    id: 'p2',
    nombre: 'Tacos Gobernador de Camarón (3 pzas)',
    descripcion: 'Tortillas de maíz doradas al comal rellenas de camarones salteados con pimientos, cebolla caramelizada y queso fundido.',
    precio: 210,
    precioOriginal: null,
    imagen: '/promo_shrimp.png',
    categoria: 'mariscos',
    disponible: true,
    stock: 20,
    badge: '🔥 Más pedido',
    destacado: true,
    promocion: false,
    ofertaEspecial: true,
    rating: 4.8,
    reviewsCount: 52,
    tiempoPrep: '15-20 min',
    ingredientes: ['Camarón de costa', 'Queso gouda', 'Cebolla morada', 'Pimientos asados', 'Salsa de la casa'],
    extras: ['Camarón extra (+$50)', 'Costra de queso (+$25)'],
    restricciones: ['sinGluten', 'picante']
  },
  {
    id: 'p3',
    nombre: 'Hamburguesa Aurum Black Angus',
    descripcion: '200g de carne Black Angus a la brasa, tocino crujiente, cebolla caramelizada al bourbon, queso cheddar maduro y papas rústicas.',
    precio: 245,
    precioOriginal: 275,
    imagen: '/gourmet_pizza_slice.png',
    categoria: 'fuertes',
    disponible: true,
    stock: 12,
    badge: '🎁 Oferta Chef',
    destacado: true,
    promocion: true,
    ofertaEspecial: true,
    rating: 5.0,
    reviewsCount: 64,
    tiempoPrep: '18-22 min',
    ingredientes: ['Carne Black Angus', 'Pan brioche artesanal', 'Queso cheddar', 'Tocino ahumado', 'Papas trufadas'],
    extras: ['Carne extra 200g (+$70)', 'Huevo estrellado (+$20)', 'Queso azul (+$30)'],
    restricciones: []
  },
  {
    id: 'p4',
    nombre: 'Ceviche Acapulco Tradicional',
    descripcion: 'Pescado blanco fresco marinado en jugo de limón recién exprimido, jitomate, cebolla morada, cilantro, chile serrano y aguacate.',
    precio: 195,
    precioOriginal: null,
    imagen: '/promo_shrimp.png',
    categoria: 'mariscos',
    disponible: true,
    stock: 8,
    badge: '✨ Nuevo',
    destacado: false,
    promocion: false,
    ofertaEspecial: false,
    rating: 4.7,
    reviewsCount: 19,
    tiempoPrep: '12-15 min',
    ingredientes: ['Pescado fresco', 'Limón criollo', 'Cilantro', 'Aguacate', 'Totopos de maíz'],
    extras: ['Pulpo cocido (+$45)', 'Camarón fresco (+$40)'],
    restricciones: ['sinGluten', 'sinLacteos', 'picante']
  },
  {
    id: 'p5',
    nombre: 'Ribeye Steak Prime 400g a las Brasas',
    descripcion: 'Corte selecto Prime con alto marmoleo, sellado a fuego directo con mantequilla de hierbas finas y espárragos asados.',
    precio: 480,
    precioOriginal: 520,
    imagen: '/promo_ribeye.png',
    categoria: 'cortes',
    disponible: true,
    stock: 6,
    badge: '⭐ Premium',
    destacado: true,
    promocion: true,
    ofertaEspecial: true,
    rating: 4.9,
    reviewsCount: 41,
    tiempoPrep: '25-30 min',
    ingredientes: ['Ribeye Prime', 'Mantequilla de romero', 'Sal de mar', 'Espárragos a la parrilla'],
    extras: ['Término especial sellado', 'Salsa de pimienta negra (+$30)', 'Puré de papa trufado (+$45)'],
    restricciones: ['sinGluten']
  },
  {
    id: 'p6',
    nombre: 'Guacamole Rústico con Totopos Artesanales',
    descripcion: 'Aguacate hass machacado en molcajete con pico de gallo, limón y toque de sal de Colima con totopos crujientes.',
    precio: 130,
    precioOriginal: null,
    imagen: '/promo_shrimp.png',
    categoria: 'entradas',
    disponible: true,
    stock: 25,
    badge: '🌱 Vegetariano',
    destacado: false,
    promocion: false,
    ofertaEspecial: false,
    rating: 4.8,
    reviewsCount: 27,
    tiempoPrep: '10 min',
    ingredientes: ['Aguacate Hass', 'Cebolla morada', 'Cilantro', 'Jitomate', 'Limón'],
    extras: ['Chicharrón prensado (+$35)', 'Queso panela asado (+$30)'],
    restricciones: ['vegetariano', 'vegano', 'sinGluten', 'sinLacteos']
  },
  {
    id: 'p7',
    nombre: 'Mezcalita de Maracuyá & Sal de Gusano',
    descripcion: 'Mezcal artesanal espadín, pulpa natural de maracuyá, jugo de limón y escarchado de sal de gusano de maguey.',
    precio: 140,
    precioOriginal: 160,
    imagen: '/promo_cocktails.png',
    categoria: 'bebidas',
    disponible: true,
    stock: 30,
    badge: '🏷️ 2x1 Jueves',
    destacado: true,
    promocion: true,
    ofertaEspecial: false,
    rating: 4.9,
    reviewsCount: 88,
    tiempoPrep: '5-8 min',
    ingredientes: ['Mezcal Espadín 100%', 'Maracuyá fresco', 'Jarabe de agave', 'Sal de gusano'],
    extras: ['Shot extra de mezcal (+$50)'],
    restricciones: ['vegano', 'sinGluten', 'sinLacteos']
  },
  {
    id: 'p8',
    nombre: 'Pastel de Chocolate Fundente Volcán',
    descripcion: 'Bizcocho esponjoso de chocolate belga con centro líquido caliente, acompañado de helado de vainilla de Papantla.',
    precio: 125,
    precioOriginal: null,
    imagen: '/promo_shrimp.png',
    categoria: 'postres',
    disponible: false,
    stock: 0,
    badge: null,
    destacado: false,
    promocion: false,
    ofertaEspecial: false,
    rating: 4.9,
    reviewsCount: 45,
    tiempoPrep: '15 min',
    ingredientes: ['Chocolate amargo 70%', 'Helado artesanal', 'Frutos rojos'],
    extras: ['Bola de helado extra (+$30)'],
    restricciones: ['vegetariano']
  }
]

const MOCK_CATEGORIAS_DEFAULT = [
  { id: 'entradas', nombre: 'Entradas & Botanas' },
  { id: 'fuertes', nombre: 'Platillos Fuertes' },
  { id: 'cortes', nombre: 'Cortes & Carnes' },
  { id: 'mariscos', nombre: 'Mariscos Frescos' },
  { id: 'bebidas', nombre: 'Bebidas & Coctelería' },
  { id: 'postres', nombre: 'Postres Artesanales' }
]

// Helper para formatear badges de oferta o promoción (ej. PROMO 2X1, OFERTA, etc.)
const formatearBadgeTexto = (badge, platilloNombre, esPromo, esOferta) => {
  if (!badge) return null
  const badgeStr = String(badge).trim()
  const lower = badgeStr.toLowerCase()

  // 1. Detectar 2x1 o 3x2 o combinaciones similares
  if (lower.includes('2x1') || lower.includes('2 x 1')) {
    return esOferta ? 'OFERTA 2X1' : 'PROMO 2X1'
  }
  if (lower.includes('3x2') || lower.includes('3 x 2')) {
    return esOferta ? 'OFERTA 3X2' : 'PROMO 3X2'
  }

  // 2. Si es una promoción vinculada o categoría de promo
  if (esPromo) {
    const matchPct = lower.match(/\d+%\s*(off|desc|descuento)?/i)
    if (matchPct) return `PROMO ${matchPct[0].toUpperCase()}`
    
    if (platilloNombre && lower.includes(platilloNombre.toLowerCase())) {
      return 'PROMO 2X1'
    }
    if (lower.includes('promocion') || lower.includes('promoción') || lower.includes('promo')) {
      return 'PROMO'
    }
    if (badgeStr.length <= 16) return badgeStr.toUpperCase()
    return 'PROMO'
  }

  // 3. Si es una oferta especial o descuento
  if (esOferta) {
    const matchPct = lower.match(/\d+%\s*(off|desc|descuento)?/i)
    if (matchPct) return `OFERTA ${matchPct[0].toUpperCase()}`
    if (platilloNombre && lower.includes(platilloNombre.toLowerCase())) {
      return 'OFERTA'
    }
    if (badgeStr.length <= 16) return badgeStr.toUpperCase()
    return 'OFERTA'
  }

  // 4. Si el texto incluye el nombre del platillo (ej. "2x1 en tacos"), recortar al beneficio
  if (platilloNombre && lower.includes(platilloNombre.toLowerCase())) {
    return 'PROMO 2X1'
  }

  return badgeStr.length > 20 ? badgeStr.slice(0, 18).toUpperCase() + '...' : badgeStr.toUpperCase()
}

// Componente Card de Platillo (Compacto, elegante y no invasivo)
const PlatilloCard = ({ platillo, onAbrirDetalle, onAgregarRapido, isHighlighted }) => {
  const isAvailable = platillo.disponible !== false && platillo.is_available !== false && (platillo.stock === undefined || platillo.stock === null || platillo.stock > 0)
  const ratingValue = platillo.calificacion || platillo.rating || null
  const reviewsCount = platillo.totalResenas || platillo.total_resenas || platillo.reviewsCount || 0

  return (
    <div
      id={`platillo-${platillo.id}`}
      onClick={() => isAvailable && onAbrirDetalle(platillo)}
      style={{
        backgroundColor: 'var(--theme-card, var(--theme-surface))',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.05)',
      }}
      className={`group h-full flex flex-col justify-between rounded-md overflow-hidden transition-all duration-300 text-left shadow-lg hover:shadow-2xl hover:-translate-y-1 ${
        isAvailable
          ? 'cursor-pointer'
          : 'opacity-60 cursor-not-allowed grayscale-[25%]'
      } ${
        isHighlighted
          ? 'ring-4 ring-[var(--theme-primary)] shadow-2xl shadow-[var(--theme-primary)]/40 scale-[1.03] -translate-y-1 z-20'
          : ''
      }`}
    >
      {/* 1. Imagen del Platillo: Sin zoom y sin capa de color al hover */}
      <div className="relative w-full h-[194px] sm:h-[210px] max-xl:h-40 overflow-hidden bg-black/20">
        {platillo.imagen ? (
          <img
            src={platillo.imagen}
            alt={platillo.nombre}
            className={`w-full h-full object-cover ${
              isAvailable ? '' : 'opacity-70'
            }`}
            onError={(e) => {
              e.currentTarget.src = '/promo_shrimp.png'
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-theme-text-muted/50 gap-1">
            <Utensils size={18} className="text-[var(--theme-primary)] opacity-50" />
            <span className="text-[9px] tracking-wider uppercase font-semibold">Sin imagen</span>
          </div>
        )}

        {/* Badge promocional / Más Vendido (detectado de BD) */}
        {platillo.esMasVendido && isAvailable ? (
          <span 
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              boxShadow: '0 3px 10px -1px rgba(234, 88, 12, 0.45)'
            }}
            className="absolute top-2.5 left-2.5 text-white text-[9.5px] tracking-wider px-2.5 py-1 rounded-md font-bold uppercase flex items-center gap-1.5 z-10 select-none shadow-md"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200 shrink-0" />
            <span className="tracking-wide">Más Vendido</span>
          </span>
        ) : platillo.badge && isAvailable ? (
          <span 
            style={
              (platillo.promocion || platillo.ofertaEspecial || platillo.badge.includes('PROMO') || platillo.badge.includes('OFERTA') || platillo.badge.includes('2X1'))
                ? {
                    background: 'linear-gradient(135deg, #EF2323 0%, #DB1212 55%, #B30C0C 100%)',
                    boxShadow: '0 3px 12px -1px rgba(219, 18, 18, 0.45)',
                    border: '1px solid rgba(254, 202, 202, 0.4)'
                  }
                : {
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #ffffff)',
                    boxShadow: '0 3px 10px -1px rgba(0, 0, 0, 0.25)'
                  }
            }
            className="absolute top-2.5 left-2.5 text-white text-[9.5px] tracking-wider px-2.5 py-1 rounded-md font-bold shadow-md uppercase z-10 select-none flex items-center gap-1.5"
          >
            {(platillo.promocion || platillo.badge.includes('PROMO') || platillo.badge.includes('2X1')) ? (
              <Tag className="w-3 h-3 text-red-100 shrink-0" strokeWidth={2.5} />
            ) : (platillo.ofertaEspecial || platillo.badge.includes('OFERTA')) ? (
              <Gift className="w-3 h-3 text-red-100 shrink-0" strokeWidth={2.5} />
            ) : null}
            <span>{platillo.badge}</span>
          </span>
        ) : null}

        {/* Control de Stock: Overlay No Disponible */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-red-400 text-[10px] tracking-wider border border-red-500/40 bg-red-950/80 px-2.5 py-1 rounded font-bold uppercase shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* 2. Cuerpo de Información: Bordes con variable de tema */}
      <div 
        style={{
          borderColor: isHighlighted ? 'var(--theme-primary)' : 'var(--theme-border-subtle)'
        }}
        className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between min-h-[195px] sm:min-h-[205px] border-[1.5px] border-[var(--theme-border-subtle)] rounded-b-md transition-colors"
      >
        <div className="flex flex-col">
          {/* Nombre del Platillo: SIEMPRE EN MAYÚSCULAS */}
          <h3 className={`font-serif text-sm sm:text-base font-bold uppercase tracking-wide leading-snug transition-colors duration-200 line-clamp-1 h-5 sm:h-6 ${
            isAvailable ? 'text-theme-text group-hover:text-[var(--theme-primary)]' : 'text-theme-text-muted'
          }`}>
            {platillo.nombre?.toUpperCase()}
          </h3>

          {/* Espacio reservado para la descripción: espacio libre amplio para no estirar la tarjeta */}
          <div className="min-h-[58px] flex items-start pt-1.5 pb-1">
            {platillo.descripcion && (
              <div 
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary, #6366f1) 8%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--theme-primary, #6366f1) 22%, transparent)'
                }}
                className="text-[11px] text-[var(--theme-primary)] font-normal flex items-start gap-1.5 px-2.5 py-1 rounded border w-fit max-w-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] shrink-0 mt-1"></span>
                <span className="line-clamp-2 leading-relaxed first-letter:uppercase">
                  {platillo.descripcion.charAt(0).toUpperCase() + platillo.descripcion.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Calificación y opiniones: con salto de línea (mt-3) para separar de la descripción */}
          <div className="flex items-center gap-1.5 mt-3 pt-0.5 text-xs select-none">
            <Star 
              className={`w-3.5 h-3.5 stroke-[1.8] ${
                ratingValue 
                  ? 'fill-amber-400 text-amber-400' 
                  : 'text-[var(--theme-primary)] fill-[var(--theme-primary)]/10'
              }`} 
            />
            <span className="font-bold text-xs text-theme-text">
              {ratingValue ? Number(ratingValue).toFixed(1) : '0.0'}
            </span>
            <span className="text-[11px] text-theme-text-muted">
              ({reviewsCount || 0})
            </span>
          </div>

          {/* Indicadores de características con tooltip */}
          {platillo.restricciones && platillo.restricciones.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2.5">
              {platillo.restricciones.map((r) => {
                const info = restriccionesDict[r] || { label: r, icon: '•', tooltip: r }
                return (
                  <span
                    key={r}
                    title={info.tooltip}
                    className="text-[9px] bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] text-theme-text-muted rounded px-1.5 py-0.5 flex items-center gap-0.5 hover:border-[var(--theme-primary)]/30 hover:text-theme-text transition-colors"
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* 3. Precio y Botón Agregar o Badge Agotado */}
        <div 
          style={{ borderColor: 'var(--theme-border-subtle)' }}
          className="flex items-center justify-between pt-2.5 border-t border-[var(--theme-border-subtle)] mt-3"
        >
          <div className="flex flex-col text-left select-none">
            {/* Bloque Precio Anterior */}
            {platillo.precioOriginal && platillo.precioOriginal > platillo.precio && (
              <div className="flex items-center gap-1 text-[10px] text-theme-text-muted font-medium tracking-tight">
                <span className="line-through opacity-70">
                  ${platillo.precioOriginal}
                </span>
              </div>
            )}

            {/* Bloque Precio Actual */}
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base sm:text-lg text-theme-text group-hover:text-[var(--theme-primary)] transition-colors duration-200 leading-none tracking-tight">
                ${platillo.precio}
              </span>
              <span className="text-theme-text-muted text-[10px] font-semibold uppercase tracking-wider leading-none">
                MXN
              </span>
            </div>
          </div>

          {!isAvailable ? (
            <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-medium px-2 py-1 rounded select-none">
              Agotado
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onAgregarRapido) {
                  onAgregarRapido(platillo)
                } else {
                  onAbrirDetalle(platillo)
                }
              }}
              style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
              className="flex items-center gap-1 hover:opacity-90 active:scale-95 text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { isLight, colorPrimario, logoUrl: themeLogoUrl, restaurantName: themeRestName } = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()


  // Estados de datos dinámicos desde API
  const [categorias, setCategorias] = useState([])
  const [platillos, setPlatillos] = useState([])
  const [settingsData, setSettingsData] = useState(null)
  const [cargando, setCargando] = useState(true)

  // State de navegación y filtros
  const [tipoPedido, setTipoPedido] = useState('delivery')
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtrosActivos, setFiltrosActivos] = useState([])
  const [filtroPrecio, setFiltroPrecio] = useState(null)
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [restriccionesActivas, setRestriccionesActivas] = useState([])
  const [mostrarFiltrosModal, setMostrarFiltrosModal] = useState(false)
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [notificacionToast, setNotificacionToast] = useState(null)
  const [platilloHighlight, setPlatilloHighlight] = useState(null)
  const [promociones, setPromociones] = useState([])
  const isInitialLoad = useRef(true)
  const mainScrollRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Persistencia de Carrito en localStorage
  const [carrito, setCarrito] = useState(() => {
    try {
      const saved = localStorage.getItem('aurum_cart_v1')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  // Sincronización automática con localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aurum_cart_v1', JSON.stringify(carrito))
    } catch (e) {
      console.error('Error guardando carrito en localStorage:', e)
    }
  }, [carrito])

  // Asegurar que el fondo del body sea Tono 1 (superficie limpia) durante toda la estancia en el Menú
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = 'var(--theme-surface)'
    return () => {
      document.body.style.backgroundColor = prevBg
    }
  }, [])

  // Consumo dinámico de la API de backend con sincronización continua y silenciosa
  useEffect(() => {
    let isMounted = true

    const cargarCatalogoMenu = async (silencioso = !isInitialLoad.current) => {
      if (!silencioso) setCargando(true)
      try {
        const publicReqConfig = { skipAuth: true, headers: { Authorization: undefined } }

        const [catsRes, dishesRes, settingsRes, promosRes] = await Promise.all([
          client.get('/public/categories', publicReqConfig)
            .catch(() => client.get('/categories', publicReqConfig))
            .catch(() => client.get('/menu/categories', publicReqConfig))
            .catch(() => client.get('/menu/public/categories', publicReqConfig))
            .catch(() => ({ data: [] })),
          client.get('/public/dishes', publicReqConfig)
            .catch(() => client.get('/dishes', publicReqConfig))
            .catch(() => client.get('/menu/dishes', publicReqConfig))
            .catch(() => client.get('/public/menu', publicReqConfig))
            .catch(() => client.get('/menu/public', publicReqConfig))
            .catch(() => ({ data: [] })),
          client.get('/settings/landing', publicReqConfig)
            .catch(() => client.get('/public/settings', publicReqConfig))
            .catch(() => client.get('/settings', publicReqConfig))
            .catch(() => ({ data: null })),
          client.get('/promotions', publicReqConfig)
            .catch(() => ({ data: [] }))
        ])

        if (!isMounted) return

        // Extraer categorías
        const rawCats = Array.isArray(catsRes.data)
          ? catsRes.data
          : (Array.isArray(catsRes.data?.data) ? catsRes.data.data : (Array.isArray(catsRes.data?.categories) ? catsRes.data.categories : []))

        // Extraer platillos
        const rawDishes = Array.isArray(dishesRes.data)
          ? dishesRes.data
          : (Array.isArray(dishesRes.data?.data) ? dishesRes.data.data : (Array.isArray(dishesRes.data?.dishes) ? dishesRes.data.dishes : []))

        // Extraer promociones del backend
        const rawPromos = Array.isArray(promosRes?.data?.data)
          ? promosRes.data.data
          : Array.isArray(promosRes?.data)
            ? promosRes.data
            : Array.isArray(promosRes)
              ? promosRes
              : []

        // Si hay datos en backend, usarlos; de lo contrario cargar fallback completo
        const finalDishes = rawDishes.length > 0 ? rawDishes : MOCK_PLATILLOS_DEFAULT
        const finalCats = rawCats.length > 0 ? rawCats : MOCK_CATEGORIAS_DEFAULT

        setCategorias(finalCats)
        setPlatillos(finalDishes)
        setPromociones(rawPromos)
        if (settingsRes?.data) {
          setSettingsData(settingsRes.data?.data || settingsRes.data)
        }
        getConfiguracion().then(res => {
          if (res?.data && isMounted) {
            setSettingsData(prev => ({ ...res.data, ...(prev || {}) }))
          }
        }).catch(() => {})
      } catch (err) {
        console.error('Error consumiendo API de menú pública:', err)
        if (isMounted && !silencioso) {
          setCategorias(MOCK_CATEGORIAS_DEFAULT)
          setPlatillos(MOCK_PLATILLOS_DEFAULT)
        }
      } finally {
        if (isMounted) {
          isInitialLoad.current = false
          if (!silencioso) {
            setCargando(false)
          }
        }
      }
    }

    cargarCatalogoMenu(!isInitialLoad.current)

    // Actualización silenciosa continua en segundo plano cada 30 segundos
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        cargarCatalogoMenu(true)
      }
    }, 30000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        cargarCatalogoMenu(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshKey])

  // Calcular el volumen máximo de pedidos registrados en la base de datos entre todos los platillos
  const maxPedidos = Math.max(
    0,
    ...platillos.map(d => Number(d.total_pedidos ?? d.totalPedidos ?? d.ventas_count ?? d.ventas ?? 0))
  )

  // Helper para verificar si una promoción está vinculada a un platillo
  const estaPromoVinculada = (pr, id) => {
    if (!pr) return false
    if (pr.active === false || pr.activo === false || pr.status === 'inactive' || pr.is_active === false) return false
    const pId = pr.platillo_id ?? pr.platilloId ?? pr.dish_id ?? pr.dishId
    if (pId && String(pId) === String(id)) return true
    const prods = pr.products || pr.product_ids || pr.selectedDishes || pr.platillos || pr.dishes || []
    if (Array.isArray(prods) && prods.some(pid => String(typeof pid === 'object' ? (pid.id ?? pid._id ?? pid.platillo_id) : pid) === String(id))) {
      return true
    }
    return false
  }

  // Normalizar platillos para el catálogo
  const platillosNorm = platillos.map(d => {
    const dishId = d.id ?? d._id
    const catId = String(d.category_id ?? d.categoryId ?? d.categoria_id ?? d.categoria ?? '')
    const catObj = categorias.find(c => String(c.id ?? c._id) === catId || String(c.slug) === catId || String(c.nombre || '').toLowerCase() === catId.toLowerCase() || String(c.name || '').toLowerCase() === catId.toLowerCase())
    const categoriaNombre = d.category?.name || d.category?.nombre || d.category_name || d.categoria_nombre || (catObj ? (catObj.name || catObj.nombre) : '')

    // Buscar si hay promoción activa asignada
    const promoVinculada = promociones.find(pr => estaPromoVinculada(pr, dishId))

    // Total de pedidos reales de la base de datos
    const totalPedidos = Number(d.total_pedidos ?? d.totalPedidos ?? d.ventas_count ?? d.ventas ?? 0)
    // Solo se activa automáticamente como "Más Vendido" si realmente tiene pedidos (> 0) y es el que más pedidos tiene
    const esMasVendido = (maxPedidos > 0 && totalPedidos === maxPedidos) || Boolean(d.es_mas_vendido || d.is_bestseller || d.mas_vendido || (d.badge && String(d.badge).toLowerCase().includes('más vendido')))

    const esPromo = Boolean(d.promocion || d.is_promo || d.es_promo || d.en_promo || d.en_promocion || promoVinculada)
    const esOferta = Boolean(d.oferta_especial || d.ofertaEspecial || d.is_offer || d.is_oferta || d.en_oferta || (d.precioOriginal && d.precioOriginal > d.precio))

    let badgeCalculado = d.badge || (d.destacado ? '⭐ Popular' : null)
    if (promoVinculada) {
      badgeCalculado = promoVinculada.badge || promoVinculada.beneficio || promoVinculada.benefit || promoVinculada.nombre || promoVinculada.name || 'Promo'
    } else if (d.precioOriginal && d.precioOriginal > d.precio) {
      badgeCalculado = badgeCalculado || 'Oferta'
    }

    if (badgeCalculado) {
      badgeCalculado = formatearBadgeTexto(badgeCalculado, d.name || d.nombre, esPromo, esOferta)
    }

    return {
      id: dishId,
      nombre: (d.name || d.nombre || 'Platillo').toUpperCase(),
      descripcion: d.description || d.descripcion || '',
      categoria: catId,
      categoriaNombre: categoriaNombre || '',
      precio: typeof d.price === 'number' ? d.price : (typeof d.precio === 'number' ? d.precio : parseFloat(d.price || d.precio) || 0),
      precioOriginal: d.original_price ? parseFloat(d.original_price) : (d.precioOriginal ? parseFloat(d.precioOriginal) : null),
      imagen: d.image_url || d.image || d.imagen || '/promo_shrimp.png',
      disponible: d.is_available ?? d.available ?? d.disponible ?? true,
      stock: d.stock !== undefined ? d.stock : (d.inventory_count !== undefined ? d.inventory_count : null),
      badge: badgeCalculado,
      destacado: d.destacado,
      totalPedidos,
      esMasVendido,
      promocion: Boolean(d.promocion || d.is_promo || d.es_promo || d.en_promo || d.en_promocion || promoVinculada),
      ofertaEspecial: Boolean(d.oferta_especial || d.ofertaEspecial || d.is_offer || d.is_oferta || d.en_oferta || (d.precioOriginal && d.precioOriginal > d.precio)),
      ingredientes: Array.isArray(d.ingredients) ? d.ingredients : (Array.isArray(d.ingredientes) ? d.ingredientes : (typeof d.ingredients === 'string' ? d.ingredients.split(',').map(s => s.trim()) : [])),
      extras: Array.isArray(d.extras) 
        ? d.extras 
        : (Array.isArray(d.dish_extras) 
            ? d.dish_extras 
            : (Array.isArray(d.available_extras) 
                ? d.available_extras 
                : (typeof d.extras === 'string' && d.extras.startsWith('[')
                    ? (() => { try { return JSON.parse(d.extras) } catch(e) { return [] } })()
                    : []))),
      allow_extras: Boolean(d.allow_extras ?? d.allowExtras ?? (Array.isArray(d.extras) && d.extras.length > 0)),
      restricciones: Array.isArray(d.restricciones) ? d.restricciones : [],
      allow_spice_level: Boolean(d.allow_spice_level ?? d.allowSpiceLevel ?? false)
    }
  })

  // Helper para verificar si un platillo tiene una oferta asignada
  const esPlatilloOferta = (d) => {
    const catLow = String(d.categoriaNombre || d.categoria || '').toLowerCase()
    if (catLow === 'ofertas' || catLow === 'oferta' || catLow.includes('oferta')) return true
    if (d.ofertaEspecial || d.oferta_especial || d.is_offer || d.is_oferta || d.en_oferta) return true
    if (d.precioOriginal && Number(d.precioOriginal) > Number(d.precio)) return true
    if (d.original_price && Number(d.original_price) > Number(d.price || d.precio)) return true
    if (d.badge && String(d.badge).toLowerCase().includes('oferta')) return true
    if (d.descuento && Number(d.descuento) > 0) return true
    if (d.discount && Number(d.discount) > 0) return true

    const promoVinculada = promociones.find(pr => estaPromoVinculada(pr, d.id))
    if (promoVinculada) {
      const nom = String(promoVinculada.nombre || promoVinculada.name || '').toLowerCase()
      const ben = String(promoVinculada.beneficio || promoVinculada.benefit || promoVinculada.detail || '').toLowerCase()
      const tipo = String(promoVinculada.type || promoVinculada.tipo || '').toLowerCase()
      if (nom.includes('oferta') || ben.includes('oferta') || tipo === 'fixed' || promoVinculada.tipo_descuento || promoVinculada.descuento) {
        return true
      }
    }
    return false
  }

  // Helper para verificar si un platillo tiene una promoción asignada
  const esPlatilloPromo = (d) => {
    const catLow = String(d.categoriaNombre || d.categoria || '').toLowerCase()
    if (catLow === 'promo' || catLow === 'promos' || catLow === 'promocion' || catLow === 'promociones' || catLow.includes('promo')) return true
    if (d.promocion || d.is_promo || d.es_promo || d.en_promo || d.en_promocion) return true
    if (d.badge && (String(d.badge).toLowerCase().includes('promo') || String(d.badge).toLowerCase().includes('2x1'))) return true

    const promoVinculada = promociones.find(pr => estaPromoVinculada(pr, d.id))
    if (promoVinculada) return true
    return false
  }

  // Platillos asignados a Ofertas y Promo
  const platillosOfertas = platillosNorm.filter(esPlatilloOferta)
  const platillosPromo = platillosNorm.filter(esPlatilloPromo)

  // Categorías fijas de Promo y Ofertas siempre visibles con su conteo dinámico (sin emojis)
  const categoriasEspeciales = [
    {
      id: 'promo',
      nombre: 'Promo',
      total: platillosPromo.length
    },
    {
      id: 'ofertas',
      nombre: 'Ofertas',
      total: platillosOfertas.length
    }
  ]

  // Normalizar categorías para el sidebar y mobile tabs con conteo dinámico
  const categoriasNorm = [
    { id: 'todos', nombre: 'Todos', total: platillosNorm.length },
    ...categoriasEspeciales,
    ...categorias
      .filter(c => {
        const n = (c.name || c.nombre || '').toLowerCase()
        if (n === 'ofertas' || n === 'oferta') return false
        if (n === 'promo' || n === 'promos' || n === 'promociones' || n === 'promocion') return false
        return true
      })
      .map(c => {
        const catId = String(c.id ?? c._id ?? c.slug ?? c.nombre)
        const count = platillosNorm.filter(p => String(p.categoria).toLowerCase() === catId.toLowerCase() || String(p.categoria) === String(c.id)).length
        return {
          id: catId,
          nombre: c.name || c.nombre || 'Categoría',
          total: count
        }
      })
  ]

  // CÁLCULO DINÁMICO E INTELIGENTE DE RANGOS DE PRECIO (ADAPTABLE A CUALQUIER MENÚ)
  // Analiza todos los precios del catálogo (platillos, bebidas, postres, etc.)
  // y genera automáticamente 4 tramos comerciales coherentes con los precios reales del restaurante.
  const rangosPreciosDinamicos = useMemo(() => {
    // 1. Extraer todos los precios válidos de TODOS los productos del menú
    const preciosValidos = platillosNorm
      .map(p => Number(p.precio))
      .filter(p => !isNaN(p) && p > 0)

    // FALLBACK DE SEGURIDAD 1: Si no hay platillos o precios aún en el menú
    if (preciosValidos.length === 0) {
      return [
        { id: 'r1', label: 'Hasta $100',     desc: 'Económicos',              fn: (p) => p <= 100 },
        { id: 'r2', label: 'De $100 a $200', desc: 'Populares',               fn: (p) => p > 100 && p <= 200 },
        { id: 'r3', label: 'De $200 a $400', desc: 'Platillos fuertes',       fn: (p) => p > 200 && p <= 400 },
        { id: 'r4', label: 'Más de $400',    desc: 'Cortes y especialidades', fn: (p) => p > 400 },
      ]
    }

    const min = Math.min(...preciosValidos)
    const max = Math.max(...preciosValidos)
    const rangoTotal = max - min

    // VALIDACIÓN CASO EXTREMO 1: Si todos los precios son iguales o la variación es mínima (< $25 MXN)
    // (Ej. Cafetería, buffet o pizzería donde casi todo vale lo mismo)
    if (rangoTotal < 25) {
      const mitad = Math.round((min + max) / 2)
      return [
        { id: 'r1', label: `Hasta $${mitad}`, desc: 'Menor precio', fn: (p) => p <= mitad },
        { id: 'r2', label: `Más de $${mitad}`, desc: 'Mayor precio', fn: (p) => p > mitad },
      ]
    }

    // Helper de redondeo a números comerciales atractivos y cerrados ($5, $10, $25, $50)
    const redondear = (val) => {
      if (val < 50) return Math.max(10, Math.ceil(val / 5) * 5)
      if (val < 200) return Math.ceil(val / 10) * 10
      if (val < 600) return Math.ceil(val / 25) * 25
      return Math.ceil(val / 50) * 50
    }

    // Ordenar para percentiles reales
    const ordenados = [...preciosValidos].sort((a, b) => a - b)
    const total = ordenados.length

    // Cortes por percentiles (25%, 50%, 75%) para asegurar que todos los tramos tengan opciones
    let c1 = redondear(ordenados[Math.floor(total * 0.25)] || (min + rangoTotal * 0.25))
    let c2 = redondear(ordenados[Math.floor(total * 0.50)] || (min + rangoTotal * 0.50))
    let c3 = redondear(ordenados[Math.floor(total * 0.75)] || (min + rangoTotal * 0.75))

    // Validar que c1 < c2 < c3 estrictamente para que ningún tramo quede solapado
    const pasoMin = Math.max(10, Math.floor(rangoTotal / 6))
    if (c1 <= min) c1 = redondear(min + pasoMin)
    if (c2 <= c1) c2 = redondear(c1 + pasoMin)
    if (c3 <= c2) c3 = redondear(c2 + pasoMin)
    if (c3 >= max) c3 = Math.max(c2 + 10, redondear(max - pasoMin))
    if (c2 >= c3) c2 = Math.round(c1 + (c3 - c1) / 2)

    return [
      {
        id: 'r1',
        label: `Hasta $${c1}`,
        desc: 'Económicos',
        fn: (p) => p <= c1
      },
      {
        id: 'r2',
        label: `De $${c1} a $${c2}`,
        desc: 'Populares',
        fn: (p) => p > c1 && p <= c2
      },
      {
        id: 'r3',
        label: `De $${c2} a $${c3}`,
        desc: 'Platillos fuertes',
        fn: (p) => p > c2 && p <= c3
      },
      {
        id: 'r4',
        label: `Más de $${c3}`,
        desc: 'Cortes y especialidades',
        fn: (p) => p > c3
      }
    ]
  }, [platillosNorm])

  // Modal de Personalización / Detalle
  const [modalDetalle, setModalDetalle] = useState(null)
  const [editingCartId, setEditingCartId] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [modalDetalleCantidad, setModalDetalleCantidad] = useState(1)
  const [modalDetalleExtras, setModalDetalleExtras] = useState([])
  const [modalDetalleIngredientesQuitados, setModalDetalleIngredientesQuitados] = useState([])
  const [modalDetallePicante, setModalDetallePicante] = useState('Sin picante')
  const [modalDetalleNota, setModalDetalleNota] = useState('')

  // Formulario de Checkout
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteCalle, setClienteCalle] = useState('')
  const [clienteNumExt, setClienteNumExt] = useState('')
  const [clienteNumInt, setClienteNumInt] = useState('')
  const [clienteCP, setClienteCP] = useState('')
  const [clienteColonia, setClienteColonia] = useState('')
  const [clienteReferencias, setClienteReferencias] = useState('')
  const [notaGeneral, setNotaGeneral] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [telefonoClienteConfirmado, setTelefonoClienteConfirmado] = useState('')
  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const [erroresFormulario, setErroresFormulario] = useState({})

  // Validación estricta en tiempo real de campos del formulario
  const validarCampo = (name, value) => {
    let errorMsj = ''
    const val = typeof value === 'string' ? value : ''

    if (name === 'nombre') {
      if (!val.trim()) {
        errorMsj = 'El nombre completo es obligatorio.'
      } else if (!VALIDACIONES.nombre.regex.test(val.trim())) {
        errorMsj = VALIDACIONES.nombre.mensaje
      }
    } else if (name === 'telefono') {
      if (!val.trim()) {
        errorMsj = 'El teléfono es obligatorio.'
      } else if (!VALIDACIONES.telefono.regex.test(val.trim())) {
        errorMsj = VALIDACIONES.telefono.mensaje
      }
    } else if (name === 'cp') {
      if (tipoPedido === 'delivery') {
        if (!val.trim()) {
          errorMsj = 'El código postal es obligatorio.'
        } else if (!VALIDACIONES.cp.regex.test(val.trim())) {
          errorMsj = VALIDACIONES.cp.mensaje
        }
      }
    } else if (name === 'calle') {
      if (tipoPedido === 'delivery') {
        if (!val.trim()) {
          errorMsj = 'La calle es obligatoria.'
        } else if (!VALIDACIONES.textoSeguro.regex.test(val.trim())) {
          errorMsj = VALIDACIONES.textoSeguro.mensaje
        }
      }
    } else if (name === 'no_exterior') {
      if (tipoPedido === 'delivery') {
        if (!val.trim()) {
          errorMsj = 'El número exterior es obligatorio.'
        } else if (!/^[a-zA-Z0-9\s.,#-]{1,20}$/.test(val.trim())) {
          errorMsj = VALIDACIONES.textoSeguro.mensaje
        }
      }
    } else if (name === 'no_interior') {
      if (val.trim() && !/^[a-zA-Z0-9\s.,#-]{1,20}$/.test(val.trim())) {
        errorMsj = VALIDACIONES.textoSeguro.mensaje
      }
    } else if (name === 'colonia') {
      if (tipoPedido === 'delivery') {
        if (!val.trim()) {
          errorMsj = 'La colonia es obligatoria.'
        } else if (!VALIDACIONES.textoSeguro.regex.test(val.trim())) {
          errorMsj = VALIDACIONES.textoSeguro.mensaje
        }
      }
    } else if (name === 'referencias') {
      if (tipoPedido === 'delivery') {
        if (!val.trim()) {
          errorMsj = 'Las referencias de entrega son obligatorias.'
        } else if (!VALIDACIONES.textoSeguro.regex.test(val.trim())) {
          errorMsj = VALIDACIONES.textoSeguro.mensaje
        }
      } else if (val.trim() && !VALIDACIONES.textoSeguro.regex.test(val.trim())) {
        errorMsj = VALIDACIONES.textoSeguro.mensaje
      }
    } else if (name === 'nota_especial') {
      if (val.trim() && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#-]{1,250}$/.test(val.trim())) {
        errorMsj = VALIDACIONES.textoSeguro.mensaje
      }
    }

    setErroresFormulario(prev => {
      if (!errorMsj) {
        const { [name]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [name]: errorMsj }
    })

    return errorMsj
  }

  // Estado calculado de validez del formulario para deshabilitar el botón de envío
  const formularioInvalido = useMemo(() => {
    const hayErrores = Object.values(erroresFormulario).some(Boolean)
    if (hayErrores) return true

    if (!metodoPago) return true

    const nombreValido = clienteNombre.trim().length >= 3 && VALIDACIONES.nombre.regex.test(clienteNombre.trim())
    const telValido = clienteTelefono.trim().length === 10 && VALIDACIONES.telefono.regex.test(clienteTelefono.trim())

    if (!nombreValido || !telValido) return true

    if (tipoPedido === 'delivery') {
      const calleValida = clienteCalle.trim().length >= 2 && VALIDACIONES.textoSeguro.regex.test(clienteCalle.trim())
      const numExtValido = clienteNumExt.trim().length >= 1 && /^[a-zA-Z0-9\s.,#-]{1,20}$/.test(clienteNumExt.trim())
      const cpValido = clienteCP.trim().length === 5 && VALIDACIONES.cp.regex.test(clienteCP.trim())
      const colValida = clienteColonia.trim().length >= 2 && VALIDACIONES.textoSeguro.regex.test(clienteColonia.trim())
      const refValida = clienteReferencias.trim().length >= 2 && VALIDACIONES.textoSeguro.regex.test(clienteReferencias.trim())

      if (!calleValida || !numExtValido || !cpValido || !colValida || !refValida) {
        return true
      }
    }

    return false
  }, [tipoPedido, clienteNombre, clienteTelefono, clienteCalle, clienteNumExt, clienteCP, clienteColonia, clienteReferencias, erroresFormulario, metodoPago])

  // Toast Notificación
  const mostrarToast = (mensaje) => {
    setNotificacionToast(mensaje)
    setTimeout(() => {
      setNotificacionToast(null)
    }, 2500)
  }

  // Abrir Modal de Personalización
  const abrirDetallePlatillo = (platillo, itemCartParaEditar = null) => {
    const isAvailable = platillo.disponible !== false && platillo.is_available !== false && (platillo.stock === undefined || platillo.stock === null || platillo.stock > 0)
    if (!isAvailable) return

    setModalDetalle(platillo)
    setActiveImageIndex(0)

    if (itemCartParaEditar) {
      setEditingCartId(itemCartParaEditar.cartId)
      setModalDetalleCantidad(itemCartParaEditar.cantidad)
      setModalDetalleExtras(itemCartParaEditar.extras || [])
      setModalDetalleIngredientesQuitados(itemCartParaEditar.ingredientesQuitados || [])
      setModalDetallePicante(itemCartParaEditar.nivelPicante || (platillo.allow_spice_level ? 'Sin picante' : null))
      setModalDetalleNota(itemCartParaEditar.nota || '')
    } else {
      setEditingCartId(null)
      setModalDetalleCantidad(1)
      setModalDetalleExtras([])
      setModalDetalleIngredientesQuitados([])
      setModalDetallePicante(
        platillo.allow_spice_level ? 'Sin picante' : null
      )
      setModalDetalleNota('')
    }
  }

  // Agregar rápido al pedido desde la tarjeta
  const agregarRapidoAlPedido = (platillo) => {
    const isAvailable = platillo.disponible !== false && platillo.is_available !== false && (platillo.stock === undefined || platillo.stock === null || platillo.stock > 0)
    if (!isAvailable) return

    const itemGuardado = {
      cartId: Date.now() + Math.random(),
      id: platillo.id,
      nombre: platillo.nombre,
      precioBase: platillo.precio,
      precio: platillo.precio,
      imagen: platillo.imagen,
      extras: [],
      nivelPicante: platillo.allow_spice_level ? 'Medio 🌶️' : null,
      nota: '',
      cantidad: 1,
    }
    setCarrito(prev => [...prev, itemGuardado])
    mostrarToast(`✓ ¡${platillo.nombre} agregado al pedido!`)
  }

  // URL query handler para categoría o platillo específico
  useEffect(() => {
    const catQuery = searchParams.get('categoria')
    if (catQuery) {
      setCategoriaActiva(catQuery.toLowerCase())
    }
  }, [searchParams])


  // Recepción de Hash (#platillo-ID) y Auto-Scroll suave a la tarjeta exacta
  useEffect(() => {
    const hashVal = location.hash || window.location.hash
    const queryPlatillo = searchParams.get('platillo')

    let targetId = null
    let rawDishId = null

    if (hashVal) {
      targetId = hashVal.replace(/^#/, '')
      const match = targetId.match(/^platillo-(.+)$/)
      rawDishId = match ? match[1] : targetId
    } else if (queryPlatillo) {
      targetId = `platillo-${queryPlatillo}`
      rawDishId = String(queryPlatillo)
    }

    if (!targetId || !rawDishId) return
    if (cargando || platillosNorm.length === 0) return

    // Localizar platillo en el catálogo
    const platillo = platillosNorm.find(p => String(p.id) === String(rawDishId))
    if (!platillo) return

    // Asegurar que esté visible en pantalla quitando filtros si estuviera oculto
    if (categoriaActiva !== 'todos' && String(platillo.categoria) !== String(categoriaActiva)) {
      setCategoriaActiva('todos')
    }
    if (busqueda) {
      setBusqueda('')
    }

    // Scroll suave con reintentos para asegurar renderizado completo en el DOM
    let intentos = 0
    const maxIntentos = 8
    let timerHighlight = null

    const ejecutarScroll = () => {
      const elemento = document.getElementById(targetId) || document.getElementById(`platillo-${rawDishId}`)
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setPlatilloHighlight(platillo.id)

        timerHighlight = setTimeout(() => {
          setPlatilloHighlight(null)
        }, 3500)
      } else if (intentos < maxIntentos) {
        intentos++
        setTimeout(ejecutarScroll, 120)
      }
    }

    const timer = setTimeout(ejecutarScroll, 150)
    return () => {
      clearTimeout(timer)
      if (timerHighlight) clearTimeout(timerHighlight)
    }
  }, [location.hash, searchParams, cargando, platillosNorm.length])

  // Toggle extra en modal
  const toggleModalDetalleExtra = (extra) => {
    setModalDetalleExtras((prev) => {
      const extraId = extra.id ?? extra
      const exists = prev.some((e) => (e.id ?? e) === extraId)
      return exists
        ? prev.filter((e) => (e.id ?? e) !== extraId)
        : [...prev, extra]
    })
  }

  // Toggle ingrediente quitado en modal
  const toggleModalDetalleIngredienteQuitado = (ingNombre) => {
    setModalDetalleIngredientesQuitados((prev) => {
      const exists = prev.includes(ingNombre)
      return exists ? prev.filter((i) => i !== ingNombre) : [...prev, ingNombre]
    })
  }

  // Confirmar y agregar al carrito
  const agregarDesdeModalDetalle = () => {
    if (!modalDetalle) return

    const extrasPrecio = modalDetalleExtras.reduce((sum, extra) => {
      const p = typeof extra === 'object' 
        ? (extra.price !== undefined ? (parseFloat(extra.price) || 0) : (extra.precio !== undefined ? (parseFloat(extra.precio) || 0) : 0))
        : (typeof extra === 'string' && extra.match(/\+\$?(\d+(\.\d+)?)/) ? (parseFloat(extra.match(/\+\$?(\d+(\.\d+)?)/)[1]) || 0) : 0)
      return sum + p
    }, 0)
    const precioConExtras = modalDetalle.precio + extrasPrecio

    const itemGuardado = {
      cartId: editingCartId || (Date.now() + Math.random()),
      id: modalDetalle.id,
      nombre: modalDetalle.nombre,
      precioBase: modalDetalle.precio,
      precio: precioConExtras,
      imagen: modalDetalle.imagen,
      extras: modalDetalleExtras,
      ingredientesQuitados: modalDetalleIngredientesQuitados,
      nivelPicante: modalDetalle.allow_spice_level ? modalDetallePicante : null,
      nota: modalDetalleNota.trim(),
      cantidad: modalDetalleCantidad,
    }

    if (editingCartId) {
      setCarrito(prev => prev.map(item => item.cartId === editingCartId ? itemGuardado : item))
      mostrarToast(`✓ Personalización actualizada`)
    } else {
      setCarrito(prev => [...prev, itemGuardado])
      mostrarToast(`✓ ¡${modalDetalle.nombre} agregado a tu pedido!`)
    }

    setModalDetalle(null)
    setEditingCartId(null)
  }

  // Modificar cantidad en carrito
  const ajustarCantidad = (index, delta) => {
    setCarrito(prev => {
      const copy = [...prev]
      const item = copy[index]
      if (!item) return prev
      const nuevaCant = item.cantidad + delta
      if (nuevaCant <= 0) {
        copy.splice(index, 1)
      } else {
        copy[index] = { ...item, cantidad: nuevaCant }
      }
      return copy
    })
  }

  // Eliminar producto individual
  const eliminarDelCarrito = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index))
    mostrarToast('Producto eliminado del pedido')
  }

  // Vaciar carrito
  const limpiarCarrito = () => {
    setCarrito([])
    localStorage.removeItem('aurum_cart_v1')
    setClienteNombre('')
    setClienteTelefono('')
    setClienteCalle('')
    setClienteNumExt('')
    setClienteNumInt('')
    setClienteCP('')
    setClienteColonia('')
    setClienteReferencias('')
    setNotaGeneral('')
  }

  // Helper filtros
  const tieneProductosCumplen = (filterId) => {
    return platillosNorm.some(p => {
      if (filterId === 'mas_pedido') return p.esMasVendido || p.badge?.includes('Más pedido') || p.destacado
      if (filterId === 'chef') return p.badge?.includes('Chef') || p.badge?.includes('Popular') || p.badge?.includes('Especialidad')
      if (filterId === 'nuevo') return p.badge?.includes('Nuevo')
      if (filterId === 'promocion') return p.promocion || p.badge?.includes('Promoción') || p.badge?.includes('2x1')
      if (filterId === 'oferta_especial') return p.ofertaEspecial || p.badge?.includes('Oferta') || p.badge?.includes('Chef')
      if (filterId === 'favorito') return p.destacado || p.badge?.includes('Favorito')
      if (filterId === 'disponible') return p.disponible && (p.stock === null || p.stock === undefined || p.stock > 0)
      if (filterId === 'rapido') return parseInt(p.tiempoPrep || '30') <= 20
      return false
    })
  }

  const toggleFiltro = (id) => {
    setFiltrosActivos(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const toggleRestriccion = (id) => {
    setRestriccionesActivas(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const limpiarFiltros = () => {
    setFiltroPrecio(null)
    setPrecioMin('')
    setPrecioMax('')
    setRestriccionesActivas([])
    setFiltrosActivos([])
  }

  // 1. Filtrado Base (Búsqueda, Filtros destacados, Precios y Restricciones) sin aislar todavía por categoría seleccionada
  const platillosFiltradosBase = useMemo(() => {
    return platillosNorm.filter((platillo) => {
      if (busqueda) {
        const q = busqueda.toLowerCase().trim()
        const matchNombre = platillo.nombre?.toLowerCase().includes(q)
        const matchDesc = platillo.descripcion?.toLowerCase().includes(q)
        const matchIng = platillo.ingredientes?.some(i => i.toLowerCase().includes(q))
        if (!matchNombre && !matchDesc && !matchIng) return false
      }

      // Filtros Destacados (Promociones & Ofertas Especiales)
      if (filtrosActivos.includes('promocion') && !platillo.promocion && !platillo.badge?.includes('Promoción') && !platillo.badge?.includes('2x1')) {
        return false
      }
      if (filtrosActivos.includes('oferta_especial') && !platillo.ofertaEspecial && !platillo.badge?.includes('Oferta') && !platillo.badge?.includes('Chef')) {
        return false
      }

      // Otros filtros
      if (filtrosActivos.includes('mas_pedido') && !platillo.esMasVendido && !platillo.badge?.includes('Más pedido') && !platillo.destacado) return false
      if (filtrosActivos.includes('chef') && !platillo.badge?.includes('Chef') && !platillo.badge?.includes('Popular') && !platillo.badge?.includes('Especialidad')) return false
      if (filtrosActivos.includes('nuevo') && !platillo.badge?.includes('Nuevo')) return false
      if (filtrosActivos.includes('favorito') && !platillo.badge?.includes('Favorito') && !platillo.destacado) return false
      if (filtrosActivos.includes('disponible') && (!platillo.disponible || platillo.stock === 0)) return false
      if (filtrosActivos.includes('rapido')) {
        const mins = parseInt(platillo.tiempoPrep || '30')
        if (mins > 20) return false
      }

      if (filtroPrecio) {
        const rangoDin = rangosPreciosDinamicos.find(r => r.id === filtroPrecio)
        if (rangoDin) {
          if (!rangoDin.fn(platillo.precio)) return false
        } else if (rangosPrecios[filtroPrecio]) {
          if (!rangosPrecios[filtroPrecio](platillo.precio)) return false
        }
      }
      if (precioMin !== '' && !isNaN(parseFloat(precioMin))) {
        if (platillo.precio < parseFloat(precioMin)) return false
      }
      if (precioMax !== '' && !isNaN(parseFloat(precioMax))) {
        if (platillo.precio > parseFloat(precioMax)) return false
      }

      if (restriccionesActivas.length > 0) {
        const tieneTodas = restriccionesActivas.every((r) =>
          platillo.restricciones && platillo.restricciones.includes(r)
        )
        if (!tieneTodas) return false
      }

      return true
    })
  }, [platillosNorm, busqueda, filtrosActivos, filtroPrecio, rangosPreciosDinamicos, precioMin, precioMax, restriccionesActivas])

  // Helper para ordenar por volumen de ventas y destacados
  const ordenarPorVentas = (lista) => {
    return [...lista].sort((a, b) => {
      const ventasA = Number(a.totalPedidos ?? a.total_pedidos ?? 0)
      const ventasB = Number(b.totalPedidos ?? b.total_pedidos ?? 0)
      if (ventasB !== ventasA) {
        return ventasB - ventasA // Orden descendente: mayor a menor ventas
      }
      if (b.destacado && !a.destacado) return 1
      if (a.destacado && !b.destacado) return -1
      return 0
    })
  }

  // Condición de visualización en filas de carrusel por categoría:
  // Se muestra carrusel únicamente cuando categoría es 'todos' y el buscador no tiene texto escrito
  const modoCarruselCategorias = categoriaActiva === 'todos' && !busqueda.trim()

  // Agrupamiento por categorías para carruseles horizontales
  const gruposCategorias = useMemo(() => {
    if (!modoCarruselCategorias) return []
    const grupos = []

    // 1. Fila de Promociones (si hay y cumplen filtros)
    const catPromoObj = categoriasNorm.find(c => c.id === 'promo')
    const itemsPromo = ordenarPorVentas(platillosFiltradosBase.filter(esPlatilloPromo))
    if (itemsPromo.length > 0) {
      grupos.push({
        categoria: { id: 'promo', nombre: catPromoObj?.nombre || 'Promo' },
        platillos: itemsPromo
      })
    }

    // 2. Fila de Ofertas (si hay y cumplen filtros)
    const catOfertasObj = categoriasNorm.find(c => c.id === 'ofertas')
    const itemsOfertas = ordenarPorVentas(platillosFiltradosBase.filter(esPlatilloOferta))
    if (itemsOfertas.length > 0) {
      grupos.push({
        categoria: { id: 'ofertas', nombre: catOfertasObj?.nombre || 'Ofertas' },
        platillos: itemsOfertas
      })
    }

    // 3. Categorías regulares del menú
    categoriasNorm
      .filter(c => c.id !== 'todos' && c.id !== 'promo' && c.id !== 'ofertas')
      .forEach(cat => {
        const catId = String(cat.id).toLowerCase()
        const catNom = String(cat.nombre || '').toLowerCase()

        const itemsCat = platillosFiltradosBase.filter(p => {
          const pCat = String(p.categoria || '').toLowerCase()
          const pCatNom = String(p.categoriaNombre || '').toLowerCase()
          return pCat === catId || pCatNom === catId || (catNom && (pCatNom === catNom || pCat === catNom))
        })

        if (itemsCat.length > 0) {
          grupos.push({
            categoria: cat,
            platillos: ordenarPorVentas(itemsCat)
          })
        }
      })

    return grupos
  }, [modoCarruselCategorias, platillosFiltradosBase, categoriasNorm])

  // Platillos para vista Grid (cuando hay búsqueda o categoría individual seleccionada)
  const platillosFiltrados = useMemo(() => {
    if (categoriaActiva === 'todos') {
      return ordenarPorVentas(platillosFiltradosBase)
    }
    if (categoriaActiva === 'ofertas') {
      return platillosFiltradosBase.filter(esPlatilloOferta)
    }
    if (categoriaActiva === 'promo' || categoriaActiva === 'promocion' || categoriaActiva === 'promociones') {
      return platillosFiltradosBase.filter(esPlatilloPromo)
    }

    const actCat = String(categoriaActiva).toLowerCase()
    const catObj = categoriasNorm.find(c => String(c.id).toLowerCase() === actCat)
    const cNom = String(catObj?.nombre || '').toLowerCase()

    return platillosFiltradosBase.filter(p => {
      const pCat = String(p.categoria || '').toLowerCase()
      const pCatNom = String(p.categoriaNombre || '').toLowerCase()
      return pCat === actCat || pCatNom === actCat || (cNom && pCatNom === cNom)
    })
  }, [categoriaActiva, platillosFiltradosBase, categoriasNorm])

  const platillosAMostrar = platillosFiltrados

  // Totales
  const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const costoEnvio = tipoPedido === 'delivery' ? (subtotal >= 500 ? 0 : 50) : 0
  const total = subtotal + costoEnvio
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0)
  const totalFiltrosActivos = (filtroPrecio ? 1 : 0) + 
    ((precioMin !== '' || precioMax !== '') ? 1 : 0) + 
    restriccionesActivas.length + 
    filtrosActivos.length

  // Submit Order con Validación Estricta de Promesa (Status 200/201)
  // Submit Order con Validación Estricta de Promesa (Status 200/201)
  const confirmarPedido = async () => {
    // 1. Ejecutar validación completa de todos los campos según la modalidad
    const errNombre = validarCampo('nombre', clienteNombre)
    const errTel = validarCampo('telefono', clienteTelefono)
    let hayErrores = Boolean(errNombre || errTel)

    if (tipoPedido === 'delivery') {
      const errCalle = validarCampo('calle', clienteCalle)
      const errExt = validarCampo('no_exterior', clienteNumExt)
      const errCP = validarCampo('cp', clienteCP)
      const errCol = validarCampo('colonia', clienteColonia)
      const errRef = validarCampo('referencias', clienteReferencias)
      if (errCalle || errExt || errCP || errCol || errRef) {
        hayErrores = true
      }
    }

    if (hayErrores || formularioInvalido) {
      mostrarToast('⚠️ Por favor completa correctamente los campos obligatorios.')
      return
    }

    if (carrito.length === 0) {
      mostrarToast('⚠️ Tu carrito está vacío')
      return
    }

    setEnviandoPedido(true)

    const direccionCompleta = tipoPedido === 'delivery'
      ? `Calle ${clienteCalle.trim()} #${clienteNumExt.trim()}${clienteNumInt.trim() ? ' Int. ' + clienteNumInt.trim() : ''}, Col. ${clienteColonia.trim()}, C.P. ${clienteCP.trim()}`
      : 'Recoger en Sucursal / Comedor'

    try {
      const payload = {
        order_type: tipoPedido,
        modality: tipoPedido,
        // Compatibilidad total con StoreCustomerOrderRequest y procesador
        nombre_completo: clienteNombre.trim(),
        customer_name: clienteNombre.trim(),
        telefono: clienteTelefono.trim(),
        customer_phone: clienteTelefono.trim(),
        customer_address: direccionCompleta,
        calle: clienteCalle.trim(),
        no_exterior: clienteNumExt.trim(),
        num_ext: clienteNumExt.trim(),
        no_interior: clienteNumInt.trim() || undefined,
        num_int: clienteNumInt.trim() || undefined,
        codigo_postal: clienteCP.trim(),
        cp: clienteCP.trim(),
        colonia: clienteColonia.trim(),
        referencias: clienteReferencias.trim() || undefined,
        nota_especial: notaGeneral.trim() || undefined,
        payment_method: metodoPago,
        notes: [
          clienteReferencias ? `Ref: ${clienteReferencias.trim()}` : '',
          notaGeneral ? `Nota gral: ${notaGeneral.trim()}` : ''
        ].filter(Boolean).join(' | '),
        subtotal,
        delivery_fee: costoEnvio,
        total,
        items: carrito.map(item => ({
          dish_id: item.id,
          id: item.id,
          quantity: item.cantidad,
          price: item.precioBase || item.precio,
          notes: [
            item.nivelPicante && item.nivelPicante !== 'Sin picante' ? `Picante: ${item.nivelPicante}` : '',
            item.ingredientesQuitados && item.ingredientesQuitados.length > 0 ? `Sin: ${item.ingredientesQuitados.join(', ')}` : '',
            item.nota ? item.nota : ''
          ].filter(Boolean).join(' | '),
          extras: (item.extras || []).map(extra => ({
            id: typeof extra === 'object' ? extra.id : extra,
            extra_id: typeof extra === 'object' ? extra.id : extra,
            price: typeof extra === 'object' ? (extra.price || extra.precio || 0) : 0
          }))
        }))
      }

      const publicReqConfig = {
        skipAuth: true,
        headers: { Authorization: undefined }
      }

      const res = await client.post('/orders/online', payload, publicReqConfig)
        .catch(() => client.post('/orders', payload, publicReqConfig))

      if (res && (res.status === 200 || res.status === 201)) {
        const createdOrder = res.data?.data || res.data
        const folioNum = createdOrder?.folio || createdOrder?.daily_number || createdOrder?.id || (Math.floor(Math.random() * 9000) + 1000)
        setNumeroPedido(folioNum)
        setTelefonoClienteConfirmado(clienteTelefono)
        setMostrarCheckout(false)
        setPedidoConfirmado(true)
        // Limpieza del carrito y persistencia ÚNICAMENTE con status 200/201
        limpiarCarrito()
        mostrarToast('✓ ¡Pedido enviado con éxito a cocina!')
        // Sincronizar actualización silenciosa de ventas en catálogo
        setRefreshKey(prev => prev + 1)
      } else {
        throw new Error(`El servidor respondió con código inesperado: ${res?.status}`)
      }
    } catch (err) {
      console.error('Error al procesar el pedido:', err)
      const apiErrors = err.response?.data?.errors
      if (apiErrors && typeof apiErrors === 'object') {
        const firstApiError = Object.values(apiErrors).flat()[0]
        mostrarToast(`⚠️ ${firstApiError}`)
        const nuevosErrores = {}
        if (apiErrors.nombre_completo) nuevosErrores.nombre = apiErrors.nombre_completo[0]
        if (apiErrors.telefono) nuevosErrores.telefono = apiErrors.telefono[0]
        if (apiErrors.calle) nuevosErrores.calle = apiErrors.calle[0]
        if (apiErrors.no_exterior) nuevosErrores.no_exterior = apiErrors.no_exterior[0]
        if (apiErrors.codigo_postal) nuevosErrores.cp = apiErrors.codigo_postal[0]
        if (apiErrors.colonia) nuevosErrores.colonia = apiErrors.colonia[0]
        if (apiErrors.referencias) nuevosErrores.referencias = apiErrors.referencias[0]
        setErroresFormulario(prev => ({ ...prev, ...nuevosErrores }))
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Hubo un error al procesar tu pedido. Por favor intenta de nuevo.'
        mostrarToast(`⚠️ ${errorMsg}`)
      }
    } finally {
      setEnviandoPedido(false)
    }
  }

  const restName = settingsData?.restaurant_name || settingsData?.business_name || settingsData?.nombre || themeRestName || 'Restaurante'
  const restLogo = settingsData?.logo_url || settingsData?.logoUrl || settingsData?.logo || settingsData?.logotipo || themeLogoUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('rest_logo') : null) || ''

  return (
    <div style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }} className="h-screen max-h-screen w-full max-w-[100vw] flex flex-col font-sans select-none overflow-hidden overflow-x-hidden text-theme-text transition-colors duration-300">

      {/* TOAST NOTIFICACIÓN */}
      <AnimatePresence>
        {notificacionToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 border text-theme-text px-5 py-2.5 rounded-full shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--theme-primary)] animate-pulse" />
            <span>{notificacionToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CABECERA PRINCIPAL CON TÍTULO, ACCIONES SUPERIORES (PEDIDO / VOLVER) Y BUSCADOR — COLOR PRIMARIO */}
      <header 
        style={{ 
          backgroundColor: 'var(--theme-primary)', 
          color: 'var(--theme-primary-contrast, #ffffff)' 
        }} 
        className="flex-shrink-0 border-b border-black/10 py-3.5 sm:py-4 px-4 sm:px-8 md:px-10 lg:px-12 text-left shadow-md z-20 transition-colors duration-300"
      >
        <div className="w-full">
          {/* Marca / Título a la izquierda | Botones Pedido y Volver a la derecha */}
          <div className="flex items-center justify-between gap-3">
            {/* Identidad del Establecimiento y Título */}
            <div className="flex flex-col">
              <div className="hidden sm:flex items-center gap-2 mb-1">
                {restLogo ? (
                  <img
                    src={restLogo}
                    alt={'Logo ' + restName}
                    className="h-5 sm:h-6 w-auto object-contain shrink-0 rounded-md shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
                <span 
                  className="text-xs tracking-[0.3em] font-bold uppercase opacity-90 leading-none"
                  style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
                >
                  {restName}
                </span>
              </div>
              <h1 
                className="text-xl sm:text-3xl md:text-4xl font-bold font-serif leading-tight tracking-tight"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                Nuestro Menú
              </h1>
            </div>

            {/* Acciones Rápidas: Pedido + Volver (Sin contenedor, icono más grueso y badge en esquina superior) */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Botón PEDIDO */}
              <button
                type="button"
                onClick={() => setMostrarCarrito(true)}
                className="relative p-1.5 text-white hover:opacity-80 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                title="Ver mi pedido"
                aria-label="Ver mi pedido"
              >
                <ShoppingCart className="w-6 h-6 text-white" strokeWidth={2.4} />
                {totalArticulos > 0 && (
                  <span 
                    style={{ backgroundColor: '#ffffff', color: '#000000' }}
                    className="absolute -top-1 -right-1.5 text-[10px] font-black px-1.5 h-[18px] min-w-[18px] rounded-full flex items-center justify-center shadow-md select-none leading-none"
                  >
                    {totalArticulos}
                  </span>
                )}
              </button>

              {/* Botón VOLVER */}
              <Link
                to="/"
                className="p-1.5 text-white hover:opacity-80 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                title="Volver al inicio"
                aria-label="Volver al inicio"
              >
                <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.4} />
              </Link>
            </div>
          </div>


        </div>
      </header>

      {/* LAYOUT PRINCIPAL UNIFICADO: SIDEBAR + CATÁLOGO CONTINUO */}
      <div 
        style={{ backgroundColor: 'var(--theme-surface)' }}
        className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 w-full px-6 sm:px-8 md:px-10 lg:px-14 pb-0 gap-8 md:gap-10 lg:gap-12 pt-4 md:pt-6 bg-[var(--theme-surface)]"
      >

        {/* SIDEBAR DESKTOP (FIJO / SCROLL INTERNO: ESPACIOSO Y HOLGADO) */}
        <aside 
          style={{ backgroundColor: 'var(--theme-surface)' }}
          className="menu-sidebar w-64 lg:w-72 flex-shrink-0 h-full overflow-y-auto pr-6 lg:pr-8 pb-24 hidden md:block text-left scrollbar-thin border-r-[2px] border-[var(--theme-border-subtle)] bg-[var(--theme-surface)]"
        >
          <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] font-bold mb-3 uppercase">CATEGORÍAS</p>
          <ul className="space-y-1 mb-8">
            {categoriasNorm.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex justify-between items-center cursor-pointer ${
                    categoriaActiva === cat.id
                      ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border-l-2 border-[var(--theme-primary)] pl-2.5 font-bold'
                      : 'text-theme-text-muted hover:text-theme-text hover:bg-[var(--theme-bg)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.nombre}</span>
                  </span>
                  <span className="text-xs text-theme-text-muted/60">{cat.total}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] font-bold mb-3 uppercase">FILTRAR POR</p>
          <div className="space-y-2">
            {[
              { id: 'mas_pedido', label: '🔥 Más pedidos' },
              { id: 'chef',       label: '⭐ Especialidades' },
              { id: 'nuevo',      label: '✨ Nuevos' },
              { id: 'promocion',  label: '🏷️ Promociones' },
              { id: 'oferta_especial', label: '🎁 Ofertas' },
              { id: 'favorito',   label: '❤️ Favoritos' },
              { id: 'disponible', label: '✓ Disponibles' },
              { id: 'rapido',     label: '⚡ Prep. rápida' },
            ].filter(f => tieneProductosCumplen(f.id)).map((filtro) => (
              <label key={filtro.id} className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  className="accent-[var(--theme-primary)] w-3.5 h-3.5 rounded cursor-pointer"
                  checked={filtrosActivos.includes(filtro.id)}
                  onChange={() => toggleFiltro(filtro.id)}
                />
                <span className="text-theme-text-muted text-xs group-hover:text-theme-text transition-colors">
                  {filtro.label}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-8">
            <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] font-bold mb-3 uppercase">PRECIO</p>
            <div className="space-y-2">
              {rangosPreciosDinamicos.map((rango) => (
                <label key={rango.id} className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="radio"
                    name="precio"
                    className="accent-[var(--theme-primary)] cursor-pointer"
                    checked={filtroPrecio === rango.id}
                    onChange={() => {
                      setFiltroPrecio(filtroPrecio === rango.id ? null : rango.id)
                      setPrecioMin('')
                      setPrecioMax('')
                    }}
                  />
                  <span className="text-theme-text-muted text-xs group-hover:text-theme-text transition-colors">
                    {rango.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-3.5 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={precioMin}
                  onChange={(e) => {
                    setPrecioMin(e.target.value)
                    setFiltroPrecio(null)
                  }}
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-border-subtle)',
                    color: 'var(--theme-text)'
                  }}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none focus:border-[var(--theme-primary)]/50 text-center font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-theme-text-muted text-xs font-normal">—</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={precioMax}
                  onChange={(e) => {
                    setPrecioMax(e.target.value)
                    setFiltroPrecio(null)
                  }}
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-border-subtle)',
                    color: 'var(--theme-text)'
                  }}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none focus:border-[var(--theme-primary)]/50 text-center font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setFiltroPrecio(null)}
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    borderColor: 'var(--theme-border-subtle)',
                    color: 'var(--theme-text-muted)'
                  }}
                  className="w-7 h-7 rounded-full border hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-contrast,#ffffff)] flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
                  title="Aplicar rango de precio"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] font-bold mb-3 uppercase">APTO PARA</p>
            <div className="space-y-2">
              {[
                { id: 'vegetariano', label: '🌱 Vegetariano' },
                { id: 'vegano',      label: '🌿 Vegano'      },
                { id: 'sinGluten',   label: '🌾 Sin gluten'  },
                { id: 'sinLacteos',  label: '🥛 Sin lácteos' },
                { id: 'sinPicante',  label: '🌶 Sin picante' },
              ].map((restriccion) => (
                <label key={restriccion.id} className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    className="accent-[var(--theme-primary)] cursor-pointer"
                    checked={restriccionesActivas.includes(restriccion.id)}
                    onChange={() => toggleRestriccion(restriccion.id)}
                  />
                  <span className="text-theme-text-muted text-xs group-hover:text-theme-text transition-colors">
                    {restriccion.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {(filtroPrecio || precioMin || precioMax || restriccionesActivas.length > 0 || filtrosActivos.length > 0) && (
            <button
              onClick={limpiarFiltros}
              className="mt-8 w-full text-xs text-theme-text-muted hover:text-theme-text border border-[var(--theme-border-subtle)] hover:border-[var(--theme-primary)]/40 rounded-lg py-2 transition-all cursor-pointer"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </aside>

        {/* CATÁLOGO CONTINUO */}
        <main 
          ref={mainScrollRef}
          style={{ backgroundColor: 'var(--theme-surface)' }}
          className="flex-1 h-full overflow-y-auto min-h-0 pb-32 text-left scrollbar-thin bg-[var(--theme-surface)] px-3 pt-1"
        >
          {/* Encabezado del contenedor de platillos con Buscador y Botón de Filtros */}
          <div className="pb-2 mb-3 text-left space-y-3">
            <h2 className="text-theme-text font-serif text-xl sm:text-2xl font-bold capitalize">
              {categoriaActiva === 'todos' ? 'Todos los Platillos' : (categoriasNorm.find(c => c.id === categoriaActiva)?.nombre || 'Platillos')}
            </h2>

            {/* Barra de búsqueda con botón de filtros a la derecha */}
            <div className="flex items-center gap-2 w-full max-w-md sm:max-w-lg">
              <div className="relative flex-1 flex items-center">
                <div 
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 transition-colors"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="¿Qué se te antoja hoy?"
                  style={{ 
                    backgroundColor: 'var(--theme-card, var(--theme-surface))',
                    borderColor: 'var(--theme-border-subtle)',
                    color: 'var(--theme-text)',
                    boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                  }}
                  className="input-surface w-full rounded-xl pl-10 pr-9 py-2.5 border-[1.5px] text-sm font-normal transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/40 placeholder:text-theme-text-muted/60"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    style={{ color: 'var(--theme-text-muted)' }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 p-1 rounded-full cursor-pointer z-10 transition-colors"
                    title="Borrar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botón de Filtros en la barra de búsqueda */}
              <button
                type="button"
                onClick={() => setMostrarFiltrosModal(true)}
                style={
                  totalFiltrosActivos > 0
                    ? {
                        backgroundColor: 'var(--theme-primary)',
                        borderColor: 'var(--theme-primary)',
                        color: 'var(--theme-primary-contrast, #ffffff)',
                        boxShadow: '0 4px 14px -2px color-mix(in srgb, var(--theme-primary) 40%, transparent)'
                      }
                    : {
                        backgroundColor: 'var(--theme-card, var(--theme-surface))',
                        borderColor: 'var(--theme-border-subtle)',
                        color: 'var(--theme-text)',
                        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                      }
                }
                className="relative h-[42px] px-3 sm:px-3.5 rounded-xl border-[1.5px] flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-95 group"
                title="Abrir filtros"
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span className="text-xs font-semibold hidden min-[440px]:inline">Filtros</span>
                {totalFiltrosActivos > 0 && (
                  <span 
                    style={{
                      backgroundColor: 'var(--theme-primary-contrast, #ffffff)',
                      color: 'var(--theme-primary)'
                    }}
                    className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs"
                  >
                    {totalFiltrosActivos}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* MOBILE CATEGORY TABS (Ahora abajo del buscador) */}
          <div className="md:hidden text-left mb-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted/80">
                Categorías
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pt-1 pb-1.5 px-0.5 scrollbar-none items-center">
              {categoriasNorm.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  style={categoriaActiva === cat.id ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' } : {}}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                    categoriaActiva === cat.id
                      ? 'font-bold shadow-md'
                      : 'bg-[var(--theme-surface)] text-theme-text-muted border border-[var(--theme-border-subtle)] shadow-md hover:shadow-lg'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.nombre}</span>
                  </span>
                  <span className="text-[10px] opacity-70">({cat.total})</span>
                </button>
              ))}
            </div>
          </div>

          {/* SKELETON LOADER MIENTRAS CARGA */}
          {cargando ? (
            <div 
              className="grid gap-5 sm:gap-6 pt-2 pb-6 w-full items-start grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  style={{ backgroundColor: 'var(--theme-card, var(--theme-surface))', borderColor: 'var(--theme-border-subtle)' }}
                  className="border rounded-md overflow-hidden flex flex-col justify-between"
                >
                  {/* Imagen del platillo (skeleton) */}
                  <div className="h-48 md:h-56 w-full animate-shimmer shrink-0" />
                  
                  {/* Cuerpo del Platillo (Textos y Precios) */}
                  <div className="p-3.5 sm:p-4 space-y-2.5 min-h-[195px] sm:min-h-[205px] flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-4 rounded w-3/4 animate-shimmer" />
                      <div className="h-5 rounded w-2/3 animate-shimmer" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-2.5 rounded w-full animate-shimmer" />
                      <div className="h-2.5 rounded w-4/5 animate-shimmer" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--theme-border-subtle)]">
                      <div className="h-5 rounded w-16 animate-shimmer" />
                      <div className="h-7 rounded-lg w-20 animate-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (modoCarruselCategorias ? gruposCategorias.length === 0 : platillosAMostrar.length === 0) ? (
            <div className="py-20 sm:py-24 text-center flex flex-col items-center justify-center">
              {/* Emblema estilizado gastronómico */}
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center shadow-lg shadow-[var(--theme-primary)]/5 backdrop-blur-xs">
                  {categoriaActiva === 'ofertas' ? (
                    <Gift className="w-7 h-7 text-[var(--theme-primary)]" />
                  ) : (categoriaActiva === 'promo' || categoriaActiva === 'promocion' || categoriaActiva === 'promociones') ? (
                    <Tag className="w-7 h-7 text-[var(--theme-primary)]" />
                  ) : (
                    <UtensilsCrossed className="w-7 h-7 text-[var(--theme-primary)]" />
                  )}
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--theme-surface)] border border-[var(--theme-primary)]/40 flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3 h-3 text-[var(--theme-primary)] animate-pulse" />
                </div>
              </div>

              <p className="text-theme-text text-sm sm:text-base font-serif font-bold">
                {busqueda
                  ? 'No se encontraron resultados para tu búsqueda'
                  : categoriaActiva === 'ofertas'
                    ? 'No hay ofertas disponibles por el momento'
                    : (categoriaActiva === 'promo' || categoriaActiva === 'promocion' || categoriaActiva === 'promociones')
                      ? 'No hay promociones disponibles por el momento'
                      : categoriaActiva !== 'todos'
                        ? 'No hay disponibles por el momento'
                        : (filtrosActivos.length > 0 || restriccionesActivas.length > 0 || filtroPrecio || precioMin || precioMax)
                          ? 'No hay platillos que coincidan con los filtros'
                          : 'No hay disponibles por el momento'}
              </p>
              <p className="text-theme-text-muted text-xs mt-1.5 max-w-xs leading-relaxed">
                {busqueda
                  ? 'Intenta con otros términos o borra el texto del buscador.'
                  : categoriaActiva === 'ofertas'
                    ? 'Vuelve a consultar pronto para descubrir nuevos descuentos y platillos en oferta.'
                    : (categoriaActiva === 'promo' || categoriaActiva === 'promocion' || categoriaActiva === 'promociones')
                      ? 'Estamos preparando nuevas promociones especiales. ¡Vuelve a consultar pronto!'
                      : categoriaActiva !== 'todos'
                        ? 'Actualmente no hay platillos asignados a esta categoría. ¡Vuelve a consultar pronto!'
                        : (filtrosActivos.length > 0 || restriccionesActivas.length > 0 || filtroPrecio || precioMin || precioMax)
                          ? 'Prueba desmarcar algunos filtros para ver más opciones.'
                          : 'Estamos actualizando nuestro menú. ¡Vuelve a consultar pronto!'}
              </p>

              {(categoriaActiva !== 'todos' || busqueda || filtrosActivos.length > 0 || restriccionesActivas.length > 0 || filtroPrecio || precioMin || precioMax) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaActiva('todos')
                    limpiarFiltros()
                    setBusqueda('')
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--theme-primary)] text-[var(--theme-primary-contrast,#ffffff)] hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  Ver todos los platillos
                </button>
              )}
            </div>
          ) : modoCarruselCategorias ? (
            /* VISTA DE FILAS POR CATEGORÍA EN CARRUSEL (Solo en 'todos' y sin búsqueda) */
            <div className="space-y-4 pt-1 pb-10 w-full">
              {gruposCategorias.map((grupo) => (
                <CategoryCarouselRow
                  key={grupo.categoria.id}
                  categoria={grupo.categoria}
                  platillos={grupo.platillos}
                  onSelectCategoria={(catId) => {
                    setCategoriaActiva(catId)
                    if (mainScrollRef.current) {
                      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  scrollTargetRef={mainScrollRef}
                  platilloHighlight={platilloHighlight}
                  renderCard={(platillo, isHighlighted) => (
                    <PlatilloCard
                      platillo={platillo}
                      onAbrirDetalle={abrirDetallePlatillo}
                      onAgregarRapido={agregarRapidoAlPedido}
                      isHighlighted={isHighlighted}
                    />
                  )}
                />
              ))}
            </div>
          ) : (
            <div 
              className="grid gap-5 sm:gap-6 pt-2 pb-6 w-full items-start grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
            >
              {/* GRID DE PLATILLOS DINÁMICOS COMPACTOS */}
              {platillosAMostrar.map((platillo) => (
                <PlatilloCard
                  key={platillo.id}
                  platillo={platillo}
                  onAbrirDetalle={abrirDetallePlatillo}
                  onAgregarRapido={agregarRapidoAlPedido}
                  isHighlighted={Boolean(platilloHighlight && String(platilloHighlight) === String(platillo.id))}
                />
              ))}
            </div>
          )}
        </main>

      </div>

      {/* ─── MODAL DE PERSONALIZACIÓN Y DETALLE DEL PLATILLO ───── */}
      <AnimatePresence>
        {modalDetalle && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{ backgroundColor: 'var(--theme-surface)' }}
              className="rounded-2xl w-full max-w-lg text-left shadow-2xl overflow-hidden h-[72vh] sm:h-[620px] max-h-[640px] flex flex-col border-0"
            >
              {/* Header Carrusel de Imágenes sin bordes ni degradado */}
              <div className="relative h-40 sm:h-48 md:h-52 bg-stone-900 flex-shrink-0 overflow-hidden border-0">
                <img
                  src={modalDetalle.imagenes?.[activeImageIndex] || modalDetalle.imagen}
                  alt={modalDetalle.nombre}
                  className="w-full h-full object-cover border-0 outline-none block"
                />

                {/* Botón Cerrar */}
                <button
                  type="button"
                  onClick={() => { setModalDetalle(null); setEditingCartId(null) }}
                  className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/55 text-white hover:text-white hover:bg-black/80 border border-white/20 backdrop-blur-md transition-all z-10 flex items-center justify-center cursor-pointer shadow-md"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Controles Carrusel si hay múltiples imágenes */}
                {modalDetalle.imagenes && modalDetalle.imagenes.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : modalDetalle.imagenes.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev < modalDetalle.imagenes.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {modalDetalle.imagenes.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${activeImageIndex === idx ? 'w-5 bg-[var(--theme-primary)]' : 'w-1.5 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Badges de Promoción o Más Vendido */}
                <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                  {modalDetalle.esMasVendido && (
                    <span 
                      style={{
                        background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                        boxShadow: '0 4px 12px -1px rgba(234, 88, 12, 0.4)'
                      }}
                      className="text-white text-[11px] px-3 py-1 rounded-md font-bold uppercase flex items-center gap-1.5 shadow-md"
                    >
                      <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                      <span>Más Vendido</span>
                    </span>
                  )}
                  {modalDetalle.badge && !modalDetalle.esMasVendido && (
                    <span 
                      style={
                        (modalDetalle.promocion || modalDetalle.ofertaEspecial || modalDetalle.badge.includes('PROMO') || modalDetalle.badge.includes('OFERTA') || modalDetalle.badge.includes('2X1'))
                          ? {
                              background: 'linear-gradient(135deg, #EF2323 0%, #DB1212 55%, #B30C0C 100%)',
                              boxShadow: '0 4px 14px -1px rgba(219, 18, 18, 0.45)',
                              border: '1px solid rgba(254, 202, 202, 0.4)'
                            }
                          : {
                              backgroundColor: 'var(--theme-primary)',
                              color: 'var(--theme-primary-contrast, #ffffff)',
                              boxShadow: '0 4px 12px -1px rgba(0, 0, 0, 0.25)'
                            }
                      }
                      className="text-white text-[11px] px-3 py-1 rounded-md font-bold shadow-md uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {(modalDetalle.promocion || modalDetalle.badge.includes('PROMO') || modalDetalle.badge.includes('2X1')) ? (
                        <Tag className="w-3.5 h-3.5 text-red-100 shrink-0" strokeWidth={2.5} />
                      ) : (modalDetalle.ofertaEspecial || modalDetalle.badge.includes('OFERTA')) ? (
                        <Gift className="w-3.5 h-3.5 text-red-100 shrink-0" strokeWidth={2.5} />
                      ) : null}
                      <span>{modalDetalle.badge}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Contenedor con Scroll de Opciones */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 sm:space-y-5 scrollbar-thin">
                
                {/* 1. Ficha Principal: Nombre, Precios y Descripción */}
                <div className="space-y-2.5 pb-4 border-b border-[var(--theme-border-subtle)]">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-serif text-theme-text font-bold leading-tight uppercase tracking-wide">
                      {modalDetalle.nombre?.toUpperCase()}
                    </h2>
                    <div className="text-right flex-shrink-0">
                      {modalDetalle.precioOriginal && modalDetalle.precioOriginal > modalDetalle.precio && (
                        <span className="block text-xs line-through opacity-60 font-semibold text-theme-text-muted">
                          ${modalDetalle.precioOriginal}
                        </span>
                      )}
                      <span className="text-[var(--theme-primary)] text-xl sm:text-2xl font-bold">
                        ${modalDetalle.precio} <span className="text-xs font-normal text-theme-text-muted/70">MXN</span>
                      </span>
                    </div>
                  </div>

                  {/* Metadatos (Calificación, Tiempo) */}
                  {(modalDetalle.rating || modalDetalle.tiempoPrep) && (
                    <div className="flex items-center gap-3 text-xs text-theme-text-muted">
                      {modalDetalle.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-[var(--theme-primary)] text-[var(--theme-primary)]" />
                          <span className="font-semibold text-theme-text">{modalDetalle.rating}</span>
                          {modalDetalle.reviewsCount && (
                            <span className="opacity-60">({modalDetalle.reviewsCount})</span>
                          )}
                        </div>
                      )}
                      {modalDetalle.tiempoPrep && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 opacity-70" />
                          <span>{modalDetalle.tiempoPrep}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Descripción */}
                  {modalDetalle.descripcion && (
                    <p className="text-theme-text-muted text-sm leading-relaxed">
                      {modalDetalle.descripcion.charAt(0).toUpperCase() + modalDetalle.descripcion.slice(1)}
                    </p>
                  )}

                  {/* Ingredientes Incluidos y Personalizables */}
                  {modalDetalle.ingredientes && modalDetalle.ingredientes.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] tracking-wider text-theme-text-muted font-bold uppercase flex items-center gap-1">
                          <span>Ingredientes base:</span>
                        </p>
                        <span className="text-[10px] text-theme-text-muted/70 italic">
                          Toca para quitar
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {modalDetalle.ingredientes.flatMap(ing => {
                          if (typeof ing === 'string') {
                            return ing.split(/,| y /i).map(s => s.trim()).filter(Boolean)
                          }
                          return [ing?.name || ing?.nombre || String(ing)]
                        }).map((ing, i) => {
                          const isQuitado = modalDetalleIngredientesQuitados.includes(ing)
                          return (
                            <button
                              key={i} 
                              type="button"
                              onClick={() => toggleModalDetalleIngredienteQuitado(ing)}
                              style={isQuitado ? {
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                                color: '#ef4444'
                              } : { 
                                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 14%, transparent)', 
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 28%, transparent)',
                                color: 'var(--theme-primary)'
                              }}
                              className={`text-[11px] font-semibold border rounded-md px-2.5 py-1 capitalize transition-all cursor-pointer flex items-center gap-1 select-none ${
                                isQuitado ? 'line-through opacity-80' : 'hover:opacity-85 shadow-2xs'
                              }`}
                              title={isQuitado ? `Restaurar ${ing}` : `Quitar ${ing}`}
                            >
                              <span>{isQuitado ? `✕ Sin ${ing}` : `✓ ${ing}`}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Paso 1: Nivel de picante (Si aplica) */}
                {modalDetalle.allow_spice_level && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-theme-text tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-contrast,#fff)] flex items-center justify-center text-[10px] font-bold">1</span>
                        <span>Nivel de picante</span>
                      </label>
                      <span className="text-[11px] text-theme-text-muted font-medium">Obligatorio</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { id: 'Sin picante', label: 'Sin picante', desc: 'Suave / Cero picante' },
                        { id: 'Medio', label: 'Término medio', desc: 'Picante moderado' },
                        { id: 'Alto', label: 'Muy picante', desc: 'Sabor intenso' }
                      ].map((opcion) => {
                        const isSelected = modalDetallePicante.toLowerCase().includes(opcion.id.toLowerCase().slice(0, 4))
                        return (
                          <button
                            key={opcion.id}
                            type="button"
                            onClick={() => setModalDetallePicante(opcion.id)}
                            style={isSelected ? {
                              borderColor: 'var(--theme-primary)',
                              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                              boxShadow: '0 6px 18px -2px color-mix(in srgb, var(--theme-primary) 35%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.12)'
                            } : {
                              borderColor: 'var(--theme-border-subtle)',
                              backgroundColor: 'var(--theme-card, var(--theme-surface))',
                              boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.11), 0 1px 4px 0 rgba(0, 0, 0, 0.06)'
                            }}
                            className={`p-3 rounded-xl border-[1.5px] text-left transition-all cursor-pointer relative flex flex-col justify-between h-full ${
                              isSelected ? 'shadow-md' : 'hover:border-[var(--theme-primary)]/50 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className={`text-xs font-bold ${isSelected ? 'text-[var(--theme-primary)]' : 'text-theme-text'}`}>
                                {opcion.label}
                              </span>
                              {isSelected && (
                                <div className="w-3.5 h-3.5 rounded-full bg-[var(--theme-primary)] flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-[var(--theme-primary-contrast,#ffffff)]" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-theme-text-muted leading-tight">
                              {opcion.desc}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Paso 2: Extras y Personalización */}
                {modalDetalle.extras && modalDetalle.extras.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-theme-text tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-contrast,#fff)] flex items-center justify-center text-[10px] font-bold">
                          {modalDetalle.allow_spice_level ? '2' : '1'}
                        </span>
                        <span>Extras y complementos</span>
                      </label>
                      <span className="text-[11px] text-theme-text-muted font-medium">Opcional</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {modalDetalle.extras.map((extra) => {
                        const extraId = extra.id ?? extra
                        const extraName = typeof extra === 'object' ? (extra.name || extra.nombre) : extra
                        const isChecked = modalDetalleExtras.some((e) => (e.id ?? e) === extraId)
                        const extraPrice = typeof extra === 'object' 
                          ? (extra.price !== undefined && extra.price !== null ? parseFloat(extra.price) : (extra.precio !== undefined && extra.precio !== null ? parseFloat(extra.precio) : null))
                          : (typeof extra === 'string' && extra.match(/\+\$?(\d+(\.\d+)?)/) ? parseFloat(extra.match(/\+\$?(\d+(\.\d+)?)/)[1]) : null)

                        return (
                          <div
                            key={extraId}
                            onClick={() => toggleModalDetalleExtra(extra)}
                            style={isChecked ? {
                              borderColor: 'var(--theme-primary)',
                              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                              boxShadow: '0 6px 18px -2px color-mix(in srgb, var(--theme-primary) 32%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.12)'
                            } : {
                              borderColor: 'var(--theme-border-subtle)',
                              backgroundColor: 'var(--theme-card, var(--theme-surface))',
                              boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.11), 0 1px 4px 0 rgba(0, 0, 0, 0.06)'
                            }}
                            className={`p-3 rounded-xl border-[1.5px] flex items-center justify-between gap-3 cursor-pointer transition-all select-none ${
                              isChecked ? 'shadow-md' : 'hover:border-[var(--theme-primary)]/50 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div 
                                style={isChecked ? {
                                  backgroundColor: 'var(--theme-primary)',
                                  borderColor: 'var(--theme-primary)'
                                } : {
                                  borderColor: 'var(--theme-border-subtle)',
                                  backgroundColor: 'var(--theme-surface)'
                                }}
                                className="w-4 h-4 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors shadow-2xs"
                              >
                                {isChecked && <Check className="w-3 h-3 text-[var(--theme-primary-contrast,#ffffff)]" strokeWidth={3} />}
                              </div>
                              <span className={`text-xs sm:text-sm font-medium truncate ${isChecked ? 'text-[var(--theme-primary)] font-bold' : 'text-theme-text'}`}>
                                {extraName}
                              </span>
                            </div>

                            <span 
                              style={{
                                backgroundColor: isChecked 
                                  ? 'color-mix(in srgb, var(--theme-primary) 22%, transparent)' 
                                  : 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
                                borderColor: isChecked 
                                  ? 'color-mix(in srgb, var(--theme-primary) 40%, transparent)' 
                                  : 'color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                                color: 'var(--theme-primary)'
                              }}
                              className="text-xs font-bold px-2.5 py-0.5 rounded-lg flex-shrink-0 border transition-colors"
                            >
                              {extraPrice !== null && extraPrice > 0 ? `+$${extraPrice} MXN` : 'Incluido'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Paso 3: Indicaciones para cocina */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-theme-text tracking-wide uppercase flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-contrast,#fff)] flex items-center justify-center text-[10px] font-bold">
                        {(modalDetalle.allow_spice_level ? 1 : 0) + (modalDetalle.extras && modalDetalle.extras.length > 0 ? 1 : 0) + 1}
                      </span>
                      <span>Instrucciones especiales para cocina</span>
                    </label>
                    <span className="text-[11px] text-theme-text-muted font-medium">Opcional</span>
                  </div>

                  {/* Sugerencias rápidas generales */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Para llevar', 'Salsa aparte', 'Bien caliente', 'Empaque separado', 'Sin cubiertos', 'Servilletas extra'].map((sug) => {
                      const isActive = modalDetalleNota.includes(sug)
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setModalDetalleNota(prev => {
                              const parts = prev.split(',').map(s => s.trim()).filter(Boolean)
                              if (parts.includes(sug)) {
                                return parts.filter(s => s !== sug).join(', ')
                              } else {
                                return [...parts, sug].join(', ')
                              }
                            })
                          }}
                          style={isActive ? {
                            backgroundColor: 'var(--theme-primary)',
                            color: 'var(--theme-primary-contrast, #ffffff)',
                            borderColor: 'var(--theme-primary)',
                            boxShadow: '0 3px 10px 0 color-mix(in srgb, var(--theme-primary) 35%, transparent), 0 1px 3px rgba(0,0,0,0.1)'
                          } : {
                            borderColor: 'var(--theme-border-subtle)',
                            backgroundColor: 'var(--theme-card, var(--theme-surface))',
                            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.09), 0 1px 3px rgba(0,0,0,0.05)'
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border-[1.5px] transition-all cursor-pointer font-medium ${
                            isActive ? 'shadow-sm' : 'text-theme-text-muted hover:text-theme-text hover:border-[var(--theme-primary)]/50 hover:shadow-sm'
                          }`}
                        >
                          {isActive ? `✓ ${sug}` : `+ ${sug}`}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    placeholder="Ej. Sin cilantro, salsa roja aparte, alérgico a frutos secos..."
                    style={{
                      backgroundColor: 'var(--theme-card, var(--theme-surface))',
                      borderColor: 'var(--theme-border-subtle)',
                      color: 'var(--theme-text)',
                      boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.09), 0 1px 4px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    className="input-surface w-full border-[1.5px] rounded-xl p-3 text-xs sm:text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none focus:!border-[var(--theme-primary)]/60 focus:shadow-md resize-none h-16 font-normal transition-all"
                    value={modalDetalleNota}
                    onChange={(e) => setModalDetalleNota(e.target.value)}
                  />
                </div>

              </div>

              {/* Barra Inferior Fija (Sticky Footer) */}
              <div 
                style={{ backgroundColor: 'var(--theme-card, var(--theme-surface))', borderColor: 'var(--theme-border-subtle)' }} 
                className="p-3 sm:p-3.5 border-t flex items-center justify-between gap-2.5 sm:gap-3 flex-shrink-0 shadow-lg"
              >
                {/* Selector de Cantidad */}
                <div 
                  style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border-subtle)' }}
                  className="flex items-center gap-1 border rounded-xl p-1 shadow-2xs shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setModalDetalleCantidad(Math.max(1, modalDetalleCantidad - 1))}
                    disabled={modalDetalleCantidad <= 1}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-theme-text hover:bg-[var(--theme-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-theme-text font-bold text-xs sm:text-sm w-5 text-center select-none">
                    {modalDetalleCantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalDetalleCantidad(modalDetalleCantidad + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-theme-text hover:bg-[var(--theme-surface)] transition-all cursor-pointer"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Botón Principal de Agregar */}
                <button
                  type="button"
                  onClick={agregarDesdeModalDetalle}
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
                  className="flex-1 hover:opacity-95 active:scale-[0.99] font-bold h-10 sm:h-11 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-[var(--theme-primary)]/20 flex items-center justify-between gap-2 min-w-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {editingCartId ? 'Guardar' : 'Agregar'}
                      <span className="hidden min-[420px]:inline"> al pedido</span>
                    </span>
                  </div>
                  <span className="bg-black/20 py-0.5 px-2 rounded-lg text-xs font-bold tracking-wide shrink-0 whitespace-nowrap">
                    ${((modalDetalle.precio + modalDetalleExtras.reduce((sum, e) => {
                      const p = typeof e === 'object' 
                        ? (e.price !== undefined && e.price !== null ? (parseFloat(e.price) || 0) : (e.precio !== undefined && e.precio !== null ? (parseFloat(e.precio) || 0) : 0))
                        : (typeof e === 'string' && e.match(/\+\$?(\d+(\.\d+)?)/) ? (parseFloat(e.match(/\+\$?(\d+(\.\d+)?)/)[1]) || 0) : 0)
                      return sum + p
                    }, 0)) * modalDetalleCantidad).toLocaleString()} MXN
                  </span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CARRITO FLOTANTE */}
      {totalArticulos > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => setMostrarCarrito(true)}
            style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
            className="flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl shadow-[var(--theme-primary)]/40 transition-all cursor-pointer font-bold active:scale-95 border border-[var(--theme-primary)]/20"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm">Ver pedido</span>
            <span style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'inherit' }} className="rounded-full px-2.5 py-0.5 text-xs font-extrabold">
              {totalArticulos}
            </span>
            <span className="text-sm">
              ${total.toLocaleString()} MXN
            </span>
          </motion.button>
        </div>
      )}

      {/* PANEL LATERAL DEL CARRITO (DRAWER) */}
      <AnimatePresence>
        {mostrarCarrito && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop oscuro independiente */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
              onClick={() => setMostrarCarrito(false)}
            />

            {/* Panel lateral deslizante anclado a la derecha */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)' }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] sm:max-w-md border-l flex flex-col h-full text-left shadow-2xl z-10 overflow-hidden"
            >

              <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-[var(--theme-border-subtle)] shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[var(--theme-primary)]" />
                  <h3 className="text-theme-text font-serif text-lg sm:text-xl font-medium">Tu pedido ({totalArticulos})</h3>
                </div>
                <button 
                  onClick={() => setMostrarCarrito(false)} 
                  className="text-theme-text-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                  aria-label="Cerrar carrito"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {carrito.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <ShoppingCart className="w-12 h-12 text-theme-text-muted/30 mx-auto" />
                    <p className="text-theme-text-muted text-sm">Tu pedido está vacío actualmente.</p>
                    <p className="text-theme-text-muted/50 text-xs">Agrega tus platillos favoritos del menú.</p>
                  </div>
                ) : (
                  carrito.map((item, i) => {
                    const originalPlatillo = platillosNorm.find(p => p.id === item.id)
                    return (
                      <div key={item.cartId || i} className="flex gap-3 pb-4 border-b border-[var(--theme-border-subtle)] relative group">
                        <img src={item.imagen} alt={item.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-black/30" />
                        <div className="flex-1 pr-6">
                          <p className="text-theme-text text-sm font-semibold uppercase tracking-wide">{item.nombre?.toUpperCase()}</p>

                          {item.nivelPicante && item.nivelPicante !== 'Sin picante' && (
                            <span className="inline-block text-[10px] text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded px-1.5 py-0.5 mt-1 mr-1">
                              {item.nivelPicante}
                            </span>
                          )}

                          {item.ingredientesQuitados && item.ingredientesQuitados.length > 0 && (
                            <p className="text-red-400 text-xs mt-0.5 leading-tight font-medium">
                              ✕ Sin: {item.ingredientesQuitados.join(', ')}
                            </p>
                          )}

                          {item.extras && item.extras.length > 0 && (
                            <p className="text-theme-text-muted text-xs mt-1 leading-tight">
                              + {item.extras.map(e => typeof e === 'object' ? (e.name || e.nombre) : e).join(', ')}
                            </p>
                          )}

                          {item.nota && (
                            <p className="text-[var(--theme-primary)]/80 text-xs mt-1 italic">
                              📝 "{item.nota}"
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => ajustarCantidad(i, -1)}
                                className="w-6 h-6 rounded-full border border-[var(--theme-border-subtle)] text-theme-text text-xs flex items-center justify-center hover:border-[var(--theme-primary)] cursor-pointer"
                              >
                                −
                              </button>
                              <span className="text-theme-text text-sm font-semibold w-4 text-center">{item.cantidad}</span>
                              <button
                                onClick={() => ajustarCantidad(i, 1)}
                                className="w-6 h-6 rounded-full border border-[var(--theme-border-subtle)] text-theme-text text-xs flex items-center justify-center hover:border-[var(--theme-primary)] cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <span className="text-[var(--theme-primary)] text-sm font-bold whitespace-nowrap ml-2">
                              ${(item.precio * item.cantidad).toLocaleString()} MXN
                            </span>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 flex flex-col gap-1">
                          {originalPlatillo && (
                            <button
                              onClick={() => {
                                setMostrarCarrito(false)
                                abrirDetallePlatillo(originalPlatillo, item)
                              }}
                              className="text-theme-text-muted hover:text-[var(--theme-primary)] transition-colors p-1 cursor-pointer"
                              title="Editar personalización"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => eliminarDelCarrito(i)}
                            className="text-theme-text-muted hover:text-red-400 transition-colors p-1 cursor-pointer"
                            title="Eliminar del pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: 'var(--theme-card, var(--theme-surface))', borderColor: 'var(--theme-border-subtle)' }} className="px-5 sm:px-6 py-4 sm:py-5 border-t space-y-3.5 shrink-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-theme-text-muted">Subtotal</span>
                    <span className="text-theme-text font-medium whitespace-nowrap">${subtotal.toLocaleString()} MXN</span>
                  </div>
                  {tipoPedido === 'delivery' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-text-muted">Envío estimado</span>
                      <span className="text-theme-text font-medium whitespace-nowrap">
                        {subtotal >= 500 ? <span className="text-emerald-500 font-semibold">Gratis</span> : '$50 MXN'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[var(--theme-border-subtle)] pt-3">
                    <span className="text-theme-text font-medium text-sm">Total del pedido</span>
                    <span className="text-[var(--theme-primary)] text-xl font-bold whitespace-nowrap">
                      ${total.toLocaleString()} MXN
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => { setMostrarCarrito(false); setMostrarCheckout(true) }}
                      style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
                      className="w-full hover:opacity-90 active:scale-95 font-bold py-3.5 rounded-xl transition-all cursor-pointer text-sm shadow-lg shadow-[var(--theme-primary)]/10 flex items-center justify-center gap-2"
                    >
                      <span>Completar mi pedido</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={limpiarCarrito}
                      className="w-full text-center text-xs text-theme-text-muted hover:text-red-400 py-1 transition-colors cursor-pointer"
                    >
                      Vaciar pedido
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT */}
      <AnimatePresence>
        {mostrarCheckout && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-primary)' }}
              className="border-[1.5px] rounded-2xl w-full max-w-[480px] h-[540px] max-h-[82vh] text-left shadow-2xl flex flex-col overflow-hidden relative"
            >
              {/* Header en color primario con bordes 100% integrados al color primario */}
              <div 
                style={{ 
                  backgroundColor: 'var(--theme-primary)', 
                  borderColor: 'var(--theme-primary)' 
                }} 
                className="px-6 sm:px-7 py-4 sm:py-4.5 border-b flex items-center justify-between shrink-0 shadow-sm"
              >
                <div>
                  <h3 className="text-white font-serif text-xl sm:text-2xl font-bold">Finalizar pedido</h3>
                  <p className="text-xs text-white/85 mt-0.5 font-medium">Verifica tus datos de entrega y pago</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarCheckout(false)}
                  className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
                  aria-label="Cerrar modal"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">

              <div className="mb-6">
                <p className="text-xs tracking-widest text-theme-text-muted mb-3 uppercase font-bold">¿CÓMO DESEAS RECIBIR TU PEDIDO?</p>
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPedido('delivery')}
                    style={tipoPedido === 'delivery' ? {
                      borderColor: 'var(--theme-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                      boxShadow: '0 8px 24px -2px color-mix(in srgb, var(--theme-primary) 35%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.12)'
                    } : {
                      borderColor: 'var(--theme-border-subtle)',
                      backgroundColor: 'var(--theme-card, var(--theme-surface))',
                      boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                    }}
                    className={`p-4 rounded-xl border-[1.5px] text-left transition-all cursor-pointer ${
                      tipoPedido === 'delivery' ? 'shadow-md' : 'hover:border-[var(--theme-primary)]/50 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <Bike className="w-5 h-5 text-[var(--theme-primary)] mb-2" />
                    <p className={`text-sm font-bold ${tipoPedido === 'delivery' ? 'text-[var(--theme-primary)]' : 'text-theme-text'}`}>Delivery a domicilio</p>
                    <p className="text-theme-text-muted text-xs mt-0.5">Repartidor propio</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPedido('pickup')}
                    style={tipoPedido === 'pickup' ? {
                      borderColor: 'var(--theme-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                      boxShadow: '0 8px 24px -2px color-mix(in srgb, var(--theme-primary) 35%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.12)'
                    } : {
                      borderColor: 'var(--theme-border-subtle)',
                      backgroundColor: 'var(--theme-card, var(--theme-surface))',
                      boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                    }}
                    className={`p-4 rounded-xl border-[1.5px] text-left transition-all cursor-pointer ${
                      tipoPedido === 'pickup' ? 'shadow-md' : 'hover:border-[var(--theme-primary)]/50 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 text-[var(--theme-primary)] mb-2" />
                    <p className={`text-sm font-bold ${tipoPedido === 'pickup' ? 'text-[var(--theme-primary)]' : 'text-theme-text'}`}>Pick-up en local</p>
                    <p className="text-theme-text-muted text-xs mt-0.5">Recoge en sucursal</p>
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-[10px] tracking-[0.25em] text-[var(--theme-primary)] uppercase font-bold">INFORMACIÓN DEL CLIENTE</p>
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  <div>
                    <input
                      name="nombre"
                      type="text"
                      required
                      placeholder="Nombre completo *"
                      value={clienteNombre}
                      onChange={(e) => {
                        const val = e.target.value
                        setClienteNombre(val)
                        validarCampo('nombre', val)
                      }}
                      onBlur={(e) => validarCampo('nombre', e.target.value)}
                      style={{
                        backgroundColor: 'var(--theme-card, var(--theme-surface))',
                        borderColor: erroresFormulario.nombre ? '#ef4444' : 'var(--theme-border-subtle)',
                        color: 'var(--theme-text)',
                        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                      }}
                      className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                        erroresFormulario.nombre ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                      }`}
                    />
                    {erroresFormulario.nombre && (
                      <span className="text-red-500 text-xs font-bold mt-1 block">
                        {erroresFormulario.nombre}
                      </span>
                    )}
                  </div>

                  <div>
                    <input
                      name="telefono"
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="Teléfono *"
                      value={clienteTelefono}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setClienteTelefono(val)
                        validarCampo('telefono', val)
                      }}
                      onBlur={(e) => validarCampo('telefono', e.target.value)}
                      style={{
                        backgroundColor: 'var(--theme-card, var(--theme-surface))',
                        borderColor: erroresFormulario.telefono ? '#ef4444' : 'var(--theme-border-subtle)',
                        color: 'var(--theme-text)',
                        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                      }}
                      className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                        erroresFormulario.telefono ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                      }`}
                    />
                    {erroresFormulario.telefono && (
                      <span className="text-red-500 text-xs font-bold mt-1 block">
                        {erroresFormulario.telefono}
                      </span>
                    )}
                  </div>
                </div>

                {tipoPedido === 'delivery' && (
                  <div className="space-y-3">
                    {/* Fila 1 (Calle): Input de ancho completo */}
                    <div>
                      <input
                        name="calle"
                        type="text"
                        required
                        placeholder="Calle * (ej. Costera Miguel Alemán)"
                        value={clienteCalle}
                        onChange={(e) => {
                          const val = e.target.value
                          setClienteCalle(val)
                          validarCampo('calle', val)
                        }}
                        onBlur={(e) => validarCampo('calle', e.target.value)}
                        style={{
                          backgroundColor: 'var(--theme-card, var(--theme-surface))',
                          borderColor: erroresFormulario.calle ? '#ef4444' : 'var(--theme-border-subtle)',
                          color: 'var(--theme-text)',
                          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                        }}
                        className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                          erroresFormulario.calle ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                        }`}
                      />
                      {erroresFormulario.calle && (
                        <span className="text-red-500 text-xs font-bold mt-1 block">
                          {erroresFormulario.calle}
                        </span>
                      )}
                    </div>

                    {/* Fila 2 (No. Exterior y No. Interior): Doble columna */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <input
                          name="no_exterior"
                          type="text"
                          required
                          maxLength={20}
                          placeholder="No. Exterior *"
                          value={clienteNumExt}
                          onChange={(e) => {
                            const val = e.target.value
                            setClienteNumExt(val)
                            validarCampo('no_exterior', val)
                          }}
                          onBlur={(e) => validarCampo('no_exterior', e.target.value)}
                          style={{
                            backgroundColor: 'var(--theme-card, var(--theme-surface))',
                            borderColor: erroresFormulario.no_exterior ? '#ef4444' : 'var(--theme-border-subtle)',
                            color: 'var(--theme-text)',
                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                          }}
                          className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                            erroresFormulario.no_exterior ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                          }`}
                        />
                        {erroresFormulario.no_exterior && (
                          <span className="text-red-500 text-xs font-bold mt-1 block">
                            {erroresFormulario.no_exterior}
                          </span>
                        )}
                      </div>

                      <div>
                        <input
                          name="no_interior"
                          type="text"
                          maxLength={20}
                          placeholder="No. Interior (Opcional)"
                          value={clienteNumInt}
                          onChange={(e) => {
                            const val = e.target.value
                            setClienteNumInt(val)
                            validarCampo('no_interior', val)
                          }}
                          onBlur={(e) => validarCampo('no_interior', e.target.value)}
                          style={{
                            backgroundColor: 'var(--theme-card, var(--theme-surface))',
                            borderColor: erroresFormulario.no_interior ? '#ef4444' : 'var(--theme-border-subtle)',
                            color: 'var(--theme-text)',
                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                          }}
                          className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                            erroresFormulario.no_interior ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                          }`}
                        />
                        {erroresFormulario.no_interior && (
                          <span className="text-red-500 text-xs font-bold mt-1 block">
                            {erroresFormulario.no_interior}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila 3 (CP y Colonia): Doble columna */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <input
                          name="cp"
                          type="text"
                          required
                          maxLength={5}
                          placeholder="Código Postal *"
                          value={clienteCP}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                            setClienteCP(val)
                            validarCampo('cp', val)
                          }}
                          onBlur={(e) => validarCampo('cp', e.target.value)}
                          style={{
                            backgroundColor: 'var(--theme-card, var(--theme-surface))',
                            borderColor: erroresFormulario.cp ? '#ef4444' : 'var(--theme-border-subtle)',
                            color: 'var(--theme-text)',
                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                          }}
                          className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                            erroresFormulario.cp ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                          }`}
                        />
                        {erroresFormulario.cp && (
                          <span className="text-red-500 text-xs font-bold mt-1 block">
                            {erroresFormulario.cp}
                          </span>
                        )}
                      </div>

                      <div>
                        <input
                          name="colonia"
                          type="text"
                          required
                          placeholder="Colonia / Fracc. *"
                          value={clienteColonia}
                          onChange={(e) => {
                            const val = e.target.value
                            setClienteColonia(val)
                            validarCampo('colonia', val)
                          }}
                          onBlur={(e) => validarCampo('colonia', e.target.value)}
                          style={{
                            backgroundColor: 'var(--theme-card, var(--theme-surface))',
                            borderColor: erroresFormulario.colonia ? '#ef4444' : 'var(--theme-border-subtle)',
                            color: 'var(--theme-text)',
                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                          }}
                          className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                            erroresFormulario.colonia ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                          }`}
                        />
                        {erroresFormulario.colonia && (
                          <span className="text-red-500 text-xs font-bold mt-1 block">
                            {erroresFormulario.colonia}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila 4 (Referencias): Referencias de entrega */}
                    <div>
                      <input
                        name="referencias"
                        type="text"
                        required
                        placeholder="Referencias de entrega * (casa azul, entre calles...)"
                        value={clienteReferencias}
                        onChange={(e) => {
                          const val = e.target.value
                          setClienteReferencias(val)
                          validarCampo('referencias', val)
                        }}
                        onBlur={(e) => validarCampo('referencias', e.target.value)}
                        style={{
                          backgroundColor: 'var(--theme-card, var(--theme-surface))',
                          borderColor: erroresFormulario.referencias ? '#ef4444' : 'var(--theme-border-subtle)',
                          color: 'var(--theme-text)',
                          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                        }}
                        className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal ${
                          erroresFormulario.referencias ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                        }`}
                      />
                      {erroresFormulario.referencias && (
                        <span className="text-red-500 text-xs font-bold mt-1 block">
                          {erroresFormulario.referencias}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {tipoPedido === 'pickup' && (
                  <div 
                    style={{ 
                      backgroundColor: 'var(--theme-card, var(--theme-surface))', 
                      borderColor: 'var(--theme-border-subtle)',
                      boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                    }} 
                    className="border-[1.5px] rounded-xl p-3.5 text-xs text-theme-text-muted space-y-1"
                  >
                    <p className="text-theme-text font-bold text-sm">📍 Sucursal {restName}</p>
                    <p>{settingsData?.address || settingsData?.direccion || 'Av. Principal #100'}</p>
                    <p className="text-theme-text-muted/70">Horario de recolección: 1:00 PM — 11:00 PM</p>
                  </div>
                )}

                <div>
                  <textarea
                    name="nota_especial"
                    maxLength={250}
                    placeholder="Nota o indicación especial del pedido (opcional)"
                    value={notaGeneral}
                    onChange={(e) => {
                      const val = e.target.value
                      setNotaGeneral(val)
                      validarCampo('nota_especial', val)
                    }}
                    onBlur={(e) => validarCampo('nota_especial', e.target.value)}
                    style={{
                      backgroundColor: 'var(--theme-card, var(--theme-surface))',
                      borderColor: erroresFormulario.nota_especial ? '#ef4444' : 'var(--theme-border-subtle)',
                      color: 'var(--theme-text)',
                      boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                    }}
                    className={`input-surface w-full border-[1.5px] rounded-xl px-3.5 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted/50 focus:outline-none transition-all font-normal resize-none h-16 ${
                      erroresFormulario.nota_especial ? '!border-red-500 focus:!border-red-500 ring-1 ring-red-500/20' : 'focus:!border-[var(--theme-primary)] focus:shadow-md'
                    }`}
                  />
                  {erroresFormulario.nota_especial && (
                    <span className="text-red-500 text-xs font-bold mt-1 block">
                      {erroresFormulario.nota_especial}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] tracking-[0.25em] text-[var(--theme-primary)] uppercase font-bold mb-3">MÉTODO DE PAGO</p>
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {[
                    { value: 'efectivo', icon: '💵', label: 'Efectivo', sub: 'Paga en efectivo al recibir tu pedido' },
                    { value: 'terminal', icon: '💳', label: 'Terminal bancaria', sub: 'Paga con tarjeta de débito o crédito al recibir' },
                    { value: 'transferencia', icon: '📲', label: 'Transferencia electrónica', sub: 'Muestra tu comprobante o transferencia al recibir' },
                  ].map((metodo) => {
                    const isSelected = metodoPago === metodo.value
                    return (
                      <button
                        key={metodo.value}
                        type="button"
                        onClick={() => setMetodoPago(prev => prev === metodo.value ? '' : metodo.value)}
                        style={isSelected ? {
                          borderColor: 'var(--theme-primary)',
                          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
                          boxShadow: '0 8px 22px -2px color-mix(in srgb, var(--theme-primary) 30%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.1)'
                        } : {
                          borderColor: 'var(--theme-border-subtle)',
                          backgroundColor: 'var(--theme-card, var(--theme-surface))',
                          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)'
                        }}
                        className={`w-full p-2.5 sm:p-3 rounded-xl border-[1.5px] flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected ? 'shadow-md ring-1 ring-[var(--theme-primary)]/30' : 'hover:border-[var(--theme-primary)]/50 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg sm:text-xl shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--theme-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shadow-xs">
                            {metodo.icon}
                          </span>
                          <div>
                            <p className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[var(--theme-primary)]' : 'text-theme-text'}`}>
                              {metodo.label}
                            </p>
                            <p className="text-[11px] text-theme-text-muted mt-0.5 leading-tight">{metodo.sub}</p>
                          </div>
                        </div>

                        {/* Indicador de Selección Circular / Radio */}
                        <div 
                          className="w-5 h-5 rounded-full border-[2px] flex items-center justify-center shrink-0 ml-2.5 transition-all"
                          style={{
                            borderColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-border-subtle)',
                            backgroundColor: isSelected ? 'var(--theme-primary)' : 'transparent'
                          }}
                        >
                          {isSelected && (
                            <span className="text-white text-[10px] font-extrabold leading-none">✓</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {!metodoPago && (
                  <p className="text-[11px] text-amber-500 font-semibold mt-2 flex items-center gap-1">
                    ⚠️ Selecciona un método de pago para continuar
                  </p>
                )}
              </div>

              <div 
                style={{ 
                  backgroundColor: 'var(--theme-card, var(--theme-surface))', 
                  borderColor: 'var(--theme-border-subtle)',
                  boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
                }} 
                className="rounded-xl p-4 mb-6 text-xs space-y-2 border-[1.5px]"
              >
                <div className="flex justify-between">
                  <span className="text-theme-text-muted">
                    Subtotal ({totalArticulos} productos)
                  </span>
                  <span className="text-theme-text font-medium">${subtotal.toLocaleString()} MXN</span>
                </div>
                {tipoPedido === 'delivery' && (
                  <div className="flex justify-between">
                    <span className="text-theme-text-muted">Envío</span>
                    <span className="text-theme-text font-medium">
                      {subtotal >= 500 ? <span className="text-emerald-500 font-semibold">Gratis</span> : '$50 MXN'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--theme-border-subtle)] pt-2 mt-2">
                  <span className="text-theme-text font-medium text-sm">Total a pagar</span>
                  <span className="text-[var(--theme-primary)] font-bold text-lg">
                    ${total.toLocaleString()} MXN
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={formularioInvalido || enviandoPedido}
                  onClick={confirmarPedido}
                  style={(formularioInvalido || enviandoPedido) ? {
                    backgroundColor: 'var(--theme-border-subtle, #e2e8f0)',
                    borderColor: 'var(--theme-border-subtle, #cbd5e1)',
                    color: 'var(--theme-text-muted, #94a3b8)',
                    boxShadow: 'none'
                  } : {
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #ffffff)',
                    borderColor: 'transparent',
                    boxShadow: '0 8px 24px -4px color-mix(in srgb, var(--theme-primary) 45%, transparent), 0 3px 8px -1px rgba(0, 0, 0, 0.12)'
                  }}
                  className={`w-full font-bold py-3.5 rounded-xl text-sm border-[1.5px] transition-all duration-200 flex items-center justify-center gap-2 group ${
                    (formularioInvalido || enviandoPedido)
                      ? 'cursor-not-allowed opacity-65 grayscale-[0.3]'
                      : 'cursor-pointer hover:border-white/40 hover:brightness-110 hover:shadow-[0_14px_30px_-4px_color-mix(in_srgb,var(--theme-primary)_65%,transparent),0_6px_14px_-2px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
                  }`}
                >
                  {enviandoPedido ? (
                    <span>Enviando pedido...</span>
                  ) : (
                    <>
                      <span>Confirmar pedido</span>
                      <span className={`transition-transform duration-200 font-extrabold ${!(formularioInvalido || enviandoPedido) ? 'group-hover:scale-125 group-hover:translate-x-0.5' : ''}`}>✓</span>
                    </>
                  )}
                </button>
              </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL / BOTTOM SHEET DE FILTROS */}
      <AnimatePresence>
        {mostrarFiltrosModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3.5 sm:px-4 pb-0 pt-10">
            {/* Backdrop con blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMostrarFiltrosModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Panel Modal / Bottom Sheet con altura fija porcentual y separado de los lados */}
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                backgroundColor: 'var(--theme-surface)'
              }}
              className="relative w-full sm:max-w-lg h-[68vh] sm:h-[650px] sm:max-h-[82vh] rounded-t-3xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl flex flex-col z-10 overflow-hidden mb-0"
            >
              {/* Encabezado con color primario del restaurante y bordes del color primario */}
              <div 
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  borderColor: 'var(--theme-primary)',
                  color: 'var(--theme-primary-contrast, #ffffff)'
                }}
                className="px-5 pt-3 pb-4 border-t-2 border-x-2 border-b border-b-black/15 border-[var(--theme-primary)] rounded-t-3xl sm:rounded-t-2xl flex flex-col flex-shrink-0"
              >
                {/* Indicador táctil en móvil */}
                <div className="w-10 h-1 bg-white/35 rounded-full mx-auto mb-2.5 sm:hidden flex-shrink-0" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white font-serif leading-tight">
                        Filtros y preferencias
                      </h3>
                      {totalFiltrosActivos > 0 ? (
                        <span className="text-[10px] text-white/95 font-semibold bg-white/25 px-2 py-0.5 rounded-full inline-block mt-1">
                          {totalFiltrosActivos} filtro{totalFiltrosActivos > 1 ? 's' : ''} aplicado{totalFiltrosActivos > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <p className="text-[10px] text-white/80 mt-0.5">
                          Personaliza tu búsqueda en el menú
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarFiltrosModal(false)}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                    title="Cerrar filtros"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Contenedor inferior (Body + Footer) con bordes del Tono 1 */}
              <div 
                style={{ borderColor: 'var(--theme-border-subtle)' }}
                className="flex-1 flex flex-col min-h-0 border-x-2 border-b-2 sm:rounded-b-2xl overflow-hidden"
              >
                {/* Contenido con scroll */}
                <div className="px-5 py-4 overflow-y-auto space-y-6 text-left flex-1 min-h-0 scrollbar-thin">
                {/* 1. Presupuesto por platillo */}
                <div className="space-y-2.5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-extrabold text-[var(--theme-primary)] flex items-center gap-1.5">
                      <span>💵</span> Presupuesto por platillo
                    </h4>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Elige el rango de precio que buscas para comer hoy:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {rangosPreciosDinamicos.map((rango) => {
                      const activo = filtroPrecio === rango.id
                      return (
                        <button
                          key={rango.id}
                          type="button"
                          onClick={() => setFiltroPrecio(activo ? null : rango.id)}
                          className={`p-3 rounded-2xl border-[1.5px] transition-all text-left cursor-pointer flex items-center justify-between select-none active:scale-[0.98] ${
                            activo
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 shadow-sm'
                              : 'border-[var(--theme-border-subtle)] bg-[var(--theme-card,var(--theme-surface))] hover:border-theme-text-muted/40'
                          }`}
                        >
                          <div className="flex flex-col pr-1">
                            <span className={`text-xs font-bold leading-tight ${
                              activo ? 'text-[var(--theme-primary)]' : 'text-theme-text'
                            }`}>
                              {rango.label}
                            </span>
                            <span className="text-[10px] text-theme-text-muted mt-0.5">
                              {rango.desc}
                            </span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                            activo
                              ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-xs'
                              : 'border-theme-text-muted/40 bg-[var(--theme-surface)]'
                          }`}>
                            {activo && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Rango manual directo sin doble contenedor */}
                  <div className="mt-3 pt-3 border-t border-[var(--theme-border-subtle)]/60">
                    <p className="text-[11px] text-theme-text-muted mb-2 font-medium">O escribe una cantidad exacta:</p>
                    <div className="flex items-center gap-2">
                      {/* Desde */}
                      <div className="flex-1 bg-[var(--theme-card,var(--theme-surface))] border border-[var(--theme-border-subtle)] focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/20 rounded-2xl px-3 py-2 transition-all">
                        <label className="text-[9px] uppercase font-extrabold text-theme-text-muted tracking-wider block">
                          Desde
                        </label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-[var(--theme-primary)]">$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={precioMin}
                            onChange={(e) => {
                              setPrecioMin(e.target.value)
                              setFiltroPrecio(null)
                            }}
                            className="w-full bg-transparent text-xs sm:text-sm font-bold text-theme-text focus:outline-none placeholder:text-theme-text-muted/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[9px] text-theme-text-muted font-bold">MXN</span>
                        </div>
                      </div>

                      {/* Separador */}
                      <span className="text-theme-text-muted/50 font-bold text-xs flex-shrink-0">
                        ➔
                      </span>

                      {/* Hasta */}
                      <div className="flex-1 bg-[var(--theme-card,var(--theme-surface))] border border-[var(--theme-border-subtle)] focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/20 rounded-2xl px-3 py-2 transition-all">
                        <label className="text-[9px] uppercase font-extrabold text-theme-text-muted tracking-wider block">
                          Hasta
                        </label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-[var(--theme-primary)]">$</span>
                          <input
                            type="number"
                            placeholder="Sin límite"
                            value={precioMax}
                            onChange={(e) => {
                              setPrecioMax(e.target.value)
                              setFiltroPrecio(null)
                            }}
                            className="w-full bg-transparent text-xs sm:text-sm font-bold text-theme-text focus:outline-none placeholder:text-theme-text-muted/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[9px] text-theme-text-muted font-bold">MXN</span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback activo al escribir */}
                    {(precioMin !== '' || precioMax !== '') && (
                      <div className="flex items-center justify-between mt-2 pt-1 text-[11px] px-1">
                        <span className="text-[var(--theme-primary)] font-bold flex items-center gap-1">
                          ✓ Rango: ${precioMin || '0'} a ${precioMax ? `$${precioMax}` : 'más'}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setPrecioMin(''); setPrecioMax('') }}
                          className="text-red-500 hover:underline cursor-pointer text-[10px] font-bold"
                        >
                          Borrar monto
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Recomendaciones y ofertas */}
                <div className="space-y-2.5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-extrabold text-[var(--theme-primary)] flex items-center gap-1.5">
                      <span>✨</span> Recomendaciones y ofertas
                    </h4>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Encuentra platillos con promociones o los favoritos de la casa:
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'mas_pedido',      label: '🔥 Los más pedidos' },
                      { id: 'promocion',       label: '🏷️ Con descuento o 2x1' },
                      { id: 'oferta_especial', label: '🎁 Ofertas especiales' },
                      { id: 'chef',            label: '⭐ Recomendados del chef' },
                      { id: 'nuevo',           label: '✨ Platillos nuevos' },
                      { id: 'favorito',        label: '❤️ Favoritos de la gente' },
                      { id: 'disponible',      label: '✓ Disponibles para entrega hoy' },
                    ].filter(f => tieneProductosCumplen(f.id)).map((filtro) => {
                      const activo = filtrosActivos.includes(filtro.id)
                      return (
                        <button
                          key={filtro.id}
                          type="button"
                          onClick={() => toggleFiltro(filtro.id)}
                          style={activo ? {
                            backgroundColor: 'var(--theme-primary)',
                            borderColor: 'var(--theme-primary)',
                            color: 'var(--theme-primary-contrast, #ffffff)',
                            boxShadow: '0 2px 8px -1px color-mix(in srgb, var(--theme-primary) 35%, transparent)'
                          } : {}}
                          className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                            activo
                              ? 'font-bold'
                              : 'border-[var(--theme-border-subtle)] bg-[var(--theme-card,var(--theme-surface))] text-theme-text hover:border-theme-text-muted/50'
                          }`}
                        >
                          <span>{filtro.label}</span>
                          {activo && <span className="text-[10px] font-black">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Dietas e ingredientes especiales */}
                <div className="space-y-2.5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-extrabold text-[var(--theme-primary)] flex items-center gap-1.5">
                      <span>🥗</span> Dietas e ingredientes especiales
                    </h4>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Selecciona si tienes alguna restricción alimentaria:
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'vegetariano', label: 'Vegetariano', desc: 'Sin carne de res, cerdo, pollo ni pescado', icon: '🌱' },
                      { id: 'vegano',      label: 'Vegano',      desc: '100% origen vegetal (sin lácteos, huevo ni miel)', icon: '🌿' },
                      { id: 'sinGluten',   label: 'Sin gluten',  desc: 'Apto para personas sensibles al trigo o celíacas', icon: '🌾' },
                      { id: 'sinLacteos',  label: 'Sin lácteos', desc: 'Sin leche, queso, crema ni derivados lácteos', icon: '🥛' },
                      { id: 'sinPicante',  label: 'Sin picante', desc: 'Sabores suaves, apto para toda la familia y niños', icon: '🌶' },
                    ].map((r) => {
                      const activa = restriccionesActivas.includes(r.id)
                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleRestriccion(r.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            activa
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 font-bold'
                              : 'border-[var(--theme-border-subtle)] bg-[var(--theme-card,var(--theme-surface))] hover:border-theme-text-muted/40'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 pr-2">
                            <span className="text-base mt-0.5">{r.icon}</span>
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold ${activa ? 'text-[var(--theme-primary)]' : 'text-theme-text'}`}>
                                {r.label}
                              </span>
                              <span className="text-[10px] text-theme-text-muted font-normal mt-0.5 leading-tight">
                                {r.desc}
                              </span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            activa
                              ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-xs'
                              : 'border-theme-text-muted/40 bg-[var(--theme-surface)]'
                          }`}>
                            {activa && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Barra inferior de acciones */}
              <div className="p-4 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-surface)] flex items-center gap-3 flex-shrink-0">
                {totalFiltrosActivos > 0 && (
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="px-4 py-2.5 rounded-xl border border-[var(--theme-border-subtle)] text-xs font-semibold text-theme-text-muted hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMostrarFiltrosModal(false)}
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #ffffff)'
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Ver {platillosFiltrados.length} platillo{platillosFiltrados.length !== 1 ? 's' : ''}</span>
                  <span className="text-xs font-black">✓</span>
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMACIÓN FINAL */}
      <AnimatePresence>
        {pedidoConfirmado && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)' }}
              className="text-center max-w-sm border p-8 rounded-2xl shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[var(--theme-primary)]" />
              </div>
              <h3 className="text-theme-text font-serif text-3xl font-normal mb-3">¡Pedido confirmado!</h3>
              <p className="text-theme-text-muted text-sm mb-1">Tu número de pedido es</p>
              <p className="text-[var(--theme-primary)] text-3xl sm:text-4xl font-mono font-bold mb-4 tracking-wider">
                {String(numeroPedido).startsWith('#') || String(numeroPedido).startsWith('PED-') || String(numeroPedido).includes('-') ? numeroPedido : `#AU-${numeroPedido}`}
              </p>
              {tipoPedido === 'delivery' ? (
                <p className="text-theme-text-muted text-sm">Tu pedido será entregado por nuestro repartidor</p>
              ) : (
                <p className="text-theme-text-muted text-sm">Tu pedido estará listo para recoger en sucursal</p>
              )}
              <p className="text-theme-text-muted/70 text-xs mt-3 mb-8">
                Te contactaremos al {telefonoClienteConfirmado} si hay alguna novedad con tu pedido.
              </p>
              <button
                onClick={() => { setPedidoConfirmado(false); limpiarCarrito() }}
                style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                className="border hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-contrast, #ffffff)] px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Hacer otro pedido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
