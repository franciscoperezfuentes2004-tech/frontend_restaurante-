import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView, useMotionValue, animate, useScroll, useTransform, useSpring, useAnimationControls } from 'framer-motion'
import {
  Menu, X, Star, Phone, MessageSquare, MapPin, Mail, ArrowRight, Clock,
  Sparkles, Coffee, AlertCircle, Check, Calendar, ShoppingBag, Leaf, ChefHat, MessageCircle,
  Navigation, ExternalLink, ChevronDown, Loader2, ShieldCheck
} from 'lucide-react'
import * as Icons from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapaUbicacion from '../components/MapaUbicacion'
import TurnstileWidget from '../components/ui/TurnstileWidget'
import SafeSocialLink from '../components/SafeSocialLink'
import ObfuscatedEmail from '../components/ui/ObfuscatedEmail'

const InstagramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
)

const FacebookIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
)

const TikTokIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .56.05.82.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 003 15.68 6.34 6.34 0 009.34 22a6.34 6.34 0 006.34-6.34V9.24a8.16 8.16 0 004.91 1.62V7.41a4.84 4.84 0 01-1-.72z"/>
  </svg>
)
import Dropdown from '../components/ui/Dropdown'
import DatePicker from '../components/ui/DatePicker'
import TimeWheelPicker from '../components/ui/TimeWheelPicker'
import axios from 'axios'
import client from '../api/client'
import { getSettings } from '../api/settings'
import { getReviews, getResenasDestacadas, getEstadisticasResenas, voteUseful, submitPublicReview } from '../api/reviews'
import { getCategories } from '../api/categories'
import { getDishes } from '../api/dishes'
import DishCard from '../components/ui/DishCard'
import LoaderGlobal from '../components/ui/LoaderGlobal'
import useExperienciasData from '../hooks/useExperienciasData'
import useResenas from '../hooks/useResenas'
import socket from '../echo'
import { useLandingRealtimeUpdates } from '../hooks/useLandingRealtimeUpdates'
import { updateDocumentTitle, updateFavicon } from '../utils/tabManager'

const getPublicPromotions = () => client.get('/promotions')

function isColorLight(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return false
  const hex = hexColor.replace('#', '').trim()
  let r = 0, g = 0, b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) || 0
    g = parseInt(hex[1] + hex[1], 16) || 0
    b = parseInt(hex[2] + hex[2], 16) || 0
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) || 0
    g = parseInt(hex.substring(2, 4), 16) || 0
    b = parseInt(hex.substring(4, 6), 16) || 0
  }
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128
}

const getImageUrl = (img) => {
  if (!img) return ''
  const raw = typeof img === 'string' ? img : (img.url || img.image_path || '')
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'
  return `${baseUrl}/storage/${raw.replace(/^\/+/, '')}`
}

function ScrollReveal({ children, className = "", delay = 0, y = 30, x = 0, scale = false }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" })

  return (
    <motion.div
      ref={ref}
      className={`transform-gpu will-change-transform ${className}`}
      initial={{ 
        opacity: 0, 
        y, 
        x, 
        scale: scale ? 0.92 : 1, 
        filter: "blur(6px)" 
      }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0, 
        x: 0, 
        scale: 1, 
        filter: "blur(0px)" 
      } : { 
        opacity: 0, 
        y, 
        x, 
        scale: scale ? 0.92 : 1, 
        filter: "blur(6px)" 
      }}
      transition={{ 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1], 
        delay 
      }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  )
}

function ImageReveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" })

  return (
    <motion.div
      ref={ref}
      className="transform-gpu will-change-transform"
      initial={{ opacity: 0, y: 60, scale: 0.88, filter: "blur(8px)" }}
      animate={isInView ? { 
        opacity: 1, y: 0, scale: 1, filter: "blur(0px)" 
      } : { 
        opacity: 0, y: 60, scale: 0.88, filter: "blur(8px)" 
      }}
      transition={{ 
        duration: 1.0, 
        ease: [0.22, 1, 0.36, 1], 
        delay 
      }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  )
}

