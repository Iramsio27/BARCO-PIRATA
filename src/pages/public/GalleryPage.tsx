/**
 * GalleryPage.tsx — Galería pública del Barco Pirata
 *
 * CARPETAS DE FOTOS (public/images/):
 *   onboard/   → A bordo
 *   families/  → Familias
 *   crew/      → Tripulación
 *   sunsets/   → Atardeceres
 *   action/    → Show & Acción
 *   aerial/    → Tomas aéreas (fotos)
 *
 * CARPETAS DE VIDEOS (public/images/videos/):
 *   onboard/   → Videos a bordo
 *   families/  → Videos de familias
 *   crew/      → Videos de tripulación
 *   sunsets/   → Videos de atardeceres
 *   action/    → Videos de shows
 *   aerial/    → Videos aéreos (drones)
 *
 * Solo agrega archivos a las carpetas — aparecen solos.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import '../../styles/gallery.css'

/* ── Tipos ─────────────────────────────────────────────────────────── */
type Category = 'all' | 'onboard' | 'families' | 'crew' | 'sunsets' | 'action' | 'aerial'
type MediaType = 'photo' | 'video'

interface MediaItem {
  id: string
  src: string
  type: MediaType
  category: Exclude<Category, 'all'>
  title: string
}

/* ── import.meta.glob — fotos ───────────────────────────────────────── */
const photoOnboard  = import.meta.glob('/public/images/onboard/**/*.{jpg,jpeg,png,webp}',  { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const photoFamilies = import.meta.glob('/public/images/families/**/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const photoCrew     = import.meta.glob('/public/images/crew/**/*.{jpg,jpeg,png,webp}',     { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const photoSunsets  = import.meta.glob('/public/images/sunsets/**/*.{jpg,jpeg,png,webp}',  { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const photoAction   = import.meta.glob('/public/images/action/**/*.{jpg,jpeg,png,webp}',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const photoAerial   = import.meta.glob('/public/images/aerial/**/*.{jpg,jpeg,png,webp}',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/* ── import.meta.glob — videos ─────────────────────────────────────── */
const videoOnboard  = import.meta.glob('/public/images/videos/onboard/**/*.{mp4,mov,webm}',  { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const videoFamilies = import.meta.glob('/public/images/videos/families/**/*.{mp4,mov,webm}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const videoCrew     = import.meta.glob('/public/images/videos/crew/**/*.{mp4,mov,webm}',     { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const videoSunsets  = import.meta.glob('/public/images/videos/sunsets/**/*.{mp4,mov,webm}',  { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const videoAction   = import.meta.glob('/public/images/videos/action/**/*.{mp4,mov,webm}',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const videoAerial   = import.meta.glob('/public/images/videos/aerial/**/*.{mp4,mov,webm}',   { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/* ── Helper: convierte módulos en MediaItem[] ───────────────────────── */
function toItems(
  modules: Record<string, string>,
  type: MediaType,
  category: Exclude<Category, 'all'>,
): MediaItem[] {
  return Object.entries(modules).map(([path, src]) => {
    const filename = path.split('/').pop() ?? path
    const name = filename.replace(/\.[^.]+$/, '')
    return { id: `${type}-${category}-${name}`, src, type, category, title: name }
  })
}

const ALL_ITEMS: MediaItem[] = [
  ...toItems(photoOnboard,  'photo', 'onboard'),
  ...toItems(photoFamilies, 'photo', 'families'),
  ...toItems(photoCrew,     'photo', 'crew'),
  ...toItems(photoSunsets,  'photo', 'sunsets'),
  ...toItems(photoAction,   'photo', 'action'),
  ...toItems(photoAerial,   'photo', 'aerial'),
  ...toItems(videoOnboard,  'video', 'onboard'),
  ...toItems(videoFamilies, 'video', 'families'),
  ...toItems(videoCrew,     'video', 'crew'),
  ...toItems(videoSunsets,  'video', 'sunsets'),
  ...toItems(videoAction,   'video', 'action'),
  ...toItems(videoAerial,   'video', 'aerial'),
]

/* ── Filtros ────────────────────────────────────────────────────────── */
interface FilterDef { key: Category; label: string }
const FILTERS: FilterDef[] = [
  { key: 'all',      label: 'Todas'         },
  { key: 'onboard',  label: 'A bordo'       },
  { key: 'families', label: 'Familias'      },
  { key: 'crew',     label: 'Tripulación'   },
  { key: 'sunsets',  label: 'Atardeceres'   },
  { key: 'action',   label: 'Show & Acción' },
  { key: 'aerial',   label: 'Aéreos'        },
]

/* ── SVG íconos ────────────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconPlay = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

/* ── Tile de foto ──────────────────────────────────────────────────── */
function PhotoTile({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  return (
    <div className="gal-tile gal-reveal" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <img src={item.src} alt="" loading="lazy"
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform .5s cubic-bezier(0.2,0.7,0.2,1)' }} />
    </div>
  )
}

/* ── Tile de video ─────────────────────────────────────────────────── */
function VideoTile({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="gal-tile gal-video-card gal-reveal" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 } }}>
      <video
        ref={videoRef}
        src={item.src}
        muted
        loop
        playsInline
        preload="metadata"
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="gal-video-play-overlay">
        <span className="gal-video-play-btn"><IconPlay size={22} /></span>
      </div>
    </div>
  )
}

/* ── Sección con fotos + videos + toggle ───────────────────────────── */
function MediaSection({
  category, label, photos, videos, onOpen,
}: {
  category: string
  label: string
  photos: MediaItem[]
  videos: MediaItem[]
  onOpen: (item: MediaItem) => void
}) {
  const [mediaType, setMediaType] = useState<'photos' | 'videos'>('photos')
  const [visible, setVisible] = useState(12)

  const items = mediaType === 'photos' ? photos : videos
  const hasPhotos = photos.length > 0
  const hasVideos = videos.length > 0

  if (!hasPhotos && !hasVideos) return null

  return (
    <div className="gal-section-block">
      {/* Cabecera de sección */}
      <div className="gal-section-title">
        <h2><span className="gal-accent">{label}</span></h2>
        <div className="gal-section-controls">
          {/* Toggle fotos / videos */}
          {hasPhotos && hasVideos && (
            <div className="gal-media-toggle">
              <button className={mediaType === 'photos' ? 'active' : ''} onClick={() => { setMediaType('photos'); setVisible(12) }}>
                📷 Fotos <span className="gal-count">{photos.length}</span>
              </button>
              <button className={mediaType === 'videos' ? 'active' : ''} onClick={() => { setMediaType('videos'); setVisible(12) }}>
                🎬 Videos <span className="gal-count">{videos.length}</span>
              </button>
            </div>
          )}
          {hasPhotos && !hasVideos && (
            <span className="gal-meta"><b>{photos.length}</b> fotos</span>
          )}
          {hasVideos && !hasPhotos && (
            <span className="gal-meta"><b>{videos.length}</b> videos</span>
          )}
        </div>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="gal-empty">
          <p>{mediaType === 'photos' ? '📷' : '🎬'}</p>
          <p>Sin {mediaType === 'photos' ? 'fotos' : 'videos'} en esta categoría aún.</p>
          <code>public/images/{mediaType === 'videos' ? 'videos/' : ''}{category}/</code>
        </div>
      ) : (
        <section className="gal-photo-grid">
          {items.slice(0, visible).map((item) => (
            item.type === 'photo'
              ? <PhotoTile key={item.id} item={item} onClick={() => onOpen(item)} />
              : <VideoTile key={item.id} item={item} onClick={() => onOpen(item)} />
          ))}
        </section>
      )}

      {visible < items.length && (
        <div className="gal-load-more">
          <button onClick={() => setVisible((v) => v + 12)}>
            Ver más <IconChevronDown />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Hook: reveal on scroll ────────────────────────────────────────── */
function useReveal(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target) } }),
      { threshold: 0.08 },
    )
    container.querySelectorAll('.gal-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  })
}

/* ────────────────────────────────────────────────────────────────────
   Componente principal
   ──────────────────────────────────────────────────────────────────── */
export default function GalleryPage() {
  const { t } = useTranslation()

  const [activeFilter, setActiveFilter] = useState<Category>('all')
  const [search, setSearch]             = useState('')
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null)
  const [lbList, setLbList]             = useState<MediaItem[]>([])
  const [lbIdx, setLbIdx]               = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef as React.RefObject<HTMLElement>)

  const todayIso = format(new Date(), 'yyyy-MM-dd')

  /* Conteo real por categoría (fotos + videos) */
  const counts = useMemo(() => {
    const c: Record<Category, number> = { all: ALL_ITEMS.length, onboard: 0, families: 0, crew: 0, sunsets: 0, action: 0, aerial: 0 }
    ALL_ITEMS.forEach((i) => { c[i.category]++ })
    return c
  }, [])

  /* Items filtrados por búsqueda */
  const filtered = useMemo(() => {
    const base = activeFilter === 'all' ? ALL_ITEMS : ALL_ITEMS.filter((i) => i.category === activeFilter)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter((i) => i.category.includes(q) || i.title.toLowerCase().includes(q))
  }, [activeFilter, search])

  /* Helpers para separar fotos y videos por categoría */
  const photosByCategory = (cat: Exclude<Category, 'all'>) =>
    filtered.filter((i) => i.type === 'photo' && i.category === cat)
  const videosByCategory = (cat: Exclude<Category, 'all'>) =>
    filtered.filter((i) => i.type === 'video' && i.category === cat)

  /* Lightbox */
  const openLightbox = useCallback((item: MediaItem, list: MediaItem[]) => {
    const idx = list.findIndex((i) => i.id === item.id)
    setLbList(list)
    setLbIdx(idx >= 0 ? idx : 0)
    setLightboxItem(item)
  }, [])
  const closeLightbox = useCallback(() => setLightboxItem(null), [])
  const prevLb = useCallback(() => {
    setLbIdx((i) => { const next = (i - 1 + lbList.length) % lbList.length; setLightboxItem(lbList[next]); return next })
  }, [lbList])
  const nextLb = useCallback(() => {
    setLbIdx((i) => { const next = (i + 1) % lbList.length; setLightboxItem(lbList[next]); return next })
  }, [lbList])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!lightboxItem) return
      if (e.key === 'Escape')     closeLightbox()
      if (e.key === 'ArrowLeft')  prevLb()
      if (e.key === 'ArrowRight') nextLb()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lightboxItem, closeLightbox, prevLb, nextLb])

  useEffect(() => {
    document.body.style.overflow = lightboxItem ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxItem])

  /* Categorías visibles según filtro */
  const visibleCategories: { key: Exclude<Category, 'all'>; label: string }[] =
    activeFilter === 'all'
      ? [
          { key: 'onboard',  label: 'A bordo'       },
          { key: 'families', label: 'Familias'       },
          { key: 'crew',     label: 'Tripulación'    },
          { key: 'sunsets',  label: 'Atardeceres'    },
          { key: 'action',   label: 'Show & Acción'  },
          { key: 'aerial',   label: '🚁 Videos Aéreos' },
        ]
      : [{ key: activeFilter as Exclude<Category, 'all'>, label: FILTERS.find(f => f.key === activeFilter)?.label ?? '' }]

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="gal-root" ref={rootRef}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="gal-hero">
        <p className="gal-crumbs">
          <Link to="/">{t('header.home')}</Link> · {t('gallery.crumb')}
        </p>
        <h1 className="gal-h1">{t('gallery.pageTitle')}</h1>
        <p className="gal-sub">{t('gallery.pageSubtitle')}</p>
        <p className="gal-lead">{t('gallery.pageLead')}</p>
      </section>

      {/* ── FILTERS ──────────────────────────────────────────────── */}
      <div className="gal-filters-wrap">
        <div className="gal-filters">
          <div className="gal-pills">
            {FILTERS.map((f) => (
              <button key={f.key}
                className={`gal-pill${activeFilter === f.key ? ' active' : ''}`}
                onClick={() => setActiveFilter(f.key)}>
                {f.label}
                <span className="gal-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="gal-filters-right">
            <label className="gal-search">
              <IconSearch />
              <input type="text" placeholder="Buscar…" value={search}
                onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" />
            </label>
          </div>
        </div>
      </div>

      {/* ── SECCIONES POR CATEGORÍA ───────────────────────────────── */}
      {visibleCategories.map(({ key, label }) => {
        const sectionList = [...photosByCategory(key), ...videosByCategory(key)]
        return (
          <MediaSection
            key={key}
            category={key}
            label={label}
            photos={photosByCategory(key)}
            videos={videosByCategory(key)}
            onOpen={(item) => openLightbox(item, sectionList)}
          />
        )
      })}

      {filtered.length === 0 && (
        <div className="gal-empty" style={{ margin: '80px auto' }}>
          <p style={{ fontSize: 40 }}>📷</p>
          <p>No hay resultados para tu búsqueda.</p>
        </div>
      )}

      {/* ── STATS STRIP ──────────────────────────────────────────── */}
      <div className="gal-stats-strip">
        <div className="gal-stat-row">
          {[
            { num: `${ALL_ITEMS.filter(i => i.type === 'photo').length}+`, label: 'Fotos' },
            { num: `${ALL_ITEMS.filter(i => i.type === 'video').length}+`, label: 'Videos' },
            { num: '4.9', label: 'Calificación' },
            { num: '1,247', label: 'Reseñas' },
          ].map((s) => (
            <div key={s.label}>
              <p className="gal-stat-num">{s.num}</p>
              <p className="gal-stat-label">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── LIGHTBOX ─────────────────────────────────────────────── */}
      {lightboxItem && (
        <div className="gal-lightbox" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox() }}>
          <button className="gal-lb-close" onClick={closeLightbox} aria-label="Cerrar"><IconX /></button>
          <span className="gal-lb-counter">
            {String(lbIdx + 1).padStart(2, '0')} / {String(lbList.length).padStart(2, '0')}
          </span>
          <button className="gal-lb-arrow left" onClick={prevLb} aria-label="Anterior"><IconChevronLeft /></button>

          <div className="gal-lb-frame">
            {lightboxItem.type === 'photo' ? (
              <img src={lightboxItem.src} alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <video src={lightboxItem.src} controls autoPlay
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
            )}
          </div>

          <button className="gal-lb-arrow right" onClick={nextLb} aria-label="Siguiente"><IconChevronRight /></button>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <div className="gal-footer-bar">
        © {new Date().getFullYear()} Barco Pirata Perla Negra · Puerto Peñasco, Sonora
        {'  ·  '}
        <Link to={`/reservar?date=${todayIso}`} style={{ color: 'var(--gold-300)', textDecoration: 'none' }}>
          {t('header.reserveNow')} →
        </Link>
      </div>
    </div>
  )
}
