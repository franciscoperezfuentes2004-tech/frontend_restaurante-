import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { 
  Save, 
  AlertTriangle, 
  Store, 
  Clock, 
  Phone, 
  Compass, 
  ShieldCheck, 
  AlertCircle, 
  MapPin, 
  MessageSquare, 
  Mail, 
  AtSign,
  Lock,
  Palette,
  Image as ImageIcon,
  X,
  Building2,
  MapPinned,
  Plus,
  Loader2,
  Upload,
  Check,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  BookOpen,
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  Bell,
  BellOff,
  Link2,
  Key,
  Hash,
  Send
} from 'lucide-react'
import * as Icons from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Toast from '../../components/ui/Toast'
import TimePicker from '../../components/ui/TimePicker'
import Dropdown from '../../components/ui/Dropdown'
import { getConfiguracion, updateConfiguracion, uploadLogoConfiguracion, updateSettings, updateCredentials } from '../../api/settings'
import client from '../../api/client'
import { useTheme } from '../../context/ThemeContext'
import { Map, Marker, RadiusCircle } from '../../components/ui/map'
import circle from '@turf/circle'
import { 
  validateRestaurantSettings, 
  validateLogoFile,
  validatePaymentMethods,
  validateAdminCredentials,
  validateDeliveryZone
} from '../../validators/settingsValidator'
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']



// Componente de regla individual para contraseñas
const Rule = ({ met, label }) => {
  return (
    <div className="flex items-center gap-2 py-0.5 transition-all duration-300">
      <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
        {/* Icono X cuando no se cumple la regla */}
        <X 
          size={13} 
          strokeWidth={2.5}
          className={`absolute transition-all duration-300 text-red-500 ${met ? 'scale-50 opacity-0 rotate-45' : 'scale-100 opacity-100 rotate-0'}`}
        />
        {/* Icono Check cuando se cumple la regla */}
        <Check 
          size={13} 
          strokeWidth={2.5}
          className={`absolute transition-all duration-300 text-green-500 ${met ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-45'}`}
        />
      </div>
      <span 
        className={`text-xs font-bold transition-all duration-300 leading-tight block ${met ? 'translate-x-0.5 text-green-500' : 'translate-x-0 text-red-500'}`}
      >
        {label}
      </span>
    </div>
  )
}

const iconosDisponibles = [
  { value: 'Leaf',        label: '🌿 Ingredientes / Natural' },
  { value: 'ChefHat',     label: '👨‍🍳 Chef / Cocina' },
  { value: 'MapPin',      label: '📍 Ubicación' },
  { value: 'Star',        label: '⭐ Calidad' },
  { value: 'Heart',       label: '❤️ Pasión' },
  { value: 'Award',       label: '🏆 Premio' },
  { value: 'Clock',       label: '🕐 Experiencia / Tiempo' },
  { value: 'Flame',       label: '🔥 Fuego / Cocina' },
  { value: 'Wine',        label: '🍷 Bebidas / Vinos' },
  { value: 'Utensils',    label: '🍴 Cubiertos / Vajilla' },
  { value: 'Globe',       label: '🌍 Internacional' },
  { value: 'Users',       label: '👥 Equipo / Personal' },
  { value: 'Sparkles',    label: '✨ Especialidad / Magia' },
  { value: 'Shield',      label: '🛡️ Garantía / Calidad' },
  { value: 'Truck',       label: '🚚 Delivery / Envío' },
  { value: 'Coffee',      label: '☕ Café / Desayuno' },
  { value: 'Pizza',       label: '🍕 Pizza / Italiana' },
  { value: 'Cake',        label: '🍰 Postres / Dulces' },
  { value: 'Compass',     label: '🧭 Tradición / Exploración' },
  { value: 'Music',       label: '🎵 Música / Ambiente' },
  { value: 'GlassWater',  label: '🥛 Bebidas / Agua' },
  { value: 'Store',       label: '🏪 Establecimiento / Tienda' },
  { value: 'Calendar',    label: '📅 Eventos / Reserva' },
  { value: 'ShoppingBag', label: '🛍️ Para Llevar / Tienda' },
  { value: 'Percent',     label: '🏷️ Descuentos / Promociones' },
  { value: 'MapPinned',   label: '🗺️ Cobertura / Zonas' },
  { value: 'BookOpen',    label: '📖 Historia / Menú' },
  { value: 'BadgeCheck',  label: '🎖️ Recomendación / Aprobado' }
]

