import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  Save, 
  Upload, 
  X, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Star, 
  Bike, 
  BookOpen, 
  ExternalLink, 
  Eye, 
  Globe, 
  Palette, 
  Image as ImageIcon, 
  Heart, 
  Award, 
  Sparkles, 
  Clock, 
  Compass, 
  Utensils, 
  Coffee, 
  Leaf, 
  ChefHat, 
  MapPin, 
  Mail, 
  AlertCircle, 
  Loader2, 
  Gift, 
  Calendar, 
  Percent, 
  Check, 
  Phone, 
  MessageSquare, 
  MessageCircle, 
  ShoppingBag, 
  Wine, 
  Fish, 
  Flame, 
  Sunset, 
  Waves, 
  Music, 
  ShieldCheck, 
  Crown, 
  Gem, 
  Beer, 
  Soup, 
  Smile, 
  Search, 
  Filter 
} from 'lucide-react'
import * as Icons from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import Dropdown from '../../components/ui/Dropdown'
import { uploadImage } from '../../api/images'
import { getSettings, updateSettings, getConfiguracion } from '../../api/settings'
import { getCategories } from '../../api/categories'
import { getDishes } from '../../api/dishes'
import client from '../../api/client'
import { validateLandingImageFile, validateHeroSection, validateHistorySection, validateFeaturedDishesSection, validateServicesSection, validateDiscountBanner, validateReservationsSection, to24HourFormat, to12HourFormat, validateContactSection, sanitizeSocialHandle, validateDeliverySection } from '../../validators/landingValidator'
import { updateFavicon } from '../../utils/tabManager'

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

const ICON_OPTIONS = [
  { value: 'Leaf', label: 'Hoja / Natural 🍃', icon: Leaf },
  { value: 'ChefHat', label: 'Chef / Sombrero 👨‍🍳', icon: ChefHat },
  { value: 'MapPin', label: 'Marcador Mapa 📍', icon: MapPin },
  { value: 'Star', label: 'Estrella ⭐', icon: Star },
  { value: 'Utensils', label: 'Cubiertos / Comida 🍴', icon: Utensils },
  { value: 'Sparkles', label: 'Brillos / Premium ✨', icon: Sparkles },
  { value: 'Wine', label: 'Vino / Copa 🍷', icon: Wine },
  { value: 'Coffee', label: 'Café / Bebidas ☕', icon: Coffee },
  { value: 'Flame', label: 'Fuego / A la leña 🔥', icon: Flame },
  { value: 'Fish', label: 'Pescados / Mariscos 🐟', icon: Fish },
  { value: 'Waves', label: 'Mar / Vista bahía 🌊', icon: Waves },
  { value: 'Sunset', label: 'Atardecer / Terraza 🌅', icon: Sunset },
  { value: 'Award', label: 'Premio / Excelencia 🏅', icon: Award },
  { value: 'Crown', label: 'VIP / Exclusivo 👑', icon: Crown },
  { value: 'Heart', label: 'Amor / Pasión ❤️', icon: Heart },
  { value: 'Soup', label: 'Sopa / Especialidad 🍲', icon: Soup },
  { value: 'Smile', label: 'Servicio Cálido 😊', icon: Smile },
  { value: 'Gem', label: 'Lujo / Alta Cocina 💎', icon: Gem },
  { value: 'Music', label: 'Música en vivo 🎵', icon: Music },
  { value: 'Beer', label: 'Cerveza / Bar 🍺', icon: Beer },
  { value: 'Bike', label: 'Delivery / Envío 🚲', icon: Bike },
  { value: 'BookOpen', label: 'Carta / Menú 📖', icon: BookOpen },
  { value: 'Clock', label: 'Horarios / Tiempo ⏰', icon: Clock },
  { value: 'Compass', label: 'Ubicación / Destino 🧭', icon: Compass },
  { value: 'ShieldCheck', label: 'Garantía / Calidad 🛡️', icon: ShieldCheck },
]

