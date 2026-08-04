import type { AddonValues, CanvasAddonMountContext, JsonValue } from '../generated/mywallpaper-runtime'
import './styles.css'

type ResourceValue = { kind: 'live'; url: string }
type Fit = 'contain' | 'cover' | 'fill'
type Preload = 'none' | 'metadata' | 'auto'

interface Settings {
  video: ResourceValue | null
  autoplay: boolean
  loop: boolean
  muted: boolean
  showControls: boolean
  clickToToggle: boolean
  volume: number
  playbackRate: number
  startAtSeconds: number
  preload: Preload
  objectFit: Fit
  borderRadius: number
  backgroundColor: string
}

const defaults: Settings = {
  video: null,
  autoplay: true,
  loop: true,
  muted: true,
  showControls: false,
  clickToToggle: true,
  volume: 100,
  playbackRate: 1,
  startAtSeconds: 0,
  preload: 'metadata',
  objectFit: 'contain',
  borderRadius: 24,
  backgroundColor: '#0c0c0dff',
}

export function mount({ layer }: CanvasAddonMountContext): () => void {
  const root = document.createElement('main')
  root.className = 'video-player'
  layer.root.replaceChildren(root)

  let disposed = false
  let generation = 0
  let activeVideo: HTMLVideoElement | null = null
  let settings = readSettings(layer.settings.get())

  const render = (): void => {
    const current = ++generation
    releaseVideo(activeVideo)
    activeVideo = null
    root.style.borderRadius = `${clamp(settings.borderRadius, 0, 100)}px`
    root.style.background = settings.backgroundColor
    root.replaceChildren(emptyState('Choose a local video or enter a live URL'))
    if (!settings.video) return

    void layer.resources.resolve(settings.video).then((url) => {
      if (disposed || current !== generation) return
      const video = document.createElement('video')
      video.className = 'video-player__media'
      video.src = url
      video.autoplay = settings.autoplay
      video.loop = settings.loop
      video.muted = settings.muted
      video.controls = settings.showControls
      video.preload = settings.preload
      video.playsInline = true
      video.playbackRate = clamp(settings.playbackRate, 0.25, 2)
      video.volume = clamp(settings.volume, 0, 100) / 100
      video.style.objectFit = settings.objectFit

      video.addEventListener('loadedmetadata', () => {
        if (settings.startAtSeconds > 0 && Number.isFinite(video.duration)) {
          video.currentTime = Math.min(settings.startAtSeconds, video.duration)
        }
      })
      video.addEventListener('error', () => {
        if (!disposed && current === generation) root.replaceChildren(emptyState('This video cannot be played here'))
      })
      video.addEventListener('click', () => {
        if (!settings.clickToToggle) return
        if (video.paused) void video.play().catch(() => undefined)
        else video.pause()
      })
      activeVideo = video
      root.replaceChildren(video)
      if (settings.autoplay) void video.play().catch(() => undefined)
    }).catch(() => {
      if (!disposed && current === generation) root.replaceChildren(emptyState('The selected video is unavailable'))
    })
  }

  const unsubscribe = layer.settings.subscribe((values) => {
    settings = readSettings(values)
    render()
  })
  render()

  return () => {
    disposed = true
    generation += 1
    unsubscribe()
    releaseVideo(activeVideo)
    activeVideo = null
    layer.root.replaceChildren()
  }
}

function releaseVideo(video: HTMLVideoElement | null): void {
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
}

function emptyState(message: string): HTMLElement {
  const element = document.createElement('p')
  element.className = 'video-player__empty'
  element.textContent = message
  return element
}

function readSettings(values: AddonValues): Settings {
  return {
    video: isResource(values.video) ? values.video : null,
    autoplay: booleanValue(values.autoplay, defaults.autoplay),
    loop: booleanValue(values.loop, defaults.loop),
    muted: booleanValue(values.muted, defaults.muted),
    showControls: booleanValue(values.showControls, defaults.showControls),
    clickToToggle: booleanValue(values.clickToToggle, defaults.clickToToggle),
    volume: numberValue(values.volume, defaults.volume),
    playbackRate: numberValue(values.playbackRate, defaults.playbackRate),
    startAtSeconds: numberValue(values.startAtSeconds, defaults.startAtSeconds),
    preload: enumValue(values.preload, ['none', 'metadata', 'auto'], defaults.preload),
    objectFit: enumValue(values.objectFit, ['contain', 'cover', 'fill'], defaults.objectFit),
    borderRadius: numberValue(values.borderRadius, defaults.borderRadius),
    backgroundColor: stringValue(values.backgroundColor, defaults.backgroundColor),
  }
}

function isResource(value: JsonValue | undefined): value is ResourceValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && value.kind === 'live' && typeof value.url === 'string'
}

function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback }
function numberValue(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function stringValue(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback }
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}
