import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, Filter, Camera, ChevronDown, ChevronLeft, ChevronRight, X, Upload, ThumbsUp, MessageSquare, Send, Utensils, Clock, Shield, ShieldCheck, Image as ImageIcon, Sparkles, CheckCircle2, Plus, Info, Loader2, Crop, ZoomIn, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import { getReviews, getListadoExperiencias, getGalleryImages, getGaleriaDestacada, submitReview, voteUseful } from '../api/reviews';
import { useTheme } from '../context/ThemeContext';
import LoaderGlobal from '../components/ui/LoaderGlobal';

const getImageUrl = (img) => {
    if (!img) return '';
    const raw = typeof img === 'string' ? img : (img.url || img.image_path || '');
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
        return raw;
    }
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    return `${baseUrl}/storage/${raw.replace(/^\/+/, '')}`;
};

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop, originalFileName = 'imagen.webp') => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No se pudo inicializar el contexto de canvas');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('El canvas está vacío'));
                return;
            }
            const cleanName = originalFileName.replace(/\.[^/.]+$/, '') + '.webp';
            const file = new File([blob], cleanName, { type: 'image/webp' });
            resolve(file);
        }, 'image/webp', 0.95);
    });
};

const Experiencias = () => {
    // Theme & Mode Settings
    const { isLight, colorPrimario, primaryBtnText } = useTheme();
    const primaryColor = colorPrimario || '#000fe0';
    const primaryTextColor = primaryBtnText || '#ffffff';

    // Iluminación dinámica global en Tono 1 (var(--theme-surface))
    const bgMain = 'bg-[var(--theme-surface)] text-[var(--theme-text)]';
    const bgCard = 'bg-[var(--theme-card)] border-[var(--theme-border-subtle)] shadow-xs';
    const bgSubcard = 'bg-[var(--theme-subcard-bg,var(--theme-bg))] border-[var(--theme-border-subtle)]';
    const textTitle = 'text-[var(--theme-text)]';
    const textSubtitle = 'text-[var(--theme-text-muted)]';
    const textBody = 'text-[var(--theme-text)]';
    const borderDefault = 'border-[var(--theme-border-subtle)]';
    const starEmpty = 'text-[var(--theme-border-subtle)] opacity-40';
    const barTrack = 'bg-[var(--theme-bg)]';

    // Ref y helper para desplazamiento horizontal de momentos
    const momentosScrollRef = useRef(null);
    const scrollMomentos = (direction) => {
        if (momentosScrollRef.current) {
            const offset = direction === 'left' ? -280 : 280;
            momentosScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    // Fondo global en Tono 1 durante la navegación en Experiencias
    useEffect(() => {
        const prevBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = 'var(--theme-surface)';
        return () => {
            document.body.style.backgroundColor = prevBg;
        };
    }, []);

    // State
    const [reviews, setReviews] = useState([]);
    const [meta, setMeta] = useState({
        average_rating: 0,
        total_count: 0,
        satisfaction_rate: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });
    const [isLoading, setIsLoading] = useState(true);
    const loading = isLoading;
    const setLoading = setIsLoading;
    const [filter, setFilter] = useState('Todas');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [votedUseful, setVotedUseful] = useState([]);
    const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0, isTestimonial: false });
    const [modalOpen, setModalOpen] = useState(false);
    const [galeria, setGaleria] = useState([]);
    const [galleryPhotos, setGalleryPhotos] = useState([]);
    const [expandedReviews, setExpandedReviews] = useState([]);

    const toggleExpand = (id) => {
        setExpandedReviews(prev => (prev || []).includes(id) ? (prev || []).filter(item => item !== id) : [...(prev || []), id]);
    };

    const formatearFecha = (review) => {
        if (review.fecha_formateada) return review.fecha_formateada;
        if (review.date) return review.date;
        const raw = review.created_at || review.fecha;
        if (!raw) return '';
        try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) return raw;
            return d.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return raw;
        }
    };

    // Opción A: Primer nombre + Inicial del apellido (ej. "Francisco P.") para proteger privacidad
    const formatearNombre = (review) => {
        if (review.customer_name_masked) return review.customer_name_masked;
        const rawName = (review.nombre || review.customer_name || review.name || '').trim();
        if (!rawName) return 'Comensal anónimo';

        const partes = rawName.split(/\s+/).filter(Boolean);
        if (partes.length === 1) {
            return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        }

        const primerNombre = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        const inicialApellido = partes[1].charAt(0).toUpperCase() + '.';
        return `${primerNombre} ${inicialApellido}`;
    };

    // Load voted useful from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('aurum_useful_votes');
            if (stored) {
                setVotedUseful(JSON.parse(stored));
            }
        } catch (e) {
            setVotedUseful([]);
        }
    }, []);

    // Load data
    const fetchReviews = async (pageNum, currentFilter, append = false) => {
        try {
            if (!append) setIsLoading(true);
            const params = { page: pageNum };
            if (currentFilter === 'Con fotos') {
                params.has_images = true;
                params.filter = 'Con fotos';
            } else if (currentFilter === '5 estrellas') {
                params.rating = 5;
                params.filter = '5 estrellas';
            } else if (currentFilter === 'Más viejas' || currentFilter === 'Más antiguas') {
                params.sort = 'antiguas';
                params.filter = 'Más viejas';
            } else if (currentFilter === 'Más recientes') {
                params.sort = 'recientes';
                params.filter = 'Más recientes';
            } else {
                params.filter = 'Todas';
            }
            const res = await getListadoExperiencias(params).catch(() => getReviews(params));
            const newReviews = res.data?.data || [];
            const summary = res.data?.summary || res.data?.stats_experiencias || {};
            const backendMeta = res.data?.meta || {};
            let rawDist = res.data?.distribution ?? backendMeta.distribution;
            if (!rawDist && newReviews.length > 0) {
                rawDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                newReviews.forEach(r => {
                    const s = Math.round(r.rating || 5);
                    if (rawDist[s] !== undefined) rawDist[s]++;
                });
            }
            const newMeta = {
                average_rating: summary.avg_rating ?? summary.promedio ?? backendMeta.average_rating ?? 0,
                total_count: summary.total_count ?? summary.total ?? backendMeta.total ?? 0,
                satisfaction_rate: summary.satisfaction_percentage ?? summary.satisfaccion ?? backendMeta.satisfaction_rate ?? 0,
                distribution: rawDist || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
            
            // Si es la página 1, reemplazamos. Si es otra, acumulamos.
            if (pageNum === 1) {
                setReviews(newReviews);
            } else {
                setReviews(prev => [...prev, ...newReviews]);
            }
            setMeta(newMeta);

            // El backend nos dice si la URL de la página siguiente es null
            const hayMasUrl = res.data?.next_page_url !== null && res.data?.next_page_url !== undefined
                ? Boolean(res.data.next_page_url)
                : (res.data?.links?.next !== null && res.data?.links?.next !== undefined
                    ? Boolean(res.data?.links?.next)
                    : Boolean(res.data?.meta?.current_page < res.data?.meta?.last_page));
            setHasMore(hayMasUrl);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchReviews(1, filter, false);
    }, [filter]);

    useEffect(() => {
        const obtenerGaleriaDiaria = async () => {
            try {
                const { data } = await getGaleriaDestacada();
                setGaleria(Array.isArray(data) ? data : (data?.data || []));
            } catch (error) {
                console.error("Error al cargar la galería", error);
            }
        };
        obtenerGaleriaDiaria();
    }, []);

    useEffect(() => {
        const loadGallery = async () => {
            try {
                const res = await getGalleryImages({ per_page: 24 });
                if (res.data?.data) setGalleryPhotos(res.data.data);
            } catch (e) { }
        };
        loadGallery();
    }, []);

    // Scroll automático si la URL contiene ancla hacia una reseña específica (#resena-ID)
    useEffect(() => {
        if (reviews && reviews.length > 0 && window.location.hash) {
            const hash = window.location.hash;
            const target = document.querySelector(hash);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }
        }
    }, [reviews]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchReviews(nextPage, filter, true);
    };

    const handleVoteUseful = async (id) => {
        if (!id || (votedUseful || []).includes(id)) return;
        
        try {
            await voteUseful(id);
            const newVoted = [...(votedUseful || []), id];
            setVotedUseful(newVoted);
            localStorage.setItem('aurum_useful_votes', JSON.stringify(newVoted));
            
            setReviews(prev => (prev || []).map(r => r?.id === id ? { ...r, useful_count: (r?.useful_count || 0) + 1 } : r));
        } catch (error) {
            console.error('Error voting useful:', error);
        }
    };

    const openLightbox = (images, index) => {
        setLightbox({ open: true, images: images || [], index: index || 0 });
    };

    const totalReviews = meta?.total_count || meta?.total || reviews.length || 0;
    const averageRating = totalReviews === 0 
        ? '0.0' 
        : (meta?.average_rating && Number(meta.average_rating) > 0
            ? Number(meta.average_rating).toFixed(1) 
            : (reviews.length > 0 
                ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
                : '0.0'
            )
        );
    const activeRating = totalReviews === 0 ? 0 : Math.round(Number(averageRating));
    const experiencias = useMemo(() => {
        let list = [...(reviews || [])];
        if (filter === 'Con fotos') {
            list = list.filter(r => (r.fotos && r.fotos.length > 0) || (r.images && r.images.length > 0));
        } else if (filter === '5 estrellas') {
            list = list.filter(r => Number(r.rating) === 5);
        } else if (filter === 'Más viejas' || filter === 'Más antiguas') {
            list.sort((a, b) => {
                const dateA = new Date(a.created_at || a.fecha || 0).getTime();
                const dateB = new Date(b.created_at || b.fecha || 0).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.id || 0) - (b.id || 0);
            });
        } else if (filter === 'Más recientes') {
            list.sort((a, b) => {
                const dateA = new Date(a.created_at || a.fecha || 0).getTime();
                const dateB = new Date(b.created_at || b.fecha || 0).getTime();
                if (dateA !== dateB) return dateB - dateA;
                return (b.id || 0) - (a.id || 0);
            });
        }
        return list;
    }, [reviews, filter]);

    // Collect all photos from reviews and gallery for "Opiniones con fotos"
    const allReviewPhotos = [];
    (reviews || []).forEach(r => {
        if (r.images && r.images.length > 0) {
            r.images.forEach(img => {
                const path = typeof img === 'string' ? img : (img.image_path || img.url);
                if (path && !allReviewPhotos.some(p => p.image_path === path)) {
                    allReviewPhotos.push({
                        image_path: path,
                        rating: r.rating || 5,
                        testimonial: r
                    });
                }
            });
        }
    });
    (galleryPhotos || []).forEach(g => {
        const path = typeof g === 'string' ? g : (g.image_path || g.url);
        if (path && !allReviewPhotos.some(p => p.image_path === path)) {
            allReviewPhotos.push({
                image_path: path,
                rating: g.rating || g.testimonial?.rating || 5,
                testimonial: g.testimonial || null
            });
        }
    });

    return (
        <>
            {isLoading && <LoaderGlobal />}
            <div className={`min-h-screen ${bgMain} font-sans pb-24 transition-colors duration-300`}>
            {/* CABECERA COMPACTA CON COLOR PRIMARIO — CONSISTENTE Y OPTIMIZADA */}
            <header 
                style={{ 
                    backgroundColor: primaryColor, 
                    color: primaryTextColor 
                }} 
                className="relative pt-4 pb-5 sm:pt-5 sm:pb-6 px-4 sm:px-6 lg:px-8 xl:px-12 shadow-md transition-colors duration-300 overflow-hidden"
            >
                {/* Degradado sutil para profundidad */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />

                <div className="relative max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto">
                    {/* Fila: Título a la izquierda y Botón Volver a la derecha */}
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-serif font-bold tracking-tight">
                            <span className="sm:hidden">Experiencias</span>
                            <span className="hidden sm:inline">Experiencias de nuestros visitantes</span>
                        </h1>

                        <Link 
                            to="/" 
                            style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.18)', 
                                borderColor: 'rgba(255, 255, 255, 0.35)', 
                                color: primaryTextColor 
                            }}
                            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold hover:bg-white hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-xs group shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="hidden sm:inline">Volver al inicio</span>
                            <span className="sm:hidden">Volver</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* VISTA PRINCIPAL DIRECTAMENTE SOBRE EL FONDO EN TONO 1 (SIN CONTENEDOR ENVOLVENTE GENERAL) */}
            <main className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
                    
                    {/* COLUMNA IZQUIERDA: Resumen de Calificaciones */}
                    <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6 lg:pr-6">
                        <h2 className={`text-xs font-bold uppercase tracking-wider ${textSubtitle} mb-4`}>
                            Resumen de Calificaciones
                        </h2>

                        <div className="flex items-center sm:items-start gap-4 mb-3">
                            <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-amber-400 font-mono leading-none">
                                {averageRating}
                            </span>
                            <div>
                                <div className="flex gap-0.5 mt-1 text-amber-400">
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const isFilled = totalReviews > 0 && star <= activeRating;
                                        return (
                                            <Star 
                                                key={star} 
                                                className={`w-5 h-5 ${
                                                    isFilled 
                                                        ? 'fill-amber-400 text-amber-400' 
                                                        : (isLight ? 'text-slate-300' : 'text-slate-600')
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                                <span className={`text-xs ${textSubtitle} mt-1.5 block font-semibold`}>
                                    {totalReviews} {totalReviews === 1 ? 'calificación' : 'calificaciones'}
                                </span>
                            </div>
                        </div>

                        <div className={`flex items-center gap-2.5 text-xs ${textSubtitle} mb-5 p-2.5 rounded-xl bg-[var(--theme-subcard-bg,var(--theme-bg))] border border-[var(--theme-border-subtle)] shadow-sm`}>
                            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="leading-snug font-medium">Reseñas verificadas basadas en experiencias reales de comensales.</span>
                        </div>

                        {/* Barras de distribución horizontal (5 a 1 estrellas) */}
                        <div className="space-y-2.5">
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = meta?.distribution?.[star] || 0;
                                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                return (
                                    <div key={star} className={`flex items-center gap-3 text-xs ${textSubtitle}`}>
                                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--theme-border-subtle)]/40">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500 bg-amber-400" 
                                                style={{ 
                                                    width: `${percentage}%`
                                                }}
                                            />
                                        </div>
                                        <span className="w-8 flex items-center justify-end font-semibold">
                                            {star} <Star className="w-3 h-3 ml-1 fill-amber-400 text-amber-400" />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Acceso directo a redactar - Botón principal */}
                        <div className="mt-6 pt-5 border-t border-[var(--theme-border-subtle)]">
                            <button
                                onClick={() => setModalOpen(true)}
                                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Escribir una opinión</span>
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Fotos horizontales y Feed de Opiniones */}
                    <div className="lg:col-span-8 xl:col-span-8 space-y-6 sm:space-y-8">
                        
                        {/* Subsección: Momentos compartidos (carrusel horizontal fluido con snap) */}
                        {((galeria && galeria.length > 0) || (allReviewPhotos && allReviewPhotos.length > 0)) && (
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className={`text-base sm:text-lg font-bold ${textTitle} tracking-tight flex items-center gap-2`}>
                                        <Camera className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" style={{ color: primaryColor }} />
                                        <span>Momentos compartidos por nuestros visitantes</span>
                                    </h3>
                                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => scrollMomentos('left')}
                                            className="p-1.5 rounded-full border border-[var(--theme-border-subtle)] hover:bg-[var(--theme-bg)] text-[var(--theme-text)] transition-colors cursor-pointer"
                                            title="Anterior"
                                            aria-label="Anterior"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => scrollMomentos('right')}
                                            className="p-1.5 rounded-full border border-[var(--theme-border-subtle)] hover:bg-[var(--theme-bg)] text-[var(--theme-text)] transition-colors cursor-pointer"
                                            title="Siguiente"
                                            aria-label="Siguiente"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Contenedor Horizontal Responsivo con Snap Scroll */}
                                <div 
                                    ref={momentosScrollRef}
                                    className="flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-3 pt-1 px-0.5 select-none"
                                >
                                    {((galeria && galeria.length > 0) 
                                        ? galeria 
                                        : (allReviewPhotos || []).map(p => ({
                                            url: getImageUrl(p),
                                            cliente: p.testimonial?.customer_name_masked || p.testimonial?.nombre || 'Comensal',
                                            rating: p.rating || 5,
                                            testimonial: p.testimonial
                                        }))
                                    ).map((item, index, listaCompleta) => (
                                        <div 
                                            key={index} 
                                            onClick={() => openLightbox(listaCompleta, index)}
                                            className="w-[155px] sm:w-[185px] md:w-[215px] shrink-0 snap-start aspect-[4/3] rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[var(--theme-border-subtle)] group cursor-pointer relative bg-slate-900/10 hover:-translate-y-0.5 transition-all"
                                        >
                                            <img 
                                                src={getImageUrl(item.url || item.image_path || item) || item.url} 
                                                alt={`Experiencia de ${item.cliente || item.customer_name || 'comensal'}`} 
                                                className="w-full h-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            
                                            {/* Etiqueta flotante minimalista (Calificación) */}
                                            <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                                <span>{item.rating || 5}</span>
                                                <span className="text-amber-400">★</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subsección: Feed de Opiniones */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className={`text-lg sm:text-xl font-bold ${textTitle} tracking-tight`}>
                                        Opiniones de clientes
                                    </h3>
                                </div>

                                {totalReviews > 0 && (
                                    <div className="flex gap-2 overflow-x-auto scroll-smooth hide-scrollbar pb-1 pt-0.5">
                                        {['Todas', 'Más recientes', 'Más viejas', 'Con fotos', '5 estrellas'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFilter(f)}
                                                style={filter === f ? { backgroundColor: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}40` } : {}}
                                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                                                    filter === f 
                                                        ? 'font-semibold shadow-xs' 
                                                        : `${borderDefault} ${textSubtitle} hover:text-slate-900 dark:hover:text-white bg-[var(--theme-card)]`
                                                }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                                {experiencias.length === 0 ? (
                                    <div className={`py-12 sm:py-16 text-center rounded-2xl border-2 border-dashed ${borderDefault} p-6 sm:p-8 bg-[var(--theme-card)] shadow-xs`}>
                                        <MessageSquare className={`w-12 h-12 mx-auto mb-3.5 ${textSubtitle} opacity-40`} />
                                        <h4 className={`text-base font-bold ${textTitle} mb-1.5`}>
                                            {filter === 'Todas' ? 'Aún no hay opiniones publicadas' : `No hay opiniones para el filtro "${filter}"`}
                                        </h4>
                                        <p className={`text-xs sm:text-sm ${textSubtitle} max-w-md mx-auto mb-6 leading-relaxed`}>
                                            {filter === 'Todas' 
                                                ? 'Sé el primer comensal en calificar tu visita y compartir hasta 3 fotos de tus platillos favoritos.'
                                                : 'Prueba seleccionando otro filtro o vuelve a la lista completa.'}
                                        </p>
                                        {filter === 'Todas' ? (
                                            <button
                                                onClick={() => setModalOpen(true)}
                                                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Escribir la primera experiencia</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setFilter('Todas')}
                                                style={{ borderColor: primaryColor, color: primaryColor }}
                                                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                            >
                                                Ver todas las opiniones
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-8 sm:space-y-10">
                                        {/* Lista de Reseñas sin Contenedores ni Líneas (Solo espacio limpio) */}
                                        {experiencias.map((review) => {
                                            const colorTexto = isLight ? '#000000' : '#ffffff';
                                            const colorSecundario = isLight ? '#475569' : '#cbd5e1';
                                            const fotosReview = review.fotos || review.images || [];

                                            return (
                                                <div 
                                                    key={review.id || Math.random()} 
                                                    id={`resena-${review.id}`}
                                                    className="w-full scroll-mt-28 transition-all"
                                                >
                                                    {/* Cabecera del Contenedor: Usuario + Fecha a la izquierda, Estrellas a la derecha */}
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div className="flex items-center min-w-0">
                                                            <div 
                                                                style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                                                                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase mr-3 shrink-0"
                                                            >
                                                                {(formatearNombre(review) || 'C').substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base font-bold capitalize truncate" style={{ color: colorTexto }}>
                                                                    {formatearNombre(review)}
                                                                </p>
                                                                <p className="text-xs" style={{ color: colorSecundario }}>
                                                                    {formatearFecha(review)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Estrellas */}
                                                        <div className="flex items-center gap-0.5 text-amber-400 shrink-0 pt-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star 
                                                                    key={star} 
                                                                    className={`w-4 h-4 ${
                                                                        star <= (Number(review.rating) || 5) 
                                                                            ? 'fill-amber-400 text-amber-400' 
                                                                            : (isLight ? 'text-slate-300' : 'text-slate-600')
                                                                    }`} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Platillo (si aplica) */}
                                                    {(review.dish || review.platillo_texto) && (
                                                        <p className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: primaryColor }}>
                                                            <Utensils className="w-3.5 h-3.5" />
                                                            <span>Platillo: {review.dish || review.platillo_texto}</span>
                                                        </p>
                                                    )}

                                                    {/* Comentario */}
                                                    <p 
                                                        style={{ color: colorTexto }}
                                                        className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-4"
                                                    >
                                                        {review.comentario || review.comment}
                                                    </p>

                                                    {/* Fotos en Grid (Container Queries + auto-fill/minmax + proporciones fijas aspect-[4/3]) */}
                                                    {fotosReview && fotosReview.length > 0 && (
                                                        <div className="@container w-full mb-4">
                                                            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] @sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 sm:gap-3">
                                                                {fotosReview.map((foto, index) => (
                                                                    <div 
                                                                        key={index}
                                                                        onClick={() => openLightbox(fotosReview, index)}
                                                                        className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-[var(--theme-border-subtle)] cursor-pointer group shadow-xs hover:opacity-95 transition-all"
                                                                    >
                                                                        <img 
                                                                            src={getImageUrl(foto)} 
                                                                            alt={`Foto ${index + 1}`} 
                                                                            className="w-full h-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-200" 
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* SI EL ADMIN RESPONDIÓ, SE MUESTRA ESTE BLOQUE CONECTADO */}
                                                    {(review.respuesta_admin || review.reply || review.reply_text || review.response) && (
                                                        <div className="mt-3.5 bg-[var(--theme-subcard-bg,var(--theme-bg))] border-l-4 p-3.5 sm:p-4 rounded-r-xl mb-3.5 text-xs sm:text-sm shadow-xs" style={{ borderLeftColor: primaryColor }}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <MessageSquare className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                                                                <span className="font-bold text-xs sm:text-sm" style={{ color: colorTexto }}>Respuesta del local</span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: colorSecundario }}>
                                                                {review.respuesta_admin || review.reply || review.reply_text || review.response}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Pie del Contenedor: Acción de Útil */}
                                                    <div className="flex items-center justify-end pt-1">
                                                        <button 
                                                            onClick={() => handleVoteUseful(review.id)}
                                                            disabled={(votedUseful || []).includes(review.id)}
                                                            style={{ 
                                                                color: (votedUseful || []).includes(review.id)
                                                                    ? primaryColor 
                                                                    : colorSecundario
                                                            }}
                                                            className="flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 py-1.5 px-3 rounded-lg hover:bg-[var(--theme-bg)]"
                                                            title="Marcar como útil"
                                                        >
                                                            <ThumbsUp className="w-3.5 h-3.5" />
                                                            <span>Útil ({review.useful_count || 0})</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {hasMore && (
                                    <div className="flex justify-center mt-8 pb-12">
                                        <button 
                                            onClick={() => {
                                                const next = page + 1;
                                                setPage(next);
                                                fetchReviews(next, filter, true);
                                            }}
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text)] text-sm font-semibold rounded-full hover:bg-[var(--theme-bg)] shadow-xs transition-all cursor-pointer"
                                        >
                                            {loading ? 'Cargando...' : 'Cargar más opiniones'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
            </main>

            {/* Write Review Modal E */}
            <AnimatePresence>
                {modalOpen && <ReviewModal onClose={() => setModalOpen(false)} onSuccess={() => {
                    setModalOpen(false);
                    setPage(1);
                    fetchReviews(1, filter, false);
                }} />}
            </AnimatePresence>

            {/* Image Lightbox F */}
            <AnimatePresence>
                {lightbox.open && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <button onClick={() => setLightbox({ ...lightbox, open: false })} className="absolute top-6 right-6 text-white hover:opacity-80 z-10 transition-opacity">
                            <X className="w-8 h-8" />
                        </button>
                        
                        <div className="relative max-w-4xl max-h-screen w-full flex items-center justify-center">
                            {lightbox.isTestimonial && lightbox.images[lightbox.index]?.testimonial ? (
                                <motion.div
                                  initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                                  className={`${bgCard} border rounded-2xl p-6 max-w-lg w-full flex flex-col gap-4 text-left shadow-2xl cursor-default`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <img src={getImageUrl(lightbox.images[lightbox.index])} alt="Experiencia" className="w-full h-64 object-cover rounded-xl" />
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: 5 }).map((_, si) => (
                                        <Star key={si} size={14} className={si < lightbox.images[lightbox.index].testimonial.rating ? 'text-amber-400 fill-amber-400' : starEmpty} />
                                      ))}
                                    </div>
                                    {lightbox.images[lightbox.index].testimonial.insignia && (
                                      <span 
                                        style={{ backgroundColor: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}35` }}
                                        className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border"
                                      >
                                        {lightbox.images[lightbox.index].testimonial.insignia.replace('_', ' ')}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className={`text-sm ${textBody} italic leading-relaxed font-normal`}>
                                    "{lightbox.images[lightbox.index].testimonial.comment}"
                                  </p>
                                  
                                  {lightbox.images[lightbox.index].testimonial.platillo_texto && (
                                    <p style={{ color: primaryColor }} className="text-xs font-semibold uppercase tracking-wider">
                                      Platillo: {lightbox.images[lightbox.index].testimonial.platillo_texto}
                                    </p>
                                  )}
                                  
                                  <div className={`flex items-center gap-3 pt-4 border-t ${borderDefault}`}>
                                    <div 
                                      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}35` }}
                                      className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs"
                                    >
                                      {(lightbox.images[lightbox.index].testimonial.customer_name_masked || lightbox.images[lightbox.index].testimonial.customer_name || 'C').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className={`text-sm font-bold ${textTitle} block`}>{lightbox.images[lightbox.index].testimonial.customer_name_masked || lightbox.images[lightbox.index].testimonial.customer_name}</span>
                                      {lightbox.images[lightbox.index].testimonial.created_at && (
                                        <span className={`text-[10px] ${textSubtitle} font-medium`}>
                                          {new Date(lightbox.images[lightbox.index].testimonial.created_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {lightbox.images[lightbox.index].testimonial.reply_text && (
                                    <div className={`mt-2 pt-3 border-t ${borderDefault}`}>
                                      <span style={{ color: primaryColor }} className="text-[10px] font-bold uppercase tracking-widest block mb-1">Respuesta del Restaurante</span>
                                      <p className={`text-xs ${textSubtitle} leading-relaxed font-normal`}>{lightbox.images[lightbox.index].testimonial.reply_text}</p>
                                    </div>
                                  )}
                                </motion.div>
                            ) : (
                                <img 
                                    src={getImageUrl(lightbox.images[lightbox.index])} 
                                    alt="Experiencia" 
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                />
                            )}
                            
                            {lightbox.images.length > 1 && !lightbox.isTestimonial && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightbox(prev => ({ ...prev, index: prev.index > 0 ? prev.index - 1 : prev.images.length - 1 }));
                                        }}
                                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
                                        className="absolute left-4 p-2 text-white rounded-full transition-colors"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightbox(prev => ({ ...prev, index: prev.index < prev.images.length - 1 ? prev.index + 1 : 0 }));
                                        }}
                                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
                                        className="absolute right-4 p-2 text-white rounded-full transition-colors"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </>
  );
};

const ReviewModal = ({ onClose, onSuccess }) => {
    const { isLight, colorPrimario, primaryBtnText } = useTheme();
    const primaryColor = colorPrimario || '#000fe0';
    const primaryTextColor = primaryBtnText || '#ffffff';

    const modalBg = 'bg-[var(--theme-surface)] border-[var(--theme-border-subtle)]';
    const textTitle = 'text-[var(--theme-text)]';
    const textSubtitle = 'text-[var(--theme-text-muted)]';
    const textLabel = 'text-[var(--theme-text)]';
    const inputBg = 'bg-[var(--theme-input)] border-[var(--theme-border-subtle)] text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]';
    const starEmpty = isLight ? 'text-slate-300' : 'text-slate-600';
    const borderFooter = 'border-[var(--theme-border-subtle)]';

    const ratingDescriptions = {
        1: '1 estrella — Muy deficiente',
        2: '2 estrellas — Regular / Mejorable',
        3: '3 estrellas — Buena experiencia',
        4: '4 estrellas — Muy buena experiencia',
        5: '5 estrellas — ¡Excelente experiencia!'
    };

    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        telefono: '',
        rating: 0,
        comentario: '',
        comment: ''
    });
    const [hoverRating, setHoverRating] = useState(0);
    const [files, setFiles] = useState([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [errores, setErrores] = useState({});

    // Estados para el recorte interactivo (react-easy-crop)
    const [imagenEnEdicion, setImagenEnEdicion] = useState(null); // { file: File, url: string }
    const [colaRecorte, setColaRecorte] = useState([]); // Array<{ file: File, url: string }>
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [procesandoRecorte, setProcesandoRecorte] = useState(false);

    // Limpieza de URLs temporales al desmontar
    useEffect(() => {
        return () => {
            if (imagenEnEdicion?.url) URL.revokeObjectURL(imagenEnEdicion.url);
            colaRecorte.forEach(item => {
                if (item?.url) URL.revokeObjectURL(item.url);
            });
        };
    }, [imagenEnEdicion, colaRecorte]);

    // Callbacks del recortador
    const onCropComplete = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirmCrop = async () => {
        if (!imagenEnEdicion || !croppedAreaPixels) return;
        try {
            setProcesandoRecorte(true);

            // 1. Extraer fragmento recortado con Canvas
            const croppedFile = await getCroppedImg(
                imagenEnEdicion.url,
                croppedAreaPixels,
                imagenEnEdicion.file.name
            );

            // 2. Comprimir la imagen recortada (máx 1MB WebP)
            const opciones = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/webp'
            };

            const fotoComprimida = await imageCompression(croppedFile, opciones);
            const cleanName = imagenEnEdicion.file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const finalFile = new File([fotoComprimida], cleanName, { type: 'image/webp' });

            if (import.meta.env.DEV) {
                console.log(`Original/Recortada: ${(croppedFile.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Comprimida final: ${(finalFile.size / 1024 / 1024).toFixed(2)} MB`);
            }

            setFiles(prev => [...prev, finalFile].slice(0, 3));
            setErrors(prev => {
                const rest = { ...prev };
                delete rest.images;
                delete rest.fotos;
                return rest;
            });

            // Revocar URL de objeto actual
            URL.revokeObjectURL(imagenEnEdicion.url);

            // Avanzar a la siguiente foto en cola si existe
            if (colaRecorte.length > 0) {
                const [siguiente, ...resto] = colaRecorte;
                setImagenEnEdicion(siguiente);
                setColaRecorte(resto);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCroppedAreaPixels(null);
            } else {
                setImagenEnEdicion(null);
                setColaRecorte([]);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCroppedAreaPixels(null);
            }
        } catch (error) {
            console.error('Error al procesar recorte y compresión:', error);
            alert(error.message || 'Error al procesar el recorte de la imagen.');
        } finally {
            setProcesandoRecorte(false);
        }
    };

    const handleSkipCurrentCrop = () => {
        if (!imagenEnEdicion) return;
        URL.revokeObjectURL(imagenEnEdicion.url);
        if (colaRecorte.length > 0) {
            const [siguiente, ...resto] = colaRecorte;
            setImagenEnEdicion(siguiente);
            setColaRecorte(resto);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
        } else {
            setImagenEnEdicion(null);
            setColaRecorte([]);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
        }
    };

    const handleCancelAllCrop = () => {
        if (imagenEnEdicion?.url) URL.revokeObjectURL(imagenEnEdicion.url);
        colaRecorte.forEach(item => {
            if (item?.url) URL.revokeObjectURL(item.url);
        });
        setImagenEnEdicion(null);
        setColaRecorte([]);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const handleCloseModal = () => {
        handleCancelAllCrop();
        onClose();
    };

    // Motor estricto de reglas
    const validarCampo = (name, value) => {
        let error = '';
        const val = (value || '').trim();
        
        if (!val) {
            error = 'Este campo es obligatorio.';
        } else if (name === 'correo' && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val)) {
            error = 'Ingresa un formato válido (ej. correo@dominio.com).';
        } else if (name === 'telefono' && val.replace(/\D/g, '').length !== 10) {
            error = 'El teléfono debe tener exactamente 10 dígitos.';
        } else if (name === 'nombre' && val.length < 3) {
            error = 'El nombre es muy corto.';
        } else if ((name === 'comentario' || name === 'comment') && val.length < 5) {
            error = 'El comentario debe tener al menos 5 caracteres.';
        }

        setErrores(prev => ({ ...prev, [name]: error }));
        return error;
    };

    // Validador al salir del campo
    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        validarCampo(name, value);
    };

    // Limpieza de errores en tiempo real al escribir
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            ...(name === 'comentario' ? { comment: value } : {}),
            ...(name === 'comment' ? { comentario: value } : {})
        }));
        
        // Si el campo ya tenía un error, evaluarlo mientras escribe para borrar el texto rojo
        if (touched[name]) {
            validarCampo(name, value);
        }
    };

    const handlePhoneChange = (e) => {
        // \D elimina cualquier carácter que NO sea número. slice(0,10) corta exactamente al llegar a 10.
        const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, telefono: valorLimpio }));
        
        if (touched.telefono) {
            validarCampo('telefono', valorLimpio);
        }
    };

    const handleFileChange = (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const selected = Array.from(e.target.files);

        if (files.length + selected.length > 3) {
            const msg = `Solo puedes subir un máximo de 3 fotografías. Actualmente tienes ${files.length} foto(s).`;
            alert(msg);
            setErrors(prev => ({ ...prev, images: [msg] }));
            e.target.value = '';
            return;
        }

        const validQueue = [];
        for (const archivo of selected) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
                alert(`El archivo "${archivo.name}" no es válido. Solo se admiten JPG, PNG o WebP.`);
                continue;
            }
            if (archivo.size > 10 * 1024 * 1024) {
                alert(`La imagen "${archivo.name}" supera el límite máximo de 10MB.`);
                continue;
            }
            validQueue.push({
                file: archivo,
                url: URL.createObjectURL(archivo)
            });
        }

        e.target.value = '';

        if (validQueue.length === 0) return;

        // Iniciar flujo de recorte con el primer archivo válido
        const [primero, ...resto] = validQueue;
        setImagenEnEdicion(primero);
        setColaRecorte(resto);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setErrors(prev => {
            const rest = { ...prev };
            delete rest.images;
            return rest;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        // Marcar todos los campos como tocados al intentar enviar
        setTouched({
            nombre: true,
            correo: true,
            telefono: true,
            comentario: true
        });

        const errNombre = validarCampo('nombre', formData.nombre);
        const errCorreo = validarCampo('correo', formData.correo);
        const errTelefono = validarCampo('telefono', formData.telefono);
        const commentVal = (formData.comentario || formData.comment || '').trim();
        const errComentario = validarCampo('comentario', commentVal);

        if (errNombre || errCorreo || errTelefono || errComentario) {
            return;
        }

        if (!formData.rating || formData.rating <= 0) {
            alert('Por favor selecciona tu calificación tocando al menos una estrella.');
            return setErrors({ rating: ['Por favor selecciona tu calificación (1 a 5 estrellas).'] });
        }

        // Validación estricta en JavaScript antes del axios.post (sin tocar backend)
        if (files.length > 3) {
            const msg = 'Has seleccionado más de 3 fotografías. El límite son 3 imágenes.';
            alert(msg);
            return setErrors({ images: [msg] });
        }

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                const msg = `La imagen "${file.name}" supera el límite de 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB). Reduce su tamaño o elige otra imagen.`;
                alert(msg);
                return setErrors({ images: [msg] });
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                const msg = `El archivo "${file.name}" no es válido. Solo se admiten imágenes JPG, PNG o WebP.`;
                alert(msg);
                return setErrors({ images: [msg] });
            }
        }

        setSubmitting(true);
        const data = new FormData();
        data.append('nombre', formData.nombre.trim());
        data.append('name', formData.nombre.trim());
        data.append('correo', formData.correo.trim());
        data.append('email', formData.correo.trim());
        data.append('telefono', formData.telefono.trim());
        data.append('phone', formData.telefono.trim());
        data.append('rating', formData.rating);
        data.append('comentario', commentVal);
        data.append('comment', commentVal);

        // Empaquetar las fotos comprimidas con 'fotos[]' e 'images[]'
        if (files && files.length > 0) {
            files.forEach((foto) => {
                data.append('fotos[]', foto, foto.name);
                data.append('images[]', foto, foto.name);
            });
        }

        try {
            await submitReview(data);
            setIsSuccess(true);
        } catch (error) {
            if (error.response && error.response.status === 429) {
                const throttleMsg = error.response?.data?.message || 'Has intentado demasiadas veces. Por favor, espera un minuto antes de volver a intentarlo.';
                alert(throttleMsg);
                setErrors({ general: throttleMsg });
            } else if (error.response && error.response.status === 422) {
                console.error("Errores de validación de Laravel:", error.response.data.errors);
                const backendErrors = error.response.data.errors || {};
                setErrors(backendErrors);

                // Mapear a errores de campos en pantalla
                const nuevosErrores = {};
                if (backendErrors.nombre || backendErrors.name) nuevosErrores.nombre = (backendErrors.nombre || backendErrors.name)[0];
                if (backendErrors.correo || backendErrors.email) nuevosErrores.correo = (backendErrors.correo || backendErrors.email)[0];
                if (backendErrors.telefono || backendErrors.phone) nuevosErrores.telefono = (backendErrors.telefono || backendErrors.phone)[0];
                if (backendErrors.comentario || backendErrors.comment) nuevosErrores.comentario = (backendErrors.comentario || backendErrors.comment)[0];
                setErrores(prev => ({ ...prev, ...nuevosErrores }));

                const primerError = Object.values(backendErrors).flat()[0];
                if (primerError) {
                    setErrors(prev => ({ ...prev, general: primerError }));
                }
            } else {
                console.error("Error del servidor:", error);
                if (error.response?.data?.error) {
                    setErrors({ general: error.response.data.error });
                } else if (error.response?.data?.message) {
                    setErrors({ general: error.response.data.message });
                } else {
                    setErrors({ general: 'Ocurrió un error al enviar tu experiencia. Verifica los datos ingresados.' });
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const obtenerMensajeDeExito = (rating) => {
        // 4 o 5 Estrellas: Experiencia positiva
        if (rating >= 4) {
            return {
                titulo: "¡Gracias por su excelente calificación!",
                mensaje: "Nos alegra saber que su experiencia fue positiva. Valoramos sinceramente su retroalimentación y esperamos tener el honor de recibirle nuevamente muy pronto."
            };
        } 
        
        // 3 Estrellas: Experiencia regular
        else if (rating === 3) {
            return {
                titulo: "Agradecemos sus comentarios",
                mensaje: "Lamentamos que su experiencia no haya sido completamente satisfactoria. Tomamos nota de sus observaciones, ya que nos ayudan a identificar áreas de oportunidad para seguir mejorando nuestro servicio."
            };
        } 
        
        // 1 o 2 Estrellas: Mala experiencia
        else {
            return {
                titulo: "Le ofrecemos una sincera disculpa",
                mensaje: "Lamentamos profundamente que no hayamos cumplido con sus expectativas en esta visita. Nos tomamos muy en serio su retroalimentación y nos comprometemos a tomar las medidas necesarias para mejorar. Agradecemos que nos lo haya hecho saber."
            };
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-5 md:p-6 overflow-hidden"
        >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ backgroundColor: isSuccess ? undefined : primaryColor }}
                className={`${modalBg} rounded-2xl sm:rounded-3xl w-[86%] min-[400px]:w-[88%] sm:w-full max-w-[420px] sm:max-w-lg max-h-[80vh] sm:max-h-[85vh] flex flex-col relative my-auto shadow-2xl overflow-hidden`}
            >
                {isSuccess ? (
                    <div className="text-center p-6 sm:p-8 my-auto overflow-y-auto bg-[var(--theme-surface)] h-full flex flex-col justify-center items-center">
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer p-1">
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <div 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center"
                            style={{ backgroundColor: `${primaryColor}18` }}
                        >
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: primaryColor }} />
                        </div>
                        <h3 className={`text-xl sm:text-2xl font-serif font-bold ${textTitle} mb-2 sm:mb-3`}>
                            {obtenerMensajeDeExito(formData.rating).titulo}
                        </h3>
                        <p className={`${textSubtitle} text-xs sm:text-sm mb-5 sm:mb-6 max-w-md mx-auto leading-relaxed`}>
                            {obtenerMensajeDeExito(formData.rating).mensaje}
                        </p>
                        <button
                            onClick={() => {
                                setIsSuccess(false);
                                onSuccess();
                            }}
                            style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                            className="px-7 py-2.5 sm:px-8 sm:py-3 rounded-full font-medium shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer text-sm"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Cabecera Fija del Modal en Color Primario */}
                        <div 
                            className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 shrink-0 transition-colors rounded-t-2xl sm:rounded-t-3xl"
                            style={{ 
                                backgroundColor: primaryColor, 
                                color: primaryTextColor 
                            }}
                        >
                            <h2 className="text-sm sm:text-xl font-serif font-bold tracking-tight" style={{ color: primaryTextColor }}>
                                Comparte tu experiencia
                            </h2>
                            <button 
                                type="button"
                                onClick={handleCloseModal} 
                                style={{ color: primaryTextColor }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer -mr-1"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* Formulario con cuerpo scrolleable y pie de acciones fijo */}
                        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--theme-surface)]">
                            <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 space-y-2.5 sm:space-y-3.5">
                                {errors.general && (
                                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 sm:p-2.5 rounded-lg text-xs">
                                        {errors.general}
                                    </div>
                                )}

                                {/* Primer Nivel: Calificación (Estrellas centradas con color primario) */}
                                <div 
                                    style={{ 
                                        boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.12)'
                                    }}
                                    className="flex flex-col items-center justify-center p-2 sm:py-3 sm:px-4 rounded-xl sm:rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-border-subtle)] text-center"
                                >
                                    <label className={`block text-[10px] sm:text-xs font-bold uppercase tracking-wider ${textSubtitle} mb-0.5 sm:mb-1`}>
                                        ¿Cómo calificarías tu experiencia?
                                    </label>
                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const activeRating = hoverRating || formData.rating;
                                            const isFilled = star <= activeRating;
                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setFormData({...formData, rating: star})}
                                                    className="focus:outline-none p-0.5 sm:p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                                >
                                                    <Star 
                                                        className={`w-5 h-5 sm:w-7 sm:h-7 transition-colors ${isFilled ? 'drop-shadow-sm' : starEmpty}`}
                                                        style={isFilled ? { color: primaryColor, fill: primaryColor } : {}}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {(hoverRating || formData.rating) > 0 ? (
                                        <span className="text-[11px] sm:text-xs font-semibold mt-0.5 sm:mt-1" style={{ color: primaryColor }}>
                                            {ratingDescriptions[hoverRating || formData.rating]}
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] sm:text-[11px] ${textSubtitle} mt-0.5 sm:mt-1 opacity-60`}>
                                            Toca una estrella para calificar
                                        </span>
                                    )}
                                    {errors.rating && <p className="text-red-500 text-xs mt-0.5 sm:mt-1 font-medium">{errors.rating[0]}</p>}
                                </div>

                                {/* Campo: Nombre Completo */}
                                <div>
                                    <label className={`block text-[11px] sm:text-sm font-medium ${textLabel} mb-0.5 sm:mb-1`}>
                                        Nombre completo <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        maxLength={100}
                                        placeholder="Ej. Juan Pérez"
                                        style={{
                                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.10)'
                                        }}
                                        className={`w-full rounded-xl border-[1.5px] px-3 sm:px-3.5 py-1.5 sm:py-2.5 outline-none transition-colors text-xs sm:text-sm dark:text-white ${
                                            (touched.nombre && errores.nombre) || errors.nombre
                                                ? 'border-red-500 bg-red-50/50 focus:border-red-600 dark:bg-red-900/20' 
                                                : 'border-slate-400 dark:border-slate-500 hover:border-slate-500 dark:hover:border-slate-400 focus:border-slate-700 dark:focus:border-slate-200 bg-white dark:bg-slate-900'
                                        }`}
                                    />
                                    {((touched.nombre && errores.nombre) || errors.nombre) && (
                                        <p className="text-red-500 text-xs font-medium mt-1 animate-pulse">{errores.nombre || errors.nombre?.[0]}</p>
                                    )}
                                </div>

                                {/* Grid para Correo y Teléfono */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <label className={`block text-[11px] sm:text-sm font-medium ${textLabel} mb-0.5 sm:mb-1`}>
                                            Correo electrónico <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="email" 
                                            name="correo"
                                            value={formData.correo}
                                            onChange={handleInputChange}
                                            onBlur={handleBlur}
                                            placeholder="ejemplo@correo.com"
                                            style={{
                                                boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.10)'
                                            }}
                                            className={`w-full rounded-xl border-[1.5px] px-3 sm:px-3.5 py-1.5 sm:py-2.5 outline-none transition-colors text-xs sm:text-sm dark:text-white ${
                                                (touched.correo && errores.correo) || errors.correo || errors.email
                                                    ? 'border-red-500 bg-red-50/50 focus:border-red-600 dark:bg-red-900/20' 
                                                    : 'border-slate-400 dark:border-slate-500 hover:border-slate-500 dark:hover:border-slate-400 focus:border-slate-700 dark:focus:border-slate-200 bg-white dark:bg-slate-900'
                                            }`}
                                        />
                                        {((touched.correo && errores.correo) || errors.correo || errors.email) && (
                                            <p className="text-red-500 text-xs font-medium mt-1 animate-pulse">{errores.correo || errors.correo?.[0] || errors.email?.[0]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={`block text-[11px] sm:text-sm font-medium ${textLabel} mb-0.5 sm:mb-1`}>
                                            Número de teléfono <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="tel" 
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handlePhoneChange}
                                            onBlur={handleBlur}
                                            placeholder="Ej. 5512345678"
                                            style={{
                                                boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.10)'
                                            }}
                                            className={`w-full rounded-xl border-[1.5px] px-3 sm:px-3.5 py-1.5 sm:py-2.5 outline-none transition-colors text-xs sm:text-sm dark:text-white ${
                                                (touched.telefono && errores.telefono) || errors.telefono || errors.phone
                                                    ? 'border-red-500 bg-red-50/50 focus:border-red-600 dark:bg-red-900/20' 
                                                    : 'border-slate-400 dark:border-slate-500 hover:border-slate-500 dark:hover:border-slate-400 focus:border-slate-700 dark:focus:border-slate-200 bg-white dark:bg-slate-900'
                                            }`}
                                        />
                                        {((touched.telefono && errores.telefono) || errors.telefono || errors.phone) && (
                                            <p className="text-red-500 text-xs font-medium mt-1 animate-pulse">{errores.telefono || errors.telefono?.[0] || errors.phone?.[0]}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tercer Nivel: Comentario */}
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                                        <label className={`block text-[11px] sm:text-sm font-medium ${textLabel}`}>
                                            Comentario <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                                            {(formData.comentario || '').length} / 1000
                                        </span>
                                    </div>
                                    <textarea 
                                        name="comentario"
                                        value={formData.comentario}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        maxLength={1000}
                                        rows="2"
                                        placeholder="¿Cómo fue el servicio, el ambiente y los sabores de tu visita?"
                                        style={{
                                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.10)'
                                        }}
                                        className={`w-full rounded-xl border-[1.5px] p-2 sm:p-3 outline-none transition-colors resize-none text-xs sm:text-sm dark:text-white ${
                                            (touched.comentario && errores.comentario) || errors.comentario || errors.comment
                                                ? 'border-red-500 bg-red-50/50 focus:border-red-600 dark:bg-red-900/20' 
                                                : 'border-slate-400 dark:border-slate-500 hover:border-slate-500 dark:hover:border-slate-400 focus:border-slate-700 dark:focus:border-slate-200 bg-white dark:bg-slate-900'
                                        }`}
                                    ></textarea>
                                    {((touched.comentario && errores.comentario) || errors.comentario || errors.comment) && (
                                        <p className="text-red-500 text-xs font-medium mt-0.5 animate-pulse">{errores.comentario || errors.comentario?.[0] || errors.comment?.[0]}</p>
                                    )}
                                </div>

                                {/* Cuarto Nivel: Fotografías */}
                                <div>
                                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                        <label className={`block text-[11px] sm:text-sm font-medium ${textLabel}`}>
                                            Fotografías de tu visita <span className={`${textSubtitle} font-normal`}>(Máximo 3)</span>
                                        </label>
                                        <span className={`text-[11px] sm:text-xs font-semibold ${files.length >= 3 ? 'text-amber-500' : textSubtitle}`}>
                                            {files.length}/3 fotografías
                                        </span>
                                    </div>

                                    {/* Previsualización si hay archivos */}
                                    {files.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-2">
                                            {(files || []).map((file, index) => (
                                                <div key={index} className="relative aspect-[4/3] rounded-xl bg-[var(--theme-subcard-bg)] border-[1.5px] border-[var(--theme-border-subtle)] overflow-hidden group shadow-md">
                                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeFile(index)}
                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        title="Eliminar foto"
                                                    >
                                                        <X className="w-5 h-5 text-white" />
                                                    </button>
                                                    <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded font-bold">
                                                        #{index + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* RENDERIZADO CONDICIONAL: ¿Estamos recortando una foto inline? */}
                                    {imagenEnEdicion ? (
                                        <div className="relative w-full h-56 sm:h-64 bg-neutral-950 rounded-2xl overflow-hidden shadow-inner border border-slate-700">
                                            <Cropper
                                                image={imagenEnEdicion.url}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={4 / 3}
                                                onCropChange={setCrop}
                                                onZoomChange={setZoom}
                                                onCropComplete={onCropComplete}
                                            />

                                            {/* Indicador de foto en cola */}
                                            {colaRecorte.length > 0 && (
                                                <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white font-medium z-10 flex items-center gap-1.5 shadow">
                                                    <Crop className="w-3 h-3 text-amber-400" />
                                                    Foto actual (+{colaRecorte.length} más)
                                                </div>
                                            )}

                                            {/* Control flotante de Zoom */}
                                            <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-2 z-10 shadow">
                                                <ZoomIn className="w-3.5 h-3.5 text-white/80 shrink-0" />
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={3}
                                                    step={0.05}
                                                    value={zoom}
                                                    onChange={(e) => setZoom(Number(e.target.value))}
                                                    className="w-16 sm:w-20 h-1.5 bg-white/30 rounded-lg cursor-pointer"
                                                    style={{ accentColor: primaryColor }}
                                                />
                                                <span className="text-[11px] font-mono text-white">{zoom.toFixed(1)}x</span>
                                            </div>

                                            {/* Controles sobre el área de recorte */}
                                            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-3 px-4 z-10">
                                                <button 
                                                    type="button"
                                                    disabled={procesandoRecorte}
                                                    onClick={handleSkipCurrentCrop}
                                                    className="px-4 py-1.5 bg-black/75 hover:bg-black/90 text-white text-xs font-medium backdrop-blur-md rounded-xl border border-white/20 transition-all cursor-pointer disabled:opacity-50 shadow"
                                                >
                                                    {colaRecorte.length > 0 ? 'Omitir foto' : 'Cancelar'}
                                                </button>
                                                <button 
                                                    type="button"
                                                    disabled={procesandoRecorte}
                                                    onClick={handleConfirmCrop}
                                                    style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                                    className="px-5 py-1.5 text-xs font-semibold rounded-xl hover:brightness-110 active:scale-95 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                                                >
                                                    {procesandoRecorte ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            Procesando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            Aceptar recorte
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ZONA DE SUBIDA NORMAL */
                                        files.length < 3 && (
                                            <label 
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = primaryColor; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                                                style={{
                                                    boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.10)'
                                                }}
                                                className="w-full flex items-center justify-center gap-2.5 py-1.5 sm:py-2.5 px-2.5 sm:px-3 border-2 border-dashed border-[var(--theme-border-subtle)] rounded-xl bg-[var(--theme-input)] text-[var(--theme-text-muted)] transition-all shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/40 group cursor-pointer"
                                            >
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[var(--theme-bg)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: primaryColor }} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`text-[11px] sm:text-sm font-semibold ${textTitle} block leading-tight`}>
                                                        Haz clic para agregar fotos
                                                    </span>
                                                    <span className="text-[9px] sm:text-[11px] opacity-70 block">
                                                        PNG, JPG o WebP (Hasta 3 fotos, recorte 4:3)
                                                    </span>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/jpeg, image/png, image/webp" 
                                                    className="hidden" 
                                                    onChange={handleFileChange} 
                                                />
                                            </label>
                                        )
                                    )}

                                    {(errors['fotos'] || errors['fotos.0'] || errors['images'] || errors['images.0']) && (
                                        <p className="text-red-500 text-xs mt-1 font-medium">
                                            {errors['fotos']?.[0] || errors['fotos.0']?.[0] || errors['images']?.[0] || errors['images.0']?.[0]}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Pie de acciones fijo en la parte inferior */}
                            <div className={`px-3.5 sm:px-6 py-2 sm:py-3 border-t ${borderFooter} flex items-center justify-end gap-2 sm:gap-2.5 shrink-0 bg-[var(--theme-surface)]`}>
                                <button type="button" onClick={handleCloseModal} className={`px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm ${textSubtitle} hover:opacity-80 transition-colors font-medium cursor-pointer`}>
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting || procesandoRecorte || !!imagenEnEdicion}
                                    style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                    className="px-4 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-medium hover:brightness-110 active:scale-95 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                                    title={imagenEnEdicion ? 'Acepta o cancela el recorte de la foto antes de enviar' : ''}
                                >
                                    {submitting ? 'Enviando reseña...' : (
                                        <>Enviar experiencia <Send className="w-3.5 h-3.5 ml-1.5" /></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default Experiencias;