export default function LandingPersonalizar() {
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  // 0. Estados de Identidad Pública
  const [restLogo, setRestLogo] = useState('')
  const [restDesc, setRestDesc] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef()

  // Modals de Vista Previa
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSection, setPreviewSection] = useState('')

  const handleOpenPreview = (sectionId = 'inicio') => {
    setPreviewSection(sectionId)
    setPreviewOpen(true)
  }

  // 1. Contenedor: Portada Principal
  const [heroTitle, setHeroTitle] = useState('RESTAURANTE AURUM')
  const [heroDescription, setHeroDescription] = useState('UNA EXPERIENCIA GASTRONÓMICA QUE DESPIERTA TODOS LOS SENTIDOS')
  const [heroImage, setHeroImage] = useState('/aurum_hero_dish.png')
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false)
  const heroImageInputRef = useRef()
  const [useCarousel, setUseCarousel] = useState(false)
  const [bannerImages, setBannerImages] = useState([])
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const bannerInputRef = useRef()

  // Estados de Validación - Portada Principal
  const [portadaErrors, setPortadaErrors] = useState({})
  const [heroImageError, setHeroImageError] = useState('')
  const [portadaTouched, setPortadaTouched] = useState({})
  const [portadaSubmitted, setPortadaSubmitted] = useState(false)

  // 2. Contenedor: Platillos destacados
  const [platillosSeccion, setPlatillosSeccion] = useState({
    labelSuperior: 'NUESTRA CARTA',
    tituloPrincipal: 'Platillos que cuentan una historia',
    textoDebajoBoton: 'SERVICIO A DOMICILIO DISPONIBLE',
    selected_categories: [],
    selected_dishes: []
  })

  // Categorías y Platillos del restaurante para selector dinámico
  const [availableCategories, setAvailableCategories] = useState([])
  const [availableDishes, setAvailableDishes] = useState([])
  const [loadingMenuData, setLoadingMenuData] = useState(false)
  const [dishSearchQuery, setDishSearchQuery] = useState('')

  const toggleCategorySelection = (catId) => {
    setPlatillosSeccion(prev => {
      const current = prev.selected_categories || []
      const isSelected = current.some(id => String(id) === String(catId))
      if (isSelected) {
        // Regla Cruzada: al desmarcar categoría, eliminar platillos huérfanos de esa categoría
        const newCategories = current.filter(id => String(id) !== String(catId))
        const orphanDishIds = availableDishes
          .filter(d => String(d.category_id) === String(catId))
          .map(d => String(d.id))
        const cleanedDishes = (prev.selected_dishes || []).filter(
          id => !orphanDishIds.includes(String(id))
        )
        return {
          ...prev,
          selected_categories: newCategories,
          selected_dishes: cleanedDishes
        }
      } else {
        if (current.length >= 4) {
          setToast({ message: 'Puedes seleccionar un máximo de 4 categorías', type: 'info' })
          return prev
        }
        return {
          ...prev,
          selected_categories: [...current, catId]
        }
      }
    })
  }

  const toggleDishSelection = (dishId) => {
    setPlatillosSeccion(prev => {
      const current = prev.selected_dishes || []
      const isSelected = current.some(id => String(id) === String(dishId))
      return {
        ...prev,
        selected_dishes: isSelected
          ? current.filter(id => String(id) !== String(dishId))
          : [...current, dishId]
      }
    })
  }

  const handleSelectAllVisibleDishes = (visibleDishIds) => {
    setPlatillosSeccion(prev => {
      const current = new Set((prev.selected_dishes || []).map(String))
      visibleDishIds.forEach(id => current.add(String(id)))
      return { ...prev, selected_dishes: Array.from(current) }
    })
  }

  const handleDeselectAllVisibleDishes = (visibleDishIds) => {
    setPlatillosSeccion(prev => {
      const toRemove = new Set(visibleDishIds.map(String))
      const filtered = (prev.selected_dishes || []).filter(id => !toRemove.has(String(id)))
      return { ...prev, selected_dishes: filtered }
    })
  }

  // useMemo: filtrado 100% en cliente — cero peticiones al servidor al buscar
  const filteredDishes = useMemo(() => {
    const selectedCats = platillosSeccion.selected_categories || []
    if (selectedCats.length === 0) return []
    return availableDishes.filter(dish => {
      if (!selectedCats.some(catId => String(catId) === String(dish.category_id))) return false
      if (dishSearchQuery.trim()) {
        const q = dishSearchQuery.toLowerCase().trim()
        if (!dish.name?.toLowerCase().includes(q) && !dish.description?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [availableDishes, platillosSeccion.selected_categories, dishSearchQuery])


  // 3. Contenedor: Sección Delivery
  const [deliverySeccion, setDeliverySeccion] = useState({
    labelSuperior: 'SERVICIO A DOMICILIO',
    tituloPrincipal: 'LLEVAMOS LA EXPERIENCIA AURUM HASTA TU HOGAR',
    descripcion: 'Entrega a domicilio con nuestros repartidores propios en 30-45 minutos. También puedes pasar a recoger tu pedido.',
    imagen: '',
    imagenTitulo: '',
    imagenDescripcion: '',
    beneficios: [
      { titulo: 'Entrega rápida', descripcion: '30–45 minutos' },
      { titulo: 'Amplia cobertura', descripcion: 'Servicio en toda la zona' },
      { titulo: 'Pedido mínimo', descripcion: 'Desde $200 MXN' },
      { titulo: 'Envío gratuito', descripcion: 'En compras de $500+' },
    ],
    pasos: [
      { titulo: 'Elige tus platillos', subtitulo: 'De nuestra carta digital' },
      { titulo: 'Confirma tu pedido', subtitulo: 'Vía WhatsApp o llamada' },
      { titulo: 'Recíbelo en casa', subtitulo: 'Disfruta recién preparado' },
    ],
    numeroWhatsapp: '744-123-4567',
    textoBoton: 'Tiempo estimado de entrega: 30–45 minutos • Responderemos tu pedido lo antes posible.',
    garantias: [
      '✓ Pedido seguro',
      '✓ Confirmación rápida',
      '✓ Atención en horario del restaurante'
    ]
  })

  // Estados de Validación - Sección Delivery
  const [deliveryErrors, setDeliveryErrors] = useState({})
  const [deliveryBeneficiosErrors, setDeliveryBeneficiosErrors] = useState([{}, {}, {}, {}])
  const [deliveryPasosErrors, setDeliveryPasosErrors] = useState([{}, {}, {}])
  const [deliveryGarantiasErrors, setDeliveryGarantiasErrors] = useState(['', '', ''])
  const [deliveryTouched, setDeliveryTouched] = useState({})
  const [deliverySubmitted, setDeliverySubmitted] = useState(false)
  const [deliveryImageError, setDeliveryImageError] = useState('')

  // 4. Contenedor: Banner de descuento por reserva
  const [bannerDescuento, setBannerDescuento] = useState({
    activo: true,
    porcentaje: '',
    badgeVigencia: '',
    tituloDescuento: '',
    descripcion: '',
    textoBoton: '',
    textoBotonSub: ''
  })

  // Estados de Validación - Banner de Descuento
  const [bannerErrors, setBannerErrors] = useState({})
  const [bannerTouched, setBannerTouched] = useState({})
  const [bannerSubmitted, setBannerSubmitted] = useState(false)

  // 5. Contenedor: Sección Reservaciones
  const [reservacionesSeccion, setReservacionesSeccion] = useState({
    tituloPrincipal: 'RESERVA TU MESA',
    subtituloDorado: 'UNA NOCHE INOLVIDABLE TE ESTÁ ESPERANDO',
    textoDescriptivo: 'Cada reservación es una experiencia diseñada especialmente para ti. Nuestro equipo estará listo para hacer de tu visita un momento único.',
    horarios: {
      lunesViernesInicio: '1:00 PM',
      lunesViernesFin: '11:00 PM',
      sabadoDomingoInicio: '12:00 PM',
      sabadoDomingoFin: '12:00 AM'
    },
    politicas: [
      'Confirmación en menos de 24hrs',
      'Cancela o reprograma mínimo 2 horas antes de la hora reservada',
      'Cambios o cancelaciones vía llamada o mensaje directo',
      'Sin costo de reservación'
    ]
  })

  // Estados de Validación - Sección Reservaciones
  const [reservacionesErrors, setReservacionesErrors] = useState({})
  const [policiesErrors, setPoliciesErrors] = useState(['', '', '', ''])
  const [reservacionesTouched, setReservacionesTouched] = useState({})
  const [policiesTouched, setPoliciesTouched] = useState([false, false, false, false])
  const [reservacionesSubmitted, setReservacionesSubmitted] = useState(false)

  // Mock Form State for Reservation Preview
  const [previewResForm, setPreviewResForm] = useState({
    nombre: 'Juan Pérez',
    telefono: '744-000-0000',
    email: '',
    fecha: '',
    hora: '13:00',
    personas: '2',
    zona: 'Sin preferencia',
    ocasion: 'Sin preferencia',
    nota: ''
  })

  // 6. Contenedor: Sección Nuestra Historia
  const [historiaConfig, setHistoriaConfig] = useState({
    titulo: 'Más de 15 años creando experiencias inolvidables',
    descripcion: 'Fundado frente a la emblemática bahía de Acapulco, Aurum nació de la pasión por fusionar la alta cocina contemporánea con el vibrante sabor de la costa mexicana. Cada platillo es diseñado por nuestro chef para contar una historia de calidad, frescura y sabor insuperable.',
    anioFundacion: 2009,
    imagenFondo: null,
    caracteristicas: [
      { icono: 'Leaf',     titulo: 'Ingredientes frescos y locales',    descripcion: 'Trabajamos con productores locales de Guerrero para garantizar la mejor calidad.' },
      { icono: 'ChefHat', titulo: 'Chef con formación internacional',   descripcion: 'Nuestro chef ejecutivo ha trabajado en restaurantes de Francia, España y México.' },
      { icono: 'MapPin',  titulo: 'Frente a la bahía de Acapulco',     descripcion: 'Una ubicación única con vista al mar para hacer de tu visita algo especial.' },
    ]
  })
  const [uploadingFondo, setUploadingFondo] = useState(false)
  const fontInputRef = useRef()
  const [activeHistoriaDropdown, setActiveHistoriaDropdown] = useState(null)
  const historiaDropdownRefs = useRef([])

  // Estados de Validación - Sección Nuestra Historia
  const [historiaErrors, setHistoriaErrors] = useState({})
  const [featuresErrors, setFeaturesErrors] = useState([{}, {}, {}])
  const [historiaTouched, setHistoriaTouched] = useState({})
  const [featuresTouched, setFeaturesTouched] = useState([{}, {}, {}])
  const [historiaSubmitted, setHistoriaSubmitted] = useState(false)

  // 7. Contenedor: Servicios Exclusivos (Arreglo estricto de 3 elementos)
  const [serviciosConfig, setServiciosConfig] = useState([
    {
      icono: 'Star',
      icon: 'Star',
      titulo: 'Servicio Premium',
      title: 'Servicio Premium',
      descripcion: 'Atención personalizada y cuidada al mínimo detalle para una velada excelente.',
      description: 'Atención personalizada y cuidada al mínimo detalle para una velada excelente.'
    },
    {
      icono: 'Bike',
      icon: 'Bike',
      titulo: 'Delivery Veloz',
      title: 'Delivery Veloz',
      descripcion: 'Llevamos la experiencia gastronómica directo a tu mesa en 30-45 minutos.',
      description: 'Llevamos la experiencia gastronómica directo a tu mesa en 30-45 minutos.'
    },
    {
      icono: 'BookOpen',
      icon: 'BookOpen',
      titulo: 'Carta Selecta',
      title: 'Carta Selecta',
      descripcion: 'Vinos de reserva y mixología premium inspirada en sabores tradicionales.',
      description: 'Vinos de reserva y mixología premium inspirada en sabores tradicionales.'
    }
  ])
  const [activeDropdown, setActiveDropdown] = useState(null)
  const dropdownRefs = useRef([])

  // Estados de Validación - Servicios Exclusivos
  const [serviciosErrors, setServiciosErrors] = useState([{}, {}, {}])
  const [serviciosTouched, setServiciosTouched] = useState([{}, {}, {}])
  const [serviciosSubmitted, setServiciosSubmitted] = useState(false)

  // 8. Contenedor: Sección Contacto (Encuéntranos)
  const [contactoSeccion, setContactoSeccion] = useState({
    titulo: 'Encuéntranos',
    labelSuperior: 'UBICACIÓN & CONTACTO',
    textoEventos: '¿Tienes una celebración o evento privado? Celebra con nosotros bodas, cumpleaños o reuniones de negocios frente a la bahía. Por favor completa el formulario adjunto para atenderte personalmente.',
    mapsLink: 'https://maps.google.com/?q=Av+Costera+Miguel+Aleman+1234+Acapulco',
    telefono: '744-123-4567',
    email: 'contacto@restaurante.com',
    whatsapp: '744-123-4567',
    redesSociales: {
      instagram: '@restaurante',
      facebook: 'Restaurante',
      tiktok: '@restaurante'
    }
  })

  // Estados de Validación - Sección Contacto
  const [contactoErrors, setContactoErrors] = useState({})
  const [contactoTouched, setContactoTouched] = useState({})
  const [contactoSubmitted, setContactoSubmitted] = useState(false)

  // Cargar configuraciones del backend
  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getSettings()
      const d = res.data || {}
      setRestLogo(d.logo_url || '')
      setRestDesc(d.description || '')
      setHeroTitle(d.hero_title || 'RESTAURANTE AURUM')
      setHeroDescription(d.hero_description || '')
      setHeroImage(d.hero_image || '/aurum_hero_dish.png')
      setUseCarousel(Boolean(d.use_carousel))
      setBannerImages(d.banner_images || [])
      if (d.platillos_seccion || d.featured_dishes !== undefined || d.selected_dishes !== undefined) {
        const platSec = (typeof d.platillos_seccion === 'object' && d.platillos_seccion !== null) ? d.platillos_seccion : {}
        setPlatillosSeccion({
          labelSuperior: platSec.labelSuperior || platSec.subtitle || 'NUESTRA CARTA',
          tituloPrincipal: platSec.tituloPrincipal || platSec.title || 'Platillos que cuentan una historia',
          textoDebajoBoton: platSec.textoDebajoBoton || platSec.button_text || 'SERVICIO A DOMICILIO DISPONIBLE',
          selected_categories: platSec.selected_categories || platSec.selectedCategories || platSec.featured_categories || d.featured_categories || d.selected_categories || [],
          selected_dishes: platSec.selected_dishes || platSec.selectedDishes || platSec.featured_dishes || d.featured_dishes || d.selected_dishes || []
        })
      }
      if (d.delivery_seccion) {
        const rawDel = d.delivery_seccion
        const defaultBeneficios = [
          { titulo: 'Entrega rápida', descripcion: '30–45 minutos' },
          { titulo: 'Amplia cobertura', descripcion: 'Servicio en toda la zona' },
          { titulo: 'Pedido mínimo', descripcion: 'Desde $200 MXN' },
          { titulo: 'Envío gratuito', descripcion: 'En compras de $500+' },
        ]
        const defaultPasos = [
          { titulo: 'Elige tus platillos', subtitulo: 'De nuestra carta digital' },
          { titulo: 'Confirma tu pedido', subtitulo: 'Vía WhatsApp o llamada' },
          { titulo: 'Recíbelo en casa', subtitulo: 'Disfruta recién preparado' },
        ]
        const defaultGarantias = [
          '✓ Pedido seguro',
          '✓ Confirmación rápida',
          '✓ Atención en horario del restaurante'
        ]

        const rawBen = Array.isArray(rawDel.beneficios) ? rawDel.beneficios : (Array.isArray(rawDel.benefits) ? rawDel.benefits : [])
        const normalizedBen = [0, 1, 2, 3].map(i => ({
          titulo: rawBen[i]?.titulo || rawBen[i]?.title || defaultBeneficios[i].titulo,
          descripcion: rawBen[i]?.descripcion || rawBen[i]?.description || defaultBeneficios[i].descripcion
        }))

        const rawPas = Array.isArray(rawDel.pasos) ? rawDel.pasos : (Array.isArray(rawDel.steps) ? rawDel.steps : [])
        const normalizedPas = [0, 1, 2].map(i => ({
          titulo: rawPas[i]?.titulo || rawPas[i]?.title || defaultPasos[i].titulo,
          subtitulo: rawPas[i]?.subtitulo || rawPas[i]?.subtitle || defaultPasos[i].subtitulo
        }))

        const rawGar = Array.isArray(rawDel.garantias) ? rawDel.garantias : (Array.isArray(rawDel.guarantees) ? rawDel.guarantees : [])
        const normalizedGar = [0, 1, 2].map(i => {
          const val = typeof rawGar[i] === 'string' ? rawGar[i] : (rawGar[i]?.texto || rawGar[i]?.text || '')
          return val.trim() ? val : defaultGarantias[i]
        })

        setDeliverySeccion(prev => ({
          ...prev,
          ...rawDel,
          labelSuperior: rawDel.labelSuperior || rawDel.subtitle || prev.labelSuperior,
          tituloPrincipal: rawDel.tituloPrincipal || rawDel.title || prev.tituloPrincipal,
          descripcion: rawDel.descripcion || rawDel.description || prev.descripcion,
          imagen: rawDel.imagen || rawDel.imagen_url || rawDel.delivery_image_url || d.delivery_image_url || d.delivery_image || '',
          imagenTitulo: rawDel.imagenTitulo || rawDel.imagen_titulo || rawDel.delivery_image_title || d.delivery_image_title || '',
          imagenDescripcion: rawDel.imagenDescripcion || rawDel.imagen_descripcion || rawDel.imagen_alt || d.delivery_image_description || d.delivery_image_alt || '',
          beneficios: normalizedBen,
          pasos: normalizedPas,
          numeroWhatsapp: rawDel.numeroWhatsapp || rawDel.whatsapp || prev.numeroWhatsapp,
          textoBoton: rawDel.textoBoton || rawDel.button_subtext || prev.textoBoton,
          garantias: normalizedGar
        }))
      }
      if (d.banner_descuento) setBannerDescuento(d.banner_descuento)
      if (d.reservaciones_seccion || d.reservacionesSeccion) {
        const rawRes = d.reservaciones_seccion || d.reservacionesSeccion || {}
        const rawHorarios = rawRes.horarios || {}
        const defaultPolicies = [
          'Confirmación en menos de 24hrs',
          'Cancela o reprograma mínimo 2 horas antes de la hora reservada',
          'Cambios o cancelaciones vía llamada o mensaje directo',
          'Sin costo de reservación'
        ]
        const rawPol = Array.isArray(rawRes.politicas) 
          ? rawRes.politicas 
          : (Array.isArray(rawRes.policies) ? rawRes.policies : [])
        const normalizedPol = [0, 1, 2, 3].map(i => (typeof rawPol[i] === 'string' && rawPol[i].trim() ? rawPol[i] : defaultPolicies[i]))

        setReservacionesSeccion({
          tituloPrincipal: rawRes.tituloPrincipal || rawRes.title || 'RESERVA TU MESA',
          subtituloDorado: rawRes.subtituloDorado || rawRes.subtitle || 'UNA NOCHE INOLVIDABLE TE ESTÁ ESPERANDO',
          textoDescriptivo: rawRes.textoDescriptivo || rawRes.description || 'Cada reservación es una experiencia diseñada especialmente para ti. Nuestro equipo estará listo para hacer de tu visita un momento único.',
          horarios: {
            lunesViernesInicio: to12HourFormat(rawHorarios.lunesViernesInicio || rawHorarios.weekday_start || '1:00 PM'),
            lunesViernesFin: to12HourFormat(rawHorarios.lunesViernesFin || rawHorarios.weekday_end || '11:00 PM'),
            sabadoDomingoInicio: to12HourFormat(rawHorarios.sabadoDomingoInicio || rawHorarios.weekend_start || '12:00 PM'),
            sabadoDomingoFin: to12HourFormat(rawHorarios.sabadoDomingoFin || rawHorarios.weekend_end || '12:00 AM')
          },
          politicas: normalizedPol
        })
      }
      if (d.servicios_config || d.serviciosConfig) {
        const rawServ = d.servicios_config || d.serviciosConfig || []
        const defaultServicios = [
          { icono: 'Star', icon: 'Star', titulo: 'Servicio Premium', title: 'Servicio Premium', descripcion: 'Atención personalizada y cuidada al mínimo detalle para una velada excelente.', description: 'Atención personalizada y cuidada al mínimo detalle para una velada excelente.' },
          { icono: 'Bike', icon: 'Bike', titulo: 'Delivery Veloz', title: 'Delivery Veloz', descripcion: 'Llevamos la experiencia gastronómica directo a tu mesa en 30-45 minutos.', description: 'Llevamos la experiencia gastronómica directo a tu mesa en 30-45 minutos.' },
          { icono: 'BookOpen', icon: 'BookOpen', titulo: 'Carta Selecta', title: 'Carta Selecta', descripcion: 'Vinos de reserva y mixología premium inspirada en sabores tradicionales.', description: 'Vinos de reserva y mixología premium inspirada en sabores tradicionales.' }
        ]
        const normalizedServ = [0, 1, 2].map(idx => {
          const item = Array.isArray(rawServ) ? rawServ[idx] : null
          if (!item) return defaultServicios[idx]
          const ico = item.icono || item.icon || defaultServicios[idx].icono
          const tit = (item.titulo || item.title || defaultServicios[idx].titulo).slice(0, 50)
          const desc = (item.descripcion || item.description || defaultServicios[idx].descripcion).slice(0, 150)
          return {
            icono: ico,
            icon: ico,
            titulo: tit,
            title: tit,
            descripcion: desc,
            description: desc
          }
        })
        setServiciosConfig(normalizedServ)
      }
      if (d.contacto_seccion) {
        setContactoSeccion({
          titulo: d.contacto_seccion.titulo || 'Encuéntranos',
          labelSuperior: d.contacto_seccion.labelSuperior || 'UBICACIÓN & CONTACTO',
          textoEventos: d.contacto_seccion.textoEventos || '',
          mapsLink: d.contacto_seccion.mapsLink || '',
          telefono: d.contacto_seccion.telefono || d.contacto_seccion.phone || d.contact_phone || d.telefono || '744-123-4567',
          email: d.contacto_seccion.email || d.contacto_seccion.correo || d.contact_email || d.email || 'contacto@restaurante.com',
          whatsapp: d.contacto_seccion.whatsapp || d.contacto_seccion.numeroWhatsapp || d.contact_whatsapp || d.whatsapp || '744-123-4567',
          redesSociales: {
            instagram: d.contacto_seccion.redesSociales?.instagram || '',
            facebook: d.contacto_seccion.redesSociales?.facebook || '',
            tiktok: d.contacto_seccion.redesSociales?.tiktok || ''
          }
        })
      } else {
        setContactoSeccion(prev => ({
          ...prev,
          telefono: d.contact_phone || d.telefono || prev.telefono,
          email: d.contact_email || d.email || prev.email,
          whatsapp: d.contact_whatsapp || d.whatsapp || prev.whatsapp
        }))
      }
    } catch (err) {
      console.error('Error cargando landing:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar categorías y platillos del menú para los selectores dinámicos
  const fetchMenuData = async () => {
    setLoadingMenuData(true)
    try {
      // 1. Cargar Categorías
      let catsList = []
      try {
        const catsRes = await getCategories()
        const rawCats = catsRes?.data
        catsList = rawCats?.categories || (Array.isArray(rawCats) ? rawCats : (rawCats?.data || []))
      } catch (errCats) {
        console.warn('Error al llamar getCategories (/admin/categories), intentando /categories:', errCats)
        try {
          const publicCatsRes = await client.get('/categories')
          const rawCats = publicCatsRes?.data
          catsList = rawCats?.categories || (Array.isArray(rawCats) ? rawCats : (rawCats?.data || []))
        } catch (e2) {
          console.error('Error cargando categorías:', e2)
        }
      }

      const normalizedCats = (Array.isArray(catsList) ? catsList : []).map(c => ({
        id: c.id ?? c._id,
        name: c.name || c.nombre || c.title || 'Categoría',
        active: c.active !== undefined ? c.active : true,
        ...c
      }))
      setAvailableCategories(normalizedCats)
      console.log('[LandingPersonalizar] Categorías cargadas:', normalizedCats)

      // 2. Cargar Platillos
      let dishList = []
      try {
        const dishesRes = await getDishes()
        const rawDishes = dishesRes?.data
        dishList = rawDishes?.dishes || (Array.isArray(rawDishes) ? rawDishes : (rawDishes?.data || []))
      } catch (errDishes) {
        console.warn('Error al llamar getDishes (/admin/dishes), intentando /dishes:', errDishes)
        try {
          const publicDishesRes = await client.get('/dishes')
          const rawDishes = publicDishesRes?.data
          dishList = rawDishes?.dishes || (Array.isArray(rawDishes) ? rawDishes : (rawDishes?.data || []))
        } catch (e2) {
          console.error('Error cargando platillos:', e2)
        }
      }

      const normalizedDishes = (Array.isArray(dishList) ? dishList : []).map(d => ({
        id: d.id ?? d._id,
        name: d.name || d.nombre || d.title || 'Platillo',
        description: d.description || d.descripcion || '',
        price: d.price ?? d.precio ?? 0,
        image: d.image || d.image_url || d.imagen || '',
        category_id: d.category_id ?? d.categoryId ?? d.categoria_id ?? d.category?.id ?? d.categoria?.id,
        ...d
      }))
      setAvailableDishes(normalizedDishes)
      console.log('[LandingPersonalizar] Platillos cargados:', normalizedDishes)

    } catch (err) {
      console.error('Error cargando menú para personalización:', err)
    } finally {
      setLoadingMenuData(false)
    }
  }

  const handleLogoUpload = async (file) => {
    if (!file) return
    setUploadingLogo(true)
    try {
      const res = await uploadImage(file, 'logo')
      setRestLogo(res.data.url)
      if (res.data?.url) {
        updateFavicon(res.data.url)
      }
      setToast({ message: 'Logotipo subido correctamente', type: 'success' })
    } catch {
      setToast({ message: 'Error al subir el logotipo', type: 'error' })
    } finally {
      setUploadingLogo(false)
    }
  }

  // Validador helper para Portada Principal
  const runPortadaValidation = (overrides = {}) => {
    const dataToValidate = {
      hero_title: overrides.hero_title !== undefined ? overrides.hero_title : heroTitle,
      hero_slogan: overrides.hero_slogan !== undefined ? overrides.hero_slogan : heroDescription,
      enable_carousel: overrides.enable_carousel !== undefined ? overrides.enable_carousel : useCarousel,
      carousel_images: overrides.carousel_images !== undefined 
        ? overrides.carousel_images 
        : [...bannerImages, ...pendingFiles]
    }
    const res = validateHeroSection(dataToValidate)
    setPortadaErrors(res.errors)
    return res
  }

  const handleHeroImageUpload = async (file) => {
    if (!file) return
    setHeroImageError('')

    // Validación de Archivo (Cliente): peso <= 3MB y formato JPG, PNG, WEBP
    const fileVal = validateLandingImageFile(file)
    if (!fileVal.isValid) {
      setHeroImageError(fileVal.error)
      setToast({ message: fileVal.error, type: 'error' })
      if (heroImageInputRef.current) heroImageInputRef.current.value = ''
      return
    }

    setUploadingHeroImage(true)
    try {
      const res = await uploadImage(file, 'banner')
      setHeroImage(res.data.url)
      setHeroImageError('')
      setToast({ message: 'Imagen de portada subida correctamente', type: 'success' })
    } catch (err) {
      const serverErrors = err?.response?.data?.errors
      let errorMsg = 'Error al subir la imagen de portada'
      if (serverErrors) {
        const firstField = Object.keys(serverErrors)[0]
        if (firstField && Array.isArray(serverErrors[firstField]) && serverErrors[firstField][0]) {
          errorMsg = serverErrors[firstField][0]
        }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setHeroImageError(errorMsg)
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setUploadingHeroImage(false)
      if (heroImageInputRef.current) heroImageInputRef.current.value = ''
    }
  }

  const [uploadingDeliveryImage, setUploadingDeliveryImage] = useState(false)
  const deliveryImageInputRef = useRef(null)

  const handleDeliveryImageUpload = async (file) => {
    if (!file) return
    setDeliveryImageError('')

    // Validación de Archivo (Cliente): peso <= 10MB y formato JPG, PNG, WEBP
    const fileVal = validateLandingImageFile(file)
    if (!fileVal.isValid) {
      setDeliveryImageError(fileVal.error)
      setToast({ message: fileVal.error, type: 'error' })
      if (deliveryImageInputRef.current) deliveryImageInputRef.current.value = ''
      return
    }

    setUploadingDeliveryImage(true)
    try {
      const res = await uploadImage(file, 'banner')
      setDeliverySeccion(prev => ({
        ...prev,
        imagen: res.data.url,
        imagen_url: res.data.url
      }))
      setDeliveryImageError('')
      setToast({ message: 'Imagen de delivery subida correctamente', type: 'success' })
    } catch (err) {
      const serverErrors = err?.response?.data?.errors
      let errorMsg = 'Error al subir la imagen de delivery'
      if (serverErrors) {
        const firstField = Object.keys(serverErrors)[0]
        if (firstField && Array.isArray(serverErrors[firstField]) && serverErrors[firstField][0]) {
          errorMsg = serverErrors[firstField][0]
        }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setDeliveryImageError(errorMsg)
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setUploadingDeliveryImage(false)
      if (deliveryImageInputRef.current) deliveryImageInputRef.current.value = ''
    }
  }

  useEffect(() => {
    fetchData()
    fetchMenuData()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown !== null) {
        const ref = dropdownRefs.current[activeDropdown]
        if (ref && !ref.contains(e.target)) {
          setActiveDropdown(null)
        }
      }
      if (activeHistoriaDropdown !== null) {
        const ref = historiaDropdownRefs.current[activeHistoriaDropdown]
        if (ref && !ref.contains(e.target)) {
          setActiveHistoriaDropdown(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown, activeHistoriaDropdown])

  // Lógica del Carrusel (Hero)
  const handleBannerSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validar cada archivo seleccionado (<= 3MB y formatos JPG/PNG/WEBP)
    for (const f of files) {
      const val = validateLandingImageFile(f)
      if (!val.isValid) {
        setPortadaErrors(prev => ({ ...prev, carousel_images: `${f.name}: ${val.error}` }))
        setToast({ message: `${f.name}: ${val.error}`, type: 'error' })
        e.target.value = ''
        return
      }
    }

    const remaining = 6 - pendingFiles.length - bannerImages.length
    if (files.length > remaining) {
      const msg = `Solo puedes agregar ${remaining} imagen(es) más (máximo 6 en total).`
      setPortadaErrors(prev => ({ ...prev, carousel_images: msg }))
      setToast({ message: msg, type: 'warning' })
    }

    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))
    const nextPending = [...pendingFiles, ...toAdd]
    setPendingFiles(nextPending)
    e.target.value = ''

    if (useCarousel) {
      const nextTotal = bannerImages.length + nextPending.length
      if (nextTotal >= 2 && nextTotal <= 6) {
        setPortadaErrors(prev => {
          const copy = { ...prev }
          delete copy.carousel_images
          return copy
        })
      }
    }
  }

  const removePending = (index) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      const next = prev.filter((_, i) => i !== index)
      if (useCarousel) {
        const nextTotal = bannerImages.length + next.length
        if (nextTotal < 2) {
          setPortadaErrors(p => ({ ...p, carousel_images: 'El carrusel debe contener al menos 2 imágenes.' }))
        } else if (nextTotal <= 6) {
          setPortadaErrors(p => {
            const copy = { ...p }
            delete copy.carousel_images
            return copy
          })
        }
      }
      return next
    })
  }

  const removeBannerImage = (urlToRemove) => {
    setBannerImages(prev => {
      const next = prev.filter(url => url !== urlToRemove)
      if (useCarousel) {
        const nextTotal = next.length + pendingFiles.length
        if (nextTotal < 2) {
          setPortadaErrors(p => ({ ...p, carousel_images: 'El carrusel debe contener al menos 2 imágenes.' }))
        } else if (nextTotal <= 6) {
          setPortadaErrors(p => {
            const copy = { ...p }
            delete copy.carousel_images
            return copy
          })
        }
      }
      return next
    })
  }

  const totalSelected = pendingFiles.length + bannerImages.length

  // ==========================================
  // HANDLERS DE GUARDADO
  // ==========================================

  // 1. Portada Principal
  const handleSavePortada = async (e) => {
    e.preventDefault()
    setPortadaSubmitted(true)

    // Validación Zod
    const validation = runPortadaValidation()
    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor, corrige los errores en la portada.', type: 'error' })
      return
    }

    try {
      const uploadedUrls = []
      for (const item of pendingFiles) {
        if (item.file) {
          const fileVal = validateLandingImageFile(item.file)
          if (!fileVal.isValid) {
            setToast({ message: `${item.name}: ${fileVal.error}`, type: 'error' })
            return
          }
          const res = await uploadImage(item.file, 'banner')
          uploadedUrls.push(res.data.url)
        }
      }

      const allBanners = [...bannerImages, ...uploadedUrls]
      const cleanTitle = heroTitle.trim()
      const cleanSlogan = heroDescription.trim()

      await updateSettings({
        logo: restLogo,
        description: restDesc,
        hero_title: cleanTitle,
        heroTitle: cleanTitle,
        hero_description: cleanSlogan,
        heroDescription: cleanSlogan,
        hero_image: heroImage,
        heroImage: heroImage,
        use_carousel: useCarousel,
        useCarousel: useCarousel,
        banner_images: allBanners,
        bannerImages: allBanners
      })

      setHeroTitle(cleanTitle)
      setHeroDescription(cleanSlogan)
      setBannerImages(allBanners)
      setPendingFiles([])
      setPortadaSubmitted(false)
      setToast({ message: 'Portada principal actualizada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar los cambios de la portada principal', type: 'error' })
    }
  }

  // 2. Platillos destacados
  const handleSavePlatillosSeccion = async (e) => {
    e.preventDefault()
    try {
      // .trim() en campos de texto
      const cleanLabel = (platillosSeccion.labelSuperior || '').trim().slice(0, 100)
      const cleanTitle = (platillosSeccion.tituloPrincipal || '').trim().slice(0, 100)
      const cleanBtnText = (platillosSeccion.textoDebajoBoton || '').trim().slice(0, 150)

      // Limpieza final de platillos huérfanos: solo conservar los que pertenecen a categorías seleccionadas
      const selectedCatIds = platillosSeccion.selected_categories || []
      const validDishIds = (platillosSeccion.selected_dishes || []).filter(dishId => {
        const dish = availableDishes.find(d => String(d.id) === String(dishId))
        return dish && selectedCatIds.some(catId => String(catId) === String(dish.category_id))
      })

      // Validar con Zod
      const validation = validateFeaturedDishesSection({
        labelSuperior: cleanLabel,
        tituloPrincipal: cleanTitle,
        textoDebajoBoton: cleanBtnText,
        selected_categories: selectedCatIds,
        selected_dishes: validDishIds
      })
      if (!validation.isValid) {
        setToast({ message: validation.firstError || 'Por favor, corrige los errores en la sección.', type: 'error' })
        return
      }

      // Payload explícito y sanitizado: garantiza featured_dishes: [] si está vacío
      const payload = {
        featured_dishes: validDishIds,
        featured_categories: selectedCatIds,
        selected_dishes: validDishIds,
        selected_categories: selectedCatIds,
        platillos_seccion: {
          labelSuperior: cleanLabel,
          tituloPrincipal: cleanTitle,
          textoDebajoBoton: cleanBtnText,
          selected_categories: selectedCatIds,
          selected_dishes: validDishIds,
          featured_categories: selectedCatIds,
          featured_dishes: validDishIds
        }
      }

      await updateSettings(payload)

      // Sincronizar estado local con valores limpios
      setPlatillosSeccion(prev => ({
        ...prev,
        labelSuperior: cleanLabel,
        tituloPrincipal: cleanTitle,
        textoDebajoBoton: cleanBtnText,
        selected_categories: selectedCatIds,
        selected_dishes: validDishIds
      }))

      // Revalidación inmediata: Notificar a otras vistas / pestañas en tiempo real
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('landing_settings_updated', {
          detail: payload
        }))
        try {
          localStorage.setItem('landing_last_update', String(Date.now()))
        } catch (e) {
          // ignore
        }
      }

      setToast({ message: 'Sección Platillos destacados guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la sección Platillos destacados', type: 'error' })
    }
  }

  // 3. Sección Delivery
  const handleDeliveryTextChange = (field, value) => {
    let finalVal = value
    if (field === 'labelSuperior' || field === 'tituloPrincipal' || field === 'imagenTitulo' || field === 'imagenDescripcion') {
      finalVal = value.slice(0, 100)
    } else if (field === 'descripcion') {
      finalVal = value.slice(0, 250)
    } else if (field === 'textoBoton') {
      finalVal = value.slice(0, 150)
    } else if (field === 'numeroWhatsapp') {
      finalVal = value.replace(/[^0-9+\s-]/g, '')
    }

    setDeliverySeccion(prev => {
      const nextState = { ...prev, [field]: finalVal }
      const validation = validateDeliverySection(nextState)
      setDeliveryErrors(validation.errors)
      return nextState
    })
  }

  const handleDeliveryTextBlur = (field) => {
    setDeliveryTouched(prev => ({ ...prev, [field]: true }))

    setDeliverySeccion(prev => {
      let currentVal = prev[field] || ''
      if (typeof currentVal === 'string') {
        currentVal = currentVal.trim()
      }
      const nextState = { ...prev, [field]: currentVal }
      const validation = validateDeliverySection(nextState)
      setDeliveryErrors(validation.errors)
      return nextState
    })
  }

  const handleDeliveryBeneficioChange = (idx, subfield, value) => {
    const maxLen = subfield === 'titulo' ? 50 : 100
    const finalVal = value.slice(0, maxLen)

    setDeliverySeccion(prev => {
      const nextBeneficios = prev.beneficios.map((b, i) => {
        if (i !== idx) return b
        return { ...b, [subfield]: finalVal }
      })
      const nextState = { ...prev, beneficios: nextBeneficios }
      const validation = validateDeliverySection(nextState)
      setDeliveryBeneficiosErrors(validation.beneficiosErrors)
      return nextState
    })
  }

  const handleDeliveryBeneficioBlur = (idx, subfield) => {
    setDeliveryTouched(prev => ({ ...prev, [`beneficio_${idx}_${subfield}`]: true }))

    setDeliverySeccion(prev => {
      const nextBeneficios = prev.beneficios.map((b, i) => {
        if (i !== idx) return b
        return { ...b, [subfield]: (b[subfield] || '').trim() }
      })
      const nextState = { ...prev, beneficios: nextBeneficios }
      const validation = validateDeliverySection(nextState)
      setDeliveryBeneficiosErrors(validation.beneficiosErrors)
      return nextState
    })
  }

  const handleDeliveryPasoChange = (idx, subfield, value) => {
    const maxLen = subfield === 'titulo' ? 50 : 100
    const finalVal = value.slice(0, maxLen)

    setDeliverySeccion(prev => {
      const nextPasos = prev.pasos.map((p, i) => {
        if (i !== idx) return p
        return { ...p, [subfield]: finalVal }
      })
      const nextState = { ...prev, pasos: nextPasos }
      const validation = validateDeliverySection(nextState)
      setDeliveryPasosErrors(validation.pasosErrors)
      return nextState
    })
  }

  const handleDeliveryPasoBlur = (idx, subfield) => {
    setDeliveryTouched(prev => ({ ...prev, [`paso_${idx}_${subfield}`]: true }))

    setDeliverySeccion(prev => {
      const nextPasos = prev.pasos.map((p, i) => {
        if (i !== idx) return p
        return { ...p, [subfield]: (p[subfield] || '').trim() }
      })
      const nextState = { ...prev, pasos: nextPasos }
      const validation = validateDeliverySection(nextState)
      setDeliveryPasosErrors(validation.pasosErrors)
      return nextState
    })
  }

  const handleDeliveryGarantiaChange = (idx, value) => {
    const finalVal = value.slice(0, 100)

    setDeliverySeccion(prev => {
      const nextGarantias = prev.garantias.map((g, i) => (i === idx ? finalVal : g))
      const nextState = { ...prev, garantias: nextGarantias }
      const validation = validateDeliverySection(nextState)
      setDeliveryGarantiasErrors(validation.garantiasErrors)
      return nextState
    })
  }

  const handleDeliveryGarantiaBlur = (idx) => {
    setDeliveryTouched(prev => ({ ...prev, [`garantia_${idx}`]: true }))

    setDeliverySeccion(prev => {
      const nextGarantias = prev.garantias.map((g, i) => (i === idx ? (g || '').trim() : g))
      const nextState = { ...prev, garantias: nextGarantias }
      const validation = validateDeliverySection(nextState)
      setDeliveryGarantiasErrors(validation.garantiasErrors)
      return nextState
    })
  }

  const handleSaveDeliverySeccion = async (e) => {
    e.preventDefault()
    setDeliverySubmitted(true)

    const validation = validateDeliverySection(deliverySeccion)
    setDeliveryErrors(validation.errors)
    setDeliveryBeneficiosErrors(validation.beneficiosErrors)
    setDeliveryPasosErrors(validation.pasosErrors)
    setDeliveryGarantiasErrors(validation.garantiasErrors)

    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor completa correctamente los campos de la sección Delivery.', type: 'error' })
      return
    }

    const cleanData = validation.data

    try {
      await updateSettings({
        delivery_seccion: {
          labelSuperior: cleanData.labelSuperior,
          tituloPrincipal: cleanData.tituloPrincipal,
          descripcion: cleanData.descripcion,
          imagen: cleanData.imagen,
          imagen_url: cleanData.imagen,
          imagenTitulo: cleanData.imagenTitulo,
          imagen_titulo: cleanData.imagenTitulo,
          delivery_image_title: cleanData.imagenTitulo,
          imagenDescripcion: cleanData.imagenDescripcion,
          imagen_descripcion: cleanData.imagenDescripcion,
          delivery_image_url: cleanData.imagen,
          delivery_image_description: cleanData.imagenDescripcion,
          beneficios: cleanData.beneficios,
          pasos: cleanData.pasos,
          numeroWhatsapp: cleanData.numeroWhatsapp,
          textoBoton: cleanData.textoBoton,
          garantias: cleanData.garantias
        },
        delivery_image_title: cleanData.imagenTitulo,
        delivery_image_url: cleanData.imagen,
        delivery_image_description: cleanData.imagenDescripcion
      })
      setDeliverySeccion({
        labelSuperior: cleanData.labelSuperior,
        tituloPrincipal: cleanData.tituloPrincipal,
        descripcion: cleanData.descripcion,
        imagen: cleanData.imagen,
        imagenTitulo: cleanData.imagenTitulo,
        imagenDescripcion: cleanData.imagenDescripcion,
        beneficios: cleanData.beneficios,
        pasos: cleanData.pasos,
        numeroWhatsapp: cleanData.numeroWhatsapp,
        textoBoton: cleanData.textoBoton,
        garantias: cleanData.garantias
      })
      setDeliverySubmitted(false)
      setToast({ message: 'Sección Delivery guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la sección Delivery', type: 'error' })
    }
  }

  // 4. Banner de descuento por reserva
  const handleToggleBanner = () => {
    setBannerDescuento(prev => {
      const nextActivo = !prev.activo
      if (!nextActivo) {
        // Al apagar el banner, limpiar errores para permitir guardar sin trabas
        setBannerErrors({})
        setBannerTouched({})
      }
      return { ...prev, activo: nextActivo }
    })
  }

  const handleBannerFieldChange = (field, value) => {
    let finalVal = value
    if (field === 'porcentaje') {
      // Restringir a números enteros positivos
      finalVal = value.replace(/[^0-9]/g, '')
      if (finalVal !== '') {
        const num = parseInt(finalVal, 10)
        if (num > 100) finalVal = '100'
      }
    } else if (field === 'badgeVigencia' || field === 'textoBoton') {
      finalVal = value.slice(0, 50)
    } else if (field === 'tituloDescuento' || field === 'textoBotonSub') {
      finalVal = value.slice(0, 100)
    } else if (field === 'descripcion') {
      finalVal = value.slice(0, 200)
    }

    setBannerDescuento(prev => {
      const nextState = { ...prev, [field]: finalVal }
      if (nextState.activo) {
        const validation = validateDiscountBanner(nextState)
        setBannerErrors(validation.errors)
      }
      return nextState
    })
  }

  const handleBannerFieldBlur = (field) => {
    setBannerTouched(prev => ({ ...prev, [field]: true }))
    setBannerDescuento(prev => {
      let trimmedVal = prev[field]
      if (typeof trimmedVal === 'string') {
        trimmedVal = trimmedVal.trim()
      }
      const nextState = { ...prev, [field]: trimmedVal }
      if (nextState.activo) {
        const validation = validateDiscountBanner(nextState)
        setBannerErrors(validation.errors)
      }
      return nextState
    })
  }

  const handleSaveBannerDescuento = async (e) => {
    e.preventDefault()
    setBannerSubmitted(true)

    // Si está activo, limpiar y validar con Zod
    if (bannerDescuento.activo) {
      const cleanBanner = {
        activo: true,
        porcentaje: typeof bannerDescuento.porcentaje === 'string' && bannerDescuento.porcentaje.trim() === '' 
          ? '' 
          : parseInt(bannerDescuento.porcentaje, 10) || '',
        badgeVigencia: (bannerDescuento.badgeVigencia || '').trim().slice(0, 50),
        tituloDescuento: (bannerDescuento.tituloDescuento || '').trim().slice(0, 100),
        descripcion: (bannerDescuento.descripcion || '').trim().slice(0, 200),
        textoBoton: (bannerDescuento.textoBoton || '').trim().slice(0, 50),
        textoBotonSub: (bannerDescuento.textoBotonSub || '').trim().slice(0, 100)
      }

      const validation = validateDiscountBanner(cleanBanner)
      setBannerErrors(validation.errors)

      if (!validation.isValid) {
        setToast({ message: validation.firstError || 'Por favor, completa los campos requeridos del banner de descuento.', type: 'error' })
        return
      }

      try {
        await updateSettings({
          banner_descuento: cleanBanner
        })
        setBannerDescuento(cleanBanner)
        setBannerSubmitted(false)
        setToast({ message: 'Banner de descuento por reserva guardado correctamente', type: 'success' })
      } catch (err) {
        console.error(err)
        setToast({ message: 'Error al guardar el banner de descuento', type: 'error' })
      }
    } else {
      // Si está inactivo, guardar directamente
      try {
        await updateSettings({
          banner_descuento: {
            ...bannerDescuento,
            activo: false
          }
        })
        setBannerErrors({})
        setBannerSubmitted(false)
        setToast({ message: 'Banner de descuento por reserva guardado correctamente', type: 'success' })
      } catch (err) {
        console.error(err)
        setToast({ message: 'Error al guardar el banner de descuento', type: 'error' })
      }
    }
  }

  // 5. Sección Reservaciones
  const handleResTextChange = (field, value) => {
    let finalVal = value
    if (field === 'tituloPrincipal' || field === 'subtituloDorado') {
      finalVal = value.slice(0, 100)
    } else if (field === 'textoDescriptivo') {
      finalVal = value.slice(0, 300)
    }

    setReservacionesSeccion(prev => {
      const nextState = { ...prev, [field]: finalVal }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handleResTextBlur = (field) => {
    setReservacionesTouched(prev => ({ ...prev, [field]: true }))
    setReservacionesSeccion(prev => {
      const current = prev[field]
      const trimmed = typeof current === 'string' ? current.trim() : current
      const nextState = { ...prev, [field]: trimmed }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handleHorarioChange = (field, value) => {
    setReservacionesSeccion(prev => {
      const nextState = {
        ...prev,
        horarios: {
          ...prev.horarios,
          [field]: value
        }
      }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handleHorarioBlur = (field) => {
    setReservacionesTouched(prev => ({ ...prev, [field]: true }))
    setReservacionesSeccion(prev => {
      const rawVal = prev.horarios?.[field] || ''
      const formatted12 = to12HourFormat(rawVal)
      const nextState = {
        ...prev,
        horarios: {
          ...prev.horarios,
          [field]: formatted12 || rawVal.trim()
        }
      }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handlePoliticaChange = (idx, value) => {
    const finalVal = value.slice(0, 100)
    setReservacionesSeccion(prev => {
      const nextPolicies = [...(prev.politicas || [])]
      nextPolicies[idx] = finalVal
      const nextState = { ...prev, politicas: nextPolicies }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handlePoliticaBlur = (idx) => {
    setPoliciesTouched(prev => {
      const next = [...prev]
      next[idx] = true
      return next
    })
    setReservacionesSeccion(prev => {
      const nextPolicies = [...(prev.politicas || [])]
      nextPolicies[idx] = (nextPolicies[idx] || '').trim()
      const nextState = { ...prev, politicas: nextPolicies }
      const validation = validateReservationsSection(nextState)
      setReservacionesErrors(validation.errors)
      setPoliciesErrors(validation.policyErrors)
      return nextState
    })
  }

  const handleSaveReservacionesSeccion = async (e) => {
    e.preventDefault()
    setReservacionesSubmitted(true)

    // Normalizar y recortar
    const cleanSection = {
      tituloPrincipal: (reservacionesSeccion.tituloPrincipal || '').trim().slice(0, 100),
      subtituloDorado: (reservacionesSeccion.subtituloDorado || '').trim().slice(0, 100),
      textoDescriptivo: (reservacionesSeccion.textoDescriptivo || '').trim().slice(0, 300),
      horarios: {
        lunesViernesInicio: (reservacionesSeccion.horarios?.lunesViernesInicio || '').trim(),
        lunesViernesFin: (reservacionesSeccion.horarios?.lunesViernesFin || '').trim(),
        sabadoDomingoInicio: (reservacionesSeccion.horarios?.sabadoDomingoInicio || '').trim(),
        sabadoDomingoFin: (reservacionesSeccion.horarios?.sabadoDomingoFin || '').trim(),
        weekday_start: to24HourFormat(reservacionesSeccion.horarios?.lunesViernesInicio || reservacionesSeccion.horarios?.weekday_start),
        weekday_end: to24HourFormat(reservacionesSeccion.horarios?.lunesViernesFin || reservacionesSeccion.horarios?.weekday_end),
        weekend_start: to24HourFormat(reservacionesSeccion.horarios?.sabadoDomingoInicio || reservacionesSeccion.horarios?.weekend_start),
        weekend_end: to24HourFormat(reservacionesSeccion.horarios?.sabadoDomingoFin || reservacionesSeccion.horarios?.weekend_end)
      },
      politicas: [0, 1, 2, 3].map(i => (reservacionesSeccion.politicas?.[i] || '').trim().slice(0, 100))
    }

    // Validación Zod
    const validation = validateReservationsSection(cleanSection)
    setReservacionesErrors(validation.errors)
    setPoliciesErrors(validation.policyErrors)

    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor, completa los campos requeridos en la sección Reservaciones.', type: 'error' })
      return
    }

    try {
      await updateSettings({
        reservaciones_seccion: validation.data
      })
      setReservacionesSeccion({
        tituloPrincipal: validation.data.tituloPrincipal,
        subtituloDorado: validation.data.subtituloDorado,
        textoDescriptivo: validation.data.textoDescriptivo,
        horarios: validation.data.horarios,
        politicas: validation.data.politicas
      })
      setReservacionesSubmitted(false)
      setToast({ message: 'Sección Reservaciones guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la sección Reservaciones', type: 'error' })
    }
  }

  // 6. Sección Nuestra Historia
  const handleFondoUpload = async (file) => {
    if (!file) return
    const fileCheck = validateLandingImageFile(file)
    if (!fileCheck.isValid) {
      setToast({ message: fileCheck.error, type: 'error' })
      return
    }

    setUploadingFondo(true)
    try {
      const res = await uploadImage(file, 'background')
      setHistoriaConfig(prev => ({ ...prev, imagenFondo: res.data.url, fondo: res.data.url }))
      setToast({ message: 'Imagen de fondo de historia subida correctamente', type: 'success' })
    } catch (err) {
      const serverErrors = err?.response?.data?.errors
      let errorMsg = 'Error al subir la imagen de fondo'
      if (serverErrors) {
        const firstField = Object.keys(serverErrors)[0]
        if (firstField && Array.isArray(serverErrors[firstField]) && serverErrors[firstField][0]) {
          errorMsg = serverErrors[firstField][0]
        }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setUploadingFondo(false)
    }
  }

  // Validador helper para Sección Nuestra Historia
  const runHistoriaValidation = (cfg = historiaConfig) => {
    const dataToValidate = {
      history_title: cfg.titulo,
      history_description: cfg.descripcion,
      foundation_year: cfg.anioFundacion ?? cfg.anio,
      features: cfg.caracteristicas
    }
    const res = validateHistorySection(dataToValidate)
    setHistoriaErrors(res.errors)
    setFeaturesErrors(res.featureErrors)
    return res
  }

  const handleFeatureBlur = (index, field) => {
    setFeaturesTouched(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: true }
      return next
    })
    runHistoriaValidation()
  }

  const handleCaracteristicaChange = (index, field, value) => {
    setFeaturesTouched(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: true }
      return next
    })
    setHistoriaConfig(prev => {
      const nuevas = [...prev.caracteristicas]
      nuevas[index] = { ...nuevas[index], [field]: value }
      if (field === 'titulo') nuevas[index].title = value
      if (field === 'title') nuevas[index].titulo = value
      if (field === 'descripcion') nuevas[index].description = value
      if (field === 'description') nuevas[index].descripcion = value
      if (field === 'icono') nuevas[index].icon = value
      if (field === 'icon') nuevas[index].icono = value

      const nextState = { ...prev, caracteristicas: nuevas }
      const vRes = validateHistorySection({
        history_title: nextState.titulo,
        history_description: nextState.descripcion,
        foundation_year: nextState.anioFundacion ?? nextState.anio,
        features: nuevas
      })
      setFeaturesErrors(vRes.featureErrors)
      return nextState
    })
  }

  const handleSaveHistoria = async (e) => {
    e.preventDefault()
    setHistoriaSubmitted(true)

    // Validación Zod
    const validation = runHistoriaValidation()
    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor, corrige los errores en la sección Nuestra Historia.', type: 'error' })
      return
    }

    try {
      const cleanTitulo = historiaConfig.titulo.trim()
      const cleanDesc = historiaConfig.descripcion.trim()
      const cleanFeatures = (historiaConfig.caracteristicas || []).map(c => ({
        ...c,
        icono: (c.icono || c.icon || 'Star').trim(),
        icon: (c.icono || c.icon || 'Star').trim(),
        titulo: (c.titulo || c.title || '').trim(),
        title: (c.titulo || c.title || '').trim(),
        descripcion: (c.descripcion || c.description || '').trim(),
        description: (c.descripcion || c.description || '').trim()
      }))

      await updateSettings({
        historia_config: {
          titulo: cleanTitulo,
          descripcion: cleanDesc,
          anio: historiaConfig.anio ?? historiaConfig.anioFundacion,
          anioFundacion: historiaConfig.anioFundacion ?? historiaConfig.anio,
          fondo: historiaConfig.fondo ?? historiaConfig.imagenFondo,
          imagenFondo: historiaConfig.imagenFondo ?? historiaConfig.fondo,
          caracteristicas: cleanFeatures
        }
      })

      setHistoriaConfig(prev => ({
        ...prev,
        titulo: cleanTitulo,
        descripcion: cleanDesc,
        caracteristicas: cleanFeatures
      }))
      setHistoriaSubmitted(false)
      setToast({ message: 'Sección Nuestra Historia guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la sección Nuestra Historia', type: 'error' })
    }
  }

  // 7. Servicios Exclusivos
  const handleServicioChange = (index, field, value) => {
    let finalVal = value
    if (field === 'descripcion' || field === 'description') {
      finalVal = value.slice(0, 150) // Bloquea escritura al llegar a 150 caracteres
    } else if (field === 'titulo' || field === 'title') {
      finalVal = value.slice(0, 50) // Bloquea escritura al llegar a 50 caracteres
    }

    setServiciosConfig(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: finalVal }
      if (field === 'titulo') copy[index].title = finalVal
      if (field === 'title') copy[index].titulo = finalVal
      if (field === 'descripcion') copy[index].description = finalVal
      if (field === 'description') copy[index].descripcion = finalVal
      if (field === 'icono') copy[index].icon = finalVal
      if (field === 'icon') copy[index].icono = finalVal

      const vRes = validateServicesSection(copy)
      setServiciosErrors(vRes.serviceErrors)
      return copy
    })
  }

  const handleServicioBlur = (index, field) => {
    setServiciosTouched(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: true }
      return next
    })

    setServiciosConfig(prev => {
      const copy = [...prev]
      const currentVal = copy[index][field] || ''
      const trimmed = typeof currentVal === 'string' ? currentVal.trim() : currentVal
      copy[index] = { ...copy[index], [field]: trimmed }
      if (field === 'titulo' || field === 'title') {
        copy[index].titulo = trimmed
        copy[index].title = trimmed
      }
      if (field === 'descripcion' || field === 'description') {
        copy[index].descripcion = trimmed
        copy[index].description = trimmed
      }
      const vRes = validateServicesSection(copy)
      setServiciosErrors(vRes.serviceErrors)
      return copy
    })
  }

  const handleSaveServicios = async (e) => {
    e.preventDefault()
    setServiciosSubmitted(true)

    // Normalizar y recortar antes de validar
    const cleanServices = (serviciosConfig || []).slice(0, 3).map(s => {
      const ico = (s.icono || s.icon || '').trim()
      const tit = (s.titulo || s.title || '').trim().slice(0, 50)
      const desc = (s.descripcion || s.description || '').trim().slice(0, 150)
      return {
        icono: ico,
        icon: ico,
        titulo: tit,
        title: tit,
        descripcion: desc,
        description: desc
      }
    })

    // Validación Zod
    const validation = validateServicesSection(cleanServices)
    setServiciosErrors(validation.serviceErrors)

    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor, corrige los errores en los servicios exclusivos.', type: 'error' })
      return
    }

    try {
      await updateSettings({
        servicios_config: cleanServices
      })
      setServiciosConfig(cleanServices)
      setServiciosSubmitted(false)
      setToast({ message: 'Servicios exclusivos actualizados correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar los servicios exclusivos', type: 'error' })
    }
  }

  // 8. Sección Contacto
  const handleContactoChange = (field, value, subfield = null) => {
    let finalVal = value
    if (subfield) {
      finalVal = value.slice(0, 255)
    } else if (field === 'titulo' || field === 'labelSuperior') {
      finalVal = value.slice(0, 100)
    } else if (field === 'textoEventos') {
      finalVal = value.slice(0, 300)
    }

    setContactoSeccion(prev => {
      const nextState = subfield
        ? {
            ...prev,
            redesSociales: {
              ...prev.redesSociales,
              [subfield]: finalVal
            }
          }
        : {
            ...prev,
            [field]: finalVal
          }
      const validation = validateContactSection(nextState)
      setContactoErrors(validation.errors)
      return nextState
    })
  }

  const handleContactoBlur = (field, subfield = null) => {
    const errorKey = subfield || field
    setContactoTouched(prev => ({ ...prev, [errorKey]: true }))

    setContactoSeccion(prev => {
      let nextState
      if (subfield) {
        const rawVal = prev.redesSociales?.[subfield] || ''
        const clean = sanitizeSocialHandle(rawVal)
        nextState = {
          ...prev,
          redesSociales: {
            ...prev.redesSociales,
            [subfield]: clean
          }
        }
      } else {
        let currentVal = prev[field] || ''
        if (field === 'email') {
          currentVal = currentVal.trim().toLowerCase()
        } else if (typeof currentVal === 'string') {
          currentVal = currentVal.trim()
        }
        nextState = {
          ...prev,
          [field]: currentVal
        }
      }
      const validation = validateContactSection(nextState)
      setContactoErrors(validation.errors)
      return nextState
    })
  }

  const handleSaveContactoSeccion = async (e) => {
    e.preventDefault()
    setContactoSubmitted(true)

    // Validación Zod y sanitización
    const validation = validateContactSection(contactoSeccion)
    setContactoErrors(validation.errors)

    if (!validation.isValid) {
      setToast({ message: validation.firstError || 'Por favor, completa los campos requeridos en la sección Contacto.', type: 'error' })
      return
    }

    const cleanData = validation.data

    try {
      await updateSettings({
        contacto_seccion: {
          titulo: cleanData.titulo,
          labelSuperior: cleanData.labelSuperior,
          textoEventos: cleanData.textoEventos,
          mapsLink: cleanData.mapsLink,
          telefono: cleanData.telefono,
          email: cleanData.email,
          whatsapp: cleanData.whatsapp,
          redesSociales: cleanData.redesSociales
        },
        contact_phone: cleanData.telefono,
        telefono: cleanData.telefono,
        contact_email: cleanData.email,
        email: cleanData.email,
        contact_whatsapp: cleanData.whatsapp,
        whatsapp: cleanData.whatsapp
      })
      setContactoSeccion({
        titulo: cleanData.titulo,
        labelSuperior: cleanData.labelSuperior,
        textoEventos: cleanData.textoEventos,
        mapsLink: cleanData.mapsLink,
        telefono: cleanData.telefono,
        email: cleanData.email,
        whatsapp: cleanData.whatsapp,
        redesSociales: cleanData.redesSociales
      })
      setContactoSubmitted(false)
      setToast({ message: 'Sección Contacto guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la sección Contacto', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn p-8">
        <div className="h-10 w-48 bg-white/5 animate-shimmer rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="animate-shimmer rounded-2xl h-80 w-[calc(50%-12px)] max-xl:w-full" />
          <div className="animate-shimmer rounded-2xl h-80 w-[calc(50%-12px)] max-xl:w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans w-full max-md:p-3 max-md:space-y-4">
      <PageHeader 
        title="Personalizar Landing Page" 
        description="Edita el contenido visual, imágenes, carruseles, características y secciones visibles de la página pública."
      />

      {/* CONTENEDOR FLEXBOX: 2 COLUMNAS EN DESKTOP (XL), 1 COLUMNA EN TABLET/MÓVIL (max-xl:flex-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-md:gap-4">
        
        {/* COLUMNA IZQUIERDA: Portada Principal, Platillos Destacados, Banner Descuento, Reservaciones, Contacto */}
        <div className="space-y-6 flex flex-col max-md:space-y-4">
          
          {/* 1. Portada Principal (Hero) */}
          <form onSubmit={handleSavePortada} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6 max-md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <ImageIcon size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>Portada Principal</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('inicio')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4">
                {/* Contenedor Nivel 2 — Título y Eslogan (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  {/* 1. Título de la Portada */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">
                      Título de la portada <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={heroTitle}
                      onChange={(e) => {
                        const val = e.target.value
                        setHeroTitle(val)
                        setPortadaTouched(prev => ({ ...prev, hero_title: true }))
                        const vRes = validateHeroSection({
                          hero_title: val,
                          hero_slogan: heroDescription,
                          enable_carousel: useCarousel,
                          carousel_images: [...bannerImages, ...pendingFiles]
                        })
                        setPortadaErrors(prev => ({ ...prev, hero_title: vRes.errors.hero_title }))
                      }}
                      onBlur={() => {
                        const trimmed = heroTitle.trim()
                        setHeroTitle(trimmed)
                        setPortadaTouched(prev => ({ ...prev, hero_title: true }))
                        const vRes = validateHeroSection({
                          hero_title: trimmed,
                          hero_slogan: heroDescription,
                          enable_carousel: useCarousel,
                          carousel_images: [...bannerImages, ...pendingFiles]
                        })
                        setPortadaErrors(prev => ({ ...prev, hero_title: vRes.errors.hero_title }))
                      }}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] ${
                        (portadaTouched.hero_title || portadaSubmitted) && portadaErrors.hero_title
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="RESTAURANTE AURUM"
                    />
                    {(portadaTouched.hero_title || portadaSubmitted) && portadaErrors.hero_title && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">
                        {portadaErrors.hero_title}
                      </p>
                    )}
                  </div>

                  {/* 2. Eslogan de la Portada */}
                  <div className="text-left">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">Eslogan</label>
                      <span className={`text-[10px] font-bold ${heroDescription.length > 150 ? 'text-red-400' : 'opacity-40'}`}>
                        {heroDescription.length}/150
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      value={heroDescription}
                      onChange={(e) => {
                        const val = e.target.value
                        setHeroDescription(val)
                        setPortadaTouched(prev => ({ ...prev, hero_slogan: true }))
                        const vRes = validateHeroSection({
                          hero_title: heroTitle,
                          hero_slogan: val,
                          enable_carousel: useCarousel,
                          carousel_images: [...bannerImages, ...pendingFiles]
                        })
                        setPortadaErrors(prev => ({ ...prev, hero_slogan: vRes.errors.hero_slogan }))
                      }}
                      onBlur={() => {
                        const trimmed = heroDescription.trim()
                        setHeroDescription(trimmed)
                        setPortadaTouched(prev => ({ ...prev, hero_slogan: true }))
                        const vRes = validateHeroSection({
                          hero_title: heroTitle,
                          hero_slogan: trimmed,
                          enable_carousel: useCarousel,
                          carousel_images: [...bannerImages, ...pendingFiles]
                        })
                        setPortadaErrors(prev => ({ ...prev, hero_slogan: vRes.errors.hero_slogan }))
                      }}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] ${
                        (portadaTouched.hero_slogan || portadaSubmitted) && portadaErrors.hero_slogan
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        border: '1px solid var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="UNA EXPERIENCIA GASTRONÓMICA QUE DESPIERTA TODOS LOS SENTIDOS..."
                    />
                    {(portadaTouched.hero_slogan || portadaSubmitted) && portadaErrors.hero_slogan && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">
                        {portadaErrors.hero_slogan}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Imagen de fondo principal (Contenedor Nivel 2 - Tono 2) */}
                <div>
                  <div 
                    className={`bg-theme-subcard-bg border ${
                      heroImageError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
                    } rounded-xl p-4 flex items-start gap-4 shadow-xs`} 
                    style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: heroImageError ? '#ef4444' : 'var(--theme-border-subtle)' }}
                  >
                    <div className="relative w-32 h-20 shrink-0 overflow-hidden
                                    transition-all duration-200 cursor-pointer group bg-white dark:bg-[var(--theme-surface)] rounded-lg shadow-xs"
                         style={{
                           backgroundColor: 'var(--theme-surface)',
                           border: '1px dashed var(--theme-border-subtle)',
                           borderRadius: '0.5rem'
                         }}
                         onClick={() => !useCarousel && heroImageInputRef.current?.click()}>
                      {heroImage ? (
                        <>
                          <img src={heroImage} alt="Portada" className="w-full h-full object-cover"/>
                          {!useCarousel && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Upload size={16} className="text-white"/>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <ImageIcon size={20} className="opacity-20"/>
                          <span className="text-[10px] font-medium opacity-40">Subir portada</span>
                        </div>
                      )}
                      {uploadingHeroImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--theme-primary)' }}/>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 justify-center h-20 text-left">
                      <p className="text-xs font-semibold opacity-80">Imagen de fondo principal</p>
                      <p className="text-[10px] font-medium opacity-50">Apaisado · JPG, PNG o WebP · Máx. 10MB</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => heroImageInputRef.current?.click()} disabled={useCarousel}
                                className="input-surface bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 rounded-lg shadow-xs"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}>
                          <Upload size={12}/> Subir imagen
                        </button>
                      </div>
                    </div>
                    <input ref={heroImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleHeroImageUpload(e.target.files[0])}/>
                  </div>
                  {heroImageError && (
                    <p className="text-red-500 text-xs mt-1.5 animate-fadeIn font-medium text-left">
                      {heroImageError}
                    </p>
                  )}
                </div>

                {/* Interruptor de Carrusel (Contenedor Nivel 2 - Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-semibold opacity-90">¿Activar carrusel de imágenes en la portada?</span>
                    <span className="text-[10px] font-medium opacity-50">Si se activa, el fondo de la portada rotará automáticamente entre múltiples imágenes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !useCarousel
                      setUseCarousel(next)
                      const vRes = validateHeroSection({
                        hero_title: heroTitle,
                        hero_slogan: heroDescription,
                        enable_carousel: next,
                        carousel_images: [...bannerImages, ...pendingFiles]
                      })
                      setPortadaErrors(prev => ({ ...prev, carousel_images: vRes.errors.carousel_images }))
                    }}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: useCarousel ? 'var(--theme-primary)' : 'rgba(128,128,128,0.2)' }}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useCarousel ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Subir Imágenes Carrusel (Contenedor Nivel 2 - Tono 2) */}
                <div 
                  className={`bg-theme-subcard-bg border ${
                    (useCarousel || portadaSubmitted) && portadaErrors.carousel_images ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
                  } p-4 space-y-3 rounded-xl transition-all duration-300 shadow-xs ${!useCarousel ? 'opacity-30 pointer-events-none select-none' : 'opacity-100 pointer-events-auto'}`} 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: (useCarousel || portadaSubmitted) && portadaErrors.carousel_images ? '#ef4444' : 'var(--theme-border-subtle)' }}
                >
                  <label className="text-xs font-semibold uppercase tracking-wider block text-left opacity-60">
                    Imágenes del carrusel (portada) — mín. 2, máx. 6
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={!useCarousel || totalSelected >= 6}
                      className="input-surface bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 flex-1 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer rounded-lg shadow-xs"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                    >
                      <Upload size={15}/> Subir imagen
                    </button>

                    <button
                      type="button"
                      onClick={() => useCarousel && totalSelected > 0 && setShowBannerModal(true)}
                      disabled={!useCarousel || totalSelected === 0}
                      className={`input-surface bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 flex-1 flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg shadow-xs ${useCarousel && totalSelected > 0 ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: useCarousel && totalSelected > 0 ? 'var(--theme-primary)' : 'rgba(128,128,128,0.3)' }}>
                        {totalSelected}
                      </div>
                      <span>
                        {totalSelected === 0
                          ? 'Sin imágenes'
                          : `${totalSelected} seleccionada${totalSelected > 1 ? 's' : ''}`}
                      </span>
                      {useCarousel && totalSelected > 0 && <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--theme-primary)' }}/>}
                    </button>
                  </div>

                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleBannerSelect}
                  />

                  {useCarousel && portadaErrors.carousel_images && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium text-left">
                      {portadaErrors.carousel_images}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 2. Platillos destacados */}
          <form onSubmit={handleSavePlatillosSeccion} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <Utensils size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>🍽 Platillos destacados</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('menu')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-5 text-left">
                {/* Contenedor Nivel 2 — Subtítulo y Título (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">SUBTÍTULO DE LA SECCIÓN</label>
                        <span className={`text-[10px] font-bold ${(platillosSeccion.labelSuperior || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                          {(platillosSeccion.labelSuperior || '').length}/100
                        </span>
                      </div>
                      <input 
                        type="text"
                        value={platillosSeccion.labelSuperior || ''}
                        maxLength={100}
                        onChange={(e) => setPlatillosSeccion(prev => ({ ...prev, labelSuperior: e.target.value.slice(0, 100) }))}
                        onBlur={(e) => setPlatillosSeccion(prev => ({ ...prev, labelSuperior: (prev.labelSuperior || '').trim() }))}
                        className="input-surface px-4 py-2.5 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          border: '1px solid var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                        placeholder="Nuestra carta"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TÍTULO PRINCIPAL</label>
                        <span className={`text-[10px] font-bold ${(platillosSeccion.tituloPrincipal || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                          {(platillosSeccion.tituloPrincipal || '').length}/100
                        </span>
                      </div>
                      <input 
                        type="text"
                        value={platillosSeccion.tituloPrincipal || ''}
                        maxLength={100}
                        onChange={(e) => setPlatillosSeccion(prev => ({ ...prev, tituloPrincipal: e.target.value.slice(0, 100) }))}
                        onBlur={(e) => setPlatillosSeccion(prev => ({ ...prev, tituloPrincipal: (prev.tituloPrincipal || '').trim() }))}
                        className="input-surface px-4 py-2.5 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          border: '1px solid var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                        placeholder="Platillos que cuentan una historia"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Selector de Categorías (Multi-select Píldoras, hasta 4) */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <label className="block text-xs md:text-sm font-bold uppercase tracking-wider opacity-90" style={{ color: 'var(--theme-text)' }}>
                        Categorías a Mostrar
                      </label>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm" style={{
                        background: (platillosSeccion.selected_categories?.length || 0) === 4 
                          ? 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.2)' 
                          : 'rgba(255,255,255,0.08)',
                        color: (platillosSeccion.selected_categories?.length || 0) === 4 
                          ? 'var(--theme-primary)' 
                          : 'var(--theme-text-muted)',
                        border: '1px solid ' + ((platillosSeccion.selected_categories?.length || 0) === 4 ? 'var(--theme-primary)' : 'rgba(255,255,255,0.1)')
                      }}>
                        {platillosSeccion.selected_categories?.length || 0}/4 seleccionadas
                      </span>
                    </div>

                    {availableCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const first4 = availableCategories.slice(0, 4).map(c => c.id)
                            const first4Set = new Set(first4.map(String))
                            // Regla Cruzada: al cambiar a Primeras 4, filtrar platillos a solo los de esas categorías
                            setPlatillosSeccion(prev => {
                              const cleanedDishes = (prev.selected_dishes || []).filter(dishId => {
                                const dish = availableDishes.find(d => String(d.id) === String(dishId))
                                return dish && first4Set.has(String(dish.category_id))
                              })
                              return { ...prev, selected_categories: first4, selected_dishes: cleanedDishes }
                            })
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-95 flex items-center gap-1.5"
                          style={{
                            background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.08)',
                            color: 'var(--theme-primary)',
                            borderColor: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.3)'
                          }}
                        >
                          Primeras 4
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlatillosSeccion(prev => ({ ...prev, selected_categories: [], selected_dishes: [] }))}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          Limpiar
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs md:text-sm mb-5 font-normal opacity-65 leading-relaxed">
                    Selecciona hasta 4 categorías para exhibir sus pestañas en la Landing Page.
                  </p>

                  {loadingMenuData ? (
                    <div className="flex items-center justify-center p-6 border rounded-xl" style={{ borderColor: 'var(--theme-border-subtle, rgba(255,255,255,0.05))' }}>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--theme-primary)' }} />
                      <span className="ml-2 text-xs opacity-60">Cargando categorías...</span>
                    </div>
                  ) : availableCategories.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed text-center text-xs opacity-60" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      No se encontraron categorías en el sistema. Puedes crearlas en Menú &gt; Categorías.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {availableCategories.map(cat => {
                        const isSelected = (platillosSeccion.selected_categories || []).some(id => String(id) === String(cat.id))
                        const isMaxReached = (platillosSeccion.selected_categories || []).length >= 4
                        const isDisabled = !isSelected && isMaxReached
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => !isDisabled && toggleCategorySelection(cat.id)}
                            disabled={isDisabled}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 capitalize shadow-sm select-none active:scale-95 ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{
                              background: isSelected 
                                ? 'var(--theme-primary)' 
                                : 'var(--theme-input)',
                              color: isSelected 
                                ? 'var(--theme-primary-contrast, #fff)' 
                                : 'var(--theme-text)',
                              border: isSelected 
                                ? '1px solid var(--theme-primary)' 
                                : '1px solid var(--theme-border, rgba(128,128,128,0.25))',
                              boxShadow: isSelected ? '0 3px 12px rgba(var(--theme-primary-rgb, 124, 58, 237), 0.3)' : 'none'
                            }}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{
                              background: isSelected ? '#fff' : 'rgba(128,128,128,0.4)'
                            }} />
                            <span className="capitalize">{cat.name}</span>
                            {isSelected && <Check size={16} strokeWidth={2.5} className="shrink-0 ml-0.5" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Selector de Platillos Dinámico */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <label className="block text-xs md:text-sm font-bold uppercase tracking-wider opacity-90" style={{ color: 'var(--theme-text)' }}>
                        Platillos a Destacar
                      </label>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/10 shadow-sm border border-white/10" style={{ color: 'var(--theme-primary)' }}>
                        {platillosSeccion.selected_dishes?.length || 0} seleccionados
                      </span>
                    </div>

                    {availableDishes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (filteredDishes.length === 0) return
                            handleSelectAllVisibleDishes(filteredDishes.map(d => d.id))
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-95 flex items-center gap-1.5"
                          style={{
                            background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.08)',
                            color: 'var(--theme-primary)',
                            borderColor: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.3)'
                          }}
                        >
                          Seleccionar visibles
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (filteredDishes.length === 0) return
                            handleDeselectAllVisibleDishes(filteredDishes.map(d => d.id))
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          Deseleccionar
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs md:text-sm mb-5 font-normal opacity-65 leading-relaxed">
                    Busca y selecciona platillos pertenecientes a las categorías elegidas para exhibirlos en la Landing Page.
                  </p>

                  {/* Barra de Búsqueda de Platillos (Ancho Completo) */}
                  <div className="relative flex items-center mb-3 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      value={dishSearchQuery}
                      onChange={(e) => setDishSearchQuery(e.target.value)}
                      placeholder="Buscar platillo por nombre..."
                      className="input-subcard w-full pl-10 pr-9 py-2.5 text-sm focus:outline-none transition-all font-medium bg-theme-subcard-bg border border-gray-200 dark:border-gray-700"
                      style={{
                        backgroundColor: 'var(--theme-subcard-bg)',
                        color: 'var(--theme-text)',
                        borderColor: 'var(--theme-border-subtle)',
                        borderRadius: '0.75rem'
                      }}
                    />
                    {dishSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDishSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 cursor-pointer z-10 px-1 py-0.5"
                        style={{ color: 'var(--theme-text)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Lista con Scroll de Platillos (Segundo contenedor - Tono 2) */}
                  <div 
                    className="max-h-60 overflow-y-auto pr-1 space-y-2.5 rounded-xl p-4 border transition-colors bg-theme-subcard-bg border-gray-200 dark:border-gray-700 shadow-xs"
                    style={{
                      background: 'var(--theme-subcard-bg)',
                      borderColor: 'var(--theme-border-subtle)'
                    }}
                  >
                    {loadingMenuData ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--theme-primary)' }} />
                        <span className="ml-2 text-xs" style={{ color: 'var(--theme-text-muted)' }}>Cargando platillos...</span>
                      </div>
                    ) : (platillosSeccion.selected_categories || []).length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Utensils size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-primary)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                          Selecciona una categoría arriba para ver sus platillos.
                        </p>
                      </div>
                    ) : filteredDishes.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <Utensils size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-primary)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                          {dishSearchQuery ? 'No hay platillos que coincidan con la búsqueda en las categorías seleccionadas.' : 'No hay platillos registrados en las categorías seleccionadas.'}
                        </p>
                      </div>
                    ) : filteredDishes.map(dish => {
                      const isDishSelected = (platillosSeccion.selected_dishes || []).some(id => String(id) === String(dish.id))
                      const categoryName = availableCategories.find(c => String(c.id) === String(dish.category_id))?.name || 'Menú'

                      return (
                        <div
                          key={dish.id}
                          onClick={() => toggleDishSelection(dish.id)}
                          className="rounded-lg p-3 shadow-sm border flex items-center justify-between transition-all cursor-pointer select-none active:scale-[0.99]"
                          style={{
                            background: 'var(--theme-surface)',
                            borderColor: isDishSelected 
                              ? 'var(--theme-primary)' 
                              : 'var(--theme-border-subtle)',
                            boxShadow: isDishSelected ? '0 0 0 1px var(--theme-primary)' : 'none'
                          }}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div 
                              className="w-11 h-11 rounded-lg shrink-0 overflow-hidden border flex items-center justify-center"
                              style={{
                                background: 'var(--theme-input)',
                                borderColor: 'var(--theme-border, #94a3b8)',
                                color: 'var(--theme-text)'
                              }}
                            >
                              {dish.image || dish.image_url ? (
                                <img 
                                  src={dish.image || dish.image_url} 
                                  alt={dish.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <Utensils size={16} className="opacity-40" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-semibold text-sm truncate capitalize"
                                  style={{ color: 'var(--theme-text)' }}
                                >
                                  {dish.name}
                                </span>
                                <span 
                                  className="text-[11px] px-2 py-0.5 rounded-md font-medium border capitalize"
                                  style={{
                                    background: 'var(--theme-input)',
                                    color: 'var(--theme-text-muted)',
                                    borderColor: 'var(--theme-border, #94a3b8)'
                                  }}
                                >
                                  {categoryName}
                                </span>
                              </div>
                              <div 
                                className="text-xs font-mono font-bold mt-0.5" 
                                style={{ color: 'var(--theme-text)' }}
                              >
                                ${Number(dish.price || 0).toFixed(2)} MXN
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 ml-3">
                            <div 
                              className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                              style={{
                                background: isDishSelected ? 'var(--theme-primary)' : 'transparent',
                                border: isDishSelected 
                                  ? '1px solid var(--theme-primary)' 
                                  : '1px solid var(--theme-border, #94a3b8)',
                                color: 'var(--theme-primary-contrast, #fff)'
                              }}
                            >
                              {isDishSelected && <Check size={13} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO DEBAJO DEL BOTÓN</label>
                    <span className={`text-[10px] font-bold ${(platillosSeccion.textoDebajoBoton || '').length > 150 ? 'text-red-400' : 'opacity-40'}`}>
                      {(platillosSeccion.textoDebajoBoton || '').length}/150
                    </span>
                  </div>
                  <input 
                    type="text"
                    value={platillosSeccion.textoDebajoBoton || ''}
                    maxLength={150}
                    onChange={(e) => setPlatillosSeccion(prev => ({ ...prev, textoDebajoBoton: e.target.value.slice(0, 150) }))}
                    onBlur={(e) => setPlatillosSeccion(prev => ({ ...prev, textoDebajoBoton: (prev.textoDebajoBoton || '').trim() }))}
                    className="input-surface px-4 py-2.5 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    style={{ 
                      backgroundColor: 'var(--theme-surface)', 
                      color: 'var(--theme-text)',
                      border: '1px solid var(--theme-border-subtle)',
                      borderRadius: '0.5rem'
                    }}
                    placeholder="Servicio a domicilio disponible"
                  />
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 3. Banner de descuento por reserva */}
          <form onSubmit={handleSaveBannerDescuento} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <Gift size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>🎁 Banner de descuento por reserva</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('banner-descuento')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {/* Toggle Activar Banner */}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-90">ACTIVAR BANNER</span>
                    <span className="text-[11px] font-medium opacity-50">Mostrar banner de descuento en la landing</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBanner}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: bannerDescuento.activo ? 'var(--theme-primary)' : 'rgba(128,128,128,0.2)' }}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${bannerDescuento.activo ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Contenedor Nivel 2 — Campos del Banner (Tono 2) */}
                <div 
                  className={`bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs transition-opacity duration-200 ${
                    !bannerDescuento.activo ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">PORCENTAJE DE DESCUENTO (%)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        disabled={!bannerDescuento.activo}
                        value={bannerDescuento.porcentaje ?? ''}
                        onKeyDown={(e) => {
                          if (['-', '.', ',', 'e', 'E', '+'].includes(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) => handleBannerFieldChange('porcentaje', e.target.value)}
                        onBlur={() => handleBannerFieldBlur('porcentaje')}
                        className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                          bannerDescuento.activo && (bannerTouched.porcentaje || bannerSubmitted) && bannerErrors.porcentaje
                            ? '!border-red-500 ring-1 ring-red-500/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          borderColor: bannerDescuento.activo && (bannerTouched.porcentaje || bannerSubmitted) && bannerErrors.porcentaje ? '#ef4444' : 'var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                        placeholder="Ej: 20"
                      />
                      {bannerDescuento.activo && (bannerTouched.porcentaje || bannerSubmitted) && bannerErrors.porcentaje && (
                        <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                          {bannerErrors.porcentaje}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">BADGE DE VIGENCIA</label>
                        <span className={`text-[10px] font-bold ${(bannerDescuento.badgeVigencia || '').length > 50 ? 'text-red-400' : 'opacity-40'}`}>
                          {(bannerDescuento.badgeVigencia || '').length}/50
                        </span>
                      </div>
                      <input 
                        type="text"
                        disabled={!bannerDescuento.activo}
                        value={bannerDescuento.badgeVigencia || ''}
                        maxLength={50}
                        onChange={(e) => handleBannerFieldChange('badgeVigencia', e.target.value)}
                        onBlur={() => handleBannerFieldBlur('badgeVigencia')}
                        className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                          bannerDescuento.activo && (bannerTouched.badgeVigencia || bannerSubmitted) && bannerErrors.badgeVigencia
                            ? '!border-red-500 ring-1 ring-red-500/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          borderColor: bannerDescuento.activo && (bannerTouched.badgeVigencia || bannerSubmitted) && bannerErrors.badgeVigencia ? '#ef4444' : 'var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                        placeholder="Válido solo por este mes"
                      />
                      {bannerDescuento.activo && (bannerTouched.badgeVigencia || bannerSubmitted) && bannerErrors.badgeVigencia && (
                        <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                          {bannerErrors.badgeVigencia}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TÍTULO DEL DESCUENTO</label>
                      <span className={`text-[10px] font-bold ${(bannerDescuento.tituloDescuento || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                        {(bannerDescuento.tituloDescuento || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text"
                      disabled={!bannerDescuento.activo}
                      value={bannerDescuento.tituloDescuento || ''}
                      maxLength={100}
                      onChange={(e) => handleBannerFieldChange('tituloDescuento', e.target.value)}
                      onBlur={() => handleBannerFieldBlur('tituloDescuento')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                        bannerDescuento.activo && (bannerTouched.tituloDescuento || bannerSubmitted) && bannerErrors.tituloDescuento
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: bannerDescuento.activo && (bannerTouched.tituloDescuento || bannerSubmitted) && bannerErrors.tituloDescuento ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Descuento de aniversario"
                    />
                    {bannerDescuento.activo && (bannerTouched.tituloDescuento || bannerSubmitted) && bannerErrors.tituloDescuento && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {bannerErrors.tituloDescuento}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">DESCRIPCIÓN</label>
                      <span className={`text-[10px] font-bold ${(bannerDescuento.descripcion || '').length >= 200 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(bannerDescuento.descripcion || '').length}/200
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      disabled={!bannerDescuento.activo}
                      value={bannerDescuento.descripcion || ''}
                      maxLength={200}
                      onChange={(e) => handleBannerFieldChange('descripcion', e.target.value)}
                      onBlur={() => handleBannerFieldBlur('descripcion')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                        bannerDescuento.activo && (bannerTouched.descripcion || bannerSubmitted) && bannerErrors.descripcion
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: bannerDescuento.activo && (bannerTouched.descripcion || bannerSubmitted) && bannerErrors.descripcion ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Celebramos nuestra trayectoria ofreciéndote un beneficio exclusivo al reservar tu mesa en línea."
                    />
                    {bannerDescuento.activo && (bannerTouched.descripcion || bannerSubmitted) && bannerErrors.descripcion && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {bannerErrors.descripcion}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO DEL BOTÓN</label>
                      <span className={`text-[10px] font-bold ${(bannerDescuento.textoBoton || '').length > 50 ? 'text-red-400' : 'opacity-40'}`}>
                        {(bannerDescuento.textoBoton || '').length}/50
                      </span>
                    </div>
                    <input 
                      type="text"
                      disabled={!bannerDescuento.activo}
                      value={bannerDescuento.textoBoton || ''}
                      maxLength={50}
                      onChange={(e) => handleBannerFieldChange('textoBoton', e.target.value)}
                      onBlur={() => handleBannerFieldBlur('textoBoton')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                        bannerDescuento.activo && (bannerTouched.textoBoton || bannerSubmitted) && bannerErrors.textoBoton
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: bannerDescuento.activo && (bannerTouched.textoBoton || bannerSubmitted) && bannerErrors.textoBoton ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Reservar con descuento"
                    />
                    {bannerDescuento.activo && (bannerTouched.textoBoton || bannerSubmitted) && bannerErrors.textoBoton && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {bannerErrors.textoBoton}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO BAJO EL BOTÓN</label>
                      <span className={`text-[10px] font-bold ${(bannerDescuento.textoBotonSub || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                        {(bannerDescuento.textoBotonSub || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text"
                      disabled={!bannerDescuento.activo}
                      value={bannerDescuento.textoBotonSub || ''}
                      maxLength={100}
                      onChange={(e) => handleBannerFieldChange('textoBotonSub', e.target.value)}
                      onBlur={() => handleBannerFieldBlur('textoBotonSub')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed border ${
                        bannerDescuento.activo && (bannerTouched.textoBotonSub || bannerSubmitted) && bannerErrors.textoBotonSub
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: bannerDescuento.activo && (bannerTouched.textoBotonSub || bannerSubmitted) && bannerErrors.textoBotonSub ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Reserva ahora y obtén el beneficio automáticamente."
                    />
                    {bannerDescuento.activo && (bannerTouched.textoBotonSub || bannerSubmitted) && bannerErrors.textoBotonSub && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {bannerErrors.textoBotonSub}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 4. Sección Reservaciones */}
          <form onSubmit={handleSaveReservacionesSeccion} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <Calendar size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>📅 Sección Reservaciones</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('reservaciones')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {/* Contenedor Nivel 2 — Textos de Reservaciones (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TÍTULO PRINCIPAL</label>
                      <span className={`text-[10px] font-bold ${(reservacionesSeccion.tituloPrincipal || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                        {(reservacionesSeccion.tituloPrincipal || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text"
                      value={reservacionesSeccion.tituloPrincipal || ''}
                      maxLength={100}
                      onChange={(e) => handleResTextChange('tituloPrincipal', e.target.value)}
                      onBlur={() => handleResTextBlur('tituloPrincipal')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (reservacionesTouched.tituloPrincipal || reservacionesSubmitted) && reservacionesErrors.tituloPrincipal
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (reservacionesTouched.tituloPrincipal || reservacionesSubmitted) && reservacionesErrors.tituloPrincipal ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Reserva tu mesa"
                    />
                    {(reservacionesTouched.tituloPrincipal || reservacionesSubmitted) && reservacionesErrors.tituloPrincipal && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {reservacionesErrors.tituloPrincipal}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">SUBTÍTULO DORADO</label>
                      <span className={`text-[10px] font-bold ${(reservacionesSeccion.subtituloDorado || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                        {(reservacionesSeccion.subtituloDorado || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text"
                      value={reservacionesSeccion.subtituloDorado || ''}
                      maxLength={100}
                      onChange={(e) => handleResTextChange('subtituloDorado', e.target.value)}
                      onBlur={() => handleResTextBlur('subtituloDorado')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (reservacionesTouched.subtituloDorado || reservacionesSubmitted) && reservacionesErrors.subtituloDorado
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (reservacionesTouched.subtituloDorado || reservacionesSubmitted) && reservacionesErrors.subtituloDorado ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Una noche inolvidable te está esperando"
                    />
                    {(reservacionesTouched.subtituloDorado || reservacionesSubmitted) && reservacionesErrors.subtituloDorado && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {reservacionesErrors.subtituloDorado}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO DESCRIPTIVO</label>
                      <span className={`text-[10px] font-bold ${(reservacionesSeccion.textoDescriptivo || '').length >= 300 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(reservacionesSeccion.textoDescriptivo || '').length}/300
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      value={reservacionesSeccion.textoDescriptivo || ''}
                      maxLength={300}
                      onChange={(e) => handleResTextChange('textoDescriptivo', e.target.value)}
                      onBlur={() => handleResTextBlur('textoDescriptivo')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (reservacionesTouched.textoDescriptivo || reservacionesSubmitted) && reservacionesErrors.textoDescriptivo
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (reservacionesTouched.textoDescriptivo || reservacionesSubmitted) && reservacionesErrors.textoDescriptivo ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Cada reservación es una experiencia diseñada especialmente para ti..."
                    />
                    {(reservacionesTouched.textoDescriptivo || reservacionesSubmitted) && reservacionesErrors.textoDescriptivo && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {reservacionesErrors.textoDescriptivo}
                      </p>
                    )}
                  </div>
                </div>

                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-3 rounded-xl shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">HORARIOS</span>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold opacity-60 uppercase tracking-wider">Lunes a Viernes (Apertura y Cierre)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input 
                          type="text"
                          value={reservacionesSeccion.horarios?.lunesViernesInicio || ''}
                          onChange={(e) => handleHorarioChange('lunesViernesInicio', e.target.value)}
                          onBlur={() => handleHorarioBlur('lunesViernesInicio')}
                          className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                            (reservacionesTouched.lunesViernesInicio || reservacionesSubmitted) && reservacionesErrors.lunesViernesInicio
                              ? '!border-red-500 ring-1 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600'
                          } px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                          style={{ 
                            backgroundColor: 'var(--theme-surface)', 
                            borderColor: (reservacionesTouched.lunesViernesInicio || reservacionesSubmitted) && reservacionesErrors.lunesViernesInicio ? '#ef4444' : 'var(--theme-border-subtle)', 
                            color: 'var(--theme-text)' 
                          }}
                          placeholder="1:00 PM"
                        />
                      </div>
                      <div>
                        <input 
                          type="text"
                          value={reservacionesSeccion.horarios?.lunesViernesFin || ''}
                          onChange={(e) => handleHorarioChange('lunesViernesFin', e.target.value)}
                          onBlur={() => handleHorarioBlur('lunesViernesFin')}
                          className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                            (reservacionesTouched.lunesViernesFin || reservacionesSubmitted) && reservacionesErrors.lunesViernesFin
                              ? '!border-red-500 ring-1 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600'
                          } px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                          style={{ 
                            backgroundColor: 'var(--theme-surface)', 
                            borderColor: (reservacionesTouched.lunesViernesFin || reservacionesSubmitted) && reservacionesErrors.lunesViernesFin ? '#ef4444' : 'var(--theme-border-subtle)', 
                            color: 'var(--theme-text)' 
                          }}
                          placeholder="11:00 PM"
                        />
                      </div>
                    </div>
                    {((reservacionesTouched.lunesViernesInicio || reservacionesSubmitted) && reservacionesErrors.lunesViernesInicio) && (
                      <p className="text-red-500 text-[11px] font-medium animate-fadeIn">
                        {reservacionesErrors.lunesViernesInicio}
                      </p>
                    )}
                    {((reservacionesTouched.lunesViernesFin || reservacionesSubmitted) && reservacionesErrors.lunesViernesFin) && (
                      <p className="text-red-500 text-[11px] font-medium animate-fadeIn">
                        {reservacionesErrors.lunesViernesFin}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold opacity-60 uppercase tracking-wider">Sábados y Domingos (Apertura y Cierre)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input 
                          type="text"
                          value={reservacionesSeccion.horarios?.sabadoDomingoInicio || ''}
                          onChange={(e) => handleHorarioChange('sabadoDomingoInicio', e.target.value)}
                          onBlur={() => handleHorarioBlur('sabadoDomingoInicio')}
                          className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                            (reservacionesTouched.sabadoDomingoInicio || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoInicio
                              ? '!border-red-500 ring-1 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600'
                          } px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                          style={{ 
                            backgroundColor: 'var(--theme-surface)', 
                            borderColor: (reservacionesTouched.sabadoDomingoInicio || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoInicio ? '#ef4444' : 'var(--theme-border-subtle)', 
                            color: 'var(--theme-text)' 
                          }}
                          placeholder="12:00 PM"
                        />
                      </div>
                      <div>
                        <input 
                          type="text"
                          value={reservacionesSeccion.horarios?.sabadoDomingoFin || ''}
                          onChange={(e) => handleHorarioChange('sabadoDomingoFin', e.target.value)}
                          onBlur={() => handleHorarioBlur('sabadoDomingoFin')}
                          className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                            (reservacionesTouched.sabadoDomingoFin || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoFin
                              ? '!border-red-500 ring-1 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600'
                          } px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                          style={{ 
                            backgroundColor: 'var(--theme-surface)', 
                            borderColor: (reservacionesTouched.sabadoDomingoFin || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoFin ? '#ef4444' : 'var(--theme-border-subtle)', 
                            color: 'var(--theme-text)' 
                          }}
                          placeholder="12:00 AM"
                        />
                      </div>
                    </div>
                    {((reservacionesTouched.sabadoDomingoInicio || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoInicio) && (
                      <p className="text-red-500 text-[11px] font-medium animate-fadeIn">
                        {reservacionesErrors.sabadoDomingoInicio}
                      </p>
                    )}
                    {((reservacionesTouched.sabadoDomingoFin || reservacionesSubmitted) && reservacionesErrors.sabadoDomingoFin) && (
                      <p className="text-red-500 text-[11px] font-medium animate-fadeIn">
                        {reservacionesErrors.sabadoDomingoFin}
                      </p>
                    )}
                  </div>
                </div>

                {/* POLÍTICAS (4 items editables) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-3 rounded-xl shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">POLÍTICAS (4 items editables)</span>
                  {reservacionesSeccion.politicas.map((pol, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold opacity-60 uppercase">Política {idx + 1}</span>
                        <span className={`text-[9px] font-bold ${(pol || '').length > 100 ? 'text-red-400' : 'opacity-40'}`}>
                          {(pol || '').length}/100
                        </span>
                      </div>
                      <input 
                        type="text" 
                        value={pol || ''}
                        maxLength={100}
                        onChange={(e) => handlePoliticaChange(idx, e.target.value)}
                        onBlur={() => handlePoliticaBlur(idx)}
                        className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                          (policiesTouched[idx] || reservacionesSubmitted) && policiesErrors[idx]
                            ? '!border-red-500 ring-1 ring-red-500/20'
                            : 'border-gray-300 dark:border-gray-600'
                        } px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          borderColor: (policiesTouched[idx] || reservacionesSubmitted) && policiesErrors[idx] ? '#ef4444' : 'var(--theme-border-subtle)', 
                          color: 'var(--theme-text)' 
                        }}
                        placeholder={`Política ${idx + 1}...`}
                      />
                      {(policiesTouched[idx] || reservacionesSubmitted) && policiesErrors[idx] && (
                        <p className="text-red-500 text-[11px] font-medium animate-fadeIn">
                          {policiesErrors[idx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 5. Sección Contacto (Encuéntranos) */}
          <form onSubmit={handleSaveContactoSeccion} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <MapPin size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>📍 Sección Contacto</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('contacto')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {/* Contenedor Nivel 2 — Textos de Contacto (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TÍTULO</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.titulo || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.titulo || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text"
                      maxLength={100}
                      value={contactoSeccion.titulo || ''}
                      onChange={(e) => handleContactoChange('titulo', e.target.value)}
                      onBlur={() => handleContactoBlur('titulo')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] border ${
                        (contactoTouched.titulo || contactoSubmitted) && contactoErrors.titulo
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (contactoTouched.titulo || contactoSubmitted) && contactoErrors.titulo ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Encuéntranos"
                    />
                    {(contactoTouched.titulo || contactoSubmitted) && contactoErrors.titulo && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.titulo}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">SUBTÍTULO DE LA SECCIÓN</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.labelSuperior || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.labelSuperior || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={100}
                      value={contactoSeccion.labelSuperior || ''}
                      onChange={(e) => handleContactoChange('labelSuperior', e.target.value)}
                      onBlur={() => handleContactoBlur('labelSuperior')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (contactoTouched.labelSuperior || contactoSubmitted) && contactoErrors.labelSuperior
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (contactoTouched.labelSuperior || contactoSubmitted) && contactoErrors.labelSuperior ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Ubicación y contacto"
                    />
                    {(contactoTouched.labelSuperior || contactoSubmitted) && contactoErrors.labelSuperior && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.labelSuperior}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO DE EVENTOS ESPECIALES</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.textoEventos || '').length >= 300 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.textoEventos || '').length}/300
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      maxLength={300}
                      value={contactoSeccion.textoEventos || ''}
                      onChange={(e) => handleContactoChange('textoEventos', e.target.value)}
                      onBlur={() => handleContactoBlur('textoEventos')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (contactoTouched.textoEventos || contactoSubmitted) && contactoErrors.textoEventos
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (contactoTouched.textoEventos || contactoSubmitted) && contactoErrors.textoEventos ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="¿Tienes una celebración o evento privado?..."
                    />
                    {(contactoTouched.textoEventos || contactoSubmitted) && contactoErrors.textoEventos && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.textoEventos}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">LINK DE GOOGLE MAPS</label>
                    <input 
                      type="text" 
                      value={contactoSeccion.mapsLink || ''}
                      onChange={(e) => handleContactoChange('mapsLink', e.target.value)}
                      onBlur={() => handleContactoBlur('mapsLink')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (contactoTouched.mapsLink || contactoSubmitted) && contactoErrors.mapsLink
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (contactoTouched.mapsLink || contactoSubmitted) && contactoErrors.mapsLink ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="https://maps.google.com/..."
                    />
                    {(contactoTouched.mapsLink || contactoSubmitted) && contactoErrors.mapsLink && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.mapsLink}
                      </p>
                    )}
                  </div>
                </div>

                {/* Información de Contacto Directo */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-4 rounded-xl shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">INFORMACIÓN DE CONTACTO PÚBLICO</span>
                  
                  {/* Teléfono público */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">TELÉFONO PÚBLICO</label>
                    <input 
                      type="text" 
                      value={contactoSeccion.telefono || ''}
                      onChange={(e) => handleContactoChange('telefono', e.target.value)}
                      onBlur={() => handleContactoBlur('telefono')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.telefono || contactoSubmitted) && contactoErrors.telefono
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.telefono || contactoSubmitted) && contactoErrors.telefono ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="744-123-4567"
                    />
                    {(contactoTouched.telefono || contactoSubmitted) && contactoErrors.telefono && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.telefono}
                      </p>
                    )}
                  </div>

                  {/* Correo de contacto */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">CORREO DE CONTACTO</label>
                    <input 
                      type="email" 
                      value={contactoSeccion.email || ''}
                      onChange={(e) => handleContactoChange('email', e.target.value)}
                      onBlur={() => handleContactoBlur('email')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.email || contactoSubmitted) && contactoErrors.email
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.email || contactoSubmitted) && contactoErrors.email ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="contacto@restaurante.com"
                    />
                    {(contactoTouched.email || contactoSubmitted) && contactoErrors.email && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.email}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">WHATSAPP (NÚMERO DIRECTO)</label>
                    <input 
                      type="text" 
                      value={contactoSeccion.whatsapp || ''}
                      onChange={(e) => handleContactoChange('whatsapp', e.target.value)}
                      onBlur={() => handleContactoBlur('whatsapp')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.whatsapp || contactoSubmitted) && contactoErrors.whatsapp
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.whatsapp || contactoSubmitted) && contactoErrors.whatsapp ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="744-123-4567 ó +52 744 123 4567"
                    />
                    {(contactoTouched.whatsapp || contactoSubmitted) && contactoErrors.whatsapp ? (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.whatsapp}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Compatible con la redirección directa a la API de WhatsApp de la Landing.
                      </p>
                    )}
                  </div>
                </div>

                {/* Redes Sociales */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-4 rounded-xl shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">REDES SOCIALES</span>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">INSTAGRAM</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.redesSociales?.instagram || '').length >= 255 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.redesSociales?.instagram || '').length}/255
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={255}
                      value={contactoSeccion.redesSociales?.instagram || ''}
                      onChange={(e) => handleContactoChange('redesSociales', e.target.value, 'instagram')}
                      onBlur={() => handleContactoBlur('redesSociales', 'instagram')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.instagram || contactoSubmitted) && contactoErrors.instagram
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.instagram || contactoSubmitted) && contactoErrors.instagram ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="@restaurante o https://instagram.com/..."
                    />
                    {(contactoTouched.instagram || contactoSubmitted) && contactoErrors.instagram && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.instagram}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">FACEBOOK</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.redesSociales?.facebook || '').length >= 255 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.redesSociales?.facebook || '').length}/255
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={255}
                      value={contactoSeccion.redesSociales?.facebook || ''}
                      onChange={(e) => handleContactoChange('redesSociales', e.target.value, 'facebook')}
                      onBlur={() => handleContactoBlur('redesSociales', 'facebook')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.facebook || contactoSubmitted) && contactoErrors.facebook
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.facebook || contactoSubmitted) && contactoErrors.facebook ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="Restaurante o https://facebook.com/..."
                    />
                    {(contactoTouched.facebook || contactoSubmitted) && contactoErrors.facebook && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.facebook}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TIKTOK</label>
                      <span className={`text-[10px] font-bold ${(contactoSeccion.redesSociales?.tiktok || '').length >= 255 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(contactoSeccion.redesSociales?.tiktok || '').length}/255
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={255}
                      value={contactoSeccion.redesSociales?.tiktok || ''}
                      onChange={(e) => handleContactoChange('redesSociales', e.target.value, 'tiktok')}
                      onBlur={() => handleContactoBlur('redesSociales', 'tiktok')}
                      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-all w-full bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                        (contactoTouched.tiktok || contactoSubmitted) && contactoErrors.tiktok
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (contactoTouched.tiktok || contactoSubmitted) && contactoErrors.tiktok ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="@restaurante o https://tiktok.com/@..."
                    />
                    {(contactoTouched.tiktok || contactoSubmitted) && contactoErrors.tiktok && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {contactoErrors.tiktok}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

        </div>

        {/* COLUMNA DERECHA: Nuestra Historia, Servicios Exclusivos, Delivery */}
        <div className="space-y-6 flex flex-col">
          
          {/* 1. Sección Nuestra Historia */}
          <form onSubmit={handleSaveHistoria} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <BookOpen size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>Sección Nuestra Historia</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('nosotros')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {/* Contenedor Nivel 2 — Datos principales de Historia (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">
                      Título de la Sección <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={historiaConfig.titulo}
                      onChange={(e) => {
                        const val = e.target.value
                        setHistoriaConfig(prev => ({ ...prev, titulo: val }))
                        if (historiaTouched.titulo || historiaSubmitted) {
                          runHistoriaValidation({ ...historiaConfig, titulo: val })
                        }
                      }}
                      onBlur={() => {
                        setHistoriaTouched(prev => ({ ...prev, titulo: true }))
                        runHistoriaValidation()
                      }}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] ${
                        (historiaTouched.titulo || historiaSubmitted) && historiaErrors.history_title ? '!border-red-500 ring-1 ring-red-500/20' : ''
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        border: (historiaTouched.titulo || historiaSubmitted) && historiaErrors.history_title ? '1px solid #ef4444' : '1px solid var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Título principal..."
                    />
                    {(historiaTouched.titulo || historiaSubmitted) && historiaErrors.history_title && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{historiaErrors.history_title}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">
                        Descripción <span className="text-red-500">*</span> (Máx 300 caracteres)
                      </label>
                      <span className={`text-[10px] font-bold ${
                        (historiaConfig.descripcion || '').length > 300 ? 'text-red-500 font-extrabold' : 'opacity-40'
                      }`}>
                        {(historiaConfig.descripcion || '').length}/300
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      value={historiaConfig.descripcion}
                      onChange={(e) => {
                        const val = e.target.value
                        setHistoriaConfig(prev => ({ ...prev, descripcion: val }))
                        if (historiaTouched.descripcion || historiaSubmitted) {
                          runHistoriaValidation({ ...historiaConfig, descripcion: val })
                        }
                      }}
                      onBlur={() => {
                        setHistoriaTouched(prev => ({ ...prev, descripcion: true }))
                        runHistoriaValidation()
                      }}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] ${
                        (historiaTouched.descripcion || historiaSubmitted) && historiaErrors.history_description ? '!border-red-500 ring-1 ring-red-500/20' : ''
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        border: (historiaTouched.descripcion || historiaSubmitted) && historiaErrors.history_description ? '1px solid #ef4444' : '1px solid var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Escribe la historia aquí..."
                    />
                    {(historiaTouched.descripcion || historiaSubmitted) && historiaErrors.history_description && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{historiaErrors.history_description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">
                        Año de Fundación <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        min={1900}
                        max={new Date().getFullYear()}
                        value={historiaConfig.anioFundacion ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                          setHistoriaConfig(prev => ({ ...prev, anioFundacion: val, anio: val }))
                          if (historiaTouched.anioFundacion || historiaSubmitted) {
                            runHistoriaValidation({ ...historiaConfig, anioFundacion: val, anio: val })
                          }
                        }}
                        onBlur={() => {
                          setHistoriaTouched(prev => ({ ...prev, anioFundacion: true }))
                          runHistoriaValidation()
                        }}
                        className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] ${
                          (historiaTouched.anioFundacion || historiaSubmitted) && historiaErrors.foundation_year ? '!border-red-500 ring-1 ring-red-500/20' : ''
                        }`}
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          border: (historiaTouched.anioFundacion || historiaSubmitted) && historiaErrors.foundation_year ? '1px solid #ef4444' : '1px solid var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                        placeholder="Ej. 2009"
                      />
                      {(historiaTouched.anioFundacion || historiaSubmitted) && historiaErrors.foundation_year && (
                        <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{historiaErrors.foundation_year}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">Fondo de Sección</label>
                      <button
                        type="button"
                        onClick={() => fontInputRef.current?.click()}
                        className="input-surface w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-all duration-200 cursor-pointer bg-white dark:bg-[var(--theme-surface)]"
                        style={{ 
                          backgroundColor: 'var(--theme-surface)', 
                          color: 'var(--theme-text)',
                          border: '1px solid var(--theme-border-subtle)',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {uploadingFondo ? 'Subiendo...' : historiaConfig.imagenFondo ? 'Cambiar imagen' : 'Subir imagen'}
                      </button>
                      <input 
                        ref={fontInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFondoUpload(e.target.files[0])}
                      />
                    </div>
                  </div>
                </div>

                {/* Características */}
                <div>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: 'var(--theme-text-muted)', 
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase'
                  }}>Características destacadas</p>

                  {/* Contenedor Nivel 2 (Tono 2 / Gris Opaco) */}
                  <div 
                    className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 shadow-xs" 
                    style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                  >
                    {historiaConfig.caracteristicas.map((c, idx) => {
                      const currentIconName = c.icono || c.icon || (idx === 0 ? 'Leaf' : idx === 1 ? 'ChefHat' : idx === 2 ? 'MapPin' : 'Star')
                      const SelectedIcon = Icons[currentIconName] || (idx === 0 ? Leaf : idx === 1 ? ChefHat : idx === 2 ? MapPin : Star)
                      const hasIconError = (featuresTouched[idx]?.icon || historiaSubmitted) && !!featuresErrors[idx]?.icon
                      const hasTitleError = (featuresTouched[idx]?.title || historiaSubmitted) && !!featuresErrors[idx]?.title
                      const hasDescError = (featuresTouched[idx]?.description || historiaSubmitted) && !!featuresErrors[idx]?.description

                      return (
                        <div 
                          key={idx} 
                          className="bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 mb-3 hover:shadow-sm transition-shadow shadow-xs"
                          style={{ 
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: (hasIconError || hasTitleError || hasDescError) ? '#ef4444' : 'var(--theme-border-subtle)',
                            marginBottom: idx === historiaConfig.caracteristicas.length - 1 ? 0 : '0.75rem' 
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Característica {idx + 1}
                            </span>
                            <span className={`text-[10px] ${((c.descripcion || c.description || '').length > 150) ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                              {(c.descripcion || c.description || '').length}/150 car.
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5 mb-2.5">
                            {/* Botón Selector de Ícono / Emoji (Nivel 4 / Tono 2) */}
                            <div 
                              className="relative shrink-0"
                              ref={el => historiaDropdownRefs.current[idx] = el}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveHistoriaDropdown(activeHistoriaDropdown === idx ? null : idx)
                                  handleFeatureBlur(idx, 'icon')
                                }}
                                className={`icon-picker-btn flex items-center gap-2 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-lg bg-theme-subcard-bg border transition-all ${
                                  hasIconError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
                                } ${activeHistoriaDropdown === idx ? 'is-active' : ''}`}
                                style={{ 
                                  backgroundColor: 'var(--theme-subcard-bg)', 
                                  borderColor: hasIconError ? '#ef4444' : 'var(--theme-border-subtle)', 
                                  color: 'var(--theme-text)' 
                                }}
                              >
                                <SelectedIcon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                                <span className="text-[11px] font-semibold">{currentIconName}</span>
                              </button>

                              {activeHistoriaDropdown === idx && (
                                <div 
                                  className={`absolute left-0 w-60 border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 scrollbar-none ${idx >= 2 ? 'bottom-full mb-1.5' : 'mt-1.5'}`} 
                                  style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border-subtle)' }}
                                >
                                  {ICON_OPTIONS.map((opt) => {
                                    const OptIcon = opt.icon
                                    const isSelected = currentIconName === opt.value
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          handleCaracteristicaChange(idx, 'icono', opt.value)
                                          handleCaracteristicaChange(idx, 'icon', opt.value)
                                          setActiveHistoriaDropdown(null)
                                        }}
                                        className="dropdown-opt w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 text-xs text-left cursor-pointer transition-all duration-150 rounded-lg"
                                        style={{ 
                                          background: isSelected ? 'var(--theme-primary)' : 'transparent', 
                                          color: isSelected ? 'var(--theme-primary-contrast, #ffffff)' : 'var(--theme-text)',
                                          fontWeight: isSelected ? '700' : '500'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-primary) 65%, transparent)'
                                            e.currentTarget.style.color = 'var(--theme-primary-contrast, #ffffff)'
                                            const svg = e.currentTarget.querySelector('svg')
                                            if (svg) svg.style.color = 'var(--theme-primary-contrast, #ffffff)'
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.background = 'transparent'
                                            e.currentTarget.style.color = 'var(--theme-text)'
                                            const svg = e.currentTarget.querySelector('svg')
                                            if (svg) svg.style.color = 'var(--theme-text-muted, rgba(128,128,128,0.75))'
                                          }
                                        }}
                                      >
                                        <OptIcon 
                                          className="w-4 h-4 shrink-0 transition-colors" 
                                          style={{ color: isSelected ? 'var(--theme-primary-contrast, #ffffff)' : 'var(--theme-text-muted, rgba(128,128,128,0.75))' }} 
                                        />
                                        <span className="truncate">{opt.label}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Input de Título (Nivel 4 / Tono 2) */}
                            <div className="flex-1">
                              <input
                                type="text"
                                value={c.titulo || c.title || ''}
                                onChange={(e) => handleCaracteristicaChange(idx, 'titulo', e.target.value)}
                                onBlur={() => handleFeatureBlur(idx, 'title')}
                                placeholder={`Título característica ${idx + 1}...`}
                                className={`input-subcard w-full bg-theme-subcard-bg border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-all shadow-2xs ${
                                  hasTitleError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
                                }`}
                                style={{
                                  backgroundColor: 'var(--theme-subcard-bg)',
                                  borderColor: hasTitleError ? '#ef4444' : 'var(--theme-border-subtle)',
                                  color: 'var(--theme-text)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Error de Icono o Titulo */}
                          {hasIconError && (
                            <p className="text-red-500 text-xs mb-1.5 font-medium animate-fadeIn">{featuresErrors[idx].icon}</p>
                          )}
                          {hasTitleError && (
                            <p className="text-red-500 text-xs mb-1.5 font-medium animate-fadeIn">{featuresErrors[idx].title}</p>
                          )}

                          {/* Textarea de Descripción (Nivel 4 / Tono 2) */}
                          <textarea
                            value={c.descripcion || c.description || ''}
                            onChange={(e) => handleCaracteristicaChange(idx, 'descripcion', e.target.value)}
                            onBlur={() => handleFeatureBlur(idx, 'description')}
                            placeholder={`Descripción característica ${idx + 1} (máx 150 caracteres)...`}
                            rows={2}
                            className={`input-subcard w-full bg-theme-subcard-bg border rounded-lg p-2.5 focus:outline-none transition-all text-xs font-medium resize-none shadow-2xs leading-relaxed ${
                              hasDescError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'
                            }`}
                            style={{
                              backgroundColor: 'var(--theme-subcard-bg)',
                              borderColor: hasDescError ? '#ef4444' : 'var(--theme-border-subtle)',
                              color: 'var(--theme-text)',
                              outline: 'none'
                            }}
                          />
                          {hasDescError && (
                            <p className="text-red-500 text-xs mt-1 font-medium animate-fadeIn">{featuresErrors[idx].description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar historia</span>
              </button>
            </div>
          </form>

          {/* 2. Servicios Exclusivos */}
          <form onSubmit={handleSaveServicios} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <Star size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>Servicios Exclusivos</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('servicios')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {serviciosConfig.map((servicio, idx) => {
                  const SelectedIconComponent = Icons[servicio.icono] || Star
                  return (
                    <div 
                      key={idx} 
                      className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4 space-y-3 relative shadow-xs" 
                      style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                    >
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700/60 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-primary)' }}>Característica {idx + 1}</span>
                        
                        <div 
                          className="relative"
                          ref={el => dropdownRefs.current[idx] = el}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveDropdown(activeDropdown === idx ? null : idx)}
                            className={`icon-picker-btn flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer input-surface bg-white dark:bg-[var(--theme-surface)] border ${
                              (serviciosTouched[idx]?.icono || serviciosSubmitted) && serviciosErrors[idx]?.icon
                                ? '!border-red-500 ring-1 ring-red-500/20'
                                : 'border-gray-300 dark:border-gray-600'
                            } rounded-lg shadow-xs ${activeDropdown === idx ? 'is-active' : ''}`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: (serviciosTouched[idx]?.icono || serviciosSubmitted) && serviciosErrors[idx]?.icon ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                          >
                            <SelectedIconComponent className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                            <span className="text-[10px] font-medium">{servicio.icono || servicio.icon || 'Seleccionar'}</span>
                          </button>

                          {activeDropdown === idx && (
                            <div 
                              className={`absolute right-0 w-60 border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 scrollbar-none ${idx >= 2 ? 'bottom-full mb-1.5' : 'mt-1.5'}`} 
                              style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border-subtle)' }}
                            >
                              {ICON_OPTIONS.map((opt) => {
                                const OptIcon = opt.icon
                                const isSelected = (servicio.icono || servicio.icon) === opt.value
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleServicioChange(idx, 'icono', opt.value)
                                      setActiveDropdown(null)
                                    }}
                                    className="dropdown-opt w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 text-xs text-left cursor-pointer transition-all duration-150 rounded-lg"
                                    style={{ 
                                      background: isSelected ? 'var(--theme-primary)' : 'transparent', 
                                      color: isSelected ? 'var(--theme-primary-contrast, #ffffff)' : 'var(--theme-text)',
                                      fontWeight: isSelected ? '700' : '500'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-primary) 65%, transparent)'
                                        e.currentTarget.style.color = 'var(--theme-primary-contrast, #ffffff)'
                                        const svg = e.currentTarget.querySelector('svg')
                                        if (svg) svg.style.color = 'var(--theme-primary-contrast, #ffffff)'
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = 'var(--theme-text)'
                                        const svg = e.currentTarget.querySelector('svg')
                                        if (svg) svg.style.color = 'var(--theme-text-muted, rgba(128,128,128,0.75))'
                                      }
                                    }}
                                  >
                                    <OptIcon 
                                      className="w-4 h-4 shrink-0 transition-colors" 
                                      style={{ color: isSelected ? 'var(--theme-primary-contrast, #ffffff)' : 'var(--theme-text-muted, rgba(128,128,128,0.75))' }} 
                                    />
                                    <span className="truncate">{opt.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {(serviciosTouched[idx]?.icono || serviciosSubmitted) && serviciosErrors[idx]?.icon && (
                        <p className="text-red-500 text-[11px] font-medium animate-fadeIn text-right">
                          {serviciosErrors[idx].icon}
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-semibold opacity-60 uppercase tracking-wider">Título (Máx 50 caracteres)</label>
                            <span className={`text-[9px] font-bold ${(servicio.titulo || servicio.title || '').length > 50 ? 'text-red-400' : 'opacity-40'}`}>
                              {(servicio.titulo || servicio.title || '').length}/50
                            </span>
                          </div>
                          <input
                            type="text"
                            value={servicio.titulo || servicio.title || ''}
                            maxLength={50}
                            onChange={(e) => handleServicioChange(idx, 'titulo', e.target.value)}
                            onBlur={() => handleServicioBlur(idx, 'titulo')}
                            className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                              (serviciosTouched[idx]?.titulo || serviciosSubmitted) && serviciosErrors[idx]?.title
                                ? '!border-red-500 ring-1 ring-red-500/20'
                                : 'border-gray-300 dark:border-gray-600'
                            } rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium shadow-xs mt-1`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: (serviciosTouched[idx]?.titulo || serviciosSubmitted) && serviciosErrors[idx]?.title ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                            placeholder="Título de la característica..."
                          />
                          {(serviciosTouched[idx]?.titulo || serviciosSubmitted) && serviciosErrors[idx]?.title && (
                            <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                              {serviciosErrors[idx].title}
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-semibold opacity-60 uppercase tracking-wider">Descripción (Máx 150 caracteres)</label>
                            <span className={`text-[9px] font-bold ${(servicio.descripcion || servicio.description || '').length >= 150 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                              {(servicio.descripcion || servicio.description || '').length}/150
                            </span>
                          </div>
                          <textarea
                            rows="2"
                            value={servicio.descripcion || servicio.description || ''}
                            maxLength={150}
                            onChange={(e) => handleServicioChange(idx, 'descripcion', e.target.value)}
                            onBlur={() => handleServicioBlur(idx, 'descripcion')}
                            className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                              (serviciosTouched[idx]?.descripcion || serviciosSubmitted) && serviciosErrors[idx]?.description
                                ? '!border-red-500 ring-1 ring-red-500/20'
                                : 'border-gray-300 dark:border-gray-600'
                            } rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all resize-none font-medium leading-relaxed shadow-xs mt-1`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: (serviciosTouched[idx]?.descripcion || serviciosSubmitted) && serviciosErrors[idx]?.description ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                            placeholder="Descripción de la característica..."
                          />
                          {(serviciosTouched[idx]?.descripcion || serviciosSubmitted) && serviciosErrors[idx]?.description && (
                            <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                              {serviciosErrors[idx].description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar servicios</span>
              </button>
            </div>
          </form>

          {/* 3. Sección Delivery */}
          <form onSubmit={handleSaveDeliverySeccion} className="rounded-2xl p-6 max-md:p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[var(--theme-surface)] border border-gray-200 dark:border-white/5 shadow-xs">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-white/5 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'rgba(var(--theme-primary-rgb, 124, 58, 237), 0.1)', borderColor: 'var(--theme-primary)' }}>
                    <Bike size={16} style={{ color: 'var(--theme-primary)' }} />
                  </div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--theme-text)' }}>🛵 Sección Delivery</h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPreview('delivery')}
                  className="flex items-center gap-1.5 uppercase transition-all cursor-pointer"
                  style={{ 
                    background: 'var(--theme-primary)',
                    color: 'var(--theme-primary-contrast, #fff)',
                    border: '1px solid var(--theme-primary)',
                    borderRadius: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Vista previa
                </button>
              </div>

              <div className="space-y-4 text-left">
                {/* Contenedor Nivel 2 — Textos de Delivery (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">SUBTÍTULO DE LA SECCIÓN</label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.labelSuperior || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.labelSuperior || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={100}
                      value={deliverySeccion.labelSuperior || ''}
                      onChange={(e) => handleDeliveryTextChange('labelSuperior', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('labelSuperior')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] border ${
                        (deliveryTouched.labelSuperior || deliverySubmitted) && deliveryErrors.labelSuperior
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (deliveryTouched.labelSuperior || deliverySubmitted) && deliveryErrors.labelSuperior ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Servicio a domicilio"
                    />
                    {(deliveryTouched.labelSuperior || deliverySubmitted) && deliveryErrors.labelSuperior && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.labelSuperior}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TÍTULO PRINCIPAL</label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.tituloPrincipal || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.tituloPrincipal || '').length}/100
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={100}
                      value={deliverySeccion.tituloPrincipal || ''}
                      onChange={(e) => handleDeliveryTextChange('tituloPrincipal', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('tituloPrincipal')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (deliveryTouched.tituloPrincipal || deliverySubmitted) && deliveryErrors.tituloPrincipal
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (deliveryTouched.tituloPrincipal || deliverySubmitted) && deliveryErrors.tituloPrincipal ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Llevamos la experiencia Aurum hasta tu hogar"
                    />
                    {(deliveryTouched.tituloPrincipal || deliverySubmitted) && deliveryErrors.tituloPrincipal && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.tituloPrincipal}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">DESCRIPCIÓN</label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.descripcion || '').length >= 250 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.descripcion || '').length}/250
                      </span>
                    </div>
                    <textarea 
                      rows="3"
                      maxLength={250}
                      value={deliverySeccion.descripcion || ''}
                      onChange={(e) => handleDeliveryTextChange('descripcion', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('descripcion')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full resize-none leading-relaxed font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (deliveryTouched.descripcion || deliverySubmitted) && deliveryErrors.descripcion
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (deliveryTouched.descripcion || deliverySubmitted) && deliveryErrors.descripcion ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Entrega a domicilio con nuestros repartidores propios..."
                    />
                    {(deliveryTouched.descripcion || deliverySubmitted) && deliveryErrors.descripcion && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contenedor Unificado: Imagen de la Sección y Descripción (Texto ALT) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-3.5 rounded-xl text-left shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider block opacity-70">
                    IMAGEN DE LA SECCIÓN (OPCIONAL)
                  </span>

                  {/* Subida de Imagen */}
                  <div 
                    className="flex items-center gap-4 p-3 rounded-lg border border-dashed bg-white dark:bg-[var(--theme-surface)] shadow-xs"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)' }}
                  >
                    <div 
                      className="w-24 h-20 rounded-lg overflow-hidden shrink-0 border relative flex items-center justify-center bg-theme-subcard-bg"
                      style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                    >
                      {deliverySeccion.imagen ? (
                        <>
                          <img 
                            src={deliverySeccion.imagen} 
                            alt={deliverySeccion.imagenDescripcion || 'Delivery'} 
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => setDeliverySeccion(prev => ({ ...prev, imagen: '', imagen_url: '' }))}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md cursor-pointer transition-all shadow"
                            title="Eliminar imagen"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 opacity-40">
                          <ImageIcon size={20} />
                          <span className="text-[9px] font-medium">Sin imagen</span>
                        </div>
                      )}
                      {uploadingDeliveryImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 justify-center text-left flex-1">
                      <p className="text-xs font-semibold opacity-80">Imagen de la sección Delivery</p>
                      <p className="text-[10px] font-medium opacity-50">JPG, PNG o WebP · Máx. 10MB</p>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => deliveryImageInputRef.current?.click()}
                          disabled={uploadingDeliveryImage}
                          className="input-surface bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 rounded-lg shadow-xs"
                          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                        >
                          <Upload size={12} />
                          <span>{deliverySeccion.imagen ? 'Cambiar imagen' : 'Subir imagen'}</span>
                        </button>
                      </div>
                      {deliveryImageError && (
                        <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                          {deliveryImageError}
                        </p>
                      )}
                    </div>
                    <input
                      ref={deliveryImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleDeliveryImageUpload(e.target.files[0])}
                    />
                  </div>

                  {/* Título sobre la Imagen */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-60">
                        TÍTULO SOBRE LA IMAGEN
                      </label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.imagenTitulo || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.imagenTitulo || '').length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      value={deliverySeccion.imagenTitulo || ''}
                      onChange={(e) => handleDeliveryTextChange('imagenTitulo', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('imagenTitulo')}
                      className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                        (deliveryTouched.imagenTitulo || deliverySubmitted) && deliveryErrors.imagenTitulo
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      } px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium rounded-lg shadow-xs mt-1`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched.imagenTitulo || deliverySubmitted) && deliveryErrors.imagenTitulo ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="Ej. PACO EXPERIENCIA"
                    />
                    {(deliveryTouched.imagenTitulo || deliverySubmitted) && deliveryErrors.imagenTitulo && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.imagenTitulo}
                      </p>
                    )}
                  </div>

                  {/* Descripción de la Imagen (Texto ALT) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-60">
                        DESCRIPCIÓN DE LA IMAGEN (TEXTO ALT)
                      </label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.imagenDescripcion || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.imagenDescripcion || '').length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      value={deliverySeccion.imagenDescripcion || ''}
                      onChange={(e) => handleDeliveryTextChange('imagenDescripcion', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('imagenDescripcion')}
                      className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                        (deliveryTouched.imagenDescripcion || deliverySubmitted) && deliveryErrors.imagenDescripcion
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      } px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium rounded-lg shadow-xs mt-1`}
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched.imagenDescripcion || deliverySubmitted) && deliveryErrors.imagenDescripcion ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                      placeholder="Ej. Repartidor entregando un pedido en motocicleta"
                    />
                    {(deliveryTouched.imagenDescripcion || deliverySubmitted) && deliveryErrors.imagenDescripcion && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.imagenDescripcion}
                      </p>
                    )}
                    {deliverySeccion.imagen && !(deliverySeccion.imagenDescripcion || '').trim() && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium animate-fadeIn">
                        <span>💡</span>
                        <span>Sugerencia SEO: Añade un texto descriptivo (ALT) para mejorar la accesibilidad y posicionamiento en buscadores.</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* BENEFICIOS (4 cards editables fijas) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">BENEFICIOS (4 CARDS FIJAS)</span>
                    <span className="text-[10px] font-bold opacity-50">4 / 4 Tarjetas</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deliverySeccion.beneficios.map((b, idx) => (
                      <div 
                        key={idx} 
                        className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 space-y-2.5 rounded-xl p-4 shadow-xs" 
                        style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--theme-primary)' }}>Beneficio {idx + 1}</span>
                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="block text-[9px] font-semibold opacity-60 uppercase tracking-wider">Título</label>
                            <span className={`text-[9px] font-bold ${(b.titulo || '').length >= 50 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                              {(b.titulo || '').length}/50
                            </span>
                          </div>
                          <input 
                            type="text"
                            maxLength={50}
                            value={b.titulo || ''}
                            placeholder={`Título beneficio ${idx + 1}...`}
                            onChange={(e) => handleDeliveryBeneficioChange(idx, 'titulo', e.target.value)}
                            onBlur={() => handleDeliveryBeneficioBlur(idx, 'titulo')}
                            className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                              (deliveryTouched[`beneficio_${idx}_titulo`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.titulo
                                ? '!border-red-500 ring-1 ring-red-500/20'
                                : 'border-gray-300 dark:border-gray-600'
                            } rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all shadow-xs mt-1`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched[`beneficio_${idx}_titulo`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.titulo ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                          />
                          {(deliveryTouched[`beneficio_${idx}_titulo`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.titulo && (
                            <p className="text-red-500 text-[10px] mt-1 animate-fadeIn font-medium">
                              {deliveryBeneficiosErrors[idx].titulo}
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="block text-[9px] font-semibold opacity-60 uppercase tracking-wider">Descripción</label>
                            <span className={`text-[9px] font-bold ${(b.descripcion || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                              {(b.descripcion || '').length}/100
                            </span>
                          </div>
                          <input 
                            type="text"
                            maxLength={100}
                            value={b.descripcion || ''}
                            placeholder={`Descripción beneficio ${idx + 1}...`}
                            onChange={(e) => handleDeliveryBeneficioChange(idx, 'descripcion', e.target.value)}
                            onBlur={() => handleDeliveryBeneficioBlur(idx, 'descripcion')}
                            className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                              (deliveryTouched[`beneficio_${idx}_descripcion`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.descripcion
                                ? '!border-red-500 ring-1 ring-red-500/20'
                                : 'border-gray-300 dark:border-gray-600'
                            } rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all shadow-xs mt-1`}
                            style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched[`beneficio_${idx}_descripcion`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.descripcion ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                          />
                          {(deliveryTouched[`beneficio_${idx}_descripcion`] || deliverySubmitted) && deliveryBeneficiosErrors[idx]?.descripcion && (
                            <p className="text-red-500 text-[10px] mt-1 animate-fadeIn font-medium">
                              {deliveryBeneficiosErrors[idx].descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PASOS "CÓMO ORDENAR" (3 pasos editables fijos) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">PASOS "CÓMO ORDENAR" (3 PASOS FIJOS)</span>
                    <span className="text-[10px] font-bold opacity-50">3 / 3 Pasos</span>
                  </div>
                  <div className="space-y-3">
                    {deliverySeccion.pasos.map((p, idx) => (
                      <div 
                        key={idx} 
                        className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 space-y-2.5 rounded-xl p-4 shadow-xs" 
                        style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--theme-primary)' }}>Paso {idx + 1}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <label className="block text-[9px] font-semibold opacity-60 uppercase tracking-wider">Título</label>
                              <span className={`text-[9px] font-bold ${(p.titulo || '').length >= 50 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                                {(p.titulo || '').length}/50
                              </span>
                            </div>
                            <input 
                              type="text"
                              maxLength={50}
                              value={p.titulo || ''}
                              placeholder={`Paso ${idx + 1} Título...`}
                              onChange={(e) => handleDeliveryPasoChange(idx, 'titulo', e.target.value)}
                              onBlur={() => handleDeliveryPasoBlur(idx, 'titulo')}
                              className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                                (deliveryTouched[`paso_${idx}_titulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.titulo
                                  ? '!border-red-500 ring-1 ring-red-500/20'
                                  : 'border-gray-300 dark:border-gray-600'
                              } rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all shadow-xs mt-1`}
                              style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched[`paso_${idx}_titulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.titulo ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                            />
                            {(deliveryTouched[`paso_${idx}_titulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.titulo && (
                              <p className="text-red-500 text-[10px] mt-1 animate-fadeIn font-medium">
                                {deliveryPasosErrors[idx].titulo}
                              </p>
                            )}
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <label className="block text-[9px] font-semibold opacity-60 uppercase tracking-wider">Subtítulo</label>
                              <span className={`text-[9px] font-bold ${(p.subtitulo || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                                {(p.subtitulo || '').length}/100
                              </span>
                            </div>
                            <input 
                              type="text"
                              maxLength={100}
                              value={p.subtitulo || ''}
                              placeholder={`Paso ${idx + 1} Subtítulo...`}
                              onChange={(e) => handleDeliveryPasoChange(idx, 'subtitulo', e.target.value)}
                              onBlur={() => handleDeliveryPasoBlur(idx, 'subtitulo')}
                              className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                                (deliveryTouched[`paso_${idx}_subtitulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.subtitulo
                                  ? '!border-red-500 ring-1 ring-red-500/20'
                                  : 'border-gray-300 dark:border-gray-600'
                              } rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all shadow-xs mt-1`}
                              style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched[`paso_${idx}_subtitulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.subtitulo ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                            />
                            {(deliveryTouched[`paso_${idx}_subtitulo`] || deliverySubmitted) && deliveryPasosErrors[idx]?.subtitulo && (
                              <p className="text-red-500 text-[10px] mt-1 animate-fadeIn font-medium">
                                {deliveryPasosErrors[idx].subtitulo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contenedor Nivel 2 — WhatsApp y Texto bajo el botón (Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">NÚMERO DE WHATSAPP PARA PEDIDOS</label>
                    <input 
                      type="text" 
                      value={deliverySeccion.numeroWhatsapp || ''}
                      onChange={(e) => handleDeliveryTextChange('numeroWhatsapp', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('numeroWhatsapp')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] border ${
                        (deliveryTouched.numeroWhatsapp || deliverySubmitted) && deliveryErrors.numeroWhatsapp
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (deliveryTouched.numeroWhatsapp || deliverySubmitted) && deliveryErrors.numeroWhatsapp ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="744-123-4567 ó +52 744 123 4567"
                    />
                    {(deliveryTouched.numeroWhatsapp || deliverySubmitted) && deliveryErrors.numeroWhatsapp ? (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.numeroWhatsapp}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Los caracteres no numéricos se filtrarán automáticamente al guardar (se requieren entre 10 y 15 dígitos).
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-60">TEXTO BAJO EL BOTÓN</label>
                      <span className={`text-[10px] font-bold ${(deliverySeccion.textoBoton || '').length >= 150 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                        {(deliverySeccion.textoBoton || '').length}/150
                      </span>
                    </div>
                    <input 
                      type="text" 
                      maxLength={150}
                      value={deliverySeccion.textoBoton || ''}
                      onChange={(e) => handleDeliveryTextChange('textoBoton', e.target.value)}
                      onBlur={() => handleDeliveryTextBlur('textoBoton')}
                      className={`input-surface px-4 py-3 text-sm focus:outline-none transition-all w-full font-medium bg-white dark:bg-[var(--theme-surface)] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border ${
                        (deliveryTouched.textoBoton || deliverySubmitted) && deliveryErrors.textoBoton
                          ? '!border-red-500 ring-1 ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ 
                        backgroundColor: 'var(--theme-surface)', 
                        color: 'var(--theme-text)',
                        borderColor: (deliveryTouched.textoBoton || deliverySubmitted) && deliveryErrors.textoBoton ? '#ef4444' : 'var(--theme-border-subtle)',
                        borderRadius: '0.5rem'
                      }}
                      placeholder="Tiempo estimado de entrega: 30–45 minutos..."
                    />
                    {(deliveryTouched.textoBoton || deliverySubmitted) && deliveryErrors.textoBoton && (
                      <p className="text-red-500 text-[11px] mt-1 animate-fadeIn font-medium">
                        {deliveryErrors.textoBoton}
                      </p>
                    )}
                  </div>
                </div>

                {/* GARANTÍAS (3 items editables fijos) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 p-4 space-y-3 rounded-xl shadow-xs" 
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: 'var(--theme-border-subtle)' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold opacity-80 block uppercase tracking-wider">TEXTO DE GARANTÍAS (3 ITEMS FIJOS)</span>
                    <span className="text-[10px] font-bold opacity-50">3 / 3 Garantías</span>
                  </div>
                  <div className="space-y-2.5">
                    {deliverySeccion.garantias.map((g, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-semibold opacity-60 uppercase tracking-wider">Garantía {idx + 1}</label>
                          <span className={`text-[9px] font-bold ${(g || '').length >= 100 ? 'text-amber-500 font-extrabold' : 'opacity-40'}`}>
                            {(g || '').length}/100
                          </span>
                        </div>
                        <input 
                          type="text" 
                          maxLength={100}
                          value={g || ''}
                          onChange={(e) => handleDeliveryGarantiaChange(idx, e.target.value)}
                          onBlur={() => handleDeliveryGarantiaBlur(idx)}
                          className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${
                            (deliveryTouched[`garantia_${idx}`] || deliverySubmitted) && deliveryGarantiasErrors[idx]
                              ? '!border-red-500 ring-1 ring-red-500/20'
                              : 'border-gray-300 dark:border-gray-600'
                          } px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all rounded-lg shadow-xs`}
                          style={{ backgroundColor: 'var(--theme-surface)', borderColor: (deliveryTouched[`garantia_${idx}`] || deliverySubmitted) && deliveryGarantiasErrors[idx] ? '#ef4444' : 'var(--theme-border-subtle)', color: 'var(--theme-text)' }}
                          placeholder={`Garantía ${idx + 1}...`}
                        />
                        {(deliveryTouched[`garantia_${idx}`] || deliverySubmitted) && deliveryGarantiasErrors[idx] && (
                          <p className="text-red-500 text-[10px] mt-1 animate-fadeIn font-medium">
                            {deliveryGarantiasErrors[idx]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
              <button type="submit" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition-all shadow-lg" style={{ background: 'var(--theme-primary)' }}>
                <Save size={16} />
                <span>Guardar cambios</span>
              </button>
            </div>
          </form>

        </div>

        {/* BOTÓN "VER PÁGINA PÚBLICA" CENTRADO ABAJO A ANCHO COMPLETO */}
        <div className="w-full flex justify-center pt-6">
          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 text-sm font-bold rounded-2xl px-10 py-4 transition-all shadow-xl cursor-pointer w-full sm:w-auto text-center border"
            style={{ color: 'var(--theme-primary-contrast, #ffffff)', background: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' }}
          >
            <span>Ver página pública del restaurante →</span>
          </a>
        </div>

      </div>

      {/* MODAL: Gestionar imágenes de portada */}
      {showBannerModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setShowBannerModal(false)}>
          <div className="rounded-3xl shadow-2xl shadow-black/60 w-full max-w-xl mx-4 animate-fadeInUp overflow-hidden"
               style={{ background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
               onClick={e => e.stopPropagation()}>

            <div 
              className="relative px-6 py-5 shrink-0 transition-colors border-t border-x border-b" 
              style={{ 
                backgroundColor: 'var(--theme-primary)', 
                borderColor: 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 text-white">
                    <ImageIcon size={18} className="text-white"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Imágenes de la portada</h3>
                    <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>
                      {totalSelected} de 6 imágenes • {6 - totalSelected} disponible{6 - totalSelected !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowBannerModal(false)}
                  className="w-8 h-8 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
                >
                  <X size={15}/>
                </button>
              </div>

              <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500"
                     style={{ width: `${(totalSelected / 6) * 100}%` }}/>
              </div>
            </div>

            <div className="p-6 border-x border-b border-theme-border-subtle rounded-b-3xl" style={{ borderColor: 'var(--theme-border-subtle)' }}>
              {totalSelected === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                    <ImageIcon size={28} className="opacity-20"/>
                  </div>
                  <p className="text-sm font-medium opacity-40">Sin imágenes seleccionadas</p>
                  <p className="text-xs opacity-20">Presiona "Subir imagen" para agregar fotos</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {bannerImages.map((url, i) => (
                    <div key={`saved-${i}`}
                         className="relative group aspect-video rounded-2xl overflow-hidden border border-white/8 hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-black/30">
                      <img src={url} alt={`Banner ${i}`}
                           className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                        <div className="flex justify-end">
                          <button type="button" onClick={() => removeBannerImage(url)}
                                  className="w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer">
                            <Trash2 size={12} className="text-white"/>
                          </button>
                        </div>
                        <p className="text-white/70 text-[10px] truncate leading-tight">Imagen guardada</p>
                      </div>
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-md backdrop-blur-sm flex items-center justify-center text-[10px] text-white font-bold border border-white/10" style={{ background: 'var(--theme-primary)' }}>
                        {i + 1}
                      </div>
                    </div>
                  ))}

                  {pendingFiles.map((item, i) => {
                    const idxOffset = bannerImages.length + i
                    return (
                      <div key={`pending-${i}`}
                           className="relative group aspect-video rounded-2xl overflow-hidden border border-white/8 hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-black/30">
                        <img src={item.preview} alt={item.name}
                             className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                          <div className="flex justify-end">
                            <button type="button" onClick={() => removePending(i)}
                                    className="w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer">
                              <Trash2 size={12} className="text-white"/>
                            </button>
                          </div>
                          <p className="text-white/70 text-[10px] truncate leading-tight">{item.name}</p>
                        </div>
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-md bg-yellow-500 text-black font-bold flex items-center justify-center text-[10px] border border-white/10">
                          {idxOffset + 1}
                        </div>
                      </div>
                    )
                  })}

                  {totalSelected < 6 && (
                    <button type="button"
                            onClick={() => bannerInputRef.current?.click()}
                            className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 transition-all duration-200 group cursor-pointer"
                            style={{ background: 'var(--theme-card)' }}>
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center transition-all duration-200">
                        <Plus size={16} className="opacity-40 group-hover:opacity-100 transition-colors"/>
                      </div>
                      <span className="text-[10px] opacity-40 group-hover:opacity-100 transition-colors">
                        Agregar
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex items-center justify-between border-t border-white/5 pt-4">
              <p className="text-xs opacity-40">
                {totalSelected === 6
                  ? '✓ Límite de imágenes alcanzado'
                  : `Puedes agregar ${6 - totalSelected} imagen${6 - totalSelected !== 1 ? 'es' : ''} más`}
              </p>
              <button type="button" onClick={() => setShowBannerModal(false)}
                      className="text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
                      style={{ background: 'var(--theme-primary)' }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÚNICO DE VISTA PREVIA CON ANCHOR */}
      {previewOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: '#1a1a1a',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.875rem' }}>
                Vista previa — Landing Page
              </span>
              {previewSection && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'var(--theme-primary, #C9A84C)',
                  fontFamily: 'monospace'
                }}>
                  #{previewSection}
                </span>
              )}
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              style={{
                background: 'transparent', border: 'none',
                color: '#fff', cursor: 'pointer',
                fontSize: '1.5rem', lineHeight: 1, padding: '0 0.5rem'
              }}
            >✕</button>
          </div>
          <iframe
            key={previewSection}
            src={`${window.location.origin}/#${previewSection || 'inicio'}`}
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
            title="Vista previa Landing Page"
            onLoad={(e) => {
              const scrollToTarget = (attempts = 0) => {
                if (!previewSection || attempts > 20) return
                try {
                  const doc = e.target.contentDocument || e.target.contentWindow?.document
                  const el = doc?.getElementById(previewSection)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  } else {
                    setTimeout(() => scrollToTarget(attempts + 1), 150)
                  }
                } catch {
                  // Fallback si no hay acceso por CORS
                }
              }
              scrollToTarget()
            }}
          />
        </div>,
        document.body
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}


