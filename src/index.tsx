import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFiles, useSettings, useViewport } from '@mywallpaper/sdk-react'

type SourceType = 'file' | 'url'
type ObjectFitMode = 'contain' | 'cover' | 'fill'
type PreloadMode = 'none' | 'metadata' | 'auto'

interface Settings {
  sourceType: SourceType
  videoUrl: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  showControls: boolean
  clickToTogglePlayback: boolean
  playbackRate: number
  volume: number
  startAtSeconds: number
  preload: PreloadMode
  objectFit: ObjectFitMode
  borderRadius: number
  backgroundColor: string
}

const DEFAULT_SETTINGS: Settings = {
  sourceType: 'file',
  videoUrl: '',
  autoplay: true,
  loop: true,
  muted: true,
  showControls: false,
  clickToTogglePlayback: true,
  playbackRate: 1,
  volume: 100,
  startAtSeconds: 0,
  preload: 'metadata',
  objectFit: 'contain',
  borderRadius: 24,
  backgroundColor: '#0C0C0D',
}

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
}

function mergeSettings(raw: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...raw }
}

function normalizeHex(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return DEFAULT_SETTINGS.backgroundColor
}

function inferMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] ?? ''
  return MIME_BY_EXTENSION[ext] ?? ''
}

export default function VideoPlayer() {
  const files = useFiles()
  const rawSettings = useSettings<Partial<Settings>>()
  const settings = mergeSettings(rawSettings)
  const viewport = useViewport()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const localUrlRef = useRef<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const sourceUrl = settings.sourceType === 'url' ? settings.videoUrl.trim() : fileUrl
  const sourceMimeType = useMemo(() => (sourceUrl ? inferMimeType(sourceUrl) : ''), [sourceUrl])
  const hasSource = Boolean(sourceUrl)
  const radius = Math.max(0, Math.min(48, settings.borderRadius))

  useEffect(() => {
    if (settings.sourceType !== 'file') {
      if (localUrlRef.current) {
        files.release(localUrlRef.current)
        localUrlRef.current = null
      }
      setFileUrl(null)
      return
    }

    let cancelled = false
    setLoadError(null)

    void files
      .request('videoFile')
      .then((url) => {
        if (cancelled) {
          if (url) files.release(url)
          return
        }

        if (localUrlRef.current && localUrlRef.current !== url) files.release(localUrlRef.current)
        localUrlRef.current = url
        setFileUrl(url)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFileUrl(null)
        setLoadError(error instanceof Error ? error.message : 'Unable to load local file')
      })

    return () => {
      cancelled = true
    }
  }, [files, settings.sourceType])

  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        files.release(localUrlRef.current)
        localUrlRef.current = null
      }
    }
  }, [files])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = settings.muted
    video.loop = settings.loop
    video.controls = settings.showControls
    video.playbackRate = settings.playbackRate
    video.volume = Math.max(0, Math.min(1, settings.volume / 100))
  }, [settings.loop, settings.muted, settings.playbackRate, settings.showControls, settings.volume, sourceUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoadedMetadata = (): void => {
      setIsReady(true)
      if (settings.startAtSeconds > 0 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(settings.startAtSeconds, Math.max(0, video.duration || settings.startAtSeconds))
      }
    }

    const onError = (): void => {
      setLoadError('This video format is not supported here')
      setIsReady(false)
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('error', onError)
    }
  }, [settings.startAtSeconds, sourceUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasSource) return

    setIsReady(false)
    setLoadError(null)

    if (settings.autoplay) {
      void video.play().catch(() => {
        // Browser policy can block autoplay for unmuted media.
      })
    } else {
      video.pause()
    }
  }, [hasSource, settings.autoplay, sourceUrl])

  const handleTogglePlayback = (): void => {
    if (!settings.clickToTogglePlayback) return
    const video = videoRef.current
    if (!video || !hasSource) return

    if (video.paused) {
      void video.play().catch(() => {
        // Keep silent on play rejection.
      })
      return
    }

    video.pause()
  }

  const wrapperStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    borderRadius: radius,
    background: normalizeHex(settings.backgroundColor),
    display: 'grid',
    placeItems: 'center',
  }

  const emptyStateStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    textAlign: 'center',
    color: '#F4F4F5',
    background: normalizeHex(settings.backgroundColor),
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    fontSize: viewport.width < 360 ? 14 : 15,
    lineHeight: 1.4,
  }

  const videoStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: settings.objectFit,
    display: 'block',
    background: normalizeHex(settings.backgroundColor),
  }

  if (loadError) {
    return (
      <div style={wrapperStyle}>
        <div style={emptyStateStyle}>{loadError}</div>
      </div>
    )
  }

  if (!hasSource) {
    return (
      <div style={wrapperStyle}>
        <div style={emptyStateStyle}>
          {settings.sourceType === 'file' ? 'Select a local video file' : 'Enter a direct video URL'}
        </div>
      </div>
    )
  }

  return (
    <div style={wrapperStyle} onClick={handleTogglePlayback}>
      <video
        ref={videoRef}
        src={sourceUrl ?? undefined}
        style={videoStyle}
        autoPlay={settings.autoplay}
        loop={settings.loop}
        muted={settings.muted}
        controls={settings.showControls}
        playsInline
        preload={settings.preload}
      >
        {sourceMimeType ? <source src={sourceUrl ?? undefined} type={sourceMimeType} /> : null}
      </video>

      {!isReady && !settings.showControls ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            color: '#F4F4F5',
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
            fontSize: viewport.width < 360 ? 14 : 15,
            pointerEvents: 'none',
          }}
        >
          Loading video
        </div>
      ) : null}
    </div>
  )
}