const IconoPreview = ({ nombre }) => {
  const Icon = Icons[nombre]
  const { colorPrimario } = useTheme()
  return Icon ? <Icon className="w-4 h-4" style={{ color: colorPrimario }} /> : null
}

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const { bgCard, bgInput, bgSubcard, borderSubtle, cardShadow, textColor, textMuted, textSubtle, colorPrimario, primaryBtnText, updateTheme, isLight, setRestaurantName, setLogoUrl, logoUrl } = useTheme()

  // Section 1 State: Info
  const [restName, setRestName] = useState('')
  const [restLogo, setRestLogo] = useState('')
  const [previewLogo, setPreviewLogo] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef()
  const [bgColorTheme, setBgColorTheme] = useState('dark')
  const [bgColor, setBgColor] = useState('#1C1917')
  const [brandColor, setBrandColor] = useState('#7c3aed')
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4')
  const [useSecondary, setUseSecondary] = useState(false)
  const [activeDelivery, setActiveDelivery] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [freeDeliveryOver, setFreeDeliveryOver] = useState('0')
  const [logoError, setLogoError] = useState('')
  const [infoSubmitted, setInfoSubmitted] = useState(false)
  const [infoTouched, setInfoTouched] = useState({
    business_name: false,
    primary_color: false,
    fixed_delivery_fee: false,
    free_delivery_threshold: false
  })

  // Section 2 State: Schedule (7 days)
  const [schedule, setSchedule] = useState(
    DAYS.map(day => ({
      day,
      active: day !== 'Lunes',
      open: '13:00',
      close: '23:00'
    }))
  )

  // Section 3 State: Contact
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [tiktok, setTiktok] = useState('')

  // Section 4 State: Delivery Radius & Coverage
  const [postalCode, setPostalCode] = useState('')
  const [streetName, setStreetName] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [estado, setEstado] = useState('')
  const [deliveryRadius, setDeliveryRadius] = useState(3000)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapCenter, setMapCenter] = useState([19.4326, -99.1332])
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Location Map Modal (Mapcn MapLibre GL JS)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [pinCoords, setPinCoords] = useState(null)
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [isSearchingCoords, setIsSearchingCoords] = useState(false)

  useEffect(() => {
    if (latitude && longitude) {
      setPinCoords({ lng: parseFloat(longitude), lat: parseFloat(latitude) })
    }
  }, [latitude, longitude])

  // GeoJSON del Círculo de Cobertura de Entrega (Turf)
  const radioEnKilometros = deliveryRadius / 1000
  const defaultGeoJSON = { type: 'FeatureCollection', features: [] }
  const radiusGeoJSON = (pinCoords && pinCoords.lng && pinCoords.lat)
    ? circle([pinCoords.lng, pinCoords.lat], Math.max(radioEnKilometros, 0.1), { steps: 64, units: 'kilometers' })
    : defaultGeoJSON



  // Section 5 State: Admin Credentials
  const [adminEmail, setAdminEmail] = useState('admin@restaurante.com')
  const [adminPhone, setAdminPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [adminTouched, setAdminTouched] = useState({
    email: false,
    phone: false,
    password: false,
    confirmPassword: false
  })
  const [adminSubmitted, setAdminSubmitted] = useState(false)

  // Section 4 State: Delivery Zone Form Touched & Submitted
  const [deliveryTouched, setDeliveryTouched] = useState({
    city: false,
    municipality: false,
    state: false,
    street: false,
    postalCode: false
  })
  const [deliverySubmitted, setDeliverySubmitted] = useState(false)

  // Section 6 State: Métodos de Pago
  const [pagoEfectivo, setPagoEfectivo] = useState(true)
  const [pagoTarjeta, setPagoTarjeta] = useState(true)
  const [pagoTransferencia, setPagoTransferencia] = useState(false)
  const [transferenciaBanco, setTransferenciaBanco] = useState('')
  const [transferenciaClabe, setTransferenciaClabe] = useState('')
  const [transferenciaTitular, setTransferenciaTitular] = useState('')
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false)

  // Section 7 State: Integraciones de Notificaciones Multi-Canal (Discord / Telegram)
  const [notificationPlatform, setNotificationPlatform] = useState('none')
  const [discordReservationsWebhook, setDiscordReservationsWebhook] = useState('')
  const [discordSystemAlertsWebhook, setDiscordSystemAlertsWebhook] = useState('')
  const [discordInventoryWebhook, setDiscordInventoryWebhook] = useState('')
  const [discordCashCutsWebhook, setDiscordCashCutsWebhook] = useState('')
  const [discordGeneralAdminWebhook, setDiscordGeneralAdminWebhook] = useState('')
  const [discordDailyFinancialWebhook, setDiscordDailyFinancialWebhook] = useState('')

  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramReservationsChatId, setTelegramReservationsChatId] = useState('')
  const [telegramSystemAlertsChatId, setTelegramSystemAlertsChatId] = useState('')
  const [telegramInventoryChatId, setTelegramInventoryChatId] = useState('')
  const [telegramCashCutsChatId, setTelegramCashCutsChatId] = useState('')
  const [telegramGeneralAdminChatId, setTelegramGeneralAdminChatId] = useState('')
  const [telegramDailyFinancialChatId, setTelegramDailyFinancialChatId] = useState('')
  const [savingNotifications, setSavingNotifications] = useState(false)

  // Validaciones calculadas en tiempo real
  const validations = {
    hasLetter:     /[a-z]/.test(newPassword),
    hasUppercase:  /[A-Z]/.test(newPassword),
    hasNumber:     /[0-9]/.test(newPassword),
    hasSymbol:     /[^a-zA-Z0-9\s]/.test(newPassword),
    noSpaces:      newPassword.length > 0 && !/\s/.test(newPassword),
    minLength:     newPassword.length >= 8,
  }
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword)
  const allValid = Object.values(validations).every(Boolean)
  const allSevenRulesMet = allValid && passwordsMatch

  // Validaciones dinámicas para Credenciales Administrativas
  const getAdminEmailError = (email) => {
    const trimmed = (email || '').trim().toLowerCase()
    if (!trimmed) {
      return 'Ingresa un correo electrónico válido.'
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(trimmed)) {
      return 'Ingresa un correo electrónico válido.'
    }
    return ''
  }

  const getAdminPhoneError = (phone) => {
    const digits = String(phone || '').replace(/[^0-9]/g, '')
    if (digits.length !== 10) {
      return 'El teléfono debe contener exactamente 10 números.'
    }
    return ''
  }

  // Validaciones dinámicas para Zona de Entrega
  const getDeliveryTextError = (val) => {
    const trimmed = (val || '').trim()
    if (trimmed.length < 2) {
      return 'Este campo es obligatorio y requiere mínimo 2 letras.'
    }
    return ''
  }

  const getDeliveryZipError = (val) => {
    const digits = String(val || '').replace(/[^0-9]/g, '')
    if (digits.length !== 5) {
      return 'El código postal debe ser de 5 dígitos.'
    }
    return ''
  }

  // Validaciones para Información del Restaurante (Configuración General)
  const getBusinessNameError = (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) {
      return 'El nombre del negocio es obligatorio.'
    }
    if (trimmed.length < 2) {
      return 'El nombre debe tener al menos 2 caracteres.'
    }
    return ''
  }

  const getPrimaryColorError = (color) => {
    const val = (color || '').trim()
    if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
      return 'Ingresa un código HEX válido (ej. #0e33c8).'
    }
    return ''
  }

  const getDeliveryFeeError = (fee, active) => {
    if (!active) return ''
    const str = fee !== undefined && fee !== null ? String(fee).trim() : ''
    if (!str) {
      return 'Este campo es obligatorio si el delivery está activo.'
    }
    const num = Number(str)
    if (isNaN(num) || num < 0) {
      return 'El costo no puede ser negativo.'
    }
    return ''
  }

  const getFreeDeliveryThresholdError = (threshold, active) => {
    if (!active) return ''
    const str = threshold !== undefined && threshold !== null ? String(threshold).trim() : ''
    if (!str) {
      return 'Este campo es obligatorio si el delivery está activo.'
    }
    const num = Number(str)
    if (isNaN(num) || num < 0) {
      return 'El costo no puede ser negativo.'
    }
    return ''
  }

  const businessNameError = (infoTouched.business_name || infoSubmitted) ? getBusinessNameError(restName) : ''
  const primaryColorError = (infoTouched.primary_color || infoSubmitted) ? getPrimaryColorError(brandColor) : ''
  const deliveryFeeError = (activeDelivery && (infoTouched.fixed_delivery_fee || infoSubmitted)) ? getDeliveryFeeError(deliveryFee, activeDelivery) : ''
  const freeDeliveryThresholdError = (activeDelivery && (infoTouched.free_delivery_threshold || infoSubmitted)) ? getFreeDeliveryThresholdError(freeDeliveryOver, activeDelivery) : ''

  const handleDecimalKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return
    }

    if (e.key === '-' || e.key === '+' || e.key.toLowerCase() === 'e') {
      e.preventDefault()
      return
    }

    if (e.key === '.') {
      if (e.currentTarget.value.includes('.')) {
        e.preventDefault()
      }
      return
    }

    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const sanitizeDecimalInput = (val) => {
    let cleaned = String(val).replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    return cleaned
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getConfiguracion()
      const d = res.data || {}
      
      const loadedName = d.restaurant_name ?? d.nombre ?? d.name ?? ''
      setRestName(loadedName)
      const loadedFee = d.delivery_fee ?? d.costo_envio_fijo ?? d.deliveryFee ?? 0
      const loadedFree = d.free_delivery_over ?? d.envio_gratis_desde ?? d.freeDeliveryOver ?? 0
      const loadedPrimario = d.brand_color ?? d.color_primario ?? d.colorPrimario ?? '#7c3aed'
      const loadedLogo = d.logo_url ?? d.logotipo ?? d.logo ?? ''

      // Cargar Métodos de Pago desde respuesta real de la API
      const mp = d.metodos_pago || d.payment_methods || {}
      setPagoEfectivo(d.acepta_efectivo !== undefined ? Boolean(d.acepta_efectivo) : (d.aceptaEfectivo !== undefined ? Boolean(d.aceptaEfectivo) : (mp.efectivo !== undefined ? Boolean(mp.efectivo) : (d.pago_efectivo !== undefined ? Boolean(d.pago_efectivo) : true))))
      setPagoTarjeta(d.acepta_tarjeta !== undefined ? Boolean(d.acepta_tarjeta) : (d.aceptaTarjeta !== undefined ? Boolean(d.aceptaTarjeta) : (mp.tarjeta !== undefined ? Boolean(mp.tarjeta) : (d.pago_tarjeta !== undefined ? Boolean(d.pago_tarjeta) : true))))
      setPagoTransferencia(d.acepta_transferencia !== undefined ? Boolean(d.acepta_transferencia) : (d.aceptaTransferencia !== undefined ? Boolean(d.aceptaTransferencia) : (mp.transferencia !== undefined ? Boolean(mp.transferencia) : (d.pago_transferencia !== undefined ? Boolean(d.pago_transferencia) : false))))
      setTransferenciaBanco(d.banco_nombre ?? d.bancoNombre ?? mp.transferencia_banco ?? d.transferencia_banco ?? d.bank_name ?? '')
      setTransferenciaClabe(d.banco_clabe ?? d.bancoClabe ?? mp.transferencia_clabe ?? d.transferencia_clabe ?? d.bank_clabe ?? '')
      setTransferenciaTitular(d.banco_titular ?? d.bancoTitular ?? mp.transferencia_titular ?? d.transferencia_titular ?? d.bank_account_holder ?? '')

      setSettings({
        ...d,
        restaurant_name: loadedName,
        brand_color: loadedPrimario,
        delivery_fee: loadedFee,
        free_delivery_over: loadedFree,
        logo_url: loadedLogo
      })
      
      setRestLogo(loadedLogo)
      setPreviewLogo(loadedLogo || null)
      setRestaurantName(loadedName || 'Restaurante')
      if (loadedLogo) setLogoUrl(loadedLogo)
      
      const loadedFondo = d.fondo_sistema ?? d.fondoSistema ?? d.color_fondo ?? '#1C1917'
      const loadedApoyo = d.color_apoyo ?? d.colorApoyo ?? d.secondary_color ?? ''
      
      setBgColor(loadedFondo)
      if (loadedFondo.toLowerCase() === '#e9eaf2' || loadedFondo.toLowerCase() === '#e9ecf2' || loadedFondo.toLowerCase() === '#e6eaf0' || loadedFondo.toLowerCase() === '#d8dde6' || loadedFondo.toLowerCase() === '#d4dfec' || loadedFondo.toLowerCase() === '#cad5e2' || loadedFondo.toLowerCase() === '#dee5ee' || loadedFondo.toLowerCase() === '#e3e9f1' || loadedFondo.toLowerCase() === '#e9eef5' || loadedFondo.toLowerCase() === '#e6e6e9' || loadedFondo.toLowerCase() === '#ededf0' || loadedFondo.toLowerCase() === '#f4f4f6' || loadedFondo.toLowerCase() === '#eaeaea' || loadedFondo.toLowerCase() === '#f5f5f5' || loadedFondo.toLowerCase() === '#f0f4f8' || loadedFondo.toLowerCase() === '#eef2f7' || loadedFondo.toLowerCase() === '#ffffff' || isLight) {
        setBgColorTheme('light')
      } else {
        setBgColorTheme('dark')
      }

      setBrandColor(loadedPrimario)
      setSecondaryColor(loadedApoyo || '#06b6d4')
      setUseSecondary(Boolean(loadedApoyo))
      
      setActiveDelivery(Boolean(d.activar_delivery ?? d.active_delivery ?? true))
      setDeliveryFee(loadedFee.toString())
      setFreeDeliveryOver(loadedFree.toString())

      // Aplicar tema en tiempo real via ThemeProvider
      updateTheme(loadedFondo, loadedPrimario, loadedApoyo)
      
      if (d.schedule && Array.isArray(d.schedule)) {
        const loaded = d.schedule
        const full = DAYS.map(day => {
          const found = loaded.find(s => s.day === day)
          return found ? {
            day: found.day,
            active: !!(found.active ?? found.is_active ?? true),
            open: found.open ?? '13:00',
            close: found.close ?? '23:00'
          } : { day, active: true, open: '13:00', close: '23:00' }
        })
        setSchedule(full)
      }
      
      setPhone(d.phone ?? '')
      setAddress(d.address ?? '')
      setFacebook(d.facebook ?? '')
      setInstagram(d.instagram ?? '')
      setWhatsapp(d.whatsapp ?? '')
      setEmail(d.email ?? '')
      setTiktok(d.tiktok ?? '')
      
      setAdminEmail(d.email ?? d.admin_email ?? 'admin@restaurante.com')
      setAdminPhone(d.phone ?? d.admin_phone ?? '')
      setPostalCode(d.postal_code ?? d.postalCode ?? '')
      setStreetName(d.street_name ?? d.streetName ?? '')
      const cityStateVal = typeof (d.city_state ?? d.cityState) === 'string' ? (d.city_state ?? d.cityState) : ''
      const parts = cityStateVal.split(',')
      setCiudad(parts[0]?.trim() ?? '')
      setMunicipio(d.municipio ?? '')
      setEstado(parts[1]?.trim() ?? '')
      const loadedRadius = d.delivery_radius_meters ?? d.deliveryRadiusMeters ?? d.delivery_radius ?? 3000
      setDeliveryRadius(Number(loadedRadius) || 3000)

      const loadedLat = d.latitude ?? d.lat ?? null
      const loadedLng = d.longitude ?? d.lng ?? d.lon ?? null
      setLatitude(loadedLat !== null ? parseFloat(loadedLat) : null)
      setLongitude(loadedLng !== null ? parseFloat(loadedLng) : null)
      if (loadedLat && loadedLng) {
        const lat = parseFloat(loadedLat)
        const lng = parseFloat(loadedLng)
        if (!isNaN(lat) && !isNaN(lng)) {
          setPinCoords({ lng, lat })
        }
      }

      // Cargar Integraciones de Notificaciones Multi-Canal (Discord / Telegram)
      const loadedPlatform = d.active_notification_platform ?? d.activeNotificationPlatform ?? 'none'
      setNotificationPlatform(loadedPlatform)

      let ds = d.discord_settings ?? d.discordSettings ?? {}
      if (typeof ds === 'string') {
        try { ds = JSON.parse(ds) } catch (e) { ds = {} }
      }
      setDiscordReservationsWebhook(String(ds?.reservations ?? ds?.reservations_webhook_url ?? ''))
      setDiscordSystemAlertsWebhook(String(ds?.system_alerts ?? ''))
      setDiscordInventoryWebhook(String(ds?.inventory ?? ''))
      setDiscordCashCutsWebhook(String(ds?.cash_cuts ?? ''))
      setDiscordGeneralAdminWebhook(String(ds?.general_admin ?? ''))
      setDiscordDailyFinancialWebhook(String(ds?.daily_financial_report ?? ''))

      let ts = d.telegram_settings ?? d.telegramSettings ?? {}
      if (typeof ts === 'string') {
        try { ts = JSON.parse(ts) } catch (e) { ts = {} }
      }
      setTelegramBotToken(String(ts?.bot_token ?? ts?.botToken ?? d.telegram_bot_token ?? ''))
      setTelegramReservationsChatId(String(ts?.reservations ?? ts?.reservations_chat_id ?? ''))
      setTelegramSystemAlertsChatId(String(ts?.system_alerts ?? ''))
      setTelegramInventoryChatId(String(ts?.inventory ?? ''))
      setTelegramCashCutsChatId(String(ts?.cash_cuts ?? ''))
      setTelegramGeneralAdminChatId(String(ts?.general_admin ?? ''))
      setTelegramDailyFinancialChatId(String(ts?.daily_financial_report ?? ''))
    } catch (err) {
      console.error('Settings error:', err)
      setError('No se pudo cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Subida del logotipo conectada a POST /api/admin/configuracion/logotipo
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validación del lado del cliente antes de subir
    const validation = validateLogoFile(file)
    if (!validation.isValid) {
      setLogoError(validation.error)
      if (logoInputRef.current) logoInputRef.current.value = ''
      return
    }
    setLogoError('')

    // Preview inmediata
    const previewUrl = URL.createObjectURL(file)
    setLogoUrl(previewUrl) // actualiza sidebar en tiempo real
    setPreviewLogo(previewUrl)

    try {
      setUploadingLogo(true)
      const res = await uploadLogoConfiguracion(file)
      const url = res.data?.logo_url || res.data?.url || res.data?.logotipo || res.url
      setLogoUrl(url)
      setRestLogo(url)
      if (url) {
        setPreviewLogo(url)
        setToast({ message: 'Logotipo subido correctamente', type: 'success' })
      }
    } catch (err) {
      console.error('Error subiendo logo:', err)
      const serverErrors = err?.response?.data?.errors
      let errorMsg = 'Error al subir el logotipo'
      if (serverErrors) {
        const firstField = Object.keys(serverErrors)[0]
        if (firstField && Array.isArray(serverErrors[firstField]) && serverErrors[firstField][0]) {
          errorMsg = serverErrors[firstField][0]
        }
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setLogoError(errorMsg)
      setToast({ message: errorMsg, type: 'error' })
      if (logoInputRef.current) logoInputRef.current.value = ''
    } finally {
      setUploadingLogo(false)
    }
  }

  // Guardar información conectado a PUT /api/admin/configuracion
  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setInfoSubmitted(true)

    const trimmedName = (restName || '').trim()
    const trimmedColor = (brandColor || '').trim()

    const validation = validateRestaurantSettings({
      business_name: trimmedName,
      primary_color: trimmedColor,
      active_delivery: Boolean(activeDelivery),
      fixed_delivery_fee: deliveryFee,
      free_delivery_threshold: freeDeliveryOver
    })

    if (!validation.isValid) {
      setToast({ 
        message: validation.firstError || 'Corrige los errores antes de continuar', 
        type: 'error' 
      })
      return
    }

    try {
      const currentName = trimmedName
      const currentBrand = trimmedColor || '#7c3aed'
      const currentFee = parseFloat(deliveryFee) || 0
      const currentFree = parseFloat(freeDeliveryOver) || 0

      await updateSettings({
        restaurant_name: currentName,
        brand_color: currentBrand,
        delivery_fee: currentFee,
        free_delivery_over: currentFree,
      })

      await updateConfiguracion({
        fondo_sistema: bgColor,
        color_fondo: bgColor,
        color_primario: currentBrand,
        color_apoyo: useSecondary ? secondaryColor : null,
        secondary_color: useSecondary ? secondaryColor : null,
        activar_delivery: activeDelivery ? 1 : 0,
      })

      updateTheme(bgColor, currentBrand, useSecondary ? secondaryColor : '#06b6d4')
      setRestaurantName(currentName)
      setRestName(currentName)

      setToast({ message: 'Configuración guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar la configuración', type: 'error' })
    }
  }

  const handleSaveSchedule = async (e) => {
    e.preventDefault()
    try {
      const apiSchedule = schedule.map(s => ({
        day: s.day,
        active: s.active ? 1 : 0,
        is_active: s.active ? 1 : 0,
        open: s.open,
        close: s.close
      }))

      await Promise.all([
        updateSettings({ schedule: apiSchedule }),
        updateConfiguracion({ schedule: apiSchedule })
      ])

      setToast({ message: 'Horarios guardados correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar los horarios', type: 'error' })
    }
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    try {
      await updateSettings({
        phone,
        address,
        facebook,
        instagram,
        whatsapp,
        email,
        tiktok
      })
      setToast({ message: 'Datos de contacto guardados correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar los datos de contacto', type: 'error' })
    }
  }



  const geocodeAddressAndOpenMap = async () => {
    setIsGeocoding(true)
    const addressParts = [streetName, municipio, ciudad, estado, postalCode, 'Mexico'].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    if (fullAddress && (!pinCoords || (pinCoords.lng === -99.133209 && pinCoords.lat === 19.432608))) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=mx`)
        const data = await res.json()
        if (data && data.length > 0) {
          setPinCoords({ lng: parseFloat(data[0].lon), lat: parseFloat(data[0].lat) })
        }
      } catch (error) {
        console.error('Error obteniendo ubicación para radio de entrega:', error)
      } finally {
        setIsGeocoding(false)
        setIsMapModalOpen(true)
      }
    } else {
      setIsGeocoding(false)
      setIsMapModalOpen(true)
    }
  }


  const generateMapView = async () => {
    setIsSearchingCoords(true)
    const addressParts = [streetName, municipio, ciudad, estado, postalCode, 'Mexico'].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=mx`)
      const data = await response.json()
      if (data && data.length > 0) {
        const lon = parseFloat(data[0].lon)
        const lat = parseFloat(data[0].lat)
        if (!isNaN(lon) && !isNaN(lat)) {
          setPinCoords({ lng: lon, lat: lat })
        }
      }
    } catch (err) {
      console.error('Error al geocodificar ubicación inicial:', err)
    } finally {
      setIsSearchingCoords(false)
      setIsLocationModalOpen(true)
    }
  }

  const handleDigitsOnlyKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleToggleEfectivo = () => {
    if (pagoEfectivo && !pagoTarjeta && !pagoTransferencia) {
      setToast({ message: 'Debe mantener al menos un método de pago activo.', type: 'error' })
      return
    }
    setPagoEfectivo(!pagoEfectivo)
  }

  const handleToggleTarjeta = () => {
    if (pagoTarjeta && !pagoEfectivo && !pagoTransferencia) {
      setToast({ message: 'Debe mantener al menos un método de pago activo.', type: 'error' })
      return
    }
    setPagoTarjeta(!pagoTarjeta)
  }

  const handleToggleTransferencia = () => {
    if (pagoTransferencia && !pagoEfectivo && !pagoTarjeta) {
      setToast({ message: 'Debe mantener al menos un método de pago activo.', type: 'error' })
      return
    }
    setPagoTransferencia(!pagoTransferencia)
  }

  const handleSaveDelivery = async (e) => {
    e.preventDefault()
    setDeliverySubmitted(true)

    const validationResult = validateDeliveryZone({
      city: ciudad,
      municipality: municipio,
      state: estado,
      street: streetName,
      zip_code: postalCode
    })

    if (!validationResult.isValid) {
      const firstError = Object.values(validationResult.errors)[0] || 'Por favor completa todos los campos requeridos correctamente.'
      setToast({ message: firstError, type: 'error' })
      return
    }

    try {
      const combinedCityState = ciudad && estado ? `${ciudad.trim()}, ${estado.trim()}` : (ciudad.trim() || estado.trim())
      const res = await updateSettings({
        postal_code: postalCode.trim(),
        street_name: streetName.trim(),
        city_state: combinedCityState,
        municipio: municipio.trim(),
        delivery_radius_meters: deliveryRadius,
        delivery_radius_km: deliveryRadius / 1000,
        latitude: pinCoords?.lat ?? null,
        longitude: pinCoords?.lng ?? null,
      })
      if (res.data?.latitude && res.data?.longitude) {
        setPinCoords({
          lat: parseFloat(res.data.latitude),
          lng: parseFloat(res.data.longitude)
        })
      }
      setToast({ message: 'Zona de entrega guardada correctamente', type: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Error al guardar zona de entrega', type: 'error' })
    }
  }

  const handleAddNeighborhood = (name) => {
    const trimmed = name.trim()
    if (trimmed && !coverageNeighborhoods.includes(trimmed)) {
      setCoverageNeighborhoods([...coverageNeighborhoods, trimmed])
    }
    setNeighborhoodSearch('')
  }

  const handleRemoveNeighborhood = (name) => {
    setCoverageNeighborhoods(coverageNeighborhoods.filter(n => n !== name))
  }

  const handleNeighborhoodKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (neighborhoodSearch.trim()) {
        handleAddNeighborhood(neighborhoodSearch)
      }
    }
  }

  const handleSaveCredentials = async (e) => {
    e.preventDefault()
    setAdminSubmitted(true)

    const emailErr = getAdminEmailError(adminEmail)
    if (emailErr) {
      setToast({ message: emailErr, type: 'error' })
      return
    }

    const phoneErr = getAdminPhoneError(adminPhone)
    if (phoneErr) {
      setToast({ message: phoneErr, type: 'error' })
      return
    }

    if (!allSevenRulesMet) {
      setToast({ message: 'Por favor cumple con los 7 requisitos de la contraseña.', type: 'error' })
      return
    }

    try {
      const payload = {
        email: adminEmail.trim().toLowerCase(),
        phone: adminPhone.replace(/[^0-9]/g, ''),
        password: newPassword,
        password_confirmation: confirmPassword
      }

      await updateCredentials(payload)
      window.dispatchEvent(new Event('credentials-updated'))
      setToast({ message: 'Credenciales actualizadas correctamente', type: 'success' })
      setNewPassword('')
      setConfirmPassword('')
      setAdminSubmitted(false)
      setAdminTouched({ email: false, phone: false, password: false, confirmPassword: false })
    } catch (err) {
      console.error(err)
      setToast({ message: err?.response?.data?.message || 'Error al actualizar credenciales', type: 'error' })
    }
  }

  const handleSavePaymentMethods = async (e) => {
    e?.preventDefault?.()
    if (!pagoEfectivo && !pagoTarjeta && !pagoTransferencia) {
      setToast({ message: 'Debe mantener al menos un método de pago activo.', type: 'error' })
      return
    }
    setSavingPaymentMethods(true)
    try {
      const payload = {
        ...settings,
        acepta_efectivo: Boolean(pagoEfectivo),
        aceptaEfectivo: Boolean(pagoEfectivo),
        acepta_tarjeta: Boolean(pagoTarjeta),
        aceptaTarjeta: Boolean(pagoTarjeta),
        acepta_transferencia: Boolean(pagoTransferencia),
        aceptaTransferencia: Boolean(pagoTransferencia),
        banco_nombre: transferenciaBanco || '',
        bancoNombre: transferenciaBanco || '',
        banco_clabe: transferenciaClabe || '',
        bancoClabe: transferenciaClabe || '',
        banco_titular: transferenciaTitular || '',
        bancoTitular: transferenciaTitular || '',
        metodos_pago: {
          efectivo: Boolean(pagoEfectivo),
          tarjeta: Boolean(pagoTarjeta),
          transferencia: Boolean(pagoTransferencia),
          transferencia_banco: transferenciaBanco || '',
          transferencia_clabe: transferenciaClabe || '',
          transferencia_titular: transferenciaTitular || ''
        },
        pago_efectivo: Boolean(pagoEfectivo),
        pago_tarjeta: Boolean(pagoTarjeta),
        pago_transferencia: Boolean(pagoTransferencia),
        transferencia_banco: transferenciaBanco || '',
        transferencia_clabe: transferenciaClabe || '',
        transferencia_titular: transferenciaTitular || ''
      }

      // Guardar en la base de datos a través de PUT /admin/settings
      await updateSettings(payload)
      setSettings(prev => ({ ...prev, ...payload }))
      setToast({ message: 'Métodos de pago actualizados', type: 'success' })
    } catch (err) {
      console.error('Error guardando métodos de pago:', err)
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al guardar métodos de pago en el servidor'
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setSavingPaymentMethods(false)
    }
  }

  const handleSaveNotifications = async (e) => {
    e?.preventDefault?.()
    setSavingNotifications(true)
    try {
      const payload = {
        ...settings,
        active_notification_platform: notificationPlatform,
        activeNotificationPlatform: notificationPlatform,
        discord_settings: {
          reservations: discordReservationsWebhook.trim(),
          system_alerts: discordSystemAlertsWebhook.trim(),
          inventory: discordInventoryWebhook.trim(),
          cash_cuts: discordCashCutsWebhook.trim(),
          general_admin: discordGeneralAdminWebhook.trim(),
          daily_financial_report: discordDailyFinancialWebhook.trim(),
        },
        discordSettings: {
          reservations: discordReservationsWebhook.trim(),
          system_alerts: discordSystemAlertsWebhook.trim(),
          inventory: discordInventoryWebhook.trim(),
          cash_cuts: discordCashCutsWebhook.trim(),
          general_admin: discordGeneralAdminWebhook.trim(),
          daily_financial_report: discordDailyFinancialWebhook.trim(),
        },
        telegram_settings: {
          bot_token: telegramBotToken.trim(),
          reservations: telegramReservationsChatId.trim(),
          system_alerts: telegramSystemAlertsChatId.trim(),
          inventory: telegramInventoryChatId.trim(),
          cash_cuts: telegramCashCutsChatId.trim(),
          general_admin: telegramGeneralAdminChatId.trim(),
          daily_financial_report: telegramDailyFinancialChatId.trim(),
        },
        telegramSettings: {
          bot_token: telegramBotToken.trim(),
          reservations: telegramReservationsChatId.trim(),
          system_alerts: telegramSystemAlertsChatId.trim(),
          inventory: telegramInventoryChatId.trim(),
          cash_cuts: telegramCashCutsChatId.trim(),
          general_admin: telegramGeneralAdminChatId.trim(),
          daily_financial_report: telegramDailyFinancialChatId.trim(),
        },
      }

      await updateSettings(payload)
      setSettings(prev => ({ ...prev, ...payload }))
      setToast({ message: 'Integraciones de notificaciones actualizadas correctamente', type: 'success' })
    } catch (err) {
      console.error('Error guardando configuración de notificaciones:', err)
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al guardar configuración de notificaciones'
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleDayToggle = (index) => {
    setSchedule(schedule.map((item, idx) => 
      idx === index ? { ...item, active: !item.active } : item
    ))
  }

  const handleTimeChange = (index, field, value) => {
    setSchedule(schedule.map((item, idx) => 
      idx === index ? { ...item, [field]: value } : item
    ))
  }

  const renderScheduleRows = () => {
    try {
      return (
        <div 
          className="bg-[#D8DDE6] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5 max-md:!bg-transparent max-md:!border-transparent max-md:!p-0"
          style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
        >
          {schedule.map((item, index) => {
            return (
              <div 
                key={item.day} 
                className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 max-md:px-3 max-md:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 shadow-xs ${
                  !item.active ? 'opacity-40' : ''
                }`}
                style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', borderColor: isLight ? '#cbd5e1' : 'var(--theme-border-subtle)' }}
              >
                <div className="flex items-center gap-3 w-40">
                  <button 
                    type="button"
                    onClick={() => handleDayToggle(index)} 
                    className="relative w-9 h-5 rounded-full transition-all duration-300 shrink-0 cursor-pointer"
                    style={{ backgroundColor: item.active ? colorPrimario : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'), border: item.active ? undefined : `1px solid ${borderSubtle}` }}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${item.active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>

                  <span className="font-bold text-xs sm:text-sm" style={{ color: textColor || 'var(--theme-text)' }}>{item.day}</span>
                </div>

                <div className="flex items-center gap-2.5 max-md:grid max-md:grid-cols-1 max-md:gap-3 max-md:w-full max-md:mt-2">
                  <div className="flex items-center gap-2 max-md:w-full">
                    <span className="text-xs font-semibold w-6 shrink-0" style={{ color: textSubtle || 'var(--theme-text-muted)' }}>De:</span>
                    <div className="flex-1 min-w-0">
                      <TimePicker
                        disabled={!item.active}
                        value={item.open}
                        onChange={(value) => handleTimeChange(index, 'open', value)}
                        fullWidth
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 max-md:w-full">
                    <span className="text-xs font-semibold w-6 shrink-0" style={{ color: textSubtle || 'var(--theme-text-muted)' }}>A:</span>
                    <div className="flex-1 min-w-0">
                      <TimePicker
                        disabled={!item.active}
                        value={item.close}
                        onChange={(value) => handleTimeChange(index, 'close', value)}
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    } catch (err) {
      console.error("Error rendering schedule:", err)
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-red-400 text-sm font-semibold">Error al cargar o mostrar los horarios de atención</p>
        </div>
      )
    }
  }

  if (loading || settings === null) {
    return (
      <div className="space-y-6 pb-12 animate-fadeIn p-2 font-sans">
        <PageHeader 
          title="Configuración" 
          description="Ajusta los detalles operativos, datos de contacto, zonas de entrega y seguridad."
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="animate-shimmer rounded-2xl h-96 w-full" />
          <div className="animate-shimmer rounded-2xl h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-xl mx-auto mt-12 bg-theme-surface border border-theme-border-subtle rounded-2xl">
        <div className="text-4xl">⚠️</div>
        <p className="text-theme-text-muted">{error}</p>
        <button 
          onClick={fetchData} 
          className="bg-brand-600 hover:bg-brand-700 text-theme-text px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn p-4 md:p-6 lg:p-8 font-sans max-md:p-3 max-md:space-y-4">
      <PageHeader 
        title="Configuración" 
        description="Ajusta los detalles operativos, datos de contacto, zonas de entrega y seguridad."
      />

      {/* Grid: 2 Columns on XL desktop (Left: Info + Credentials | Right: Hours + Delivery), 1 Column on Tablet/Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-6 max-md:gap-4">
        
        {/* Left Column: Info + Credentials (Col span 6 on XL, 1 Col on Tablet/Mobile) */}
        <div className="flex flex-col space-y-6 max-md:space-y-4">
          
          {/* 1. Información comercial */}
          <form 
            onSubmit={handleSaveInfo} 
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
          >
            <div className="space-y-6 flex-1 max-md:space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <Store size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight" style={{ color: textColor }}>Información del restaurante</h3>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Configura la identidad del negocio y parámetros comerciales</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* 1.0 Nombre y Logotipo (Contenedor Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Nombre del Negocio <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={restName}
                      onChange={(e) => {
                        setRestName(e.target.value)
                        setInfoTouched(prev => ({ ...prev, business_name: true }))
                      }}
                      onBlur={() => {
                        setRestName(prev => prev.trim())
                        setInfoTouched(prev => ({ ...prev, business_name: true }))
                      }}
                      style={{ 
                        backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', 
                        borderColor: businessNameError ? '#ef4444' : (isLight ? '#cbd5e1' : borderSubtle),
                        color: textColor 
                      }}
                      className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${businessNameError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-brand-500/30 focus:border-brand-500/50'} rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-medium shadow-xs`}
                      placeholder="Nombre del restaurante"
                    />
                    {businessNameError && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{businessNameError}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden relative shrink-0 bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 shadow-xs" 
                      style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', borderColor: isLight ? '#cbd5e1' : borderSubtle }}
                    >
                      {logoUrl || previewLogo || restLogo ? (
                        <img src={logoUrl || previewLogo || restLogo} alt="Logo" className="w-16 h-16 object-contain rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white dark:bg-[var(--theme-surface)] flex items-center justify-center text-theme-text-muted text-xs font-semibold">
                          Sin logo
                        </div>
                      )}
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-theme-text animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        ref={logoInputRef} 
                        onChange={handleLogoChange} 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', borderColor: isLight ? '#cbd5e1' : borderSubtle, color: textColor }}
                        className="input-surface bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Upload size={14} style={{ color: colorPrimario }} />
                        <span>{uploadingLogo ? 'Subiendo...' : 'Cambiar logotipo'}</span>
                      </button>
                      <p className="text-[11px] leading-relaxed" style={{ color: textSubtle }}>
                        Formato PNG, JPG o WEBP (máx. 10MB). Se mostrará en la navegación pública y encabezados.
                      </p>
                      {logoError && (
                        <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{logoError}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 1.1 Identidad Visual (Contenedor Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: textMuted }}>
                    <Palette size={14} style={{ color: colorPrimario }} />
                    <span className="text-xs font-bold uppercase tracking-wider">Identidad Visual & Color</span>
                  </div>
                  
                  {/* Sección de colores: Fondo del sistema (izq) | Color primario (der) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                    
                    {/* 1. Fondo del sistema (Columna Izquierda - Tono 1) */}
                    <div 
                      className="bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-xs" 
                      style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', borderColor: isLight ? '#cbd5e1' : borderSubtle }}
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: textMuted }}>
                          Fondo del sistema
                        </label>

                        {/* Selección de Modo: Claro arriba / Oscuro abajo */}
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBgColorTheme('light')
                              setBgColor('#E9EAF2')
                            }}
                            style={{ 
                              backgroundColor: bgColorTheme === 'light' ? `${brandColor || colorPrimario}15` : (isLight ? '#FFFFFF' : 'var(--theme-subcard-bg)'), 
                              borderColor: bgColorTheme === 'light' ? (brandColor || colorPrimario) : (isLight ? '#cbd5e1' : borderSubtle), 
                              boxShadow: bgColorTheme === 'light' ? `0 0 0 2px ${brandColor || colorPrimario}30` : undefined,
                              color: textColor 
                            }}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
                          >
                            <span className="w-3 h-3 rounded-full bg-white border border-slate-400 shrink-0 shadow-xs" />
                            <span>Claro</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setBgColorTheme('dark')
                              setBgColor('#1C1917')
                            }}
                            style={{ 
                              backgroundColor: bgColorTheme === 'dark' ? `${brandColor || colorPrimario}15` : (isLight ? '#FFFFFF' : 'var(--theme-subcard-bg)'), 
                              borderColor: bgColorTheme === 'dark' ? (brandColor || colorPrimario) : (isLight ? '#cbd5e1' : borderSubtle), 
                              boxShadow: bgColorTheme === 'dark' ? `0 0 0 2px ${brandColor || colorPrimario}30` : undefined,
                              color: textColor 
                            }}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
                          >
                            <span className="w-3 h-3 rounded-full bg-[#1C1917] border border-slate-700 shrink-0 shadow-xs" />
                            <span>Oscuro</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Color primario del sistema (Columna Derecha - Tono 1) */}
                    <div 
                      className="bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-xs" 
                      style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', borderColor: isLight ? '#cbd5e1' : borderSubtle }}
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>
                          Color primario del sistema <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] leading-tight mb-3" style={{ color: textSubtle }}>
                          Se usa en botones, detalles y destacados
                        </p>
                      </div>

                      {/* Input HEX de Color primario */}
                      <div>
                        <div 
                          className={`input-subcard bg-slate-100 dark:bg-white/5 border ${primaryColorError ? 'border-red-500/60 focus-within:border-red-500' : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus-within:border-brand-500/50'} flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-200 shadow-xs`}
                        >
                          <div 
                            onClick={() => document.getElementById('primary-color-input')?.click()}
                            className="relative shrink-0 cursor-pointer"
                          >
                            <div 
                              className="w-8 h-8 rounded-lg border-2 border-white/20 shadow-lg transition-transform hover:scale-105"
                              style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#7c3aed' }}
                            />
                            <input
                              id="primary-color-input"
                              type="color"
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              value={/^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#7c3aed'}
                              onChange={e => {
                                setBrandColor(e.target.value)
                                setInfoTouched(prev => ({ ...prev, primary_color: true }))
                              }}
                            />
                          </div>
                          <input
                            type="text"
                            value={brandColor || ''}
                            onChange={e => {
                              setBrandColor(e.target.value)
                              setInfoTouched(prev => ({ ...prev, primary_color: true }))
                            }}
                            onBlur={() => setInfoTouched(prev => ({ ...prev, primary_color: true }))}
                            style={{ color: textColor }}
                            className="bg-transparent text-xs font-mono flex-1 focus:outline-none"
                            placeholder="#7c3aed"
                          />
                        </div>
                        {primaryColorError && (
                          <p className="text-red-500 text-xs mt-1.5 animate-fadeIn font-medium">{primaryColorError}</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 1.3 Costo de Envío (Contenedor Tono 2) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2" style={{ color: textMuted }}>
                      <Compass size={14} style={{ color: colorPrimario }} />
                      <span className="text-xs font-bold uppercase tracking-wider">Tarifas de Envío (Delivery)</span>
                    </div>

                    {/* Toggle Activar delivery */}
                    <button
                      type="button"
                      onClick={() => setActiveDelivery(!activeDelivery)}
                      className="flex items-center gap-2 group cursor-pointer"
                    >
                      <span className="text-xs transition-colors" style={{ color: textSubtle }}>
                        {activeDelivery ? 'Activo' : 'Inactivo'}
                      </span>
                      <div 
                        className={`relative w-9 h-5 rounded-full transition-all duration-300 ${activeDelivery ? '' : 'bg-white/10'}`}
                        style={activeDelivery ? { backgroundColor: colorPrimario } : undefined}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${activeDelivery ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Costo de Envío Fijo ($) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        disabled={!activeDelivery}
                        value={deliveryFee}
                        onKeyDown={handleDecimalKeyDown}
                        onChange={(e) => {
                          const val = sanitizeDecimalInput(e.target.value)
                          setDeliveryFee(val)
                          setSettings(prev => ({ ...prev, delivery_fee: val }))
                          setInfoTouched(prev => ({ ...prev, fixed_delivery_fee: true }))
                        }}
                        onBlur={() => setInfoTouched(prev => ({ ...prev, fixed_delivery_fee: true }))}
                        style={{ 
                          backgroundColor: !activeDelivery ? undefined : (isLight ? '#FFFFFF' : 'var(--theme-surface)'), 
                          borderColor: deliveryFeeError ? '#ef4444' : (isLight ? '#cbd5e1' : borderSubtle),
                          color: textColor 
                        }}
                        className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${deliveryFeeError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-brand-500/30 focus:border-brand-500/50'} rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-white/5 shadow-xs`}
                        placeholder="0.00"
                      />
                      {deliveryFeeError && (
                        <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{deliveryFeeError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Envío Gratis Desde ($) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        disabled={!activeDelivery}
                        value={freeDeliveryOver}
                        onKeyDown={handleDecimalKeyDown}
                        onChange={(e) => {
                          const val = sanitizeDecimalInput(e.target.value)
                          setFreeDeliveryOver(val)
                          setSettings(prev => ({ ...prev, free_delivery_over: val }))
                          setInfoTouched(prev => ({ ...prev, free_delivery_threshold: true }))
                        }}
                        onBlur={() => setInfoTouched(prev => ({ ...prev, free_delivery_threshold: true }))}
                        style={{ 
                          backgroundColor: !activeDelivery ? undefined : (isLight ? '#FFFFFF' : 'var(--theme-surface)'), 
                          borderColor: freeDeliveryThresholdError ? '#ef4444' : (isLight ? '#cbd5e1' : borderSubtle),
                          color: textColor 
                        }}
                        className={`input-surface w-full bg-white dark:bg-[var(--theme-surface)] border ${freeDeliveryThresholdError ? '!border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-brand-500/30 focus:border-brand-500/50'} rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-white/5 shadow-xs`}
                        placeholder="Monto mínimo (Ej: 50.00)"
                      />
                      {freeDeliveryThresholdError && (
                        <p className="text-red-500 text-xs mt-1 animate-fadeIn font-medium">{freeDeliveryThresholdError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 shrink-0">
              <button 
                type="submit" 
                className="flex items-center gap-2 hover:opacity-95 shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all"
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
              >
                <Save size={16} style={{ color: primaryBtnText }} />
                <span style={{ color: primaryBtnText }}>{uploadingLogo ? 'Guardando...' : 'Guardar cambios'}</span>
              </button>
            </div>
          </form>

          {/* 2. Métodos de Pago */}
          <form
            onSubmit={handleSavePaymentMethods}
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
          >
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <CreditCard size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: textColor }}>Métodos de pago</h2>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Habilita los métodos de pago aceptados en el punto de venta</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. Efectivo (Switch) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-xs transition-all"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs">
                      <Banknote size={18} style={{ color: colorPrimario }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: textColor }}>Efectivo</span>
                      <span className="text-[11px] font-medium" style={{ color: textMuted }}>Aceptar pagos en efectivo al cobrar la cuenta</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleEfectivo}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: pagoEfectivo ? colorPrimario : 'rgba(128,128,128,0.25)' }}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pagoEfectivo ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* 2. Tarjeta / Terminal (Switch) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-xs transition-all"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs">
                      <CreditCard size={18} style={{ color: colorPrimario }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: textColor }}>Tarjeta bancaria (Terminal)</span>
                      <span className="text-[11px] font-medium" style={{ color: textMuted }}>Aceptar cobro con tarjeta de débito o crédito</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleTarjeta}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: pagoTarjeta ? colorPrimario : 'rgba(128,128,128,0.25)' }}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pagoTarjeta ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* 3. Transferencia Bancaria (Switch) */}
                <div 
                  className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between shadow-xs transition-all"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs">
                      <Landmark size={18} style={{ color: colorPrimario }} />
                    </div>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: textColor }}>Transferencia Bancaria (SPEI)</span>
                      <span className="text-[11px] font-medium" style={{ color: textMuted }}>Aceptar pagos por transferencia electrónica</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleTransferencia}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: pagoTransferencia ? colorPrimario : 'rgba(128,128,128,0.25)' }}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pagoTransferencia ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Sub-contenedor condicional de Transferencia Bancaria (Nivel 2) */}
                {pagoTransferencia && (
                  <div 
                    className="bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 shadow-xs animate-fadeIn text-left"
                    style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                  >
                    <div className="flex items-center gap-2 pb-1 border-b border-black/5 dark:border-white/5">
                      <Landmark size={15} style={{ color: colorPrimario }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>
                        Datos de la cuenta bancaria para transferencias
                      </span>
                    </div>

                    {/* Banco */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70" style={{ color: textColor }}>
                        Banco
                      </label>
                      <input 
                        type="text"
                        value={transferenciaBanco}
                        onChange={(e) => setTransferenciaBanco(e.target.value)}
                        placeholder="Ej. BBVA, Santander, Banorte, Nu..."
                        className="input-surface w-full bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium shadow-xs"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: textColor }}
                      />
                    </div>

                    {/* CLABE Interbancaria */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70" style={{ color: textColor }}>
                        CLABE Interbancaria (18 dígitos)
                      </label>
                      <input 
                        type="text"
                        maxLength={18}
                        value={transferenciaClabe}
                        onChange={(e) => setTransferenciaClabe(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="012180001234567890"
                        className="input-surface w-full bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium shadow-xs tracking-wider"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: textColor }}
                      />
                    </div>

                    {/* Nombre del Titular */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-70" style={{ color: textColor }}>
                        Nombre del Titular o Beneficiario
                      </label>
                      <input 
                        type="text"
                        value={transferenciaTitular}
                        onChange={(e) => setTransferenciaTitular(e.target.value)}
                        placeholder="Ej. Restaurante S.A. de C.V. o Juan Pérez"
                        className="input-surface w-full bg-white dark:bg-[var(--theme-surface)] border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all font-medium shadow-xs"
                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border-subtle)', color: textColor }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 shrink-0">
              <button 
                type="submit" 
                onClick={handleSavePaymentMethods}
                disabled={savingPaymentMethods}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="flex items-center gap-2 hover:opacity-95 shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPaymentMethods ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ color: primaryBtnText }} />
                    <span style={{ color: primaryBtnText }}>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} style={{ color: primaryBtnText }} />
                    <span style={{ color: primaryBtnText }}>Guardar métodos de pago</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 3. Credenciales Administrativas */}
          <form
            onSubmit={handleSaveCredentials}
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
          >
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <ShieldCheck size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: textColor }}>Credenciales administrativas</h2>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Actualiza tu correo y contraseña de acceso al sistema</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Warning Banner styled */}
                <div 
                  className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-xs" 
                  style={{ 
                    backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.12)', 
                    border: `1px solid ${isLight ? '#F59E0B' : 'rgba(245, 158, 11, 0.35)'}` 
                  }}
                >
                  <AlertTriangle className="text-amber-700 dark:text-amber-400 shrink-0" size={18} strokeWidth={2.2} />
                  <span 
                    className="text-xs font-bold tracking-wide"
                    style={{ 
                      color: isLight ? '#000000' : '#FCD34D'
                    }}
                  >
                    Cambiar tus credenciales cerrará tu sesión actual
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Correo del Administrador <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="email" 
                        required
                        placeholder="correo@ejemplo.com"
                        maxLength={80}
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value.toLowerCase())
                          setAdminTouched(prev => ({ ...prev, email: true }))
                        }}
                        onBlur={(e) => {
                          setAdminEmail(e.target.value.trim().toLowerCase())
                          setAdminTouched(prev => ({ ...prev, email: true }))
                        }}
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (adminTouched.email || adminSubmitted) && getAdminEmailError(adminEmail)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all font-medium shadow-xs`}
                      />
                    </div>
                    {(adminTouched.email || adminSubmitted) && getAdminEmailError(adminEmail) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getAdminEmailError(adminEmail)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Teléfono del Administrador <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="tel" 
                        required
                        maxLength={10}
                        value={adminPhone}
                        onKeyDown={handleDigitsOnlyKeyDown}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                          setAdminPhone(cleaned)
                          setAdminTouched(prev => ({ ...prev, phone: true }))
                        }}
                        onBlur={() => setAdminTouched(prev => ({ ...prev, phone: true }))}
                        placeholder="Ej. 7440000000"
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (adminTouched.phone || adminSubmitted) && getAdminPhoneError(adminPhone)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all font-medium shadow-xs`}
                      />
                    </div>
                    {(adminTouched.phone || adminSubmitted) && getAdminPhoneError(adminPhone) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getAdminPhoneError(adminPhone)}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Nueva contraseña */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: textMuted }}>
                        Nueva contraseña <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => {
                            setNewPassword(e.target.value)
                            setAdminTouched(prev => ({ ...prev, password: true }))
                          }}
                          placeholder="Nueva contraseña"
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-all font-medium shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Reglas de validación */}
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                        <Rule met={validations.hasLetter}    label="Al menos una letra minúscula"/>
                        <Rule met={validations.hasUppercase} label="Al menos una letra mayúscula"/>
                        <Rule met={validations.hasNumber}    label="Al menos un número"/>
                        <Rule met={validations.hasSymbol}    label="Al menos un símbolo"/>
                        <Rule met={validations.noSpaces}     label="Sin espacios"/>
                        <Rule met={validations.minLength}    label="Mínimo 8 caracteres"/>
                      </div>
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: textMuted }}>
                        Confirmar contraseña <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => {
                            setConfirmPassword(e.target.value)
                            setAdminTouched(prev => ({ ...prev, confirmPassword: true }))
                          }}
                          placeholder="Confirmar contraseña"
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-all font-medium shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Validación de coincidencia */}
                      <div className="mt-2.5 px-1">
                        <Rule
                          met={passwordsMatch}
                          label="Las contraseñas coinciden"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 shrink-0">
              <button 
                type="submit" 
                disabled={!allSevenRulesMet || Boolean(getAdminEmailError(adminEmail)) || Boolean(getAdminPhoneError(adminPhone))}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer shadow-md hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={16} style={{ color: primaryBtnText }} />
                <span style={{ color: primaryBtnText }}>Guardar cambios</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Operating Hours & Delivery Zone (Col span 6 on XL, 1 Col on Tablet/Mobile) */}
        <div className="flex flex-col space-y-6">
          
          {/* 3. Horarios de Atención */}
          <form
            onSubmit={handleSaveSchedule}
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
          >
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <Clock size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: textColor }}>Horarios de atención</h2>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Gestiona los rangos de operación comercial semanal</p>
                </div>
              </div>

              <div className="space-y-2">
                {renderScheduleRows()}
              </div>

              {/* Nota informativa de horarios de atención (Tono 2 / Gris Opaco) */}
              <div 
                className="flex items-start gap-3 p-4 rounded-xl mt-4 bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 shadow-xs"
                style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: colorPrimario }} />
                <div className="space-y-1 text-xs leading-relaxed font-medium" style={{ color: textMuted }}>
                  <span className="font-bold block" style={{ color: textColor }}>Nota de operación comercial:</span>
                  <p>Define las horas de apertura y cierre para cada día de la semana. Fuera de los rangos establecidos o en los días marcados como inactivos, la plataforma suspenderá automáticamente la recepción de nuevos pedidos y reservas.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 shrink-0">
              <button
                type="submit"
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="flex items-center gap-2 hover:opacity-95 shadow-md rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all"
              >
                <Save size={16} style={{ color: primaryBtnText }} />
                <span style={{ color: primaryBtnText }}>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 4. Zona de Entrega */}
          <form
            onSubmit={handleSaveDelivery}
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <Compass size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: textColor }}>Zona de entrega</h2>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Configura las ubicaciones y áreas de cobertura del restaurante</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Fila 1: Ciudad (100% / w-full) */}
                <div className="w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      value={ciudad}
                      onChange={(e) => {
                        setCiudad(e.target.value)
                        setDeliveryTouched(prev => ({ ...prev, city: true }))
                      }}
                      onBlur={(e) => {
                        setCiudad(e.target.value.trim())
                        setDeliveryTouched(prev => ({ ...prev, city: true }))
                      }}
                      placeholder="Ej: Acapulco"
                      style={{ color: textColor }}
                      className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                        (deliveryTouched.city || deliverySubmitted) && getDeliveryTextError(ciudad)
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                      } rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs`}
                    />
                  </div>
                  {(deliveryTouched.city || deliverySubmitted) && getDeliveryTextError(ciudad) && (
                    <p className="text-red-500 text-xs font-medium mt-1">
                      {getDeliveryTextError(ciudad)}
                    </p>
                  )}
                </div>

                {/* Fila 2: Municipio y Estado (grid grid-cols-1 md:grid-cols-2 gap-4) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Municipio */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Municipio <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        value={municipio}
                        onChange={(e) => {
                          setMunicipio(e.target.value)
                          setDeliveryTouched(prev => ({ ...prev, municipality: true }))
                        }}
                        onBlur={(e) => {
                          setMunicipio(e.target.value.trim())
                          setDeliveryTouched(prev => ({ ...prev, municipality: true }))
                        }}
                        placeholder="Ej: Acapulco de Juárez"
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (deliveryTouched.municipality || deliverySubmitted) && getDeliveryTextError(municipio)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all duration-200 font-medium shadow-xs`}
                      />
                    </div>
                    {(deliveryTouched.municipality || deliverySubmitted) && getDeliveryTextError(municipio) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getDeliveryTextError(municipio)}
                      </p>
                    )}
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        value={estado}
                        onChange={(e) => {
                          setEstado(e.target.value)
                          setDeliveryTouched(prev => ({ ...prev, state: true }))
                        }}
                        onBlur={(e) => {
                          setEstado(e.target.value.trim())
                          setDeliveryTouched(prev => ({ ...prev, state: true }))
                        }}
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (deliveryTouched.state || deliverySubmitted) && getDeliveryTextError(estado)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all duration-200 font-medium shadow-xs`}
                        placeholder="Ej: Guerrero"
                      />
                    </div>
                    {(deliveryTouched.state || deliverySubmitted) && getDeliveryTextError(estado) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getDeliveryTextError(estado)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fila 3: Calle (2 cols) y Código Postal (1 col) (grid grid-cols-1 md:grid-cols-3 gap-4) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nombre de la calle (md:col-span-2) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Nombre de la calle <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        value={streetName}
                        onChange={(e) => {
                          setStreetName(e.target.value)
                          setDeliveryTouched(prev => ({ ...prev, street: true }))
                        }}
                        onBlur={(e) => {
                          setStreetName(e.target.value.trim())
                          setDeliveryTouched(prev => ({ ...prev, street: true }))
                        }}
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (deliveryTouched.street || deliverySubmitted) && getDeliveryTextError(streetName)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all duration-200 font-medium shadow-xs`}
                        placeholder="Ej: Av. Costera #100"
                      />
                    </div>
                    {(deliveryTouched.street || deliverySubmitted) && getDeliveryTextError(streetName) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getDeliveryTextError(streetName)}
                      </p>
                    )}
                  </div>

                  {/* Código Postal (md:col-span-1) */}
                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Código Postal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Compass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        value={postalCode}
                        maxLength={5}
                        onKeyDown={handleDigitsOnlyKeyDown}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 5)
                          setPostalCode(cleaned)
                          setDeliveryTouched(prev => ({ ...prev, postalCode: true }))
                        }}
                        onBlur={() => setDeliveryTouched(prev => ({ ...prev, postalCode: true }))}
                        style={{ color: textColor }}
                        className={`input-subcard w-full bg-slate-100 dark:bg-white/5 border ${
                          (deliveryTouched.postalCode || deliverySubmitted) && getDeliveryZipError(postalCode)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50'
                        } rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all duration-200 font-medium shadow-xs`}
                        placeholder="Ej: 39390"
                      />
                    </div>
                    {(deliveryTouched.postalCode || deliverySubmitted) && getDeliveryZipError(postalCode) && (
                      <p className="text-red-500 text-xs font-medium mt-1">
                        {getDeliveryZipError(postalCode)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fila 4: Botón Ver Mapa (flex justify-end mt-2) */}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={generateMapView}
                    disabled={isSearchingCoords}
                    style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}40`, color: colorPrimario }}
                    className="flex items-center gap-2 rounded-xl py-2.5 px-5 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title="Ver mapa de ubicación"
                  >
                    {isSearchingCoords ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Buscando en mapa...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={15} />
                        <span>Ver mapa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

                {/* Zona de Cobertura en Mapa (Modal Trigger - Tono 2 / Gris Opaco) */}
                <div 
                  className="rounded-xl p-5 space-y-4 bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ color: textMuted }}>
                      <MapPinned size={16} style={{ color: colorPrimario }} />
                      <span className="text-xs font-bold uppercase tracking-wider">Radio de Cobertura de Entrega</span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Radio Activo: {(deliveryRadius / 1000).toFixed(1)} km
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                    Ajusta el radio dinámico en kilómetros para definir el alcance de entregas a domicilio desde la ubicación de tu restaurante.
                  </p>

                  <button
                    type="button"
                    onClick={geocodeAddressAndOpenMap}
                    disabled={isGeocoding}
                    style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}40`, color: colorPrimario }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isGeocoding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Buscando ubicación en el mapa...</span>
                      </>
                    ) : (
                      <>
                        <Compass size={16} />
                        <span>Ajustar radio de entrega en el mapa ({(deliveryRadius / 1000).toFixed(1)} km)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Nota informativa (Tono 2 / Gris Opaco) */}
                <div 
                  className="flex items-start gap-3 p-4 rounded-xl bg-theme-subcard-bg border border-gray-200 dark:border-gray-700 shadow-xs"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: colorPrimario }} />
                  <div className="space-y-1 text-xs leading-relaxed font-medium" style={{ color: textMuted }}>
                    <span className="font-bold block" style={{ color: textColor }}>Nota informativa de cobertura:</span>
                    <p>Cuando un cliente ingrese su dirección para un pedido a domicilio, el sistema verificará que su colonia esté dentro de la lista de cobertura. Si no coincide, se le sugerirá la opción de "pick-up" (recoger en tienda).</p>
                  </div>
                </div>
              </div>

            <div className="flex justify-end pt-6 shrink-0">
              <button 
                type="submit" 
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="flex items-center gap-2 hover:opacity-95 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all shadow-md"
              >
                <Save size={16} style={{ color: primaryBtnText }} />
                <span style={{ color: primaryBtnText }}>Guardar cambios</span>
              </button>
            </div>
          </form>

          {/* 5. Integraciones de Notificaciones (Discord / Telegram) */}
          <form
            onSubmit={handleSaveNotifications}
            style={{ backgroundColor: isLight ? '#FFFFFF' : 'var(--theme-surface)', border: `1px solid ${borderSubtle}`, boxShadow: cardShadow, color: textColor }}
            className="rounded-2xl p-6 transition-all duration-200 max-md:p-4 max-md:space-y-2"
          >
            <div className="space-y-6 flex-1">
              {/* Header */}
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: borderSubtle }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${colorPrimario}15`, border: `1px solid ${colorPrimario}30` }}>
                  <Bell size={18} style={{ color: colorPrimario }} />
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight" style={{ color: textColor }}>Integraciones de notificaciones</h2>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>Configura las alertas automáticas para pedidos y reservaciones en tiempo real</p>
                </div>
              </div>

              {/* Selector de plataforma interactivo */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Plataforma activa
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opción Ninguna */}
                  <button
                    type="button"
                    onClick={() => setNotificationPlatform('none')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-xs ${
                      notificationPlatform === 'none'
                        ? 'ring-2'
                        : 'hover:border-brand-500/40 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: notificationPlatform === 'none' 
                        ? (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)')
                        : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'),
                      borderColor: notificationPlatform === 'none' ? colorPrimario : borderSubtle,
                      ringColor: notificationPlatform === 'none' ? `${colorPrimario}50` : 'transparent',
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: notificationPlatform === 'none' ? `${colorPrimario}20` : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'),
                        color: notificationPlatform === 'none' ? colorPrimario : textMuted
                      }}
                    >
                      <BellOff size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: textColor }}>Ninguna</p>
                      <p className="text-[11px] truncate" style={{ color: textMuted }}>Desactivado</p>
                    </div>
                    {notificationPlatform === 'none' && (
                      <Check size={14} className="shrink-0" style={{ color: colorPrimario }} />
                    )}
                  </button>

                  {/* Opción Discord */}
                  <button
                    type="button"
                    onClick={() => setNotificationPlatform('discord')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-xs ${
                      notificationPlatform === 'discord'
                        ? 'ring-2'
                        : 'hover:border-brand-500/40 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: notificationPlatform === 'discord' 
                        ? (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)')
                        : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'),
                      borderColor: notificationPlatform === 'discord' ? colorPrimario : borderSubtle,
                      ringColor: notificationPlatform === 'discord' ? `${colorPrimario}50` : 'transparent',
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: notificationPlatform === 'discord' ? '#5865F220' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'),
                        color: notificationPlatform === 'discord' ? '#5865F2' : textMuted
                      }}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: textColor }}>Discord</p>
                      <p className="text-[11px] truncate" style={{ color: textMuted }}>Canal Webhook</p>
                    </div>
                    {notificationPlatform === 'discord' && (
                      <Check size={14} className="shrink-0" style={{ color: colorPrimario }} />
                    )}
                  </button>

                  {/* Opción Telegram */}
                  <button
                    type="button"
                    onClick={() => setNotificationPlatform('telegram')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-xs ${
                      notificationPlatform === 'telegram'
                        ? 'ring-2'
                        : 'hover:border-brand-500/40 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: notificationPlatform === 'telegram' 
                        ? (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)')
                        : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'),
                      borderColor: notificationPlatform === 'telegram' ? colorPrimario : borderSubtle,
                      ringColor: notificationPlatform === 'telegram' ? `${colorPrimario}50` : 'transparent',
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: notificationPlatform === 'telegram' ? '#229ED920' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'),
                        color: notificationPlatform === 'telegram' ? '#229ED9' : textMuted
                      }}
                    >
                      <Send size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: textColor }}>Telegram</p>
                      <p className="text-[11px] truncate" style={{ color: textMuted }}>Bot & Chat ID</p>
                    </div>
                    {notificationPlatform === 'telegram' && (
                      <Check size={14} className="shrink-0" style={{ color: colorPrimario }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Renderizado condicional */}
              {notificationPlatform === 'discord' && (
                <div 
                  className="rounded-xl p-4 space-y-4 border transition-all animate-fadeIn"
                  style={{ 
                    backgroundColor: 'var(--theme-subcard-bg)', 
                    borderColor: borderSubtle 
                  }}
                >
                  <div className="flex items-center gap-2 pb-1 border-b border-black/5 dark:border-white/5">
                    <Link2 size={15} style={{ color: colorPrimario }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>
                      Webhooks de Discord por evento
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Webhook para Reservaciones (Recepción) */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Reservaciones (Recepción)
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordReservationsWebhook}
                          onChange={(e) => setDiscordReservationsWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Avisos de nuevas reservaciones confirmadas.
                      </p>
                    </div>

                    {/* Alertas del sistema */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Alertas del sistema
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordSystemAlertsWebhook}
                          onChange={(e) => setDiscordSystemAlertsWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Errores del sistema o avisos técnicos.
                      </p>
                    </div>

                    {/* Inventario y Stock */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Inventario y Stock
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordInventoryWebhook}
                          onChange={(e) => setDiscordInventoryWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Avisos de insumos bajos o agotados.
                      </p>
                    </div>

                    {/* Cortes de caja */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Cortes de caja
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordCashCutsWebhook}
                          onChange={(e) => setDiscordCashCutsWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Resúmenes del cierre de turno.
                      </p>
                    </div>

                    {/* General Admin */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        General Admin
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordGeneralAdminWebhook}
                          onChange={(e) => setDiscordGeneralAdminWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Actividades generales de la administración.
                      </p>
                    </div>

                    {/* Reporte Financiero Diario */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        REPORTE FINANCIERO DIARIO
                      </label>
                      <div className="relative">
                        <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="url"
                          value={discordDailyFinancialWebhook}
                          onChange={(e) => setDiscordDailyFinancialWebhook(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Cierre financiero automático diario (ventas, gastos y balance).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {notificationPlatform === 'telegram' && (
                <div 
                  className="rounded-xl p-4 space-y-4 border transition-all animate-fadeIn"
                  style={{ 
                    backgroundColor: 'var(--theme-subcard-bg)', 
                    borderColor: borderSubtle 
                  }}
                >
                  <div className="flex items-center gap-2 pb-1 border-b border-black/5 dark:border-white/5">
                    <Send size={15} style={{ color: colorPrimario }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>
                      Bot y Canales de Telegram por evento
                    </span>
                  </div>

                  {/* Token del Bot */}
                  <div className="w-full">
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                      Token del Bot
                    </label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                      <input 
                        type="text"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                        style={{ color: textColor }}
                        className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                      />
                    </div>
                    <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                      Token generado por @BotFather en Telegram.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chat ID de Reservaciones */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Reservaciones (Recepción)
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramReservationsChatId}
                          onChange={(e) => setTelegramReservationsChatId(e.target.value)}
                          placeholder="-1009876543210 o @recepcion"
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Avisos de nuevas reservaciones confirmadas.
                      </p>
                    </div>

                    {/* Alertas del sistema */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Alertas del sistema
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramSystemAlertsChatId}
                          onChange={(e) => setTelegramSystemAlertsChatId(e.target.value)}
                          placeholder="-100..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Errores del sistema o avisos técnicos.
                      </p>
                    </div>

                    {/* Inventario y Stock */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Inventario y Stock
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramInventoryChatId}
                          onChange={(e) => setTelegramInventoryChatId(e.target.value)}
                          placeholder="-100..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Avisos de insumos bajos o agotados.
                      </p>
                    </div>

                    {/* Cortes de caja */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        Cortes de caja
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramCashCutsChatId}
                          onChange={(e) => setTelegramCashCutsChatId(e.target.value)}
                          placeholder="-100..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Resúmenes del cierre de turno.
                      </p>
                    </div>

                    {/* General Admin */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        General Admin
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramGeneralAdminChatId}
                          onChange={(e) => setTelegramGeneralAdminChatId(e.target.value)}
                          placeholder="-100..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Actividades generales de la administración.
                      </p>
                    </div>

                    {/* Reporte Financiero Diario */}
                    <div className="w-full">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textMuted }}>
                        REPORTE FINANCIERO DIARIO
                      </label>
                      <div className="relative">
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 pointer-events-none" />
                        <input 
                          type="text"
                          value={telegramDailyFinancialChatId}
                          onChange={(e) => setTelegramDailyFinancialChatId(e.target.value)}
                          placeholder="-100..."
                          style={{ color: textColor }}
                          className="input-subcard w-full bg-slate-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-brand-500/30 focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 shadow-xs"
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: textMuted }}>
                        Cierre financiero automático diario (ventas, gastos y balance).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {notificationPlatform === 'none' && (
                <div 
                  className="flex items-start gap-3 p-4 rounded-xl border shadow-xs transition-all"
                  style={{ backgroundColor: 'var(--theme-subcard-bg)', borderColor: borderSubtle }}
                >
                  <BellOff className="w-5 h-5 shrink-0 mt-0.5" style={{ color: textMuted }} />
                  <div className="space-y-1 text-xs leading-relaxed font-medium" style={{ color: textMuted }}>
                    <span className="font-bold block" style={{ color: textColor }}>Notificaciones externas desactivadas</span>
                    <p>No se enviarán alertas a Discord o Telegram. Los pedidos y reservaciones continuarán funcionando normalmente en el panel administrativo.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 shrink-0">
              <button 
                type="submit" 
                disabled={savingNotifications}
                style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                className="flex items-center gap-2 hover:opacity-95 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all shadow-md disabled:opacity-50"
              >
                {savingNotifications ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ color: primaryBtnText }} />
                    <span style={{ color: primaryBtnText }}>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} style={{ color: primaryBtnText }} />
                    <span style={{ color: primaryBtnText }}>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>



      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Modal interactivo con slider para definir Radio de Entrega (Renderizado via Portal) */}
      {isMapModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div 
            style={{ backgroundColor: bgCard, color: textColor }}
            className="w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header Modal */}
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b" 
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-white/20 text-white">
                  <MapPinned size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Definir Radio de Entrega</h3>
                  <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Desliza el controlador para ajustar el radio de cobertura a la redonda</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div 
              className="flex-1 flex flex-col overflow-hidden border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              {/* Controller Bar - Slider */}
              <div className="px-5 py-4 border-b space-y-2 bg-black/5 dark:bg-white/5" style={{ borderColor: borderSubtle }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>
                    Radio de Cobertura: <span style={{ color: colorPrimario }}>{(deliveryRadius / 1000).toFixed(1)} km</span> ({deliveryRadius} m)
                  </label>
                  <span className="text-[11px] font-semibold" style={{ color: textMuted }}>
                    Rango: 0.5 km a 15.0 km
                  </span>
                </div>
                <input 
                  type="range" 
                  min={500} 
                  max={15000} 
                  step={100} 
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                  style={{ accentColor: colorPrimario }}
                  className="w-full h-2 rounded-lg cursor-pointer bg-slate-200 dark:bg-zinc-700"
                />
              </div>

              {/* Body Modal - Mapcn (MapLibre GL JS con Turf Circle) */}
              <div className="p-4 flex-1 relative">
                <div className="w-full h-[400px] rounded-lg overflow-hidden relative">
                  {pinCoords && (
                    <Map
                      initialViewState={{
                        longitude: pinCoords.lng,
                        latitude: pinCoords.lat,
                        zoom: 13
                      }}
                      mapStyle={{
                        version: 8,
                        sources: {
                          'carto-dark': {
                            type: 'raster',
                            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
                            tileSize: 256
                          }
                        },
                        layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }]
                      }}
                    >
                      {/* Círculo de Cobertura de Entrega */}
                      {pinCoords && (
                        <RadiusCircle
                          pinCoords={pinCoords}
                          radiusKm={deliveryRadius / 1000}
                        />
                      )}

                      {/* Marcador del centro interactivo */}
                      <Marker 
                        longitude={pinCoords.lng} 
                        latitude={pinCoords.lat} 
                        draggable={true}
                        onDragEnd={(e) => setPinCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
                      />
                    </Map>
                  )}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex items-center justify-between p-4 border-t shrink-0 bg-black/5 dark:bg-white/5" style={{ borderColor: borderSubtle }}>
                <span className="text-xs font-medium" style={{ color: textMuted }}>
                  ✓ Radio seleccionado: {(deliveryRadius / 1000).toFixed(1)} km ({deliveryRadius} m)
                </span>
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(false)}
                  style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                  className="flex items-center gap-2 hover:opacity-95 rounded-xl px-5 py-2 text-xs font-semibold cursor-pointer transition-all shadow-md"
                >
                  <Check size={14} style={{ color: primaryBtnText }} />
                  <span>Confirmar y Listo</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Ubicación del Restaurante (Mapcn MapLibre GL JS) */}
      {isLocationModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div 
            style={{ backgroundColor: bgCard, color: textColor }}
            className="w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header Modal */}
            <div 
              className="flex items-center justify-between px-6 py-4 shrink-0 transition-colors border-t border-x border-b" 
              style={{ 
                backgroundColor: colorPrimario || 'var(--theme-primary)', 
                borderColor: colorPrimario || 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast, #ffffff)' 
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-white/20 text-white">
                  <MapPin size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Confirma la ubicación exacta de tu restaurante</h3>
                  <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}>Arrastra el marcador al punto exacto de tu local para fijar sus coordenadas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                style={{ color: 'var(--theme-primary-contrast, #ffffff)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div 
              className="flex-1 flex flex-col overflow-hidden border-x border-b border-theme-border-subtle rounded-b-2xl"
              style={{ borderColor: borderSubtle }}
            >
              {/* Body Modal - Mapcn (MapLibre GL JS) */}
              <div className="p-4 flex-1 relative">
                <div className="w-full h-[400px] rounded-lg overflow-hidden relative">
                  <Map
                    initialViewState={{
                      longitude: pinCoords?.lng ?? -99.133209,
                      latitude: pinCoords?.lat ?? 19.432608,
                      zoom: 13
                    }}
                    mapStyle={{
                      version: 8,
                      sources: {
                        'carto-dark': {
                          type: 'raster',
                          tiles: [
                            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                          ],
                          tileSize: 256,
                          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
                        }
                      },
                      layers: [
                        {
                          id: 'carto-dark-layer',
                          type: 'raster',
                          source: 'carto-dark',
                          minzoom: 0,
                          maxzoom: 22
                        }
                      ]
                    }}
                  >
                    {pinCoords && (
                      <Marker 
                        longitude={pinCoords.lng} 
                        latitude={pinCoords.lat} 
                        draggable={true}
                        onDragEnd={(e) => setPinCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
                      />
                    )}
                  </Map>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex items-center justify-between p-4 border-t shrink-0 bg-black/5 dark:bg-white/5" style={{ borderColor: borderSubtle }}>
                <span className="text-xs font-medium" style={{ color: textMuted }}>
                  📍 Coordenadas: Lng {pinCoords?.lng?.toFixed(5) ?? '0'}, Lat {pinCoords?.lat?.toFixed(5) ?? '0'} (Arrastra el pin para ajustar)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLatitude(pinCoords.lat)
                    setLongitude(pinCoords.lng)
                    setIsLocationModalOpen(false)
                  }}
                  style={{ backgroundColor: colorPrimario, color: primaryBtnText }}
                  className="flex items-center gap-2 hover:opacity-95 rounded-xl px-5 py-2.5 text-xs font-semibold cursor-pointer transition-all shadow-md"
                >
                  <Check size={16} style={{ color: primaryBtnText }} />
                  <span>Confirmar ubicación exacta</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