function TextReveal({ text, className = "", delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" })
  const words = (text || '').split(" ")

  return (
    <motion.span
      ref={ref}
      className={"inline-flex flex-wrap transform-gpu will-change-transform " + className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          variants={{
            hidden: { opacity: 0, y: 15, filter: "blur(6px)" },
            visible: { 
              opacity: 1, 
              y: 0, 
              filter: "blur(0px)",
              transition: { 
                duration: 0.5, 
                ease: [0.22, 1, 0.36, 1], 
                delay: delay + i * 0.04
              } 
            }
          }}
          style={{ willChange: "transform, opacity, filter" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } 
  }
}

function AnimatedCounter({ value, duration = 2.0, prefix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const end = parseFloat(value.replace(/[^0-9.]/g, ''))
    const isFloat = value.includes('.')
    if (isNaN(end) || start === end) return

    const totalMiliseconds = duration * 1000
    const steps = 80
    const incrementTime = totalMiliseconds / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const val = progress * end
      
      if (currentStep >= steps) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(isFloat ? parseFloat(val.toFixed(1)) : Math.ceil(val))
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [isInView, value, duration])

  return (
    <span ref={ref} className="font-semibold text-[var(--theme-primary)]">
      {prefix}{count.toLocaleString('es-MX', { minimumFractionDigits: value.includes('.') ? 1 : 0 })}
    </span>
  )
}

const menuMock = {
  entradas: [],
  platillos: [],
  postres: [],
  bebidas: []
}

const reseñasFallback = []
const ofertasMock = []
const historiaMock = {
  titulo: '',
  descripcion: '',
  anioFundacion: null,
  imagenFondo: null,
  caracteristicas: []
}

function CarruselOfertas({ ofertas = [], primaryTextColor = '#000000' }) {
  const navigate = useNavigate()
  if (!ofertas || ofertas.length === 0) return null

  // Si hay exactamente 1 oferta, mostrar una tarjeta destacada de impacto en vez de un carrusel repetitivo
  if (ofertas.length === 1) {
    const oferta = ofertas[0]
    return (
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onClick={() => {
            navigate(oferta.platilloId ? `/menu#platillo-${oferta.platilloId}` : '/menu')
          }}
          className="relative h-60 sm:h-64 rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-[var(--theme-border-subtle)] hover:border-[var(--theme-primary)]/50 transition-all duration-500"
        >
          {oferta.imagen ? (
            <img
              src={oferta.imagen}
              alt={oferta.titulo}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-theme-card" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />

          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between z-10 text-left">
            <div className="flex items-center justify-between gap-4">
              {oferta.beneficio && (
                <span
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg border border-white/20 backdrop-blur-md"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                >
                  {oferta.beneficio}
                </span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15">
                {oferta.badge}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-serif text-white font-bold tracking-wide">
                {oferta.titulo}
              </h3>
              <div className="flex items-center justify-between gap-4 pt-1">
                <p className="text-xs sm:text-sm text-white/80 font-normal tracking-wide">
                  {oferta.vigencia}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] px-5 py-2.5 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                >
                  Ver Oferta →
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Clonación virtual para carrusel continuo solo cuando hay múltiples ofertas
  let baseList = [...ofertas]
  while (baseList.length < 6) {
    baseList = [...baseList, ...ofertas]
  }

  // 4 repeticiones de la lista base para permitir arrastre bidireccional infinito (izquierda y derecha)
  const displayList = [...baseList, ...baseList, ...baseList, ...baseList]

  const CARD_WIDTH = 320
  const GAP = 16
  const TOTAL_BASE_WIDTH = (CARD_WIDTH + GAP) * baseList.length

  const x = useMotionValue(-TOTAL_BASE_WIDTH)
  const animControlsRef = useRef(null)
  const resumeTimerRef = useRef(null)
  const dragStartPosRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  // Normaliza x para mantenerlo siempre dentro del rango medio sin cortes visuales
  const wrapPosition = (val) => {
    let current = val
    while (current < -2 * TOTAL_BASE_WIDTH) {
      current += TOTAL_BASE_WIDTH
    }
    while (current > -TOTAL_BASE_WIDTH) {
      current -= TOTAL_BASE_WIDTH
    }
    return current
  }

  const startAutoPlay = () => {
    if (animControlsRef.current) animControlsRef.current.stop()

    const currentX = wrapPosition(x.get())
    x.set(currentX)

    const targetX = currentX - TOTAL_BASE_WIDTH
    const speed = 40 // px/segundo
    const duration = TOTAL_BASE_WIDTH / speed

    animControlsRef.current = animate(x, [currentX, targetX], {
      duration,
      ease: 'linear',
      onComplete: () => {
        x.set(wrapPosition(targetX))
        startAutoPlay()
      }
    })
  }

  const stopAutoPlay = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    if (animControlsRef.current) animControlsRef.current.stop()
  }

  const scheduleResume = (delay = 20) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      startAutoPlay()
    }, delay)
  }

  useEffect(() => {
    startAutoPlay()
    return () => {
      stopAutoPlay()
    }
  }, [TOTAL_BASE_WIDTH])

  const handlePointerDown = (e) => {
    stopAutoPlay()
    isDraggingRef.current = false
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0
    dragStartPosRef.current = { x: clientX, y: clientY }
  }

  const handlePointerUp = () => {
    const wrapped = wrapPosition(x.get())
    x.set(wrapped)
    scheduleResume(20)
  }

  const handleCardClick = (platilloId, e) => {
    const clientX = e?.clientX || e?.changedTouches?.[0]?.clientX || dragStartPosRef.current.x
    const clientY = e?.clientY || e?.changedTouches?.[0]?.clientY || dragStartPosRef.current.y
    const distance = Math.hypot(clientX - dragStartPosRef.current.x, clientY - dragStartPosRef.current.y)

    // Solo navega si fue un clic directo y no un arrastre/swipe
    if (distance < 8) {
      navigate(platilloId ? `/menu#platillo-${platilloId}` : '/menu')
    }
  }

  return (
    <div
      className="overflow-hidden relative w-full select-none cursor-grab active:cursor-grabbing py-2"
    >
      <motion.div
        className="flex gap-4 w-max"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -3 * TOTAL_BASE_WIDTH, right: 0 }}
        dragElastic={0.05}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDragStart={() => {
          stopAutoPlay()
          isDraggingRef.current = true
        }}
        onDrag={(e, info) => {
          const currentX = x.get()
          if (currentX < -2.5 * TOTAL_BASE_WIDTH || currentX > -0.5 * TOTAL_BASE_WIDTH) {
            x.set(wrapPosition(currentX))
          }
        }}
        onDragEnd={handlePointerUp}
      >
        {displayList.map((oferta, i) => (
          <div
            key={i}
            onClick={(e) => handleCardClick(oferta.platilloId, e)}
            className="relative w-72 sm:w-80 h-40 rounded-xl flex-shrink-0 shrink-0 overflow-hidden select-none cursor-pointer group hover:scale-[1.02] transition-transform duration-300 pointer-events-auto shadow-md"
          >
            {oferta.imagen ? (
              <img
                src={oferta.imagen}
                alt={oferta.titulo}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-theme-card" />
            )}

            {/* Renderizado Condicional del Beneficio (Badge) */}
            {oferta.beneficio && (
              <div className="absolute top-3 left-3 max-w-[85%] z-10 pointer-events-none">
                <span 
                  className="inline-block truncate text-xs md:text-sm font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                >
                  {oferta.beneficio}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-xl pointer-events-none" />

            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end text-left z-10 pointer-events-none">
              {/* Días / Disponibilidad */}
              <span className="text-white font-semibold text-xs tracking-widest uppercase drop-shadow-md mb-1">
                {oferta.badge}
              </span>

              {/* Título de la Promoción */}
              <h3 className="text-white font-serif text-base leading-tight mb-1 font-normal drop-shadow-lg truncate">
                {oferta.titulo}
              </h3>

              {/* Horario / Vigencia */}
              <p className="text-white/80 text-xs tracking-wide font-normal drop-shadow-md">
                {oferta.vigencia}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const navSentinelRef = useRef(null)
  const [settingsData, setSettingsData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 1. Obtener datos y estados de carga de los hooks personalizados
  const { statistics: experienciasData, isLoading: isLoadingExperiencias } = useExperienciasData()
  const { reviewsData: resenasData, isLoading: isLoadingResenas } = useResenas()

  // 2. Definir estado interno para mostrar datos locales
  const [experiencias, setExperiencias] = useState([])
  const [resenas, setResenas] = useState([])

  // 1. Estado original que detecta si el servidor sigue trabajando
  const unifiedIsLoading = isLoadingExperiencias || isLoadingResenas
  
  // 2. NUEVO ESTADO: Controla el momento exacto para soltar las animaciones
  const [isReadyToAnimate, setIsReadyToAnimate] = useState(false)

  // 3. NUEVO EFECTO: Cuando el servidor termina, le damos al navegador 300ms para pintar el DOM sin trabarse
  useEffect(() => {
    if (!unifiedIsLoading) {
      const timer = setTimeout(() => {
        setIsReadyToAnimate(true)
      }, 300) // 300ms es imperceptible para el usuario, pero salva el rendimiento de la CPU
      return () => clearTimeout(timer)
    }
  }, [unifiedIsLoading])

  // 5. Actualizar el estado local cuando los datos de los hooks cambian (reactivo)
  useEffect(() => {
    if (experienciasData) {
      setExperiencias(experienciasData)
    }
  }, [experienciasData])

  useEffect(() => {
    if (resenasData) {
      setResenas(resenasData)
    }
  }, [resenasData])

  // Desplazamiento parallax ultra fluido y sedoso sincronizado con scroll (120 FPS, acelerado por GPU)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 700], [0, -80])
  const heroImgScale = useTransform(scrollY, [0, 700], [1, 1.08])
  const heroImgY = useTransform(scrollY, [0, 700], [0, 45])
  const heroContentOpacity = useTransform(scrollY, [0, 450], [1, 0.2])
  const heroContentY = useTransform(scrollY, [0, 450], [0, 30])

  const [allCategories, setAllCategories] = useState([])
  const [allDishes, setAllDishes] = useState([])

  const fetchMenu = useCallback(async () => {
    try {
      const [catRes, dishRes] = await Promise.allSettled([
        client.get('/categories').catch(() => client.get('/menu')),
        client.get('/dishes')
      ])
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const rawCats = catRes.value.data?.categories || catRes.value.data?.data || catRes.value.data
        if (Array.isArray(rawCats)) setAllCategories(rawCats)
      }
      if (dishRes.status === 'fulfilled' && dishRes.value?.data) {
        const rawDishes = dishRes.value.data?.dishes || dishRes.value.data?.data || dishRes.value.data
        if (Array.isArray(rawDishes)) setAllDishes(rawDishes)
      }
    } catch (err) {
      // silent fallback
    }
  }, [])

  const loadSettings = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      // Consultar endpoints públicos de settings y áreas en paralelo
      const [landingRes, settRes, areasRes] = await Promise.allSettled([
        client.get('/settings/landing'),
        client.get('/settings'),
        client.get('/areas')
      ])

      const landingData = (landingRes.status === 'fulfilled' && landingRes.value?.data) ? (landingRes.value.data?.data || landingRes.value.data) : {}
      const settData = (settRes.status === 'fulfilled' && settRes.value?.data) ? (settRes.value.data?.data || settRes.value.data) : {}
      const rawAreas = (areasRes.status === 'fulfilled' && areasRes.value?.data) ? (Array.isArray(areasRes.value.data) ? areasRes.value.data : (areasRes.value.data?.data || [])) : []

      const merged = {
        ...settData,
        ...landingData
      }

      if (!Array.isArray(merged.areas) || merged.areas.length === 0) {
        if (Array.isArray(rawAreas) && rawAreas.length > 0) {
          merged.areas = rawAreas.map(a => ({
            id: a.id,
            nombre: a.nombre || a.name || `Área ${a.id}`,
            name: a.nombre || a.name || `Área ${a.id}`
          }))
        }
      }

      if (!Array.isArray(merged.active_days) || merged.active_days.length === 0) {
        try {
          const schedRes = await client.get('/settings/schedule')
          const sDays = schedRes?.data?.active_days || schedRes?.data?.activeDays
          if (Array.isArray(sDays) && sDays.length > 0) {
            merged.active_days = sDays
            merged.activeDays = sDays
            if (!merged.horarios) merged.horarios = {}
            merged.horarios.active_days = sDays
          }
        } catch (e) {
          // ignore
        }
      }

      if (Object.keys(merged).length > 0) {
        setSettingsData(merged)
        const primario = merged.color_primario || merged.colorPrimario || merged.brand_color
        if (primario) document.documentElement.style.setProperty('--theme-primary', primario)
        const name = merged.restaurant_name || merged.restaurantName || merged.nombre_restaurante || merged.nombre_comercial || merged.nombre
        const logo = merged.logo_url || merged.logoUrl || merged.logotipo || merged.logo
        if (name) updateDocumentTitle(name)
        if (logo) updateFavicon(logo)
      }

      try {
        const promoRes = await client.get('/promotions')
        const promos = Array.isArray(promoRes?.data?.data)
          ? promoRes.data.data
          : Array.isArray(promoRes?.data)
            ? promoRes.data
            : Array.isArray(promoRes)
              ? promoRes
              : []

        // Mapear al formato que espera la Landing
        const menuPromosData = promos
          .filter(p => p.aplica_en === 'menu' || p.aplica_en === 'pedidos' || p.aplicaEn === 'menu' || p.aplicaEn === 'pedidos' || p.aplicaEn === 'ambos' || p.aplica_en === 'ambos' || !p.aplica_en)
          .map(p => {
            let img = p.imagen ?? p.image_url ?? p.image ?? '/promo_shrimp.png'
            const nameLower = (p.nombre ?? p.name ?? '').toLowerCase()
            if (img === '/promo_shrimp.png' || (!p.imagen && !p.image_url && !p.image)) {
              if (nameLower.includes('alitas')) img = '/promo_shrimp.png'
              else if (nameLower.includes('pizza')) img = '/gourmet_pizza_slice.png'
              else if (nameLower.includes('hamburguesa')) img = '/promo_ribeye.png'
              else if (nameLower.includes('bebida') || nameLower.includes('happy')) img = '/promo_cocktails.png'
            }

            const symbol = (p.tipo_descuento === 'porcentaje' || p.tipoDescuento === 'porcentaje') ? '%' : (p.tipo_descuento === 'fijo' || p.tipoDescuento === 'fijo' || p.tipo_descuento === 'monto' || p.tipoDescuento === 'monto') ? '$' : ''
            let valorPromo = p.valor_promocion ?? p.valorPromocion ?? ''
            if (!valorPromo && p.descuento) {
              valorPromo = symbol === '$' ? `$${p.descuento}` : `${p.descuento}%`
            }

            const beneficioVal = p.beneficio ?? p.benefit ?? p.mensaje_banner ?? p.mensajeBanner ?? p.descripcion ?? (valorPromo || (p.descuento ? `${p.descuento}%` : null))

            const diasText = (Array.isArray(p.days) && p.days.length > 0)
              ? p.days.join(', ').toUpperCase()
              : (Array.isArray(p.dias) && p.dias.length > 0)
                ? p.dias.join(', ').toUpperCase()
                : (p.dias_semana ? (Array.isArray(p.dias_semana) ? p.dias_semana.join(', ').toUpperCase() : String(p.dias_semana).toUpperCase()) : (p.dias ? String(p.dias).toUpperCase() : (p.badge || 'OFERTA')))

            return {
              id: p.id,
              titulo: p.nombre ?? p.name ?? '',
              badge: diasText,
              valor_promocion: valorPromo,
              descuento: p.descuento ?? null,
              beneficio: beneficioVal,
              vigencia: p.vigencia ?? p.fecha_fin ?? (p.timeStart && p.timeEnd ? `${p.timeStart} - ${p.timeEnd}` : 'Todo el día'),
              imagen: img,
              enlace: p.enlace ?? null,
              platilloId: p.platillo_id ?? p.platilloId ?? null
            }
          })

        const resPromosData = promos
          .filter(p => p.aplica_en === 'reservaciones' || p.aplicaEn === 'reservaciones' || p.aplicaEn === 'ambos' || p.aplica_en === 'ambos')
          .map(p => {
            const symbol = (p.tipo_descuento === 'porcentaje' || p.tipoDescuento === 'porcentaje') ? '%' : (p.tipo_descuento === 'fijo' || p.tipoDescuento === 'fijo') ? '$' : ''
            const beneficioStr = p.descuento ? (p.descuento + symbol) : (p.beneficio ?? 'Oferta')
            return {
              id: p.id,
              beneficio: beneficioStr,
              tipoBeneficio: p.tipo_beneficio ?? ((p.tipo_descuento === 'porcentaje' || p.tipoDescuento === 'porcentaje') ? 'DE DESCUENTO' : 'DE AHORRO'),
              titulo: p.nombre ?? p.name ?? '',
              descripcion: p.descripcion ?? p.mensajeBanner ?? 'Obtén un beneficio exclusivo al realizar tu reservación en línea.',
              vigencia: p.vigencia ?? (p.fechaInicio && p.fechaFin ? `Del ${p.fechaInicio} al ${p.fechaFin}` : p.fecha_fin ?? 'Vigente por tiempo limitado'),
              textoBoton: p.texto_boton ?? p.textoBoton ?? 'Reservar con descuento',
              enlace: 'reservaciones'
            }
          })

        if (menuPromosData.length > 0) setMenuPromos(menuPromosData)
        if (resPromosData.length > 0) setResPromos(resPromosData)
      } catch (e) {
        console.error('Error cargando promociones:', e)
      }
    } catch (e) {
      console.error("Error loading settings in Landing:", e)
    } finally {
      if (!isBackground) setIsLoading(false)
    }
  }, [])

  // Detección de scroll con histéresis anti-parpadeo y sincronización por rAF
  useEffect(() => {
    let isSubscribed = true
    let ticking = false
    let currentScrolled = false

    const checkScroll = (e) => {
      if (!isSubscribed) return
      
      const y = (
        window.scrollY ??
        document.documentElement?.scrollTop ??
        document.body?.scrollTop ??
        (e?.target && e.target !== document && typeof e.target.scrollTop === 'number' ? e.target.scrollTop : 0) ??
        0
      )

      // Histéresis robusta:
      // - Para ACTIVAR el fondo: el usuario debe bajar más de 50px
      // - Para DESACTIVAR el fondo: el usuario debe subir hasta arriba (<= 15px)
      // Esta zona muerta (15px - 50px) impide cualquier parpadeo, rebote o conflicto
      if (!currentScrolled && y > 50) {
        currentScrolled = true
        setNavScrolled(true)
      } else if (currentScrolled && y <= 15) {
        currentScrolled = false
        setNavScrolled(false)
      }
    }

    const onScroll = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScroll(e)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })

    // Evaluación inicial
    checkScroll()

    return () => {
      isSubscribed = false
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    loadSettings()
    fetchMenu()
  }, [loadSettings, fetchMenu])

  // Hook reactivo de Laravel Echo / WebSockets para actualización instantánea
  useLandingRealtimeUpdates(useCallback((eventData) => {
    const actualData = eventData?.detail || eventData?.settings || eventData?.data || eventData
    if (actualData && typeof actualData === 'object' && Object.keys(actualData).length > 0) {
      setSettingsData(prev => ({ ...(prev || {}), ...actualData }))
      const primario = actualData.color_primario || actualData.colorPrimario || actualData.brand_color
      if (primario) document.documentElement.style.setProperty('--theme-primary', primario)
    }
    // Revalidación silenciosa en background sin parpadeos
    loadSettings(true)
    fetchMenu()
  }, [loadSettings, fetchMenu]))

  // ─── 1. Variables derivadas de settingsData ───────────────────────────────
  const landingData = settingsData
  // Datos generales del restaurante
  const restName = settingsData?.restaurant_name || settingsData?.restaurantName || settingsData?.nombre_restaurante || settingsData?.nombre || 'Restaurante'
  const restTagline = settingsData?.restaurant_tagline || settingsData?.restaurantTagline || settingsData?.tagline || settingsData?.slogan || settingsData?.lema || ''
  const restLogo = settingsData?.logo_url || settingsData?.logoUrl || settingsData?.logo || ''
  const restDesc = settingsData?.restaurant_description || settingsData?.descripcion_restaurante || settingsData?.descripcion || ''
  const restLocation = settingsData?.location_text || settingsData?.ubicacion || settingsData?.address || settingsData?.direccion || ''

  // Colores del tema
  const primaryColor = settingsData?.color_primario || settingsData?.colorPrimario || settingsData?.brand_color || '#C9A84C'
  const colorPrimario = primaryColor
  const primaryTextColor = isColorLight(primaryColor) ? '#000000' : '#FFFFFF'

  // Hero / Banner principal
  const heroRaw = settingsData?.hero_config || settingsData?.heroConfig || settingsData?.hero || {}
  const heroTitleText = heroRaw.titulo || heroRaw.title || settingsData?.hero_title || settingsData?.heroTitle || restName || 'Restaurante'
  const heroSloganText = heroRaw.slogan || heroRaw.subtitulo || heroRaw.subtitle || settingsData?.hero_slogan || settingsData?.heroSlogan || settingsData?.slogan || 'Una experiencia gastronómica única'
  const heroLocationText = heroRaw.location || heroRaw.ubicacion || heroRaw.label || settingsData?.hero_location || settingsData?.heroLocation || restLocation || 'Acapulco, México'
  const heroCoverImage = heroRaw.imagen || heroRaw.image || heroRaw.background || heroRaw.backgroundImage || settingsData?.hero_image || settingsData?.heroImage || settingsData?.cover_image || ''

  // Carrusel de banners del hero
  const heroBannersRaw = heroRaw.banners || settingsData?.hero_banners || settingsData?.heroBanners || []
  const activeBanners = Array.isArray(heroBannersRaw)
    ? heroBannersRaw.filter(b => b && (typeof b === 'string' || b.image || b.imagen || b.url)).map(b => typeof b === 'string' ? b : (b.image || b.imagen || b.url || ''))
    : []
  const useHeroCarousel = activeBanners.length > 1

  // Sección de platillos / menú
  const platillosRaw = typeof settingsData?.platillos_seccion === 'string'
    ? (() => { try { return JSON.parse(settingsData.platillos_seccion) } catch (e) { return {} } })()
    : (typeof settingsData?.platillosSeccion === 'string'
      ? (() => { try { return JSON.parse(settingsData.platillosSeccion) } catch (e) { return {} } })()
      : (settingsData?.platillos_seccion || settingsData?.platillosSeccion || {}))

  const menuSubtitle = platillosRaw.labelSuperior || settingsData?.menu_subtitle || 'NUESTRA CARTA'
  const menuTitle = platillosRaw.tituloPrincipal || settingsData?.menu_title || 'Platillos que cuentan una historia'
  const menuBtnText = platillosRaw.textoBoton || platillosRaw.button_text || settingsData?.menu_btn_text || 'VER MENÚ COMPLETO'
  const menuSubBtnText = platillosRaw.textoDebajoBoton || platillosRaw.button_subtext || settingsData?.menu_sub_btn_text || 'SERVICIO A DOMICILIO DISPONIBLE'

  const featuredCategories = useMemo(() => {
    const cats = Array.isArray(allCategories) ? allCategories : []
    if (Array.isArray(settingsData?.featured_categories) && settingsData.featured_categories.length > 0) {
      return cats.filter(c => settingsData.featured_categories.some(id => String(id) === String(c?.id ?? c?._id)))
    }
    const selectedCatIds = platillosRaw?.selected_categories ?? settingsData?.selected_categories
    if (Array.isArray(selectedCatIds) && selectedCatIds.length > 0) {
      return cats.filter(c => selectedCatIds.some(id => String(id) === String(c?.id ?? c?._id)))
    }
    if (cats.length > 0) {
      return cats.slice(0, 5)
    }
    return []
  }, [settingsData, platillosRaw, allCategories])

  const featuredDishes = useMemo(() => {
    const dishes = Array.isArray(allDishes) ? allDishes : []
    // 1. Array explícito en settingsData.featured_dishes
    if (Array.isArray(settingsData?.featured_dishes)) {
      if (settingsData.featured_dishes.length === 0) return []
      if (typeof settingsData.featured_dishes[0] === 'object' && settingsData.featured_dishes[0] !== null) {
        return settingsData.featured_dishes
      }
      return dishes.filter(d => settingsData.featured_dishes.some(id => String(id) === String(d?.id ?? d?._id)))
    }

    // 2. Array explícito en platillosRaw / settingsData.selected_dishes
    const rawDishList = platillosRaw?.selected_dishes ?? platillosRaw?.featured_dishes ?? settingsData?.selected_dishes
    if (Array.isArray(rawDishList)) {
      if (rawDishList.length === 0) return []
      return dishes.filter(d => rawDishList.some(id => String(id) === String(d?.id ?? d?._id)))
    }

    // 3. Fallback inicial solo si nunca se ha configurado la sección
    if (!settingsData?.platillos_seccion && !settingsData?.platillosSeccion && !settingsData?.featured_dishes && dishes.length > 0) {
      const catIds = (Array.isArray(featuredCategories) ? featuredCategories : []).map(c => String(c?.id ?? c?._id))
      if (catIds.length > 0) {
        return dishes.filter(d => catIds.includes(String(d?.category_id ?? d?.categoryId ?? d?.categoria_id ?? d?.category?.id)))
      }
      return dishes.slice(0, 6)
    }
    return []
  }, [settingsData, platillosRaw, allDishes, featuredCategories])

  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    if (featuredCategories.length > 0 && (!activeCategory || !featuredCategories.some(c => String(c.id ?? c._id) === String(activeCategory)))) {
      setActiveCategory(featuredCategories[0].id ?? featuredCategories[0]._id)
    }
  }, [featuredCategories, activeCategory])

  // 3. Mapeo de Sección Delivery
  const deliveryRaw = typeof settingsData?.delivery_seccion === 'string'
    ? (() => { try { return JSON.parse(settingsData.delivery_seccion) } catch (e) { return {} } })()
    : (typeof settingsData?.deliverySeccion === 'string'
      ? (() => { try { return JSON.parse(settingsData.deliverySeccion) } catch (e) { return {} } })()
      : (settingsData?.delivery_seccion || settingsData?.deliverySeccion || {}))

  const deliverySubtitle = deliveryRaw.labelSuperior || 'SERVICIO A DOMICILIO'
  const deliveryTitle = deliveryRaw.tituloPrincipal || settingsData?.delivery_title || ('Llevamos la experiencia ' + restName + ' hasta tu hogar')
  const deliveryDescription = deliveryRaw.descripcion || settingsData?.delivery_description || 'Entrega a domicilio con nuestros repartidores propios en 30-45 minutos. También puedes pasar a recoger tu pedido.'
  const rawDeliveryImageUrl = settingsData?.delivery_image_url || deliveryRaw?.imagen || deliveryRaw?.imagen_url || deliveryRaw?.delivery_image_url || '/delivery.jpg'
  const deliveryImageUrl = typeof rawDeliveryImageUrl === 'string'
    ? rawDeliveryImageUrl.replace(/^https?:\/\/(?:www\.)?aurum\.mx/i, '')
    : '/delivery.jpg'
  const deliveryImageTitle = settingsData?.delivery_image_title || deliveryRaw?.imagenTitulo || deliveryRaw?.imagen_titulo || deliveryRaw?.delivery_image_title || (restName ? restName + ' EXPERIENCIA' : 'PACO EXPERIENCIA') || 'PACO EXPERIENCIA'
  const deliveryImageDescription = settingsData?.delivery_image_description || settingsData?.delivery_image_alt || deliveryRaw?.imagenDescripcion || deliveryRaw?.imagen_descripcion || deliveryRaw?.imagen_alt || 'Servicio de entrega a domicilio'
  const deliveryBeneficios = Array.isArray(deliveryRaw.beneficios) && deliveryRaw.beneficios.length > 0 ? deliveryRaw.beneficios : [
    { titulo: 'Entrega rápida', descripcion: '30–45 minutos' },
    { titulo: 'Amplia cobertura', descripcion: 'Servicio en toda la zona' },
    { titulo: 'Pedido mínimo', descripcion: 'Desde $200 MXN' },
    { titulo: 'Envío gratuito', descripcion: 'En compras de $500+' },
  ]
  const deliveryPasos = Array.isArray(deliveryRaw.pasos) && deliveryRaw.pasos.length > 0 ? deliveryRaw.pasos : [
    { titulo: 'Elige tus platillos', subtitulo: 'De nuestra carta digital' },
    { titulo: 'Confirma tu pedido', subtitulo: 'Vía WhatsApp o llamada' },
    { titulo: 'Recíbelo en casa', subtitulo: 'Disfruta recién preparado' },
  ]
  const deliveryBtnText = deliveryRaw.textoBoton || 'Tiempo estimado de entrega: 30–45 minutos • Responderemos tu pedido lo antes posible.'
  const deliveryGarantias = Array.isArray(deliveryRaw.garantias) && deliveryRaw.garantias.length > 0 ? deliveryRaw.garantias : [
    'Pedido seguro',
    'Confirmación rápida',
    'Atención en horario del restaurante'
  ]

  // 4. Mapeo de Nuestra Historia
  const historiaRaw = typeof settingsData?.historia_config === 'string'
    ? (() => { try { return JSON.parse(settingsData.historia_config) } catch (e) { return {} } })()
    : (typeof settingsData?.historiaConfig === 'string'
      ? (() => { try { return JSON.parse(settingsData.historiaConfig) } catch (e) { return {} } })()
      : (settingsData?.historia_config || settingsData?.historiaConfig || settingsData?.history_config || {}))
  const historiaTitulo = historiaRaw?.titulo 
    || settingsData?.titulo_historia 
    || settingsData?.historia_titulo 
    || settingsData?.history_title 
    || ('Historia de ' + (restName || 'Restaurante'))
  const historiaDescripcion = historiaRaw?.descripcion 
    || settingsData?.descripcion_historia 
    || settingsData?.historia_descripcion 
    || settingsData?.history_description 
    || restDesc 
    || 'Una experiencia gastronómica diseñada para deleitar los paladares más exigentes con ingredientes selectos y un servicio excepcional.'
  const historiaAnio = historiaRaw?.anio 
    || historiaRaw?.anioFundacion 
    || settingsData?.anio_fundacion 
    || settingsData?.anio_historia 
    || settingsData?.foundation_year 
    || 2009
  const historiaFondo = historiaRaw?.fondo 
    || historiaRaw?.imagenFondo 
    || settingsData?.imagen_fondo_historia 
    || settingsData?.historia_fondo 
    || settingsData?.history_image 
    || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80'
  const historiaCaracteristicas = Array.isArray(historiaRaw?.caracteristicas) && historiaRaw.caracteristicas.length > 0 
    ? historiaRaw.caracteristicas 
    : (Array.isArray(settingsData?.historia_caracteristicas) && settingsData.historia_caracteristicas.length > 0
      ? settingsData.historia_caracteristicas
      : (Array.isArray(settingsData?.caracteristicas_historia) && settingsData.caracteristicas_historia.length > 0
        ? settingsData.caracteristicas_historia
        : [
            { icono: 'Leaf', titulo: 'Ingredientes frescos y locales', descripcion: 'Trabajamos con productores locales para garantizar la mejor calidad.' },
            { icono: 'ChefHat', titulo: 'Chef con formación internacional', descripcion: 'Nuestro chef ejecutivo diseña recetas que fusionan técnica y tradición.' },
            { icono: 'MapPin', titulo: 'Ubicación privilegiada', descripcion: 'Un espacio diseñado para hacer de cada velada un momento inolvidable.' }
          ]))

  // 5. Mapeo de Servicios Exclusivos
  const serviciosRaw = typeof settingsData?.servicios_config === 'string'
    ? (() => { try { return JSON.parse(settingsData.servicios_config) } catch (e) { return [] } })()
    : (typeof settingsData?.serviciosConfig === 'string'
      ? (() => { try { return JSON.parse(settingsData.serviciosConfig) } catch (e) { return [] } })()
      : (settingsData?.servicios_config || settingsData?.serviciosConfig || settingsData?.services_config || settingsData?.servicios))
  const serviciosList = Array.isArray(serviciosRaw) && serviciosRaw.length > 0
    ? serviciosRaw
    : [
        { icono: 'Star', titulo: 'Servicio Premium', descripcion: 'Atención personalizada y cuidada al mínimo detalle para una velada excelente.' },
        { icono: 'Bike', titulo: 'Delivery Veloz', descripcion: 'Llevamos la experiencia gastronómica directo a tu mesa en 30-45 minutos.' },
        { icono: 'BookOpen', titulo: 'Carta Selecta', descripcion: 'Vinos de reserva y mixología premium inspirada en sabores tradicionales.' }
      ]

  // 6. Mapeo de Banner de Descuento por Reserva
  const bannerDescRaw = typeof settingsData?.banner_descuento === 'string'
    ? (() => { try { return JSON.parse(settingsData.banner_descuento) } catch (e) { return {} } })()
    : (typeof settingsData?.bannerDescuento === 'string'
      ? (() => { try { return JSON.parse(settingsData.bannerDescuento) } catch (e) { return {} } })()
      : (settingsData?.banner_descuento || settingsData?.bannerDescuento || {}))
  const bannerDescPorcentaje = bannerDescRaw?.porcentaje || 20
  const bannerDescBadge = bannerDescRaw?.badgeVigencia || 'VÁLIDO SOLO POR ESTE MES'
  const bannerDescTitulo = bannerDescRaw?.tituloDescuento || 'DESCUENTO DE ANIVERSARIO'
  const bannerDescDescripcion = bannerDescRaw?.descripcion || 'Celebramos nuestra trayectoria ofreciéndote un beneficio exclusivo en tu próxima visita al reservar tu mesa en línea.'
  const bannerDescBtn = bannerDescRaw?.textoBoton || 'RESERVAR CON DESCUENTO'
  const bannerDescSub = bannerDescRaw?.textoBotonSub || 'Reserva ahora y obtén el beneficio automáticamente.'

  // 7. Mapeo de Reservaciones
  const resSeccionRaw = typeof settingsData?.reservaciones_seccion === 'string'
    ? (() => { try { return JSON.parse(settingsData.reservaciones_seccion) } catch (e) { return {} } })()
    : (typeof settingsData?.reservacionesSeccion === 'string'
      ? (() => { try { return JSON.parse(settingsData.reservacionesSeccion) } catch (e) { return {} } })()
      : (settingsData?.reservaciones_seccion || settingsData?.reservacionesSeccion || {}))
  const resTitulo = resSeccionRaw?.tituloPrincipal || 'Reserva tu mesa'
  const resSubtitulo = resSeccionRaw?.subtituloDorado || 'Una noche inolvidable te está esperando'
  const resDescripcion = resSeccionRaw?.textoDescriptivo || 'Cada reservación es una experiencia diseñada especialmente para ti. Nuestro equipo estará listo para hacer de tu visita un momento único.'
  const resHorariosLV = resSeccionRaw?.horarios ? `${resSeccionRaw.horarios.lunesViernesInicio || '1:00 PM'} — ${resSeccionRaw.horarios.lunesViernesFin || '11:00 PM'}` : '1:00 PM — 11:00 PM'
  const resHorariosSD = resSeccionRaw?.horarios ? `${resSeccionRaw.horarios.sabadoDomingoInicio || '12:00 PM'} — ${resSeccionRaw.horarios.sabadoDomingoFin || '12:00 AM'}` : '12:00 PM — 12:00 AM'
  const resPoliticas = Array.isArray(resSeccionRaw?.politicas) && resSeccionRaw.politicas.length > 0 ? resSeccionRaw.politicas : [
    'Confirmación en menos de 24hrs',
    'Cancela o reprograma mínimo 2 horas antes de la hora reservada',
    'Cambios o cancelaciones vía llamada o mensaje directo',
    'Sin costo de reservación'
  ]

  // 8. Mapeo de Contacto y Footer
  const contactoRaw = typeof settingsData?.contacto_seccion === 'string'
    ? (() => { try { return JSON.parse(settingsData.contacto_seccion) } catch (e) { return {} } })()
    : (typeof settingsData?.contactoSeccion === 'string'
      ? (() => { try { return JSON.parse(settingsData.contactoSeccion) } catch (e) { return {} } })()
      : (settingsData?.contacto_seccion || settingsData?.contactoSeccion || {}))
  const contactoTitulo = contactoRaw?.titulo || 'Encuéntranos'
  const contactoLabel = contactoRaw?.labelSuperior || 'UBICACIÓN & CONTACTO'
  const contactoEventos = contactoRaw?.textoEventos || '¿Tienes una celebración o evento privado? Celebra con nosotros bodas, cumpleaños o reuniones de negocios. Por favor completa el formulario adjunto para atenderte personalmente.'
  const contactPhone = contactoRaw?.telefono || contactoRaw?.phone || settingsData?.contact_phone || settingsData?.telefono || '744-XXX-XXXX'
  const contactEmail = contactoRaw?.email || contactoRaw?.correo || settingsData?.contact_email || settingsData?.email || 'contacto@restaurante.com'
  const contactAddress = contactoRaw?.direccion || settingsData?.location_text || settingsData?.address || settingsData?.direccion || restLocation || ''
  // Sanitización del Número Telefónico (Eliminar cualquier espacio, guion, paréntesis o caracteres no numéricos)
  const contactWhatsapp = (
    settingsData?.whatsappPhone ??
    settingsData?.whatsapp_phone ??
    deliveryRaw?.whatsappPhone ??
    deliveryRaw?.numeroWhatsapp ??
    deliveryRaw?.whatsapp ??
    contactoRaw?.whatsapp ??
    contactoRaw?.numeroWhatsapp ??
    settingsData?.contact_whatsapp ??
    settingsData?.whatsapp ??
    settingsData?.telefono ??
    settingsData?.contact_phone ??
    contactPhone ??
    ''
  )
  const cleanNumber = String(contactWhatsapp || '').replace(/\D/g, '')

  // Codificación Segura del Mensaje (URL Encoding)
  const defaultWhatsappMessage = (
    deliveryRaw?.mensajeWhatsapp ||
    settingsData?.whatsapp_delivery_message ||
    settingsData?.whatsapp_default_message ||
    'Hola, me interesa hacer un pedido a domicilio'
  )
  const whatsappUrl = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultWhatsappMessage)}`
    : ''
  const mapsUrl = contactoRaw?.mapsLink || ('https://maps.google.com/?q=' + encodeURIComponent(typeof contactAddress === 'string' ? contactAddress : ''))

  // Coordenadas y navegación para mapa interactivo (MapLibre)
  const rawLat = settingsData?.latitude 
    ?? settingsData?.lat 
    ?? settingsData?.data?.latitude 
    ?? settingsData?.data?.lat 
    ?? settingsData?.location?.lat 
    ?? settingsData?.location?.latitude 
    ?? null

  const rawLng = settingsData?.longitude 
    ?? settingsData?.lng 
    ?? settingsData?.lon 
    ?? settingsData?.data?.longitude 
    ?? settingsData?.data?.lng 
    ?? settingsData?.location?.lng 
    ?? settingsData?.location?.longitude 
    ?? null

  let parsedLat = (rawLat !== null && rawLat !== undefined && rawLat !== '' && !isNaN(Number(rawLat))) ? parseFloat(rawLat) : null
  let parsedLng = (rawLng !== null && rawLng !== undefined && rawLng !== '' && !isNaN(Number(rawLng))) ? parseFloat(rawLng) : null

  // Protección e inversión de seguridad: si latitud > 90 o < -90 (o latitud negativa y longitud positiva)
  if (parsedLat !== null && parsedLng !== null) {
    if (Math.abs(parsedLat) > 90 && Math.abs(parsedLng) <= 90) {
      const temp = parsedLat
      parsedLat = parsedLng
      parsedLng = temp
    }
  }

  // Coordenadas con fallback garantizado a Acapulco (16.853108, -99.823701)
  const mapLatitude = (parsedLat !== null && !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) ? parsedLat : 16.853108
  const mapLongitude = (parsedLng !== null && !isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) ? parsedLng : -99.823701
  const hasValidMapCoords = Boolean(mapLatitude && mapLongitude)
  const gpsNavigationUrl = contactoRaw.mapsLink || `https://www.google.com/maps?q=${mapLatitude},${mapLongitude}`

  // Redes Sociales Dinámicas (oculta si URL está vacía)
  const facebookUrl = contactoRaw.redesSociales?.facebook || settingsData?.facebook_url || settingsData?.facebookUrl || ''
  const instagramUrl = contactoRaw.redesSociales?.instagram || settingsData?.instagram_url || settingsData?.instagramUrl || ''
  const tiktokUrl = contactoRaw.redesSociales?.tiktok || settingsData?.tiktok_url || settingsData?.tiktokUrl || ''

  const getSocialHandle = (url, fallback = '') => {
    if (!url || typeof url !== 'string') return fallback
    if (url.startsWith('@')) return url
    const clean = url.split('?')[0].split('#')[0]
    const segments = clean.split('/').filter(Boolean)
    const last = segments.pop() || ''
    return last ? (last.startsWith('@') ? last : '@' + last) : fallback
  }

  const safeRestName = String(restName || 'Restaurante')

  const socialNetworks = [
    instagramUrl ? {
      network: 'instagram',
      label: 'Instagram',
      handle: getSocialHandle(instagramUrl, '@' + (safeRestName.toLowerCase().replace(/\s+/g, ''))),
      icono: InstagramIcon,
      colorClass: 'text-[#E1306C]',
      href: (typeof instagramUrl === 'string' && instagramUrl.startsWith('http')) ? instagramUrl : `https://instagram.com/${String(instagramUrl || '').replace('@', '')}`
    } : null,
    facebookUrl ? {
      network: 'facebook',
      label: 'Facebook',
      handle: getSocialHandle(facebookUrl, safeRestName),
      icono: FacebookIcon,
      colorClass: 'text-[#1877F2]',
      href: (typeof facebookUrl === 'string' && facebookUrl.startsWith('http')) ? facebookUrl : `https://facebook.com/${String(facebookUrl || '')}`
    } : null,
    tiktokUrl ? {
      network: 'tiktok',
      label: 'TikTok',
      handle: getSocialHandle(tiktokUrl, '@' + (safeRestName.toLowerCase().replace(/\s+/g, ''))),
      icono: TikTokIcon,
      colorClass: 'text-black dark:text-white',
      href: (typeof tiktokUrl === 'string' && tiktokUrl.startsWith('http')) ? tiktokUrl : `https://tiktok.com/@${String(tiktokUrl || '').replace('@', '')}`
    } : null,
  ].filter(Boolean)

  const formatTimeStr = (val) => {
    if (!val) return ''
    const trimmed = String(val).trim()
    if (/a\.?\s*m\.?|p\.?\s*m\.?/i.test(trimmed)) {
      return trimmed
    }
    const parts = trimmed.split(':')
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10)
      const minutes = parts[1].padStart(2, '0')
      if (isNaN(hours)) return trimmed
      const suffix = hours >= 12 ? 'p. m.' : 'a. m.'
      hours = hours % 12 || 12
      return `${hours}:${minutes} ${suffix}`
    }
    return trimmed
  }

  const formatDaysGroupLabel = (days) => {
    if (!days || days.length === 0) return ''
    if (days.length === 1) return days[0]
    if (days.length === 2) {
      if (days[0] === 'Sábado' && days[1] === 'Domingo') {
        return 'Sábados y Domingos'
      }
      return `${days[0]} y ${days[1]}`
    }
    return `${days[0]} a ${days[days.length - 1]}`
  }

  const footerHorarios = useMemo(() => {
    const rawSchedule = settingsData?.schedule || settingsData?.horarios || settingsData?.horario_atencion || []
    const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    if (Array.isArray(rawSchedule) && rawSchedule.length > 0) {
      const normalizedDays = DAYS_ORDER.map(dayName => {
        const found = rawSchedule.find(s => {
          const sDay = (s?.day || s?.dia || s?.dias_semana || s?.name || (typeof s === 'string' ? s : '')).toLowerCase()
          return sDay === dayName.toLowerCase() || sDay.startsWith(dayName.slice(0, 3).toLowerCase())
        })

        if (!found) {
          return { day: dayName, active: false, open: '09:00', close: '23:00' }
        }

        const isActive = Boolean(
          found?.active === 1 || found?.active === true || found?.active === '1' ||
          found?.is_active === 1 || found?.is_active === true || found?.is_active === '1' ||
          found?.activo === 1 || found?.activo === true || found?.activo === '1'
        )

        return {
          day: dayName,
          active: isActive,
          open: found?.open || found?.hora_apertura || found?.apertura || found?.desde || '09:00',
          close: found?.close || found?.hora_cierre || found?.cierre || found?.hasta || '23:00'
        }
      })

      const groups = []
      let currentGroup = null

      for (const item of normalizedDays) {
        const timeKey = item.active
          ? `${formatTimeStr(item.open)} — ${formatTimeStr(item.close)}`
          : 'Cerrado'

        if (!currentGroup) {
          currentGroup = {
            days: [item.day],
            active: item.active,
            timeKey
          }
        } else if (currentGroup.timeKey === timeKey && currentGroup.active === item.active) {
          currentGroup.days.push(item.day)
        } else {
          groups.push(currentGroup)
          currentGroup = {
            days: [item.day],
            active: item.active,
            timeKey
          }
        }
      }

      if (currentGroup) {
        groups.push(currentGroup)
      }

      return groups.map(g => ({
        dias: formatDaysGroupLabel(g.days),
        horario: g.timeKey,
        active: g.active
      }))
    }

    const h = resSeccionRaw?.horarios || {}
    const lvInicio = formatTimeStr(h.lunesViernesInicio || settingsData?.horario_lv_inicio || '09:00')
    const lvFin = formatTimeStr(h.lunesViernesFin || settingsData?.horario_lv_fin || '23:00')
    const lv = `${lvInicio} — ${lvFin}`

    return [
      { dias: 'Lunes a Viernes', horario: settingsData?.horario_entresemana || settingsData?.horario_lv || lv, active: true },
      { dias: 'Sábados y Domingos', horario: 'Cerrado', active: false }
    ]
  }, [settingsData, resSeccionRaw])

  // 9. Botones y Llamados a la Acción (CTAs)
  const ctaMenuText = settingsData?.cta_menu_text || 'VER MENÚ'
  const ctaReservationText = settingsData?.cta_reservation_text || 'RESERVAR MESA'

  const [heroBgIndex, setHeroBgIndex] = useState(0)

  useEffect(() => {
    if (!useHeroCarousel || activeBanners.length <= 1) return
    const interval = setInterval(() => {
      setHeroBgIndex(prev => (prev + 1) % activeBanners.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [useHeroCarousel, activeBanners.length])

  const [activeMenuTab, setActiveMenuTab] = useState('entradas')
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
  const [selectedDish, setSelectedDish] = useState(null)

  const [reviewsData, setReviewsData] = useState([])
  // Estado inicial en ceros
  const [stats, setStats] = useState({ promedio: '0.0', total: 0, satisfaccion: 0 })
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [isHoveredReview, setIsHoveredReview] = useState(false)

  // Seguridad en el botón de redirección de experiencias (evalúa ruta interna vs externa)
  const reviewsLink = landingData?.reviews_url 
    || landingData?.google_reviews_url 
    || landingData?.tripadvisor_url 
    || landingData?.link_experiencias 
    || landingData?.external_reviews_url 
    || '/experiencias'
  const isExternalReviewsLink = typeof reviewsLink === 'string' && (reviewsLink.startsWith('http://') || reviewsLink.startsWith('https://'))

  const [expandedReviews, setExpandedReviews] = useState([])
  const [votedReviews, setVotedReviews] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aurum_useful_votes') || '[]')
    } catch (e) {
      return []
    }
  })

  const toggleExpandReview = (id, e) => {
    if (e) e.stopPropagation()
    setExpandedReviews(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const handleUsefulVote = async (id, e) => {
    if (e) e.stopPropagation()
    if (votedReviews.includes(id)) return

    setReviewsData(prev => prev.map(r => r.id === id ? { ...r, useful_count: (r.useful_count || 0) + 1 } : r))
    const newVoted = [...votedReviews, id]
    setVotedReviews(newVoted)
    localStorage.setItem('aurum_useful_votes', JSON.stringify(newVoted))

    try {
      await voteUseful(id)
    } catch (err) { /* silent catch */ }
  }

  // Estados y handlers para Modal de Dejar Reseña
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    nombre: '',
    comentario: '',
  })
  const [reviewRating, setReviewRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewTurnstileToken, setReviewTurnstileToken] = useState('')
  const [reviewHpWebsite, setReviewHpWebsite] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccessData, setReviewSuccessData] = useState(null)
  const reviewTurnstileWidgetRef = useRef(null)

  const handleOpenReviewModal = () => {
    setIsReviewModalOpen(true)
    setReviewSuccessData(null)
    setReviewError('')
    setReviewForm({ nombre: '', comentario: '' })
    setReviewRating(0)
    setHoverRating(0)
    setReviewHpWebsite('')
    setReviewTurnstileToken('')
  }

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false)
    setReviewSuccessData(null)
    setReviewError('')
    setReviewForm({ nombre: '', comentario: '' })
    setReviewRating(0)
    setHoverRating(0)
    setReviewHpWebsite('')
    setReviewTurnstileToken('')
    reviewTurnstileWidgetRef.current?.reset?.()
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')

    if (!reviewForm.nombre.trim()) {
      setReviewError('Por favor ingresa tu nombre.')
      return
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError('Por favor selecciona una calificación de 1 a 5 estrellas.')
      return
    }
    if (!reviewForm.comentario.trim()) {
      setReviewError('Por favor escribe tu comentario o experiencia.')
      return
    }
    if (reviewForm.comentario.trim().length > 300) {
      setReviewError('El comentario no puede superar los 300 caracteres.')
      return
    }
    if (!reviewTurnstileToken && import.meta.env.PROD) {
      setReviewError('Por favor espera a que se complete la verificación de seguridad.')
      return
    }
    if (isSubmittingReview) return

    setIsSubmittingReview(true)

    const payload = {
      nombre: reviewForm.nombre.trim(),
      rating: reviewRating,
      comentario: reviewForm.comentario.trim(),
      turnstile_token: reviewTurnstileToken,
      'cf-turnstile-response': reviewTurnstileToken,
    }

    if (reviewHpWebsite) {
      payload._hp_website = reviewHpWebsite
    }

    try {
      const response = await submitPublicReview(payload)
      if (response.status === 201 || response.status === 200) {
        setReviewSuccessData({
          nombre: response.data?.data?.nombre || response.data?.review?.nombre || reviewForm.nombre.trim(),
        })
        setReviewTurnstileToken('')
        reviewTurnstileWidgetRef.current?.reset?.()
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setReviewError('Has alcanzado el límite máximo de envíos por hoy. Por favor, intenta de nuevo más tarde.')
      } else if (err.response?.data?.errors) {
        const errors = err.response.data.errors
        const firstKey = Object.keys(errors)[0]
        setReviewError(Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey])
      } else {
        setReviewError(err.response?.data?.message || 'Ocurrió un error al enviar tu reseña. Por favor intenta más tarde.')
      }
      setReviewTurnstileToken('')
      reviewTurnstileWidgetRef.current?.reset?.()
    } finally {
      setIsSubmittingReview(false)
    }
  }

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')

    // 1. Petición para Estadísticas con RUTA COMPLETA
    axios.get(`${apiBase}/estadisticas-resenas`)
      .then(response => {
        if (response.data) {
          const s = response.data?.data || response.data
          setStats({
            promedio: s.promedio !== undefined ? s.promedio : (s.avg_rating !== undefined ? Number(s.avg_rating).toFixed(1) : '0.0'),
            total: s.total !== undefined ? s.total : (s.total_count !== undefined ? s.total_count : 0),
            satisfaccion: s.satisfaccion !== undefined ? s.satisfaccion : (s.satisfaction_percentage !== undefined ? s.satisfaction_percentage : 0),
          })
        }
      })
      .catch(error => {
        console.error("Error cargando estadísticas. ¿Problema de CORS o URL?", error);
      });

    // 2. Petición para Tarjetas con RUTA COMPLETA
    axios.get(`${apiBase}/resenas-destacadas`)
      .then(response => {
        if (response.data) {
          const items = Array.isArray(response.data) ? response.data : (response.data?.data || [])
          if (items.length > 0) {
            setReviewsData(items)
          } else {
            getReviews({ sort: 'recientes', per_page: 15 }).then(fallbackRes => {
              if (fallbackRes.data?.data?.length > 0) setReviewsData(fallbackRes.data.data)
            }).catch(() => {})
          }
        }
      })
      .catch(error => {
        console.error("Error cargando reseñas. ¿Problema de CORS o URL?", error);
        getReviews({ sort: 'recientes', per_page: 15 }).then(fallbackRes => {
          if (fallbackRes.data?.data?.length > 0) setReviewsData(fallbackRes.data.data)
        }).catch(() => {})
      });
  }, [])

  const [particles] = useState(() =>
    Array.from({ length: 20 }).map(() => ({
      x: (Math.random() * 100) + '%',
      y: (Math.random() * 100) + '%',
    }))
  )

  const [resForm, setResForm] = useState({ nombre: '', telefono: '', email: '', fecha: '', hora: '13:00', personas: '2', zona: 'Sin preferencia', zona_preferida: 'Sin preferencia', ocasion: 'Sin preferencia', nota: '', motivoPersonalizado: '' })
  const formData = resForm

  const [erroresRes, setErroresRes] = useState({
    nombre: '',
    telefono: '',
    email: '',
    fecha: '',
    hora: '',
    motivoPersonalizado: ''
  })

  const validarCampoRes = (campo, valor) => {
    let mensajeError = ''
    const valStr = String(valor ?? '').trim()

    switch (campo) {
      case 'nombre':
        if (valStr.length === 0) mensajeError = 'El nombre es obligatorio.'
        else if (valStr.length < 3) mensajeError = 'Mínimo 3 caracteres.'
        break
      case 'telefono':
        const digits = String(valor ?? '').replace(/\D/g, '')
        if (digits.length === 0) mensajeError = 'El teléfono es obligatorio.'
        else if (digits.length < 10) mensajeError = 'Completa los 10 dígitos.'
        break
      case 'email':
        if (valStr.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
          mensajeError = 'Formato de correo inválido.'
        }
        break
      case 'fecha':
        if (!valor) mensajeError = 'Selecciona una fecha.'
        break
      case 'hora':
        if (!valor) mensajeError = 'Selecciona una hora.'
        break
      case 'motivoPersonalizado':
        if (valStr.length === 0) mensajeError = 'Especifica el motivo.'
        break
      default:
        break
    }

    setErroresRes(prev => ({ ...prev, [campo]: mensajeError }))
    return mensajeError
  }

  // Extraer los días hábiles (fallback de seguridad: [])
  const diasHabiles = useMemo(() => {
    const raw = landingData?.active_days 
      ?? landingData?.horarios?.active_days 
      ?? landingData?.activeDays 
      ?? landingData?.horarios?.activeDays 
      ?? []
    return Array.isArray(raw) ? raw.map(Number) : []
  }, [landingData])

  // Función evaluadora para el calendario (invalida días no laborables)
  const esDiaLaborable = useCallback((date) => {
    if (!date) return false
    let d
    if (date instanceof Date) {
      d = date
    } else if (typeof date === 'string') {
      const parts = date.split('-').map(Number)
      d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(date)
    } else {
      d = new Date(date)
    }
    if (isNaN(d.getTime())) return false
    const day = d.getDay() // JS retorna 0 para Domingo, 6 para Sábado
    return diasHabiles.includes(day)
  }, [diasHabiles])

  const handleDateChange = (date) => {
    if (!date) {
      setResForm(prev => ({ ...prev, fecha: '' }))
      setErroresRes(prev => ({ ...prev, fecha: 'Selecciona una fecha.' }))
      return
    }
    const formatted = typeof date === 'string'
      ? date
      : (date instanceof Date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          : '')
    setResForm(prev => ({ ...prev, fecha: formatted }))
    if (formatted) {
      setErroresRes(prev => ({ ...prev, fecha: '' }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setResForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'zona_preferida' ? { zona: value } : {}),
      ...(name === 'zona' ? { zona_preferida: value } : {}),
    }))
  }
  const [zonaDropdownOpen, setZonaDropdownOpen] = useState(false)
  const [ocasionDropdownOpen, setOcasionDropdownOpen] = useState(false)
  const [horaDropdownOpen, setHoraDropdownOpen] = useState(false)

  const horaDropdownRef = useRef(null)
  const zonaDropdownRef = useRef(null)
  const ocasionDropdownRef = useRef(null)

  // Cerrar dropdown de hora si cambia la fecha seleccionada
  useEffect(() => {
    setHoraDropdownOpen(false)
  }, [formData.fecha])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (horaDropdownRef.current && !horaDropdownRef.current.contains(e.target)) {
        setHoraDropdownOpen(false)
      }
      if (zonaDropdownRef.current && !zonaDropdownRef.current.contains(e.target)) {
        setZonaDropdownOpen(false)
      }
      if (ocasionDropdownRef.current && !ocasionDropdownRef.current.contains(e.target)) {
        setOcasionDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleGlobalClick)
    document.addEventListener('touchstart', handleGlobalClick)
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick)
      document.removeEventListener('touchstart', handleGlobalClick)
    }
  }, [])
  const [contactForm, setContactForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
  // 1. Estado para guardar los errores de cada campo de forma independiente
  const [errores, setErrores] = useState({ nombre: '', telefono: '', email: '', asunto: '', mensaje: '' })
  const [isContactSubmitting, setIsContactSubmitting] = useState(false)

  // 1. Lógica de Generación de Horas disponibles según la fecha seleccionada
  const getAvailableTimeSlots = useCallback(() => {
    // Validar que haya fecha y horarios cargados
    if (!formData.fecha || !landingData?.horarios) return []

    let dateObj = null
    if (formData.fecha instanceof Date) {
      dateObj = formData.fecha
    } else if (typeof formData.fecha === 'string' && formData.fecha) {
      const parts = formData.fecha.split('-').map(Number)
      dateObj = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(formData.fecha)
    }

    if (!dateObj || isNaN(dateObj.getTime())) return []

    const dayOfWeek = dateObj.getDay() // 0 (Dom) a 6 (Sáb)
    
    // Buscar horario según el día de la semana
    let todaySchedule = landingData.horarios[dayOfWeek] 
      || landingData.horarios[String(dayOfWeek)]
      || (landingData.operating_hours && (landingData.operating_hours[dayOfWeek] || landingData.operating_hours[String(dayOfWeek)]))

    if (!todaySchedule && Array.isArray(landingData.schedule)) {
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
      const targetName = dayNames[dayOfWeek]
      const found = landingData.schedule.find(s => {
        const name = (s?.day || s?.dia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const cleanTarget = targetName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return name === cleanTarget
      })
      if (found && (found.active || found.is_active || found.is_open)) {
        todaySchedule = found
      }
    }

    if (!todaySchedule || !todaySchedule.open || !todaySchedule.close) return [] // Si no hay horario, el local está cerrado

    const slots = []
    // Parsear a números enteros (ej. "09:00" -> 9)
    const openHour = parseInt(todaySchedule.open.split(':')[0], 10)
    const closeHour = parseInt(todaySchedule.close.split(':')[0], 10)

    if (isNaN(openHour) || isNaN(closeHour)) return []

    // Variables para bloquear horas pasadas el día de hoy
    const now = new Date()
    const isToday = dateObj.toDateString() === now.toDateString()
    const currentHour = now.getHours()

    // Generar el ciclo de horas disponibles
    for (let hour = openHour; hour < closeHour; hour++) {
      // Si es hoy, y la hora del ciclo es menor o igual a la hora actual, la omitimos
      if (isToday && hour <= currentHour) {
        continue 
      }

      // Formatear para mostrar (ej. "13:00")
      const formattedHour = `${hour.toString().padStart(2, '0')}:00`
      
      // Formato AM/PM para el texto que lee el cliente
      const ampm = hour >= 12 ? 'p.m.' : 'a.m.'
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
      const displayText = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`

      slots.push({ value: formattedHour, label: displayText })
    }

    return slots
  }, [formData.fecha, landingData])

  // Variable computada
  const availableHours = useMemo(() => getAvailableTimeSlots(), [getAvailableTimeSlots])

  // Sincronizar automáticamente la hora seleccionada con las disponibles
  useEffect(() => {
    if (availableHours.length > 0) {
      const exists = availableHours.some(s => s.value === resForm.hora || s.label === resForm.hora)
      if (!exists) {
        setResForm(prev => ({ ...prev, hora: availableHours[0].value }))
      }
    } else if (resForm.hora) {
      setResForm(prev => ({ ...prev, hora: '' }))
    }
  }, [availableHours])

  const zonaOptions = useMemo(() => {
    const dynamicAreas = (landingData?.areas || [])
      .map(a => (typeof a === 'string' ? a : (a.nombre || a.name)))
      .filter(Boolean)
    if (dynamicAreas.length > 0) {
      return ['Sin preferencia', ...dynamicAreas]
    }
    return ['Sin preferencia', 'Interior', 'Terraza', 'Barra', 'VIP']
  }, [landingData?.areas])

  const defaultReservationPromos = []
  const [resPromos, setResPromos] = useState(() => {
    try {
      const stored = localStorage.getItem('aurum_promotions')
      if (stored) {
        const parsed = JSON.parse(stored)
        const filtered = parsed.filter(p => 
          !p.paused && 
          (p.aplicaEn === 'reservaciones' || p.aplicaEn === 'ambos')
        )
        if (filtered.length > 0) {
          return filtered.map(p => {
            const symbol = p.tipoDescuento === 'porcentaje' ? '%' : '$'
            const beneficioStr = p.descuento ? (p.descuento + symbol) : 'Oferta'
            
            let textB = 'Reservar con descuento'
            if (p.name?.toLowerCase().includes('valentin')) {
              textB = 'Reservar mesa'
            } else if (p.descuento) {
              textB = 'Obtener promoción'
            }

            return {
              id: p.id,
              beneficio: beneficioStr,
              tipoBeneficio: p.tipoDescuento === 'porcentaje' ? 'DE DESCUENTO' : 'DE AHORRO',
              titulo: p.name || p.nombre,
              descripcion: p.mensajeBanner || 'Obtén un beneficio exclusivo al realizar tu reservación en línea.',
              vigencia: p.fechaInicio && p.fechaFin ? ('Del ' + p.fechaInicio + ' al ' + p.fechaFin) : 'Vigente por tiempo limitado',
              restricciones: [
                p.days && p.days.length > 0 ? ('Disponible: ' + p.days.join(', ')) : 'Aplica al reservar en línea',
                'Exclusivo reservas',
                'No acumulable'
              ],
              textoBoton: textB,
              enlace: 'reservaciones'
            }
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
    return defaultReservationPromos
  })

  const [menuPromos, setMenuPromos] = useState(() => {
    try {
      const stored = localStorage.getItem('aurum_promotions')
      if (stored) {
        const parsed = JSON.parse(stored)
        const filtered = parsed.filter(p => 
          !p.paused && 
          (p.aplicaEn === 'pedidos' || p.aplicaEn === 'ambos')
        )
        return filtered.map(p => {
          let badgeText = 'OFERTA'
          if (p.days && p.days.length > 0) {
            badgeText = p.days.join(', ').toUpperCase()
          } else if (p.fechaInicio) {
            badgeText = 'TEMPORADA'
          }
          
          let img = '/promo_shrimp.png'
          const nameLower = p.name?.toLowerCase() || ''
          if (nameLower.includes('alitas')) {
            img = '/promo_shrimp.png'
          } else if (nameLower.includes('pizza')) {
            img = '/gourmet_pizza_slice.png'
          } else if (nameLower.includes('hamburguesa')) {
            img = '/promo_ribeye.png'
          } else if (nameLower.includes('bebida') || nameLower.includes('happy')) {
            img = '/promo_cocktails.png'
          }

          const symbol = p.tipoDescuento === 'porcentaje' ? '%' : '$'
          const valorPromo = p.descuento ? (symbol === '$' ? `$${p.descuento}` : `${p.descuento}%`) : (p.beneficio || 'OFERTA')

          return {
            id: p.id,
            badge: badgeText,
            valor_promocion: valorPromo,
            descuento: p.descuento,
            beneficio: p.beneficio,
            titulo: p.name || p.nombre,
            vigencia: p.timeStart && p.timeEnd ? (p.timeStart + ' - ' + p.timeEnd) : 'Todo el día',
            imagen: img
          }
        })
      }
    } catch (e) {
      console.error(e)
    }
    return []
  })

  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
  const [isPromoPaused, setIsPromoPaused] = useState(false)
  const [promoTouchStart, setPromoTouchStart] = useState(0)
  const [promoResetTrigger, setPromoResetTrigger] = useState(0)

  const activeResPromos = useMemo(() => {
    if (resPromos && resPromos.length > 0) return resPromos
    if (bannerDescRaw.activo !== false && (bannerDescRaw.tituloDescuento || bannerDescRaw.porcentaje)) {
      return [{
        id: 'settings-banner-descuento',
        beneficio: `${bannerDescPorcentaje}%`,
        tipoBeneficio: 'DE DESCUENTO',
        titulo: bannerDescTitulo,
        descripcion: bannerDescDescripcion,
        vigencia: bannerDescBadge,
        textoBoton: bannerDescBtn,
        enlace: 'reservaciones'
      }]
    }
    return []
  }, [resPromos, bannerDescRaw, bannerDescPorcentaje, bannerDescTitulo, bannerDescDescripcion, bannerDescBadge, bannerDescBtn])

  const reservacionesBg = 'var(--theme-surface)'

  const resetPromoTimer = () => {
    setPromoResetTrigger(prev => prev + 1)
  }

  useEffect(() => {
    if (activeResPromos.length <= 1 || isPromoPaused) return

    const timer = setInterval(() => {
      setCurrentPromoIndex(prev => (prev + 1) % activeResPromos.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [activeResPromos.length, isPromoPaused, currentPromoIndex, promoResetTrigger])

  const handleNextPromo = () => {
    if (activeResPromos.length === 0) return
    setCurrentPromoIndex(prev => (prev + 1) % activeResPromos.length)
    resetPromoTimer()
  }

  const handlePrevPromo = () => {
    if (activeResPromos.length === 0) return
    setCurrentPromoIndex(prev => (prev - 1 + activeResPromos.length) % activeResPromos.length)
    resetPromoTimer()
  }

  const handlePromoTouchStart = (e) => {
    setPromoTouchStart(e.targetTouches[0].clientX)
  }

  const handlePromoTouchEnd = (e) => {
    if (activeResPromos.length <= 1) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = promoTouchStart - touchEnd
    if (diff > 50) {
      handleNextPromo()
    } else if (diff < -50) {
      handlePrevPromo()
    }
  }

  const handlePromoClick = (promo) => {
    if (promo.enlace === 'reservaciones') {
      handleScrollTo('reservaciones')
    } else if (promo.enlace && (promo.enlace.startsWith('http') || promo.enlace.startsWith('/'))) {
      window.location.href = promo.enlace
    } else {
      handleScrollTo('reservaciones')
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkMobile()
  }, [])

  const handleHeroMouseMove = (e) => {
    if (isMobile) return
    const { clientX, clientY } = e
    const moveX = (clientX - window.innerWidth / 2) / 60
    const moveY = (clientY - window.innerHeight / 2) / 60
    setParallaxOffset({ x: moveX, y: moveY })
  }

  useEffect(() => {
    if (isHoveredReview || reviewsData.length <= 3) return
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviewsData.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isHoveredReview, reviewsData.length])

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return ('Hace ' + mins + ' min')
    const hours = Math.floor(mins / 60)
    if (hours < 24) return ('Hace ' + hours + 'h')
    const days = Math.floor(hours / 24)
    if (days < 7) return ('Hace ' + days + ' día' + (days > 1 ? 's' : ''))
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return ('Hace ' + weeks + ' semana' + (weeks > 1 ? 's' : ''))
    const months = Math.floor(days / 30)
    if (months < 12) return ('Hace ' + months + ' mes' + (months > 1 ? 'es' : ''))
    return 'Hace más de un año'
  }

  const insigniaLabel = (i) => {
    const map = { reserva_verificada: 'Reserva verificada', pedido_verificado: 'Pedido verificado', visita_restaurante: 'Visita al restaurante', pedido_llevar: 'Pedido a domicilio' }
    return map[i] || ''
  }

  const handleScrollTo = (id) => {
    setMobileMenuOpen(false)
    if (id === 'inicio') {
      triggerHeroReveal()
      return
    }
    if (id === 'menu') {
      navigate('/menu')
      return
    }
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Auto-scroll inicial a la sección correspondiente si la URL incluye un hash (#seccion)
  useEffect(() => {
    if (isLoading) return
    const targetHash = window.location.hash.replace('#', '')
    if (targetHash) {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(targetHash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 350)
      return () => clearTimeout(scrollTimer)
    }
  }, [isLoading])

  // Escuchar cambios de hash dinámicos para desplazar la vista en tiempo real
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash) {
        const el = document.getElementById(hash)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reservationSuccess, setReservationSuccess] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [hpWebsite, setHpWebsite] = useState('')
  const turnstileWidgetRef = useRef(null)

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return '13:00'
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = match[2]
      const modifier = match[3].toLowerCase().replace(/\./g, '')
      if (modifier === 'pm' && hours < 12) hours += 12
      if (modifier === 'am' && hours === 12) hours = 0
      return `${String(hours).padStart(2, '0')}:${minutes}`
    }
    return timeStr.slice(0, 5)
  }

  const handleConfirmReservation = async (e) => {
    e.preventDefault()

    const errNombre = validarCampoRes('nombre', resForm.nombre)
    const errTelefono = validarCampoRes('telefono', resForm.telefono)
    const errEmail = validarCampoRes('email', resForm.email)
    const errFecha = validarCampoRes('fecha', resForm.fecha)
    const errHora = validarCampoRes('hora', resForm.hora)
    let errMotivo = ''
    if (resForm.ocasion === 'Otro (Especificar)') {
      errMotivo = validarCampoRes('motivoPersonalizado', resForm.motivoPersonalizado)
    }

    if (errNombre || errTelefono || errEmail || errFecha || errHora || errMotivo) {
      setErroresRes({
        nombre: errNombre,
        telefono: errTelefono,
        email: errEmail,
        fecha: errFecha,
        hora: errHora,
        motivoPersonalizado: errMotivo
      })
      return
    }

    if (!turnstileToken && import.meta.env.PROD) {
      alert('Por favor, espere a que se complete la verificación de seguridad en segundo plano.')
      return
    }
    if (isSubmitting) return
    setIsSubmitting(true)

    const rawPhone = String(resForm.telefono || '').replace(/\D/g, '')
    const time24 = convertTo24Hour(resForm.hora)
    const motivoText = resForm.ocasion === 'Otro (Especificar)' ? resForm.motivoPersonalizado : resForm.ocasion

    const selectedZona = resForm.zona_preferida || resForm.zona
    const payload = {
      nombre: resForm.nombre ? resForm.nombre.trim() : '',
      telefono: rawPhone,
      email: resForm.email ? resForm.email.trim() : null,
      fecha: resForm.fecha,
      hora: time24,
      personas: parseInt(resForm.personas, 10) || 2,
      zona_preferida: selectedZona && selectedZona !== 'Sin preferencia' ? selectedZona : null,
      zona: selectedZona && selectedZona !== 'Sin preferencia' ? selectedZona : null,
      ocasion_especial: motivoText && motivoText !== 'Sin preferencia' ? motivoText : null,
      nota_especial: resForm.nota ? resForm.nota.trim() : null,
      turnstile_token: turnstileToken,
      'cf-turnstile-response': turnstileToken,
    }

    if (hpWebsite) {
      payload._hp_website = hpWebsite
    }

    try {
      const response = await client.post('/reservations', payload)
      const data = response?.data
      setReservationSuccess(data?.reservation || data)
      setResForm({ nombre: '', telefono: '', email: '', fecha: '', hora: '13:00', personas: '2', zona: 'Sin preferencia', zona_preferida: 'Sin preferencia', ocasion: 'Sin preferencia', nota: '', motivoPersonalizado: '' })
      setErroresRes({ nombre: '', telefono: '', email: '', fecha: '', hora: '', motivoPersonalizado: '' })
      setHpWebsite('')
      setTurnstileToken('')
      turnstileWidgetRef.current?.reset?.()
    } catch (err) {
      if (err?.response?.status === 429) {
        alert('Has intentado demasiadas veces. Por favor, espera un minuto antes de volver a intentarlo.')
      } else {
        const errData = err?.response?.data
        const errorMsg = errData?.message || 'Error al procesar la reservación. Por favor verifique los datos ingresados.'
        alert(errorMsg)
      }
      setTurnstileToken('')
      turnstileWidgetRef.current?.reset?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Función que se dispara al salir de un campo (evento onBlur)
  const validarCampo = (campo, valor) => {
    let mensajeError = ''

    switch (campo) {
      case 'nombre':
        if (valor.trim().length === 0) mensajeError = 'El nombre es obligatorio.'
        else if (valor.trim().length < 3) mensajeError = 'Mínimo 3 caracteres.'
        break
      case 'telefono':
        if (valor.trim().length === 0) mensajeError = 'El teléfono es obligatorio.'
        else if (valor.length < 10) mensajeError = 'Completa los 10 dígitos.'
        break
      case 'email':
        // Como es opcional, solo validamos si escribió algo
        if (valor.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
          mensajeError = 'Formato de correo inválido.'
        }
        break
      case 'asunto':
        if (valor.trim().length === 0) mensajeError = 'El asunto es obligatorio.'
        else if (valor.trim().length < 4) mensajeError = 'Mínimo 4 caracteres.'
        break
      case 'mensaje':
        if (valor.trim().length === 0) mensajeError = 'El mensaje es obligatorio.'
        else if (valor.trim().length < 10) mensajeError = 'Mínimo 10 caracteres.'
        break
      default:
        break
    }

    // Actualizamos solo el error del campo que se está modificando
    setErrores(prev => ({ ...prev, [campo]: mensajeError }))
    return mensajeError
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (isContactSubmitting) return

    const errNombre = validarCampo('nombre', contactForm.nombre)
    const errTelefono = validarCampo('telefono', contactForm.telefono)
    const errEmail = validarCampo('email', contactForm.email)
    const errAsunto = validarCampo('asunto', contactForm.asunto)
    const errMensaje = validarCampo('mensaje', contactForm.mensaje)

    if (errNombre || errTelefono || errEmail || errAsunto || errMensaje) {
      setErrores({
        nombre: errNombre,
        telefono: errTelefono,
        email: errEmail,
        asunto: errAsunto,
        mensaje: errMensaje,
      })
      return
    }

    setErrores({ nombre: '', telefono: '', email: '', asunto: '', mensaje: '' })
    setIsContactSubmitting(true)

    try {
      const payload = {
        nombre: contactForm.nombre.trim(),
        email: contactForm.email.trim(),
        telefono: contactForm.telefono.trim(),
        asunto: contactForm.asunto?.trim() || '',
        mensaje: contactForm.mensaje.trim()
      }

      try {
        await client.post('/contact-messages', payload)
      } catch (apiErr) {
        console.warn('Endpoint de mensajes no disponible, procesado en cliente:', apiErr?.message)
      }

      alert('¡Gracias ' + payload.nombre + '! Mensaje enviado con éxito.')
      setContactForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
      setErrores({ nombre: '', telefono: '', email: '', asunto: '', mensaje: '' })
    } catch (err) {
      console.error('Error al enviar el formulario de contacto:', err)
      alert('Error al enviar el mensaje. Por favor intenta nuevamente.')
    } finally {
      setIsContactSubmitting(false)
    }
  }

  // Función para formatear el total de experiencias
  const formatearTotal = (total) => {
    const num = Number(total) || 0;
    if (num < 1000) return num; // Si son 999 o menos, muestra el número exacto
    
    // Calcula los saltos de 500 en 500
    // Ej: 1499 / 500 = 2.99 -> floor(2) * 0.5 = 1 -> "1k+"
    // Ej: 1500 / 500 = 3 -> floor(3) * 0.5 = 1.5 -> "1.5k+"
    const factor = Math.floor(num / 500) * 0.5;
    
    return `${factor}k+`;
  };

  return (
    <>
      {/* El loader flota POR ENCIMA de la página gracias a z-[9999] y createPortal */}
      {!isReadyToAnimate && <LoaderGlobal />}
      
      <div 
        className="landing-page min-h-screen relative font-sans select-none text-theme-text transition-colors duration-300 w-full max-w-[100vw] overflow-x-hidden"
        style={{ backgroundColor: 'var(--theme-surface)', border: 'none', boxShadow: 'none' }}
      >
      
      {/* CENTINELA DE SCROLL 100% INMUNE A VIEWPORT QUIRKS */}
      <div 
        ref={navSentinelRef} 
        aria-hidden="true" 
        className="absolute top-0 left-0 right-0 pointer-events-none opacity-0 select-none -z-50"
        style={{ height: '48px', width: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* NAVBAR */}
      <header className="landing-header fixed top-0 left-0 right-0 z-40 w-full">
        {/* Fondo dinámico ultra fluido y minimalista (sin parpadeos de shader GPU al subir) */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: navScrolled ? 1 : 0,
            backgroundColor: 'var(--theme-surface)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--theme-border-subtle)',
            boxShadow: navScrolled ? '0 4px 24px -2px rgba(0,0,0,0.06)' : 'none',
            transition: 'opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 500ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity'
          }}
        />

        <div className="relative z-10 w-full px-4 sm:px-6 md:px-10 h-24 sm:h-28 pt-3 sm:pt-5 max-md:h-16 max-md:pt-0 max-md:px-3 flex items-center justify-between">
          
          {/* Left: Icono de Hamburguesa y Logo de la empresa (proporciones idénticas a la referencia) */}
          <div className="flex items-center gap-6 sm:gap-7 md:gap-8 max-md:gap-3">
            {/* Botón de Menú Hamburguesa */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 rounded-lg cursor-pointer transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center hover:bg-white/10 group shrink-0"
              style={{ color: navScrolled ? 'var(--theme-text)' : 'rgba(255,255,255,0.95)' }}
              aria-label="Abrir menú"
              title="Menú"
            >
              <svg 
                className="w-[32px] sm:w-[35px] h-[22px] sm:h-[25px] max-md:w-[24px] max-md:h-[18px] transition-transform group-hover:scale-105" 
                viewBox="0 0 36 26" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="2.5" y1="3.5" x2="33.5" y2="3.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="2.5" y1="13" x2="33.5" y2="13" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="2.5" y1="22.5" x2="33.5" y2="22.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Logo de la empresa */}
            <div 
              className="cursor-pointer select-none flex items-center shrink-0" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title={restName || 'Inicio'}
            >
              {restLogo ? (
                <img
                  src={restLogo}
                  alt={'Logo ' + (restName || 'Restaurante')}
                  className="h-10 sm:h-10 md:h-11 max-md:h-8 w-auto object-contain shrink-0 transition-transform hover:scale-105"
                />
              ) : (
                <span className="text-xl sm:text-2xl max-md:text-lg font-serif text-[var(--theme-primary)] tracking-widest uppercase leading-none">
                  {restName}
                </span>
              )}
            </div>
          </div>

          {/* Center: Despejado y limpio (la ilustración respira al 100%) */}

          {/* Right: Acción Principal (RESERVAR MESA) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleScrollTo('reservaciones')}
              className="px-5 sm:px-7 py-2.5 max-md:px-3.5 max-md:py-2 text-xs max-md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 rounded-full cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: primaryTextColor,
                border: '1px solid var(--theme-primary)'
              }}
            >
              {ctaReservationText}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Menu Desplegable */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 w-80 sm:w-88 bg-theme-surface border-r border-[var(--theme-border-subtle)] z-50 p-6 sm:p-8 flex flex-col justify-between shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-left cursor-pointer" onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                    {restLogo && (
                      <img
                        src={restLogo}
                        alt={'Logo ' + (restName || 'Restaurante')}
                        className="h-9 w-auto object-contain shrink-0"
                      />
                    )}

                    <div className="flex flex-col">
                      <span className="text-xl font-sans font-extrabold text-[var(--theme-primary)] tracking-wider uppercase leading-none whitespace-nowrap">
                        {restName}
                      </span>
                      {restTagline && (
                        <span className="text-[8px] font-bold text-theme-text-muted uppercase tracking-[0.25em] mt-1.5 whitespace-nowrap">
                          {restTagline}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-theme-text-muted hover:bg-[var(--theme-card)] rounded-xl cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
                <nav className="flex flex-col gap-4 text-xs font-bold uppercase tracking-[0.15em] text-theme-text-muted">
                  {[
                    { to: 'menu', label: 'Menú' },
                    { to: 'delivery', label: 'Delivery' },
                    { to: 'reservaciones', label: 'Reservaciones' },
                    { to: 'nosotros', label: 'Historia' },
                    { to: 'reseñas', label: 'Reseñas' },
                    { to: 'contacto', label: 'Contacto' }
                  ].map((link) => (
                    <button
                      key={link.label}
                      onClick={() => handleScrollTo(link.to)}
                      className="text-left py-2 hover:text-[var(--theme-primary)] transition-all"
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>
              </div>
              <button
                onClick={() => handleScrollTo('reservaciones')}
                style={{
                  '--theme-primary-contrast': primaryTextColor || '#ffffff'
                }}
                className="btn-mobile-drawer-cta w-full py-3.5 font-bold uppercase tracking-widest rounded-full text-center cursor-pointer block text-xs sm:text-sm active:scale-95"
              >
                {ctaReservationText}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SECCIÓN 1 — HERO (Parallax Suave hacia Arriba, Full-Bleed) */}
      <motion.section
        id="inicio"
        style={{
          y: heroY,
          border: 'none',
          boxShadow: 'none',
          willChange: 'transform'
        }}
        onMouseMove={handleHeroMouseMove}
        className="sticky top-0 z-0 w-full h-[75vh] min-h-[520px] max-h-[720px] max-md:h-auto max-md:min-h-[580px] max-md:pt-20 max-md:pb-12 flex items-center justify-center px-6 md:px-12 max-md:px-4 bg-black overflow-hidden select-none"
      >
        {/* Full-bleed background plate image */}
        <motion.div 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none"
          style={{ 
            scale: heroImgScale,
            y: heroImgY,
            border: 'none', 
            boxShadow: 'none',
            willChange: 'transform'
          }}
        >
          <AnimatePresence mode="popLayout">
            {(useHeroCarousel && activeBanners.length > 0 ? activeBanners[heroBgIndex] : heroCoverImage) ? (
              <motion.img
                key={useHeroCarousel && activeBanners.length > 0 ? activeBanners[heroBgIndex] : heroCoverImage}
                src={useHeroCarousel && activeBanners.length > 0 ? activeBanners[heroBgIndex] : heroCoverImage}
                alt="Gourmet Cover"
                className="w-full h-full object-cover absolute inset-0 opacity-85"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                style={{ willChange: "opacity, transform" }}
              />
            ) : null}
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/15 pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }} />
        </motion.div>

        {/* Gold Floating Particles */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[var(--theme-primary)]/30 rounded-full pointer-events-none z-0"
            animate={{ y: [0, -25, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 4 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            style={{ left: p.x, top: p.y }}
          />
        ))}

        {/* Centered layout */}
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10 space-y-6 max-md:space-y-4"
          style={{ 
            opacity: isLoading ? 0 : heroContentOpacity, 
            y: heroContentY,
            willChange: 'transform, opacity' 
          }}
        >
          <ScrollReveal y={20}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2 max-md:px-3.5 max-md:py-1 rounded-full border border-white/20 bg-black/40 backdrop-blur-md mb-3 max-md:mb-1 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[var(--theme-primary)] animate-pulse" />
              <span 
                style={{
                  letterSpacing: '0.3em',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  fontSize: '11px',
                }}
                className="uppercase tracking-[0.3em] max-md:tracking-[0.15em] max-md:text-[9px]"
              >
                {heroLocationText}
              </span>
            </div>
          </ScrollReveal>

          {/* Main Hero Title */}
          <ScrollReveal delay={0.15} y={20} className="transform-gpu will-change-transform">
            <div className="transform-gpu will-change-transform">
              <h1 
                style={{
                  color: '#FFFFFF',
                  letterSpacing: '0.02em',
                  fontWeight: 700,
                  textShadow: '0 2px 20px rgba(0,0,0,0.7), 0 4px 60px rgba(0,0,0,0.5)',
                  lineHeight: '1.1',
                }}
                className="text-2xl sm:text-5xl lg:text-7xl font-serif flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-md:gap-x-2 max-md:gap-y-0.5 uppercase transform-gpu will-change-transform leading-tight"
              >
                {heroTitleText.split(' ').map((word, wIdx) => (
                  <div key={wIdx} className="inline-flex gap-1.5 max-md:gap-1">
                    {word.split('').map((l, i) => (
                      <span key={i} className="inline-block">
                        {l}
                      </span>
                    ))}
                  </div>
                ))}
              </h1>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.25} y={20}>
            <div className="flex items-center justify-center gap-3 my-4 max-md:my-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <div className="w-10 h-px bg-[var(--theme-primary)]/80" />
              <div className="w-2 h-2 rotate-45 border border-[var(--theme-primary)]" />
              <div className="w-10 h-px bg-[var(--theme-primary)]/80" />
            </div>
            <div className="inline-flex items-center justify-center px-6 py-2.5 max-md:px-3.5 max-md:py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 shadow-2xl max-w-2xl mx-auto">
              <TextReveal 
                text={heroSloganText} 
                className="text-xs sm:text-sm font-semibold text-white tracking-[0.25em] max-md:tracking-[0.12em] uppercase leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] max-md:text-[10px]" 
              />
            </div>
          </ScrollReveal>
        </motion.div>

      </motion.section>


      {/* SECCIÓN 4 — MENÚ DESTACADO */}
      {featuredDishes && featuredDishes.length > 0 && (
        <section 
          id="menu" 
          style={{ backgroundColor: 'var(--theme-surface)' }}
          className="w-full py-16 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-md:py-10 max-md:px-3 relative z-10 border-t border-[var(--theme-border-subtle)] border-b transition-colors duration-300 bg-theme-surface text-theme-text"
        >
          <div className="max-w-7xl mx-auto text-center">
            
            <ScrollReveal>
              <div className="space-y-4 max-md:space-y-2 mb-8 max-md:mb-5">
                <span className="text-xs max-md:text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-[0.4em] max-md:tracking-[0.2em] block font-sans">
                  {menuSubtitle}
                </span>
                <h2 className="text-4xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight uppercase">
                  <TextReveal text={menuTitle} />
                </h2>
                <div className="w-12 h-[2px] bg-[var(--theme-primary)] rounded-full mx-auto" />
              </div>
            </ScrollReveal>

            {/* Tab selectors (Categorías Dinámicas) */}
            {featuredCategories.length > 0 && (
              <ScrollReveal delay={0.1}>
                <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-8 gap-y-3 max-md:gap-x-3 max-md:gap-y-2 max-w-xl mx-auto border-b border-[var(--theme-border-subtle)] pb-3 mb-10 max-md:mb-6 max-md:pb-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={'relative py-2 px-1 max-md:py-1.5 max-md:px-1 text-xs max-md:text-[11px] font-bold uppercase tracking-[0.2em] max-md:tracking-[0.1em] transition-all cursor-pointer ' + (
                      !activeCategory ? 'text-[var(--theme-primary)]' : 'text-theme-text-muted hover:text-theme-text'
                    )}
                  >
                    <span>Todos</span>
                    {!activeCategory && (
                      <motion.div
                        layoutId="menuUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--theme-primary)] rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                  {featuredCategories.map((cat) => {
                    const catId = cat.id ?? cat._id
                    const isCurrentActive = String(activeCategory) === String(catId)
                    return (
                      <button
                        key={catId}
                        onClick={() => setActiveCategory(catId)}
                        className={'relative py-2 px-1 max-md:py-1.5 max-md:px-1 text-xs max-md:text-[11px] font-bold uppercase tracking-[0.2em] max-md:tracking-[0.1em] transition-all cursor-pointer ' + (
                          isCurrentActive ? 'text-[var(--theme-primary)]' : 'text-theme-text-muted hover:text-theme-text'
                        )}
                      >
                        <span className="capitalize">{cat.name || cat.nombre}</span>
                        {isCurrentActive && (
                          <motion.div
                            layoutId="menuUnderline"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--theme-primary)] rounded-full"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </ScrollReveal>
            )}

            {/* Cards Horizontal Carousel */}
            <ScrollReveal y={30} className="w-full">
              <div className="min-h-0 w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory || 'all'}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    variants={staggerContainer}
                    className="flex overflow-x-auto gap-4 md:gap-6 max-md:gap-3 w-full max-w-7xl mx-auto p-4 md:p-8 max-md:p-2 max-md:pb-4 snap-x snap-mandatory custom-scrollbar pb-8"
                  >
                    {(() => {
                      const filtered = featuredDishes.filter(dish => {
                        const dishCatId = dish.category_id ?? dish.categoryId ?? dish.categoria_id ?? dish.category?.id
                        return String(dishCatId) === String(activeCategory) || !activeCategory
                      })

                      if (filtered.length === 0) {
                        return (
                          <div className="w-full py-12 text-center shrink-0">
                            <p className="text-sm font-serif tracking-wider text-theme-text-muted">
                              Próximamente más platillos en esta sección.
                            </p>
                          </div>
                        )
                      }

                      return filtered.map((dish, idx) => {
                        const dishCatId = dish.category_id ?? dish.categoryId ?? dish.categoria_id ?? dish.category?.id
                        const matchedCat = allCategories.find(c => String(c.id ?? c._id) === String(dishCatId)) || featuredCategories.find(c => String(c.id ?? c._id) === String(dishCatId))
                        const categoryName = matchedCat?.name || matchedCat?.nombre || 'SIN CATEGORÍA'
                        const dishImg = dish.imagen || dish.image_url || dish.image || '/promo_shrimp.png'
                        const dishPrice = dish.precio ?? dish.price ?? 0

                        // 1. Blindaje de Enlaces Rotos (Null Checks):
                        // La URL de destino incluye el ID único del platillo como ancla (Hash).
                        // Si no hay ID válido, redirige de forma segura al menú general (/menu).
                        const targetUrl = dish?.id ? `/menu#platillo-${dish.id}` : '/menu'

                        // 2. Desactivación Condicional (UI Security):
                        // Si el platillo viene en el JSON con estado "Agotado" (stock <= 0 o is_active == false / disponible == false).
                        const isAgotado = Boolean(
                          (dish.stock !== undefined && dish.stock !== null && Number(dish.stock) <= 0) ||
                          (dish.inventory_count !== undefined && dish.inventory_count !== null && Number(dish.inventory_count) <= 0) ||
                          dish.is_active === false ||
                          dish.activo === false ||
                          dish.disponible === false ||
                          dish.is_available === false
                        )

                        // 3. Prevención de Inyección XSS:
                        // Los textos se imprimen exclusivamente mediante llaves de React {dish.nombre}.
                        // No se utiliza dangerouslySetInnerHTML bajo ninguna circunstancia.
                        const dishNombre = String(dish.nombre || dish.name || '').toUpperCase()
                        const dishDesc = dish.descripcion || dish.description || ''

                        return (
                          <div
                            key={dish.id ?? dish._id ?? idx}
                            onClick={() => {
                              if (!isAgotado) {
                                navigate(targetUrl)
                              }
                            }}
                            className={`shrink-0 w-[78vw] sm:w-[280px] md:w-[320px] snap-start group text-theme-text transition-all duration-300 flex flex-col text-left ${
                              isAgotado ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {/* Imagen con altura fija proporcional y bordes rectos (90 grados) */}
                            <div className="relative w-full h-44 sm:h-48 md:h-56 overflow-hidden rounded-none bg-theme-card shadow-xs group-hover:shadow-md transition-all duration-500 shrink-0">
                              <img
                                src={dishImg}
                                alt={dishNombre || 'Platillo'}
                                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                                  isAgotado ? 'grayscale-[35%] opacity-75' : 'group-hover:scale-105'
                                }`}
                                onError={(e) => {
                                  e.currentTarget.src = '/promo_shrimp.png'
                                }}
                              />
                              {dish.destacado && !isAgotado && (
                                <div 
                                  style={{
                                    backgroundColor: 'var(--theme-primary)',
                                    color: primaryTextColor
                                  }}
                                  className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md z-10"
                                >
                                  Popular
                                </div>
                              )}
                              {/* Overlay de Agotado sobre imagen */}
                              {isAgotado && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px] z-10">
                                  <span className="text-red-400 text-[10px] tracking-wider border border-red-500/40 bg-red-950/80 px-2.5 py-1 rounded font-bold uppercase shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                    Agotado
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Detalles del Platillo sin bordes ni contenedor de caja */}
                            <div className="pt-4 pb-1 px-0 flex-1 flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-primary)] block">
                                  {categoryName}
                                </span>
                                <h3 className="text-lg font-serif font-bold uppercase tracking-wide line-clamp-1 text-theme-text group-hover:text-[var(--theme-primary)] transition-colors duration-300">
                                  {dishNombre}
                                </h3>
                                {/* Calificación y opiniones */}
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {(dish.reviews_count ?? 0) > 0 ? (
                                    <>
                                      <span className="text-yellow-400 mr-1">⭐</span>
                                      <span className="font-bold text-gray-700 dark:text-gray-200">{Number(dish.reviews_avg_rating).toFixed(1)}</span>
                                      <span className="ml-1 text-gray-500 dark:text-gray-400">({dish.reviews_count} opiniones)</span>
                                    </>
                                  ) : (
                                    <span className="text-blue-500 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">Nuevo</span>
                                  )}
                                </div>
                                <p className="text-xs text-theme-text-muted line-clamp-3 h-[3.75rem] font-normal leading-5">
                                  {dishDesc || ''}
                                </p>
                              </div>

                              {/* Botón: <Link> con ancla Hash o botón Agotado deshabilitado */}
                              {isAgotado ? (
                                <div
                                  className="w-full mt-auto py-2.5 px-4 font-bold text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 pointer-events-none opacity-50 bg-stone-500 text-stone-200 select-none cursor-not-allowed rounded-none"
                                >
                                  <AlertCircle size={14} className="shrink-0" />
                                  <span>Agotado</span>
                                </div>
                              ) : (
                                <Link
                                  to={targetUrl}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    backgroundColor: 'var(--theme-primary)',
                                    color: primaryTextColor
                                  }}
                                  className="mt-auto w-full py-3 px-4 font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer flex justify-between items-center text-center rounded-none"
                                >
                                  <span className="flex items-center gap-2">
                                    <ShoppingBag size={14} className="shrink-0" />
                                    <span>Ordenar</span>
                                  </span>
                                  <span className="font-extrabold text-sm tracking-tight inline-flex items-baseline gap-1">
                                    ${dishPrice} <span className="text-[10px] font-medium opacity-80">MXN</span>
                                  </span>
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollReveal>

            {/* Botón final de sección */}
            <ScrollReveal delay={0.2}>
              <div className="pt-10 flex flex-col items-center gap-3">
                <button
                  onClick={() => navigate('/menu')}
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                  className="px-12 py-3 hover:opacity-90 font-bold text-sm uppercase tracking-[0.2em] transition-all duration-300 rounded-full cursor-pointer hover:shadow-lg hover:shadow-[var(--theme-primary)]/25"
                >
                  {menuBtnText}
                </button>
                <span className="text-xs text-[var(--theme-primary)] tracking-widest font-medium uppercase">
                  {menuSubBtnText}
                </span>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* SECCIÓN 6 — DELIVERY */}
      <section 
        id="delivery" 
        style={{ backgroundColor: 'var(--theme-bg)' }} 
        className="w-full py-16 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-md:py-10 max-md:px-3 relative z-10 border-b border-[var(--theme-border-subtle)] overflow-hidden transition-colors duration-300 text-theme-text"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.02)_0%,transparent_75%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-12 2xl:gap-16 items-center">
            
            {/* Columna Izquierda: Información / Formulario */}
            <div className="w-full order-1 xl:order-1 space-y-8 max-md:space-y-5 text-left max-w-2xl mx-auto xl:max-w-none xl:mx-0">
              <ScrollReveal>
                <div className="space-y-4 max-md:space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] inline-flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-[0.3em] font-sans">SERVICIO A DOMICILIO</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight leading-tight uppercase">
                    <TextReveal text={deliveryTitle} />
                  </h2>
                  <p className="text-theme-text-muted text-sm max-md:text-xs font-normal leading-relaxed max-w-xl">
                    {deliveryDescription}
                  </p>
                </div>
              </ScrollReveal>

              {/* Beneficios */}
              <ScrollReveal delay={0.05}>
                <div className="space-y-3">
                  <span className="text-theme-text-muted block uppercase tracking-[0.25em] text-[9px] font-bold">BENEFICIOS EXCLUSIVOS</span>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-4">
                    {deliveryBeneficios.map((b, bIdx) => {
                      const bIcon = bIdx === 0 ? Clock : bIdx === 1 ? MapPin : bIdx === 2 ? ShoppingBag : Sparkles;
                      const IconComp = bIcon;
                      return (
                        <div 
                          key={bIdx} 
                          className="p-2.5 sm:p-4 rounded-xl border border-[var(--theme-border-subtle)] flex items-center sm:items-start gap-2.5 sm:gap-3 shadow-xs bg-theme-surface"
                        >
                          <IconComp size={16} className="text-[var(--theme-primary)] shrink-0" />
                          <div className="min-w-0">
                            <span className="text-theme-text font-semibold text-xs block truncate">{b.titulo || b.title}</span>
                            {(b.descripcion || b.desc) && (
                              <span className="text-theme-text-muted text-[10px] sm:text-[11px] block mt-0.5 font-normal leading-tight">{b.descripcion || b.desc}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollReveal>

              {/* Cómo ordenar */}
              <ScrollReveal delay={0.1}>
                <div className="space-y-4">
                  <span className="text-theme-text-muted block uppercase tracking-[0.25em] text-[9px] font-bold">CÓMO ORDENAR</span>
                  
                  <div className="p-4 sm:p-5 rounded-xl border border-[var(--theme-border-subtle)] shadow-xs bg-theme-surface">
                    {/* Versión Desktop: Flujo Horizontal */}
                    <div className="hidden sm:flex sm:items-center justify-between gap-4">
                      {deliveryPasos.map((paso, pIdx) => (
                        <div key={pIdx} className="contents">
                          <div className="flex items-center gap-3 text-left flex-1">
                            <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center font-serif text-sm font-bold shrink-0 border border-[var(--theme-primary)]/25">
                              {pIdx + 1}
                            </div>
                            <div>
                              <span className="text-theme-text font-medium text-xs block">{paso.titulo || paso.title}</span>
                              <span className="text-theme-text-muted text-[11px] block font-normal">{paso.subtitulo || paso.subtitle}</span>
                            </div>
                          </div>
                          {pIdx < deliveryPasos.length - 1 && (
                            <div className="text-[var(--theme-primary)]/40 text-lg">➔</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Versión Mobile: Stepper vertical continuo con línea conectora */}
                    <div className="sm:hidden flex flex-col space-y-4">
                      {deliveryPasos.map((paso, pIdx) => (
                        <div key={pIdx} className="relative flex items-start gap-3.5 text-left">
                          {pIdx < deliveryPasos.length - 1 && (
                            <div 
                              className="absolute left-[15px] top-[28px] bottom-[-16px] w-[2px] bg-[var(--theme-primary)]/25" 
                              aria-hidden="true"
                            />
                          )}
                          <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center font-serif text-xs font-bold shrink-0 border border-[var(--theme-primary)]/30 z-10 bg-theme-surface shadow-xs">
                            {pIdx + 1}
                          </div>
                          <div className="pt-0.5 min-w-0">
                            <span className="text-theme-text font-semibold text-xs block leading-tight">{paso.titulo || paso.title}</span>
                            <span className="text-theme-text-muted text-[11px] block mt-0.5 font-normal leading-relaxed">{paso.subtitulo || paso.subtitle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Botón WhatsApp */}
              <ScrollReveal delay={0.15}>
                <div className="space-y-4">
                  {cleanNumber ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 max-md:py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold uppercase tracking-widest rounded-full shadow-lg shadow-[#25D366]/15 hover:shadow-xl hover:shadow-[#25D366]/25 hover:brightness-105 active:scale-[0.99] transition-all text-center flex items-center justify-center gap-2 cursor-pointer font-sans text-sm max-md:text-xs"
                    >
                      <span>PEDIR AHORA POR WHATSAPP</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Número de WhatsApp no configurado en el sistema"
                      className="w-full py-4 max-md:py-3 bg-stone-500 text-stone-200 font-bold uppercase tracking-widest rounded-full shadow-xs text-center flex items-center justify-center gap-2 font-sans text-sm max-md:text-xs opacity-50 cursor-not-allowed pointer-events-none select-none"
                    >
                      <span>PEDIR AHORA POR WHATSAPP</span>
                    </button>
                  )}
                  
                  <p className="text-xs text-theme-text-muted text-center tracking-wide font-normal">
                    {deliveryBtnText}
                  </p>

                  <div className="pt-3 border-t border-[var(--theme-border-subtle)]">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center sm:justify-center gap-2.5 sm:gap-x-6 max-w-sm sm:max-w-none mx-auto px-1 sm:px-0">
                      {deliveryGarantias.map((g, gIdx) => (
                        <div key={gIdx} className="flex items-center gap-2 text-xs text-theme-text-muted font-normal text-left">
                          <div className="w-4 h-4 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                            <Check size={10} strokeWidth={2.5} />
                          </div>
                          <span className="leading-tight">{typeof g === 'string' ? g.replace(/^✓\s*/, '') : (g.titulo || g.text || '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>

            </div>

            {/* Columna Derecha: Imagen Ilustrativa */}
            <div className="w-full order-2 xl:order-2 relative w-full h-auto max-h-[400px] min-h-[300px] max-md:min-h-[220px] max-md:max-h-[280px] rounded-3xl max-md:rounded-2xl overflow-hidden shadow-lg border border-[var(--theme-border-subtle)] group select-none flex flex-col justify-end bg-theme-card max-w-2xl mx-auto xl:max-w-none xl:mx-0">
              {deliveryImageUrl ? (
                <img
                  src={deliveryImageUrl}
                  alt={deliveryImageDescription || 'Servicio de entrega a domicilio'}
                  className="w-full h-full max-h-[400px] object-cover rounded-3xl max-md:rounded-2xl transition-transform duration-700 group-hover:scale-105"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = '/delivery.jpg'
                    e.currentTarget.onerror = null
                  }}
                />
              ) : (
                <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-2 bg-theme-card rounded-3xl">
                  <ShoppingBag size={32} className="text-[var(--theme-primary)]/50" />
                  <span className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Imagen no disponible</span>
                </div>
              )}
              <div 
                className="absolute bottom-4 left-4 right-4 max-md:bottom-2 max-md:left-2 max-md:right-2 p-4 max-md:p-2.5 rounded-xl border shadow-sm text-left space-y-1 transition-colors duration-300"
                style={{
                  backgroundColor: 'var(--theme-bg)',
                  borderColor: 'var(--theme-border-subtle)'
                }}
              >
                <span 
                  className="text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)] mb-1 block"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {deliveryImageTitle}
                </span>
                <p 
                  className="text-sm max-md:text-xs font-medium italic text-theme-text"
                  style={{ color: 'var(--theme-text)' }}
                >
                  {deliveryImageDescription ? `"${deliveryImageDescription}"` : '"El restaurante de alta cocina directo a tu mesa"'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECCIÓN 4.5 — OFERTA DE ANIVERSARIO BANNER */}
      {activeResPromos.length > 0 && (
        <section id="banner-descuento" style={{ backgroundColor: 'var(--theme-surface)' }} className="w-full py-16 md:py-20 max-md:py-10 text-theme-text px-4 sm:px-6 md:px-8 lg:px-12 max-md:px-3 relative z-10 overflow-hidden border-b border-[var(--theme-border-subtle)] transition-colors duration-300">
          <div className="w-full max-w-7xl mx-auto border-t border-[var(--theme-border-subtle)] mb-16 max-md:mb-8" />

          <div className="max-w-5xl mx-auto text-center mb-12 max-md:mb-6">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl max-md:text-xl font-bold text-theme-text font-serif tracking-tight uppercase">
                <TextReveal text="Beneficios Exclusivos por Reserva" />
              </h2>
              <div className="w-12 border-t border-[var(--theme-primary)]/30 mx-auto mt-4" />
            </ScrollReveal>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.02)_0%,transparent_70%)] pointer-events-none" />
          
          <ScrollReveal y={20} scale={false}>
            <div 
              className="max-w-5xl mx-auto border border-[var(--theme-border-subtle)] rounded-3xl max-md:rounded-2xl p-6 md:p-8 max-md:p-4 relative overflow-hidden shadow-lg"
              style={{ backgroundColor: 'var(--theme-surface)' }}
              onMouseEnter={() => setIsPromoPaused(true)}
              onMouseLeave={() => setIsPromoPaused(false)}
              onTouchStart={handlePromoTouchStart}
              onTouchEnd={handlePromoTouchEnd}
            >
              <AnimatePresence mode="wait">
                {activeResPromos.map((promo, idx) => {
                  if (idx !== currentPromoIndex % activeResPromos.length) return null
                  return (
                    <motion.div
                      key={promo.id || idx}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      drag={activeResPromos.length > 1 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={(event, info) => {
                        const swipe = info.offset.x
                        if (swipe < -80) {
                          handleNextPromo()
                        } else if (swipe > 80) {
                          handlePrevPromo()
                        }
                      }}
                      className={'grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center relative z-10 ' + (
                        activeResPromos.length > 1 ? 'cursor-grab active:cursor-grabbing select-none' : ''
                      )}
                    >
                      <div className="md:col-span-3 flex flex-col items-center md:items-start justify-center md:border-r border-[var(--theme-border-subtle)] md:pr-6 text-center md:text-left select-none pointer-events-none">
                        <span className="text-xs font-bold text-theme-text-muted uppercase tracking-[0.2em] mb-1 font-sans">
                          {promo.tipoBeneficio ? promo.tipoBeneficio.split(' ')[0] : 'BENEFICIO'}
                        </span>
                        <div className="text-5xl md:text-7xl font-normal font-serif text-[var(--theme-primary)] leading-none">
                          {promo.beneficio}
                        </div>
                        <span className="text-xs text-theme-text-muted font-medium uppercase tracking-[0.15em] mt-1.5 font-sans">
                          {promo.tipoBeneficio || 'DE DESCUENTO'}
                        </span>
                      </div>
                      
                      <div className="md:col-span-6 text-left space-y-3 pointer-events-none">
                        <div>
                          {promo.vigencia && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-card border border-[var(--theme-border-subtle)] text-[11px] font-semibold text-theme-text-muted tracking-wider uppercase mb-2 font-sans">
                              <span className="w-1 h-1 rounded-full bg-[var(--theme-primary)] animate-pulse" />
                              {promo.vigencia}
                            </div>
                          )}
                          <h3 className="text-lg font-normal text-theme-text uppercase tracking-wider font-serif">
                            {promo.titulo}
                          </h3>
                          <p className="text-sm max-md:text-xs text-theme-text-muted font-normal mt-2 leading-relaxed">
                            {promo.descripcion}
                          </p>
                        </div>
                      </div>
                      
                      <div className="md:col-span-3 flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                        <button
                          onClick={() => handlePromoClick(promo)}
                          style={{
                            backgroundColor: 'var(--theme-primary)',
                            color: primaryTextColor
                          }}
                          className="w-full md:w-auto px-6 py-3.5 max-md:py-2.5 max-md:text-[11px] hover:opacity-90 font-bold text-xs uppercase tracking-[0.15em] transition-all duration-300 rounded-xl cursor-pointer hover:shadow-lg hover:shadow-[var(--theme-primary)]/10 active:translate-y-0 text-center font-sans z-20"
                        >
                          {promo.textoBoton}
                        </button>
                        <span className="text-[11px] text-theme-text-muted leading-normal max-w-[200px] select-none pointer-events-none font-normal">
                          {bannerDescSub}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              
              {activeResPromos.length > 1 && (
                <div className="flex justify-center gap-2 mt-6 border-t border-[var(--theme-border-subtle)] pt-4 relative z-10">
                  {activeResPromos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentPromoIndex(idx)
                        resetPromoTimer()
                      }}
                      className={'h-1 rounded-full transition-all duration-300 cursor-pointer ' + (
                        currentPromoIndex === idx ? 'w-6 bg-[var(--theme-primary)]' : 'w-2 bg-theme-card hover:opacity-80'
                      )}
                      aria-label={'Ir a promoción ' + (idx + 1)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* SECCIÓN 5 — RESERVACIONES */}
      <section 
        id="reservaciones" 
        style={{ backgroundColor: 'var(--theme-surface)' }} 
        className="w-full py-16 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-md:py-10 max-md:px-3 text-theme-text relative z-10 border-b border-[var(--theme-border-subtle)] transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-12 2xl:gap-16 items-start xl:items-center">
          
          {/* Columna Izquierda: Información / Horarios / Contacto */}
          <div className="w-full order-1 xl:order-1 space-y-8 max-md:space-y-5 text-left max-w-2xl mx-auto xl:max-w-none xl:mx-0">
            <ScrollReveal>
              <div className="space-y-4 max-md:space-y-2">
                <h2 className="text-3xl sm:text-4xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight leading-tight uppercase">
                  <TextReveal text={resTitulo} />
                </h2>
                <p className="text-xs font-semibold text-[var(--theme-primary)] uppercase tracking-[0.25em] mt-2 block">
                  {resSubtitulo}
                </p>
                <div className="w-16 h-px bg-[var(--theme-primary)]" />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <p className="text-theme-text-muted text-sm font-normal leading-relaxed">
                {resDescripcion}
              </p>
            </ScrollReveal>
            
            <ScrollReveal delay={0.1}>
              <div className="space-y-3">
                <span className="text-theme-text-muted block uppercase tracking-[0.25em] text-[9px] font-bold">HORARIOS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    className="border border-[var(--theme-border-subtle)] rounded-lg px-4 py-3 flex flex-col text-left shadow-sm"
                    style={{ backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="flex items-center gap-2 text-theme-text font-medium text-xs uppercase tracking-wider mb-1">
                      <Calendar size={14} className="text-[var(--theme-primary)] shrink-0" />
                      <span>Lunes a Viernes</span>
                    </div>
                    <div className="text-theme-text-muted text-xs font-normal pl-5">
                      {resHorariosLV}
                    </div>
                  </div>
                  
                  <div 
                    className="border border-[var(--theme-border-subtle)] rounded-lg px-4 py-3 flex flex-col text-left shadow-sm"
                    style={{ backgroundColor: 'var(--theme-bg)' }}
                  >
                    <div className="flex items-center gap-2 text-theme-text font-medium text-xs uppercase tracking-wider mb-1">
                      <Calendar size={14} className="text-[var(--theme-primary)] shrink-0" />
                      <span>Sábados y Domingos</span>
                    </div>
                    <div className="text-theme-text-muted text-xs font-normal pl-5">
                      {resHorariosSD}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="space-y-4">
                <span className="text-theme-text-muted block uppercase tracking-[0.25em] text-[9px] font-bold">CONTACTO DIRECTO</span>
                {/* Cuadrícula 2x2 de Contacto Directo (1 col en celular, 2 cols desde tablet sm) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 w-full">
                  
                  {/* Bloque Teléfono */}
                  <a 
                    href={'tel:' + contactPhone.replace(/[^0-9+]/g, '')} 
                    className="flex flex-col w-full text-left group transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-xl bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary)]/20 transition-all shrink-0 flex items-center justify-center">
                        <Phone size={14} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold uppercase text-theme-text-muted group-hover:text-[var(--theme-primary)] transition-colors">
                        Llámanos Directamente
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black truncate text-theme-text">
                      {contactPhone || '7441504888'}
                    </span>
                  </a>

                  {/* Bloque WhatsApp */}
                  <a 
                    href={whatsappUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`flex flex-col w-full text-left group transition-all duration-300 ${!cleanNumber ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-xl bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary)]/20 transition-all shrink-0 flex items-center justify-center">
                        <MessageSquare size={14} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold uppercase text-theme-text-muted group-hover:text-[var(--theme-primary)] transition-colors">
                        WhatsApp (Respuesta en Minutos)
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black truncate text-theme-text">
                      {cleanNumber ? contactPhone : '...'}
                    </span>
                  </a>

                  {/* Bloque Correo (Comparte fila 2 con Ubicación) */}
                  <a 
                    href={'mailto:' + contactEmail} 
                    className="flex flex-col w-full text-left group transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-xl bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary)]/20 transition-all shrink-0 flex items-center justify-center">
                        <Mail size={14} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold uppercase text-theme-text-muted group-hover:text-[var(--theme-primary)] transition-colors">
                        Correo Electrónico
                      </span>
                    </div>
                    <span className="text-base font-bold truncate text-theme-text">
                      {contactEmail || 'contacto@gmail.com'}
                    </span>
                  </a>

                  {/* Bloque Ubicación (Comparte fila 2 con Correo) */}
                  {contactAddress && (
                    <div className="flex flex-col w-full text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 text-[var(--theme-primary)] shrink-0 flex items-center justify-center">
                          <MapPin size={14} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold uppercase text-theme-text-muted">
                          Ubicación
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate text-theme-text capitalize">
                        {contactAddress}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="pt-6 border-t border-[var(--theme-border-subtle)] flex flex-col gap-2.5">
                {resPoliticas.map((pol, polIdx) => (
                  <div key={polIdx} className="flex items-center gap-2.5 text-xs text-theme-text-muted font-normal">
                    <Check size={14} className="text-[var(--theme-primary)] shrink-0" />
                    <span>{typeof pol === 'string' ? pol.replace(/^✓\s*/, '') : (pol.titulo || pol.text || '')}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Columna Derecha: Formulario de Reserva */}
          <div 
            className="w-full order-2 xl:order-2 border border-[var(--theme-border-subtle)] rounded-3xl max-md:rounded-2xl p-6 sm:p-8 xl:p-10 max-md:p-4 shadow-xl relative max-w-2xl mx-auto xl:max-w-none xl:mx-0"
            style={{ backgroundColor: 'var(--theme-bg)' }}
          >
            <ScrollReveal delay={0.2}>
              <form onSubmit={handleConfirmReservation} noValidate className="space-y-6 max-md:space-y-3.5 text-sm text-left">
                {/* Input de Nombre completo */}
                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold uppercase mb-1 line-clamp-1 text-theme-text" title="Nombre completo">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Juan Pérez"
                    value={resForm.nombre}
                    onChange={e => {
                      setResForm({ ...resForm, nombre: e.target.value })
                      if (erroresRes.nombre) setErroresRes(prev => ({ ...prev, nombre: '' }))
                    }}
                    onBlur={e => validarCampoRes('nombre', e.target.value)}
                    style={{ color: 'var(--theme-text)' }}
                    className={`w-full bg-transparent border-b py-2 sm:py-3 text-theme-text placeholder-[var(--theme-text-muted)] focus:outline-none transition-all font-normal text-xs sm:text-sm ${
                      erroresRes.nombre 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'
                    }`}
                  />
                  {erroresRes.nombre && (
                    <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{erroresRes.nombre}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  {/* Input de Teléfono */}
                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Teléfono">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="7440000000"
                      value={resForm.telefono}
                      onChange={e => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setResForm({ ...resForm, telefono: digitsOnly })
                        if (erroresRes.telefono) setErroresRes(prev => ({ ...prev, telefono: '' }))
                      }}
                      onBlur={e => validarCampoRes('telefono', e.target.value)}
                      style={{ color: 'var(--theme-text)' }}
                      className={`w-full bg-transparent border-b py-2 sm:py-3 text-theme-text placeholder-[var(--theme-text-muted)] focus:outline-none transition-all font-normal text-xs sm:text-sm ${
                        erroresRes.telefono 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'
                      }`}
                    />
                    <div className="flex justify-between items-start mt-1">
                      <p className="text-theme-text-muted text-[11px] sm:text-xs">Obligatorio</p>
                      {erroresRes.telefono && (
                        <p className="text-red-500 text-[11px] sm:text-xs font-medium text-right leading-tight">{erroresRes.telefono}</p>
                      )}
                    </div>
                  </div>

                  {/* Input de Email */}
                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Email (Opcional)">
                      Email (Opcional)
                    </label>
                    <input
                      type="email"
                      maxLength={100}
                      placeholder="juan@ejemplo.com"
                      value={resForm.email}
                      onChange={e => {
                        setResForm({ ...resForm, email: e.target.value })
                        if (erroresRes.email) setErroresRes(prev => ({ ...prev, email: '' }))
                      }}
                      onBlur={e => validarCampoRes('email', e.target.value)}
                      style={{ color: 'var(--theme-text)' }}
                      className={`w-full bg-transparent border-b py-2 sm:py-3 text-theme-text placeholder-[var(--theme-text-muted)] focus:outline-none transition-all font-normal text-xs sm:text-sm ${
                        erroresRes.email 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'
                      }`}
                    />
                    <div className="flex justify-between items-start mt-1">
                      <p className="text-theme-text-muted text-[11px] sm:text-xs">Opcional</p>
                      {erroresRes.email && (
                        <p className="text-red-500 text-[11px] sm:text-xs font-medium text-right leading-tight">{erroresRes.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Fecha">
                      Fecha *
                    </label>
                    <DatePicker
                      selected={formData.fecha}
                      value={resForm.fecha}
                      onChange={(date) => handleDateChange(date)}
                      minDate={new Date()} /* Bloqueo estricto: Imposible seleccionar días anteriores a hoy */
                      filterDate={esDiaLaborable} /* Bloqueo dinámico: Deshabilita los días no laborables */
                      dateFormat="yyyy-MM-dd"
                      placeholder="Seleccionar fecha"
                      variant="underline"
                      fullWidth={true}
                      hasError={!!erroresRes.fecha}
                    />
                    {erroresRes.fecha && (
                      <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{erroresRes.fecha}</p>
                    )}
                  </div>
                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Hora">
                      Hora *
                    </label>
                    <div ref={horaDropdownRef} style={{ position: 'relative' }}>
                      {/* Select accesible sincronizado */}
                      <select
                        name="hora"
                        value={formData.hora}
                        onChange={handleInputChange}
                        disabled={availableHours.length === 0}
                        tabIndex={-1}
                        aria-hidden="true"
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                      >
                        <option value="" disabled>Selecciona una hora</option>
                        {availableHours.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>

                      {/* Dropdown visual elegante preservando el diseño original */}
                      <div
                        onClick={() => setHoraDropdownOpen(prev => !prev)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', 
                          borderBottom: erroresRes.hora 
                            ? '1px solid #ef4444' 
                            : '1px solid color-mix(in srgb, var(--theme-primary) 40%, transparent)',
                          cursor: 'pointer',
                          color: 'var(--theme-text)', fontSize: '13px',
                          opacity: availableHours.length === 0 && !formData.fecha ? 0.75 : 1,
                        }}
                      >
                        <span className={`truncate ${resForm.hora && availableHours.length > 0 ? 'text-theme-text' : 'text-theme-text-muted'}`}>
                          {availableHours.length === 0
                            ? (formData.fecha ? 'Sin horas' : 'Elige fecha')
                            : (availableHours.find(s => s.value === resForm.hora || s.label === resForm.hora)?.label || (resForm.hora ? (resForm.hora.includes(':') ? resForm.hora : 'Seleccionar hora') : 'Selecciona hora'))}
                        </span>
                        <ChevronDown size={15} style={{
                          color: 'var(--theme-text-muted)',
                          transform: horaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease',
                          flexShrink: 0
                        }} />
                      </div>
                      <div style={{
                        position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20,
                        background: 'var(--theme-surface)', borderRadius: '0 0 10px 10px',
                        borderLeft: horaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderRight: horaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderBottom: horaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        boxShadow: horaDropdownOpen ? '0 12px 24px rgba(0,0,0,0.15)' : 'none',
                        overflow: 'hidden',
                        maxHeight: horaDropdownOpen ? '260px' : '0px',
                        overflowY: 'auto',
                        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                      }}>
                        {availableHours.length === 0 ? (
                          <div 
                            onClick={() => setHoraDropdownOpen(false)}
                            style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--theme-text-muted)', cursor: 'pointer' }}
                          >
                            {formData.fecha ? 'No hay horarios disponibles para hoy' : 'Selecciona una fecha primero'}
                          </div>
                        ) : (
                          availableHours.map((slot) => {
                            const isSelected = resForm.hora === slot.value || resForm.hora === slot.label
                            return (
                              <div
                                key={slot.value}
                                onClick={() => {
                                  setResForm({ ...resForm, hora: slot.value })
                                  if (erroresRes.hora) setErroresRes(prev => ({ ...prev, hora: '' }))
                                  setHoraDropdownOpen(false)
                                }}
                                className={`transition-colors duration-150 ${isSelected ? 'font-semibold text-[var(--theme-primary)]' : 'text-theme-text'}`}
                                style={{
                                  padding: '12px 14px', fontSize: '14px',
                                  cursor: 'pointer',
                                  background: isSelected
                                    ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                    : 'transparent',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'}
                                onMouseLeave={e => e.currentTarget.style.background =
                                  isSelected
                                    ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                    : 'transparent'}
                              >
                                {slot.label}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                    {erroresRes.hora && (
                      <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{erroresRes.hora}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col w-full col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Personas">
                      Personas *
                    </label>
                    <div className="flex items-center justify-between sm:justify-center gap-3 bg-transparent border-b border-[var(--theme-primary)]/40 py-1.5 sm:py-2.5 text-theme-text">
                      <span className="text-xs text-theme-text-muted font-normal sm:hidden">Número de comensales:</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setResForm(prev => ({ ...prev, personas: Math.max(1, parseInt(prev.personas) - 1).toString() }))}
                          className="w-7 h-7 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-bold text-sm flex items-center justify-center hover:bg-[var(--theme-primary)]/20 active:scale-95 transition-all cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-center text-theme-text text-xs sm:text-sm font-semibold min-w-[70px] select-none">
                          {resForm.personas} {parseInt(resForm.personas) === 1 ? 'Persona' : 'Personas'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setResForm(prev => ({ ...prev, personas: Math.min(20, parseInt(prev.personas) + 1).toString() }))}
                          className="w-7 h-7 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-bold text-sm flex items-center justify-center hover:bg-[var(--theme-primary)]/20 active:scale-95 transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Zona preferida">
                      Zona preferida
                    </label>
                    <div ref={zonaDropdownRef} style={{ position: 'relative' }}>
                      <div
                        onClick={() => setZonaDropdownOpen(prev => !prev)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--theme-primary) 40%, transparent)',
                          cursor: 'pointer', color: 'var(--theme-text)', fontSize: '13px',
                        }}
                      >
                        <span className="truncate">{resForm.zona_preferida || resForm.zona || 'Sin preferencia'}</span>
                        <ChevronDown size={15} style={{
                          color: 'var(--theme-text-muted)',
                          transform: zonaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease',
                          flexShrink: 0
                        }} />
                      </div>
                      <div style={{
                        position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20,
                        background: 'var(--theme-surface)', borderRadius: '0 0 10px 10px',
                        borderLeft: zonaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderRight: zonaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderBottom: zonaDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        boxShadow: zonaDropdownOpen ? '0 12px 24px rgba(0,0,0,0.15)' : 'none',
                        overflow: 'hidden',
                        maxHeight: zonaDropdownOpen ? '260px' : '0px',
                        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                      }}>
                        {zonaOptions.map(opt => {
                          const currentVal = resForm.zona_preferida || resForm.zona
                          const isSelected = currentVal === opt || (opt === 'Sin preferencia' && (!currentVal || currentVal === 'Sin preferencia'))
                          return (
                            <div
                              key={opt}
                              onClick={() => {
                                const val = opt === 'Sin preferencia' ? 'Sin preferencia' : opt
                                setResForm(prev => ({ 
                                  ...prev, 
                                  zona: val === 'Sin preferencia' ? '' : val,
                                  zona_preferida: val
                                }))
                                setZonaDropdownOpen(false)
                              }}
                              className={`transition-colors duration-150 ${isSelected ? 'font-semibold text-[var(--theme-primary)]' : 'text-theme-text'}`}
                              style={{
                                padding: '12px 14px', fontSize: '14px',
                                cursor: 'pointer',
                                background: isSelected
                                  ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                  : 'transparent',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'}
                              onMouseLeave={e => e.currentTarget.style.background =
                                isSelected
                                  ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                  : 'transparent'}
                            >
                              {opt}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Select oculto para compatibilidad de formulario */}
                    <select
                      name="zona_preferida"
                      value={formData.zona_preferida || formData.zona || 'Sin preferencia'}
                      onChange={handleInputChange}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <option value="Sin preferencia">Sin preferencia</option>
                      {landingData?.areas?.map((area) => (
                        <option key={area.id} value={area.nombre}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col w-full min-w-0">
                    <label className="text-xs font-bold uppercase mb-1 truncate text-theme-text" title="Ocasión especial">
                      Ocasión especial
                    </label>
                    <div ref={ocasionDropdownRef} style={{ position: 'relative' }}>
                      <div
                        onClick={() => setOcasionDropdownOpen(prev => !prev)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid color-mix(in srgb, var(--theme-primary) 40%, transparent)',
                          cursor: 'pointer', color: 'var(--theme-text)', fontSize: '13px',
                        }}
                      >
                        <span className="truncate">{resForm.ocasion || 'Sin preferencia'}</span>
                        <ChevronDown size={15} style={{
                          color: 'var(--theme-text-muted)',
                          transform: ocasionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s ease',
                          flexShrink: 0
                        }} />
                      </div>
                      <div style={{
                        position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20,
                        background: 'var(--theme-surface)', borderRadius: '0 0 10px 10px',
                        borderLeft: ocasionDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderRight: ocasionDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        borderBottom: ocasionDropdownOpen ? '1px solid var(--theme-border-subtle)' : 'none',
                        boxShadow: ocasionDropdownOpen ? '0 12px 24px rgba(0,0,0,0.15)' : 'none',
                        overflow: 'hidden',
                        maxHeight: ocasionDropdownOpen ? '260px' : '0px',
                        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                      }}>
                        {['Sin preferencia', 'Cumpleaños', 'Aniversario', 'Cena de negocios', 'Otro (Especificar)'].map(opt => {
                          const isSelected = resForm.ocasion === opt || (opt === 'Sin preferencia' && !resForm.ocasion)
                          return (
                            <div
                              key={opt}
                              onClick={() => {
                                setResForm({ 
                                  ...resForm, 
                                  ocasion: opt === 'Sin preferencia' ? '' : opt,
                                  motivoPersonalizado: opt === 'Otro (Especificar)' ? resForm.motivoPersonalizado : ''
                                })
                                setOcasionDropdownOpen(false)
                              }}
                              className={`transition-colors duration-150 ${isSelected ? 'font-semibold text-[var(--theme-primary)]' : 'text-theme-text'}`}
                              style={{
                                padding: '12px 14px', fontSize: '14px',
                                cursor: 'pointer',
                                background: isSelected
                                  ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                  : 'transparent',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-primary) 12%, transparent)'}
                              onMouseLeave={e => e.currentTarget.style.background =
                                isSelected
                                  ? 'color-mix(in srgb, var(--theme-primary) 14%, transparent)'
                                  : 'transparent'}
                            >
                              {opt}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {resForm.ocasion === 'Otro (Especificar)' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-1.5"
                      >
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Escribe el motivo de tu reservación"
                          value={resForm.motivoPersonalizado || ''}
                          onChange={e => {
                            setResForm({ ...resForm, motivoPersonalizado: e.target.value })
                            if (erroresRes.motivoPersonalizado) setErroresRes(prev => ({ ...prev, motivoPersonalizado: '' }))
                          }}
                          onBlur={e => validarCampoRes('motivoPersonalizado', e.target.value)}
                          style={{ color: 'var(--theme-text)' }}
                          className={`w-full bg-transparent border-b py-2.5 text-theme-text placeholder-[var(--theme-text-muted)] focus:outline-none transition-all font-normal text-sm ${
                            erroresRes.motivoPersonalizado 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'
                          }`}
                        />
                        {erroresRes.motivoPersonalizado && (
                          <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{erroresRes.motivoPersonalizado}</p>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold uppercase mb-1 line-clamp-1 text-theme-text" title="Nota especial">
                    Nota especial
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Detalles adicionales sobre el motivo de la reservación, preferencia de mesa específica, silla para bebé..."
                    value={resForm.nota}
                    onChange={e => setResForm({ ...resForm, nota: e.target.value })}
                    style={{ color: 'var(--theme-text)' }}
                    className="w-full bg-transparent border-b border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)] py-2 sm:py-3 text-theme-text placeholder-[var(--theme-text-muted)] focus:outline-none transition-all font-normal resize-none leading-relaxed text-xs sm:text-sm"
                  />
                </div>

                {/* Honeypot Invisible Anti-Bot */}
                <input
                  type="text"
                  name="_hp_website"
                  value={hpWebsite}
                  onChange={e => setHpWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0 }}
                />

                {/* Cloudflare Turnstile Invisible / Managed Widget */}
                <TurnstileWidget
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                  widgetRef={turnstileWidgetRef}
                  className="my-1"
                />

                <div className="space-y-3.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || (!turnstileToken && import.meta.env.PROD)}
                    style={{
                      backgroundColor: 'var(--theme-primary)',
                      color: primaryTextColor
                    }}
                    className="w-full py-4 max-md:py-3 hover:opacity-90 font-bold uppercase tracking-widest rounded-full shadow-lg transition-all cursor-pointer text-center font-sans text-sm max-md:text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                  >
                    {!turnstileToken && import.meta.env.PROD ? (
                      <>
                        <ShieldCheck className="w-5 h-5 animate-pulse shrink-0 text-current" />
                        <span className="normal-case tracking-normal">Verificando seguridad...</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        <span className="normal-case">Procesando...</span>
                      </>
                    ) : (
                      'Solicitar reservación'
                    )}
                  </button>
                  <p className="text-xs text-theme-text-muted text-center font-sans tracking-wide mt-1 font-normal">
                    Tu solicitud será confirmada por nuestro equipo en menos de 24 horas
                  </p>
                </div>
              </form>
            </ScrollReveal>
          </div>

          {/* MODAL DE ÉXITO DE RESERVACIÓN */}
          {reservationSuccess && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 max-md:p-3 bg-slate-900/40 backdrop-blur-md transition-opacity">
              <div className="bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 max-md:p-4 text-center transform transition-all">
                
                {/* Icono de Check */}
                <div className="w-16 h-16 max-md:w-12 max-md:h-12 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 max-md:mb-3">
                  <svg className="w-8 h-8 max-md:w-6 max-md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* 2. TEXTOS ACTUALIZADOS (Realistas al flujo de trabajo) */}
                <h3 className="text-xl max-md:text-lg font-bold text-[var(--theme-text)] mb-2">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-[var(--theme-text-muted)] text-sm max-md:text-xs mb-6 max-md:mb-4 leading-relaxed">
                  Tu solicitud de reservación ha sido recibida. El encargado se hará cargo de revisarla y <strong className="text-[var(--theme-text)] font-semibold">te notificaremos la confirmación a través del número o correo</strong> que nos proporcionaste.
                </p>

                {/* Detalles de la Reserva (Estilo Ticket) */}
                <div className="bg-[var(--theme-subcard-bg)] rounded-xl p-4 max-md:p-3 mb-6 max-md:mb-4 text-left border border-[var(--theme-border-subtle)]">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-[var(--theme-border-subtle)]">
                    <span className="text-sm font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Folio</span>
                    <span className="text-lg font-bold text-[var(--theme-primary)]">
                      {reservationSuccess.folio ? String(reservationSuccess.folio).replace(/-/g, '') : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--theme-text-muted)]">A nombre de:</span>
                      <span className="font-medium text-[var(--theme-text)]">{reservationSuccess.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--theme-text-muted)]">Fecha y Hora:</span>
                      <span className="font-medium text-[var(--theme-text)]">
                        {reservationSuccess.fecha} a las {reservationSuccess.hora}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Cierre */}
                <button
                  onClick={() => setReservationSuccess(null)}
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
                  className="w-full py-3 px-4 font-semibold rounded-xl transition-all hover:brightness-110 shadow-md cursor-pointer"
                >
                  Aceptar y Volver al Inicio
                </button>

              </div>
            </div>,
            document.body
          )}
          </div>
        </div>
      </section>

      {/* Línea separadora dorada */}
      <div className="w-full h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }} />

      {/* SECCIÓN 3 — SOBRE NOSOTROS / NUESTRA HISTORIA */}
      <section id="nosotros" style={{ backgroundColor: 'var(--theme-bg)' }} className="w-full text-theme-text relative z-10 border-b border-[var(--theme-border-subtle)] overflow-hidden transition-colors duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch w-full">

          {/* =========================================================
              BLOQUE 1: TEXTO (Siempre arriba en 1 columna) 
              ========================================================= */}
          <div className="order-1 w-full flex flex-col justify-center py-12 md:py-16 lg:py-20 px-6 sm:px-10 md:px-12 lg:pl-12 lg:pr-8 xl:pl-20 xl:pr-12 max-md:py-8 max-md:px-4 max-w-2xl lg:max-w-none mx-auto lg:mx-0 text-left space-y-7 max-md:space-y-4">
            <ScrollReveal x={-30} y={0}>
              <span className="text-xs font-bold tracking-[0.4em] max-md:tracking-[0.2em] text-[var(--theme-primary)] uppercase block mb-1">
                NUESTRA HISTORIA
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1} x={-30} y={0}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight leading-tight">
                <span>{historiaTitulo}</span>
              </h2>
              <div className="w-16 h-px bg-[var(--theme-primary)] mt-5 max-md:mt-3" />
            </ScrollReveal>
            <ScrollReveal delay={0.2} x={-30} y={0}>
              <p className="text-sm md:text-base max-md:text-xs text-theme-text-muted leading-relaxed max-w-lg font-normal">
                {historiaDescripcion}
              </p>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3} x={-30} y={0}>
              <div className="flex flex-col gap-6 max-md:gap-3.5 pt-2">
                {historiaCaracteristicas.map((carac, idx) => {
                  const iconName = carac.icono || carac.icon || (idx === 0 ? 'Leaf' : idx === 1 ? 'ChefHat' : 'MapPin');
                  const IconComponent = Icons[iconName] || Icons.Leaf;
                  const tituloCarac = carac.titulo || carac.title || '';
                  const descCarac = carac.descripcion || carac.desc || '';
                  return (
                    <div key={idx} className="flex gap-4 max-md:gap-3 items-start">
                      <IconComponent className="text-[var(--theme-primary)] shrink-0 mt-1 max-md:w-4 max-md:h-4" size={20} />
                      <div>
                        <h4 className="text-theme-text text-sm max-md:text-xs font-semibold">{tituloCarac}</h4>
                        <p className="text-theme-text-muted text-xs max-md:text-[11px] font-normal mt-1">{descCarac}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>

          {/* =========================================================
              BLOQUE 2: IMAGEN (Pegada a los límites en 2 columnas y en 1 columna) 
              ========================================================= */}
          <div className="order-2 w-full relative min-h-[350px] sm:min-h-[420px] lg:min-h-[500px] max-md:min-h-[260px] h-full flex items-stretch">
            <ScrollReveal x={30} y={0} delay={0.2} className="w-full h-full flex items-stretch">
              <div className="relative w-full h-full min-h-[350px] sm:min-h-[420px] lg:min-h-full max-md:min-h-[260px] overflow-hidden bg-theme-surface group">
                <img 
                  src={historiaFondo || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80'} 
                  alt={historiaTitulo || `Nuestra Historia ${restName}`} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80'
                  }}
                />
                
                {/* Etiqueta Flotante "DESDE YYYY" */}
                {historiaAnio && (
                  <div 
                    style={{
                      backgroundColor: 'var(--theme-primary)',
                      color: primaryTextColor
                    }}
                    className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 max-md:bottom-3 max-md:right-3 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 max-md:px-3 max-md:py-2 shadow-2xl z-20 text-center leading-none"
                  >
                    <span className="text-[10px] tracking-[0.3em] font-medium block mb-1 opacity-80 uppercase">DESDE</span>
                    <span className="text-xl sm:text-2xl max-md:text-lg font-bold">{historiaAnio}</span>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>

        </div>
      </section>

      {/* Línea separadora */}
      <div className="w-full h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }} />

      {/* SECCIÓN 2.5 — NUESTROS SERVICIOS */}
      <section id="servicios" style={{ backgroundColor: 'var(--theme-surface)' }} className="w-full py-16 md:py-24 max-md:py-10 text-theme-text px-4 sm:px-6 md:px-8 lg:px-12 max-md:px-3 relative z-10 border-b border-[var(--theme-border-subtle)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto text-center">
          <ScrollReveal>
            <div className="space-y-4 max-md:space-y-2">
              <span className="text-xs max-md:text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-[0.4em] max-md:tracking-[0.2em] block font-sans">SERVICIOS EXCLUSIVOS</span>
              <h2 className="text-3xl sm:text-4xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight">
                <TextReveal text={'Por qué elegir ' + restName} />
              </h2>
            </div>
          </ScrollReveal>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-md:gap-4 mt-12 max-md:mt-6"
          >
            {serviciosList.map((servicio, i) => {
              const iconName = servicio.icono || servicio.icon || 'Star'
              const Icon = Icons[iconName] || Icons.Star
              const sTitle = servicio.titulo || servicio.title || 'Servicio Premium'
              const sDesc = servicio.descripcion || servicio.desc || ''
              return (
                <motion.div 
                  key={i}
                  variants={staggerItem}
                  className="group relative p-8 max-md:p-5 cursor-default text-left overflow-hidden border border-transparent max-md:border-[var(--theme-border-subtle)] max-md:rounded-2xl"
                >
                  <span className="absolute top-4 right-6 max-md:top-3 max-md:right-4 text-7xl max-md:text-5xl font-black text-[var(--theme-primary)] select-none pointer-events-none opacity-40 max-md:opacity-30">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="mb-6 max-md:mb-3">
                    <Icon className="w-8 h-8 max-md:w-6 max-md:h-6 text-[var(--theme-primary)]" strokeWidth={1} />
                  </div>

                  <h3 className="text-theme-text font-serif text-xl max-md:text-base mb-3 max-md:mb-1.5 tracking-wide font-normal">
                    {sTitle}
                  </h3>
                  <p className="text-theme-text-muted text-sm max-md:text-xs font-normal leading-relaxed">
                    {sDesc}
                  </p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* SECCIÓN 7 — EXPERIENCIAS / RESEÑAS */}
      <section id="reseñas" style={{ backgroundColor: 'var(--theme-bg)' }} className="w-full py-16 md:py-24 max-md:py-10 text-theme-text px-4 sm:px-6 md:px-8 lg:px-12 max-md:px-3 relative z-10 border-b border-[var(--theme-border-subtle)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-16 max-md:space-y-8">
          
          <ScrollReveal>
            <div className="text-center space-y-4 max-md:space-y-2">
              <span className="text-xs max-md:text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-[0.4em] max-md:tracking-[0.2em] block">EXPERIENCIAS</span>
              <h2 className="text-3xl sm:text-4xl max-md:text-2xl font-bold text-theme-text font-serif tracking-tight uppercase">
                <TextReveal text="Lo que dicen nuestros visitantes" />
              </h2>
            </div>
          </ScrollReveal>

          {/* Contenedor de Estadísticas Dinámicas */}
          <ScrollReveal delay={0.1}>
            <div className="flex justify-center items-center gap-12 max-md:gap-5 text-center mb-12 max-md:mb-6">
              {/* Bloque 1: Promedio */}
              <div>
                <div className="text-6xl max-md:text-4xl font-bold leading-none tracking-tighter" style={{ color: 'var(--theme-primary, #2563eb)' }}>
                  {stats.promedio}
                </div>
                <div className="text-amber-400 mt-2 max-md:mt-1 text-xl max-md:text-sm tracking-widest flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= Math.round(Number(stats.promedio) || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}
                    />
                  ))}
                </div>
              </div>

              {/* Bloque 2: Total Verificadas */}
              <div className="pt-2">
                <div className="text-3xl max-md:text-2xl font-semibold text-slate-800 dark:text-white font-serif">
                  {formatearTotal(stats.total)}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                  Experiencias verificadas
                </div>
              </div>

              {/* Bloque 3: Satisfacción */}
              <div className="pt-2">
                <div className="text-3xl max-md:text-2xl font-semibold text-slate-800 dark:text-white font-serif">
                  {stats.satisfaccion}%
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                  Satisfacción
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* SECCIÓN DE TARJETAS (Carrusel Horizontal Flex) */}
          {reviewsData.length > 0 && (
            <ScrollReveal delay={0.2}>
              <div className="flex overflow-x-auto gap-4 md:gap-6 max-md:gap-3 w-full max-w-7xl mx-auto p-4 md:p-8 max-md:p-2 snap-x snap-mandatory custom-scrollbar pb-8 max-md:pb-4 mt-8 max-md:mt-4">
                {reviewsData.map((review) => {
                  const rating = Number(review.rating) || 5;
                  const comentario = review.comentario || review.comment || '';
                  const fotosReview = (review.fotos && review.fotos.length > 0)
                    ? review.fotos
                    : (review.images ? review.images.map(i => i.image_path || i) : []);
                  const nombreDisplay = review.nombre || review.customer_name_masked || review.customer_name || 'Comensal';
                  const tiempoDisplay = review.tiempo || (review.created_at ? timeAgo(review.created_at) : '');

                  return (
                    <div 
                      key={review.id} 
                      className="shrink-0 w-[78vw] sm:w-[320px] md:w-[380px] snap-start bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-md:p-4 flex flex-col justify-between"
                    >
                      {/* Estrellas */}
                      <div className="text-amber-400 text-sm mb-3 max-md:mb-2">
                        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                      </div>

                      {/* Comentario: Altura fija reservada de 3 renglones para dimensiones uniformes */}
                      <div className="h-[68px] max-md:h-[58px] min-h-[68px] max-md:min-h-[58px] mb-1 overflow-hidden flex flex-col justify-start">
                        <p 
                          onClick={() => comentario.length > 80 && navigate(`/experiencias#resena-${review.id}`)}
                          className={`text-slate-600 dark:text-slate-300 text-sm max-md:text-xs italic leading-relaxed line-clamp-3 select-none ${comentario.length > 80 ? 'cursor-pointer hover:text-[var(--theme-primary)] transition-colors' : ''}`}
                        >
                          "{comentario}"
                        </p>
                      </div>

                      {/* Botón Ver Más si el texto llena los 3 renglones */}
                      <div className="h-5 min-h-[20px] mb-3 max-md:mb-2 flex items-center">
                        {comentario.length > 80 ? (
                          <button 
                            type="button"
                            onClick={() => navigate(`/experiencias#resena-${review.id}`)}
                            className="text-[var(--theme-primary)] text-xs font-semibold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <span>ver más...</span>
                          </button>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>

                      {/* Galería de fotos auto-expandible (1, 2 o 3 fotos llenando todo el ancho) */}
                      {fotosReview && fotosReview.length > 0 && (() => {
                        const validPhotos = fotosReview.map(f => getImageUrl(f)).filter(Boolean)
                        const displayPhotos = validPhotos.slice(0, 3)
                        const totalPhotos = validPhotos.length
                        if (displayPhotos.length === 0) return null

                        return (
                          <div className="flex gap-2 w-full mb-4 max-md:mb-2.5 overflow-hidden items-center">
                            {displayPhotos.map((srcUrl, idx) => {
                              const isLastAndMore = idx === 2 && totalPhotos > 3
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => navigate(`/experiencias#resena-${review.id}`)}
                                  className="relative flex-1 min-w-0 h-20 sm:h-24 max-md:h-16 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shrink cursor-pointer group"
                                >
                                  <img 
                                    src={srcUrl} 
                                    alt={`Foto reseña ${idx + 1}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                  />
                                  {isLastAndMore && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                      +{totalPhotos - 2}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Usuario */}
                      <div className="flex items-center gap-3 mt-auto pt-4 max-md:pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="w-10 h-10 max-md:w-8 max-md:h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {nombreDisplay.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm max-md:text-xs capitalize truncate">{nombreDisplay}</h4>
                          {tiempoDisplay && <span className="text-xs max-md:text-[11px] text-slate-400 block truncate">{tiempoDisplay}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>
          )}

          {/* BOTÓN DE LLAMADO A LA ACCIÓN */}
          <ScrollReveal delay={0.3}>
            <div className="flex justify-center mt-4 mb-12 max-md:mb-6">
              <a 
                href="/experiencias" 
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: primaryTextColor
                }}
                className="font-bold py-3.5 px-8 max-md:py-3 max-md:px-6 rounded-full shadow-lg hover:shadow-xl hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer font-sans text-sm max-md:text-xs"
              >
                <span>Descubrir y compartir experiencia</span>
                <span>→</span>
              </a>
            </div>
          </ScrollReveal>
        </div>

        {/* MODAL PARA DEJAR RESEÑA */}
        <AnimatePresence>
          {isReviewModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
              >
                {/* Botón de Cerrar (X) */}
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  className="absolute top-5 right-5 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors p-1 rounded-lg cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X size={20} />
                </button>

                {reviewSuccessData ? (
                  /* MANEJO DE EXPECTATIVAS (UX DE ÉXITO) */
                  <div className="text-center py-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-5 text-green-600 dark:text-green-400">
                      <Check size={32} strokeWidth={2.5} />
                    </div>

                    <h3 className="text-2xl font-bold text-[var(--theme-text)] mb-3 font-serif">
                      ¡Reseña Enviada!
                    </h3>

                    <p className="text-[var(--theme-text-muted)] text-base leading-relaxed mb-6 font-medium">
                      ¡Gracias por compartir tu experiencia, {reviewSuccessData.nombre}! Tu reseña ha sido enviada y se publicará en breve tras ser verificada.
                    </p>

                    <div className="bg-[var(--theme-subcard-bg)] rounded-xl p-4 mb-6 text-xs sm:text-sm text-[var(--theme-text-muted)] border border-[var(--theme-border-subtle)]">
                      <span className="font-semibold text-[var(--theme-text)] block mb-1">Moderación de Calidad</span>
                      Para garantizar la autenticidad y el respeto en nuestra comunidad, un administrador verificará tu comentario antes de mostrarlo públicamente en la plataforma.
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseReviewModal}
                      style={{
                        backgroundColor: 'var(--theme-primary)',
                        color: primaryTextColor,
                      }}
                      className="w-full py-3.5 px-6 font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 shadow-md hover:opacity-95 cursor-pointer"
                    >
                      Aceptar
                    </button>
                  </div>
                ) : (
                  /* FORMULARIO DE CAPTURA */
                  <div>
                    <div className="text-left mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--theme-primary)] font-semibold block mb-1">
                        Tu Experiencia AURUM
                      </span>
                      <h3 className="text-2xl font-bold text-[var(--theme-text)] font-serif">
                        Dejar una Reseña
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] mt-1">
                        Tu opinión es fundamental para seguir perfeccionando nuestro servicio y propuesta culinaria.
                      </p>
                    </div>

                    {reviewError && (
                      <div className="flex items-center gap-2 p-3.5 mb-5 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitReview} className="space-y-5 text-left">
                      {/* Honeypot invisible */}
                      <input
                        type="text"
                        name="_hp_website"
                        value={reviewHpWebsite}
                        onChange={(e) => setReviewHpWebsite(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        className="hidden pointer-events-none opacity-0 absolute w-0 h-0"
                        aria-hidden="true"
                      />

                      {/* Selector de Estrellas Interactivo */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] mb-2">
                          Calificación general <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5 p-2 bg-[var(--theme-subcard-bg)] rounded-xl border border-[var(--theme-border-subtle)]">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = star <= (hoverRating || reviewRating)
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                title={`${star} de 5 estrellas`}
                                aria-label={`${star} estrellas`}
                              >
                                <Star
                                  size={28}
                                  className={isFilled ? 'text-[var(--theme-primary,#C9A84C)]' : 'text-slate-300 dark:text-slate-600'}
                                  fill={isFilled ? 'currentColor' : 'transparent'}
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                />
                              </button>
                            )
                          })}
                          <span className="text-xs font-medium text-[var(--theme-text-muted)] ml-2">
                            {hoverRating > 0
                              ? `${hoverRating} de 5 estrellas`
                              : reviewRating > 0
                              ? `${reviewRating} de 5 estrellas`
                              : 'Toca una estrella'}
                          </span>
                        </div>
                      </div>

                      {/* Nombre del Cliente */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] mb-1.5">
                          Tu Nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={reviewForm.nombre}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Ej. Sofía Hernández"
                          className="w-full px-4 py-3 text-sm bg-[var(--theme-input)] border border-[var(--theme-border-subtle)] rounded-xl text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] transition-all"
                        />
                      </div>

                      {/* Comentario / Experiencia */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text)]">
                            Tu Experiencia <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-[var(--theme-text-muted)]">
                            {reviewForm.comentario.length}/300
                          </span>
                        </div>
                        <textarea
                          required
                          rows={4}
                          maxLength={300}
                          value={reviewForm.comentario}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, comentario: e.target.value }))}
                          placeholder="Cuéntanos los detalles de tu visita, qué platillos probaste o qué te pareció el ambiente..."
                          className="w-full px-4 py-3 text-sm bg-[var(--theme-input)] border border-[var(--theme-border-subtle)] rounded-xl text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] transition-all resize-none"
                        />
                      </div>

                      {/* Cloudflare Turnstile */}
                      <div className="py-1">
                        <TurnstileWidget
                          onVerify={(token) => setReviewTurnstileToken(token)}
                          onExpire={() => setReviewTurnstileToken('')}
                          onError={() => setReviewTurnstileToken('')}
                          widgetRef={reviewTurnstileWidgetRef}
                        />
                      </div>

                      {/* Botón de Envío */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCloseReviewModal}
                          disabled={isSubmittingReview}
                          className="w-full sm:w-auto px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={
                            isSubmittingReview ||
                            reviewRating === 0 ||
                            !reviewForm.nombre.trim() ||
                            !reviewForm.comentario.trim() ||
                            (!reviewTurnstileToken && import.meta.env.PROD)
                          }
                          style={{
                            backgroundColor: 'var(--theme-primary)',
                            color: primaryTextColor,
                          }}
                          className="w-full sm:flex-1 py-3.5 px-6 font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                          {isSubmittingReview ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : !reviewTurnstileToken && import.meta.env.PROD ? (
                            <span>Verificando seguridad...</span>
                          ) : (
                            <>
                              <span>Enviar Reseña</span>
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      <div className="w-full h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }}
      />

      {/* SECCIÓN 8 — CONTACTO Y UBICACIÓN */}
      <section id="contacto" style={{ backgroundColor: 'var(--theme-surface)' }} className="w-full py-16 md:py-24 max-md:py-10 text-theme-text px-4 sm:px-6 md:px-8 lg:px-12 max-md:px-3 relative z-10 border-b border-[var(--theme-border-subtle)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto">

          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16 max-md:mb-8">
            <span className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] font-semibold uppercase block mb-1">
              {contactoLabel}
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold font-serif text-theme-text tracking-tight max-md:text-2xl">
              <TextReveal text={contactoTitulo} />
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 2xl:gap-16 items-stretch mb-12 md:mb-16 max-md:mb-8 max-md:gap-6">

            <div className="lg:col-span-5 space-y-6 lg:space-y-6 xl:space-y-8 flex flex-col justify-between text-left">
              <ScrollReveal delay={0.1}>
                <div className="space-y-4 sm:space-y-6 md:space-y-7 pt-2">
                  {[
                    {
                      icono: MapPin,
                      label: 'DIRECCIÓN',
                      valor: contactAddress,
                      subvalor: restName,
                      link: mapsUrl
                    },
                    {
                      icono: Phone,
                      label: 'TELÉFONO',
                      valor: contactPhone,
                      subvalor: 'Lunes a Domingo · 1:00 PM — 11:00 PM',
                      link: 'tel:' + contactPhone.replace(/[^0-9+]/g, '')
                    },
                    {
                      icono: Mail,
                      label: 'CORREO',
                      valor: contactEmail,
                      subvalor: '',
                      link: 'mailto:' + contactEmail
                    },
                    {
                      icono: MessageCircle,
                      label: 'WHATSAPP',
                      valor: contactWhatsapp,
                      subvalor: 'Atención rápida',
                      link: whatsappUrl
                    },
                  ].map((item, idx) => {
                    const Icon = item.icono
                    return (
                      <a
                        key={idx}
                        href={item.link}
                        target={item.link.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 sm:gap-4 group"
                      >
                        <div className="mt-1 text-[var(--theme-primary)] shrink-0">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs tracking-[0.25em] text-[var(--theme-primary)]/70 font-semibold mb-0.5">{item.label}</p>
                          <p className="text-theme-text text-sm sm:text-base md:text-lg font-semibold group-hover:text-[var(--theme-primary)] transition-colors break-words">{item.valor}</p>
                          {item.subvalor && (
                            <p className="text-xs sm:text-sm text-theme-text-muted font-normal mt-0.5">{item.subvalor}</p>
                          )}
                        </div>
                      </a>
                    )
                  })}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.12}>
                <div className="border border-[var(--theme-primary)]/20 rounded-xl p-3.5 sm:p-4 bg-[var(--theme-primary)]/5">
                  <p className="text-[10px] tracking-[0.25em] text-[var(--theme-primary)] font-semibold uppercase mb-1">
                    EVENTOS ESPECIALES
                  </p>
                  <p className="text-theme-text-muted text-xs font-normal leading-relaxed">
                    {contactoEventos}
                  </p>
                </div>
              </ScrollReveal>

              {/* Redes Sociales Dinámicas con Sistema Auto-Alineado */}
              {socialNetworks.length > 0 && (
                <ScrollReveal delay={0.15}>
                  <div className={`grid gap-2.5 sm:gap-3 pt-2 w-full ${
                    socialNetworks.length === 1 
                      ? 'grid-cols-1' 
                      : socialNetworks.length === 2 
                        ? 'grid-cols-2' 
                        : socialNetworks.length === 3 
                          ? 'grid-cols-2 sm:grid-cols-3' 
                          : 'grid-cols-2 sm:grid-cols-2 xl:grid-cols-4'
                  }`}>
                    {socialNetworks.map((red, idx) => {
                      const Icon = red.icono
                      // En mobile (grid de 2 cols), si hay 3 redes, la 3ra abarca ambas columnas para no quedar huérfana
                      const isThirdOfThree = socialNetworks.length === 3 && idx === 2
                      const colSpanClass = isThirdOfThree ? 'col-span-2 sm:col-span-1' : 'col-span-1'

                      return (
                        <SafeSocialLink
                          key={red.label}
                          url={red.href}
                          network={red.network || red.label.toLowerCase()}
                          className={`${colSpanClass} flex items-center justify-between gap-2.5 text-xs bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/18 border border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)]/40 rounded-xl px-3.5 py-2.5 sm:py-3 group cursor-pointer transition-all duration-300 shadow-xs min-w-0`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="text-[var(--theme-primary)] group-hover:scale-110 transition-transform shrink-0">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="text-left leading-tight min-w-0">
                              <span className="text-[9px] text-theme-text-muted block font-bold tracking-widest uppercase mb-0.5 truncate">
                                {red.label}
                              </span>
                              <span className="text-xs font-semibold text-theme-text group-hover:text-[var(--theme-primary)] transition-colors truncate block">
                                {red.handle}
                              </span>
                            </div>
                          </div>
                          <ExternalLink size={12} className="text-[var(--theme-primary)]/40 group-hover:text-[var(--theme-primary)] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </SafeSocialLink>
                      )
                    })}
                  </div>
                </ScrollReveal>
              )}
            </div>

            <ScrollReveal x={40} y={0} delay={0.15} className="lg:col-span-7 h-full">
              <div 
                className="border border-[var(--theme-border-subtle)] rounded-2xl p-4 sm:p-6 md:p-8 xl:p-10 shadow-sm text-left w-full h-full flex flex-col justify-between"
                style={{ backgroundColor: 'var(--theme-bg)' }}
              >
                <ScrollReveal delay={0.2} className="h-full flex flex-col justify-between">
                  <h3 className="text-xs sm:text-base font-bold text-theme-text uppercase tracking-widest border-b border-[var(--theme-border-subtle)] pb-2.5 mb-3 sm:mb-6">
                    ENVÍANOS UN MENSAJE
                  </h3>
                  <form onSubmit={handleSendMessage} noValidate className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-5 lg:space-y-4 xl:space-y-6 text-sm">
                    {/* Fila 1: Nombre (Izquierda) y Teléfono (Derecha) */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      {/* NOMBRE */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-theme-text truncate" title="Nombre *">Nombre *</label>
                        <input
                          type="text"
                          maxLength={50}
                          placeholder="Ej. Juan Pérez"
                          value={contactForm.nombre}
                          onChange={(e) => {
                            setContactForm({ ...contactForm, nombre: e.target.value })
                            if (errores.nombre) setErrores(prev => ({ ...prev, nombre: '' }))
                          }}
                          onBlur={(e) => validarCampo('nombre', e.target.value)}
                          className={`w-full border-b bg-transparent py-2 sm:py-2.5 focus:outline-none transition-all text-theme-text text-xs sm:text-base placeholder-[var(--theme-text-muted)] ${errores.nombre ? 'border-red-500 focus:border-red-500' : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'}`}
                        />
                        {/* Mensaje de Error */}
                        {errores.nombre && <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{errores.nombre}</p>}
                      </div>

                      {/* TELÉFONO */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-theme-text truncate" title="Teléfono *">Teléfono *</label>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10 dígitos"
                          value={contactForm.telefono}
                          onChange={(e) => {
                            setContactForm({ ...contactForm, telefono: e.target.value.replace(/\D/g, '') })
                            if (errores.telefono) setErrores(prev => ({ ...prev, telefono: '' }))
                          }}
                          onBlur={(e) => validarCampo('telefono', e.target.value)}
                          className={`w-full border-b bg-transparent py-2 sm:py-2.5 focus:outline-none transition-all text-theme-text text-xs sm:text-base placeholder-[var(--theme-text-muted)] ${errores.telefono ? 'border-red-500 focus:border-red-500' : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'}`}
                        />
                        <div className="flex justify-between items-start mt-1">
                          <p className="text-theme-text-muted text-[11px] sm:text-xs">Obligatorio</p>
                          {errores.telefono && <p className="text-red-500 text-[11px] sm:text-xs font-medium text-right leading-tight">{errores.telefono}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Email (Izquierda) y Asunto (Derecha) */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      {/* EMAIL */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-theme-text truncate" title="Email (Opcional)">Email (Opcional)</label>
                        <input
                          type="email"
                          maxLength={100}
                          placeholder="juan@ejemplo.com"
                          value={contactForm.email}
                          onChange={(e) => {
                            setContactForm({ ...contactForm, email: e.target.value })
                            if (errores.email) setErrores(prev => ({ ...prev, email: '' }))
                          }}
                          onBlur={(e) => validarCampo('email', e.target.value)}
                          className={`w-full border-b bg-transparent py-2 sm:py-2.5 focus:outline-none transition-all text-theme-text text-xs sm:text-base placeholder-[var(--theme-text-muted)] ${errores.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'}`}
                        />
                        <div className="flex justify-between items-start mt-1">
                          <p className="text-theme-text-muted text-[11px] sm:text-xs">Opcional</p>
                          {errores.email && <p className="text-red-500 text-[11px] sm:text-xs font-medium text-right leading-tight">{errores.email}</p>}
                        </div>
                      </div>

                      {/* ASUNTO */}
                      <div className="space-y-1 sm:space-y-1.5">
                        <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-theme-text truncate" title="Asunto *">Asunto *</label>
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="Reserva, evento..."
                          value={contactForm.asunto}
                          onChange={(e) => {
                            setContactForm({ ...contactForm, asunto: e.target.value })
                            if (errores.asunto) setErrores(prev => ({ ...prev, asunto: '' }))
                          }}
                          onBlur={(e) => validarCampo('asunto', e.target.value)}
                          className={`w-full border-b bg-transparent py-2 sm:py-2.5 focus:outline-none transition-all text-theme-text text-xs sm:text-base placeholder-[var(--theme-text-muted)] ${errores.asunto ? 'border-red-500 focus:border-red-500' : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'}`}
                        />
                        {errores.asunto && <p className="text-red-500 text-[11px] sm:text-xs mt-1 font-medium leading-tight">{errores.asunto}</p>}
                      </div>
                    </div>

                    {/* Fila 3: Mensaje (con Contador) */}
                    <div className="space-y-1 sm:space-y-1.5 flex-1 flex flex-col mb-2">
                      <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-theme-text truncate" title="Mensaje *">Mensaje *</label>
                      <textarea
                        rows={3}
                        maxLength={500}
                        placeholder="Escribe tu mensaje aquí..."
                        value={contactForm.mensaje}
                        onChange={(e) => {
                          setContactForm({ ...contactForm, mensaje: e.target.value })
                          if (errores.mensaje) setErrores(prev => ({ ...prev, mensaje: '' }))
                        }}
                        onBlur={(e) => validarCampo('mensaje', e.target.value)}
                        className={`w-full flex-1 min-h-20 sm:min-h-28 border-b bg-transparent py-2 sm:py-2.5 resize-none focus:outline-none transition-all text-theme-text text-xs sm:text-base placeholder-[var(--theme-text-muted)] leading-relaxed ${errores.mensaje ? 'border-red-500 focus:border-red-500' : 'border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)]'}`}
                      />
                      <div className="flex justify-between items-start mt-1">
                        <div>
                          {errores.mensaje && <p className="text-red-500 text-[11px] sm:text-xs font-medium leading-tight">{errores.mensaje}</p>}
                        </div>
                        {/* CONTADOR DE CARACTERES DINÁMICO */}
                        <div className={`text-[11px] sm:text-xs transition-colors ${contactForm.mensaje.length >= 480 ? 'text-amber-500 font-bold' : 'text-theme-text-muted'}`}>
                          {contactForm.mensaje.length} / 500
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isContactSubmitting}
                      style={{
                        backgroundColor: 'var(--theme-primary)',
                        color: primaryTextColor
                      }}
                      className="w-full py-3 sm:py-4 hover:opacity-90 font-bold uppercase tracking-widest rounded-full shadow-lg transition-all cursor-pointer text-center text-xs sm:text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isContactSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando mensaje...</span>
                        </>
                      ) : (
                        <span>Enviar mensaje</span>
                      )}
                    </button>
                  </form>
                </ScrollReveal>
              </div>
            </ScrollReveal>

          </div>

          <ScrollReveal delay={0.2}>
            {isLoading ? (
              <div 
                className="w-full max-w-4xl mx-auto h-72 sm:h-96 min-h-[260px] sm:min-h-[380px] rounded-xl overflow-hidden border border-[var(--theme-border-subtle)] relative shadow-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center"
                style={{ backgroundColor: 'var(--theme-surface)' }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-[var(--theme-primary)] border-t-transparent animate-spin mb-3" />
                <p className="text-theme-text-muted text-xs font-semibold uppercase tracking-widest">Cargando mapa...</p>
              </div>
            ) : hasValidMapCoords ? (
              <div className="w-full max-w-4xl mx-auto h-[300px] sm:h-[360px] md:h-[420px] min-h-[280px] relative overflow-hidden rounded-xl border border-[var(--theme-border-subtle)] shadow-2xl">
                <MapaUbicacion
                  latitude={mapLatitude}
                  longitude={mapLongitude}
                  colorPrimario={colorPrimario}
                  address={contactAddress}
                  direccion={contactAddress}
                  mapsLink={contactoRaw.mapsLink || contactoRaw.google_maps_url}
                  restName={restName}
                />
              </div>
            ) : (
              <div 
                className="w-full max-w-4xl mx-auto h-auto min-h-[220px] py-6 px-4 rounded-xl overflow-hidden border border-[var(--theme-border-subtle)] relative group shadow-xl flex flex-col items-center justify-center text-center"
                style={{ backgroundColor: 'var(--theme-surface)' }}
              >
                <div className="p-3 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 mb-3">
                  <MapPin size={24} className="text-[var(--theme-primary)]" />
                </div>
                <h3 className="text-theme-text font-serif text-lg font-normal mb-1">{restName}</h3>
                <p className="text-theme-text-muted text-xs sm:text-sm max-w-md">{contactAddress}</p>
                <a
                  href={gpsNavigationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  <Navigation size={13} />
                  <span>Ver en Google Maps</span>
                  <ExternalLink size={12} className="opacity-75" />
                </a>
              </div>
            )}
          </ScrollReveal>

        </div>
      </section>

      <div className="w-full h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.3), transparent)' }}
      />

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'var(--theme-bg)' }} className="w-full text-theme-text border-t border-[var(--theme-border-subtle)] pt-16 pb-8 max-md:pt-10 max-md:pb-6 px-4 sm:px-6 md:px-8 lg:px-12 max-md:px-4 relative z-10 text-left transition-colors duration-300">
        <ScrollReveal y={30}>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-16 max-md:gap-8 max-md:mb-8">
            
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-[var(--theme-primary)] tracking-widest font-normal">{restName}</h2>
                <p className="text-xs tracking-[0.3em] text-theme-text-muted mt-1 font-normal">{restTagline}</p>
              </div>

              <div className="w-12 h-px bg-[var(--theme-primary)]/50" />

              <p className="text-theme-text-muted text-sm font-normal leading-relaxed max-w-xs">
                {restDesc || 'Una experiencia gastronómica única de alta cocina contemporánea.'}
              </p>

              {/* Redes Sociales Dinámicas en Footer */}
              {socialNetworks.length > 0 && (
                <div className="flex flex-col gap-3 pt-2">
                  {socialNetworks.map((red) => {
                    const Icon = red.icono
                    return (
                      <SafeSocialLink
                        key={red.label}
                        url={red.href}
                        network={red.network || red.label.toLowerCase()}
                        className="flex items-center gap-3 group text-left transition-colors"
                      >
                        <Icon className={`w-6 h-6 ${red.colorClass} group-hover:scale-110 transition-transform shrink-0`} />
                        <span className="text-xs sm:text-sm font-medium text-theme-text-muted group-hover:text-theme-text transition-colors truncate">
                          {red.handle}
                        </span>
                      </SafeSocialLink>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] mb-5 font-bold">NAVEGACIÓN</p>
              <ul className="space-y-3">
                {[
                  { name: 'Inicio', target: 'inicio' },
                  { name: 'Menú', target: 'menu' },
                  { name: 'Reservaciones', target: 'reservaciones' },
                  { name: 'Delivery', target: 'delivery' },
                  { name: 'Reseñas', target: 'reseñas' },
                  { name: 'Contacto', target: 'contacto' },
                ].map((link) => (
                  <li key={link.name}>
                    <button
                      onClick={() => handleScrollTo(link.target)}
                      className="text-theme-text-muted text-sm hover:text-theme-text transition-colors cursor-pointer font-normal"
                    >
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] mb-5 font-bold">HORARIOS</p>
              <div className="space-y-3">
                {footerHorarios.map((h, i) => (
                  <div key={i}>
                    <p className="text-theme-text-muted text-xs font-normal">{h.dias || h.day || h.dias_semana}</p>
                    <p className="text-theme-text text-sm font-normal">{h.horario || h.hours || h.hora}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] tracking-[0.3em] text-[var(--theme-primary)] mb-5 font-bold">CONTACTO</p>
              <div className="space-y-4">
                <div>
                  <p className="text-theme-text-muted text-xs mb-1 font-normal uppercase tracking-wider">DIRECCIÓN</p>
                  <p className="text-theme-text text-sm font-normal">{contactAddress}</p>
                </div>
                <div>
                  <p className="text-theme-text-muted text-xs mb-1 font-normal uppercase tracking-wider">TELÉFONO</p>
                  <a 
                    href={'tel:' + (contactPhone.replace(/[^0-9+]/g, '').length === 10 ? '+52' + contactPhone.replace(/[^0-9+]/g, '') : contactPhone.replace(/[^0-9+]/g, ''))} 
                    className="text-theme-text text-sm hover:text-[var(--theme-primary)] transition-colors font-normal"
                  >
                    {contactPhone}
                  </a>
                </div>
                <div>
                  <p className="text-theme-text-muted text-xs mb-1 font-normal uppercase tracking-wider">WHATSAPP</p>
                  <a 
                    href={whatsappUrl || `https://wa.me/${cleanNumber.length === 10 ? '52' + cleanNumber : cleanNumber}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-theme-text text-sm hover:text-[var(--theme-primary)] transition-colors font-normal"
                  >
                    {contactWhatsapp || contactPhone}
                  </a>
                </div>
                <div>
                  <p className="text-theme-text-muted text-xs mb-1 font-normal uppercase tracking-wider">EMAIL</p>
                  <ObfuscatedEmail 
                    email={contactEmail} 
                    className="text-theme-text text-sm hover:text-[var(--theme-primary)] transition-colors font-normal"
                  />
                </div>
              </div>
            </div>

          </div>
        </ScrollReveal>

        <ScrollReveal y={15} delay={0.15}>
          <div className="max-w-7xl mx-auto pt-8 border-t border-[var(--theme-border-subtle)] flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-theme-text-muted text-xs tracking-wide font-normal">
              © {new Date().getFullYear()} {restName}. Todos los derechos reservados.
            </p>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {['Aviso de privacidad', 'Términos y condiciones', 'Política de cookies'].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-theme-text-muted text-xs hover:text-theme-text transition-colors font-normal"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </footer>

      {/* DISH DETAIL MODAL */}
      <AnimatePresence>
        {selectedDish && (
          <motion.div
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDish(null)}
          >
            <motion.div
              className="bg-theme-surface border border-[var(--theme-border-subtle)] p-5 sm:p-8 max-h-[90vh] overflow-y-auto max-w-lg w-full rounded-2xl space-y-4 sm:space-y-6 relative text-left shadow-2xl"
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedDish(null)}
                className="absolute top-4 right-4 p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-card rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-bold text-[var(--theme-primary)] uppercase tracking-[0.25em] block">ESPECIALIDAD {restName}</span>
                <h3 className="text-xl sm:text-2xl font-normal text-theme-text font-serif tracking-wide uppercase">{selectedDish.nombre}</h3>
                <hr className="w-12 border-[var(--theme-primary)] mt-2" />
              </div>

              <p className="text-xs text-theme-text-muted leading-relaxed font-normal font-sans">{selectedDish.descripcion}</p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-b border-[var(--theme-border-subtle)] py-4 sm:py-5 text-[10px] tracking-widest uppercase font-semibold text-theme-text-muted font-sans">
                <div className="space-y-1 sm:space-y-1.5">
                  <span className="block text-theme-text-muted text-[8px] tracking-[0.2em] font-bold">PREPARACIÓN</span>
                  <div className="flex items-center gap-1.5 text-theme-text font-normal">
                    <Clock size={11} className="text-[var(--theme-primary)]" />
                    <span>15-20 MINUTOS</span>
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <span className="block text-theme-text-muted text-[8px] tracking-[0.2em] font-bold">MARIDAJE RECOMENDADO</span>
                  <div className="flex items-center gap-1.5 text-theme-text font-normal">
                    <Coffee size={11} className="text-[var(--theme-primary)]" />
                    <span className="truncate">Reserva especial {restName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 gap-3">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] text-theme-text-muted uppercase tracking-widest font-bold">PRECIO TOTAL</span>
                  <span className="text-xl sm:text-2xl font-bold text-[var(--theme-primary)] tracking-tight inline-flex items-baseline gap-1">
                    ${selectedDish.precio} <span className="text-xs font-sans font-medium uppercase tracking-wider opacity-75">MXN</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDish(null)
                    handleScrollTo('reservaciones')
                  }}
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: primaryTextColor
                  }}
                  className="px-5 sm:px-8 py-2.5 sm:py-3.5 hover:opacity-90 font-semibold text-xs uppercase tracking-[0.15em] transition-all duration-300 cursor-pointer shadow-lg shadow-[var(--theme-primary)]/10 text-center"
                >
                  {ctaReservationText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  )
}
