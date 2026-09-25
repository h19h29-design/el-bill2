import { useCallback, useEffect, useRef, useState } from 'react'

const COUNT_TARGET = 18
const COUNT_DURATION_MS = 2200
const COUNT_DELAY_MS = 320

// Ellipse matched to the approved school illustration perspective.
const ART_W = 1310
const ART_H = 484
const ORBIT_CX = 661
const ORBIT_CY = 257
const ORBIT_RX = 505
const ORBIT_RY = 177

interface Particle {
  angle: number
  lane: number
  speed: number
  size: number
}

const particles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
  angle: (i * Math.PI * 2) / 24 + Math.sin(i * 7) * 0.06,
  lane: 1 + ((i % 3) - 1) * 0.018,
  speed: 0.79 + (i % 5) * 0.055,
  size: 1.2 + (i % 3) * 0.5,
}))

const orbit = (angle: number, lane: number) => ({
  x: ORBIT_CX + Math.cos(angle) * ORBIT_RX * lane,
  y: ORBIT_CY + Math.sin(angle) * ORBIT_RY * lane,
})

const formatCount = (value: number) =>
  new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

let fallbackNow = 0
const raf = (cb: (time: number) => void): number => {
  if (typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(cb)
  }
  // jsdom fallback: deterministic 16ms frames so timer-based tests work.
  fallbackNow += 16
  const at = fallbackNow
  return window.setTimeout(() => cb(at), 16) as unknown as number
}

const caf = (id: number) => {
  if (typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id)
  } else {
    window.clearTimeout(id)
  }
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface EnergyScene {
  stageRef: React.RefObject<HTMLDivElement | null>
  sceneRef: React.RefObject<HTMLDivElement | null>
  backCanvasRef: React.RefObject<HTMLCanvasElement | null>
  frontCanvasRef: React.RefObject<HTMLCanvasElement | null>
  paused: boolean
  counting: boolean
  displayValue: string
  summary: string
  togglePaused: () => void
  replay: () => void
}

// Drives the two-layer energy orbit canvases and the demo count-up in one
// rAF loop. All browser APIs are feature-detected so jsdom tests still run.
export function useEnergyScene(overlayOpen: boolean): EnergyScene {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [paused, setPaused] = useState(prefersReducedMotion)
  const [counting, setCounting] = useState(true)
  const [displayValue, setDisplayValue] = useState(() =>
    prefersReducedMotion() ? formatCount(COUNT_TARGET) : formatCount(0),
  )
  const [summary, setSummary] = useState(
    '절감 효과를 설명하는 예시입니다.',
  )

  // Mutable frame state kept in refs so the rAF loop never goes stale.
  const pausedRef = useRef(paused)
  const overlayRef = useRef(overlayOpen)
  const sceneVisibleRef = useRef(true)
  const frameRef = useRef(0)
  const lastTimeRef = useRef(0)
  const phaseRef = useRef(0)
  const elapsedRef = useRef(-COUNT_DELAY_MS)
  const completeRef = useRef(false)
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  // True once a real 2d context exists; without it the ambient orbit
  // loop would burn frames without painting (jsdom has no canvas).
  const paintableRef = useRef(false)

  const paint = useCallback(() => {
    const back = backCanvasRef.current
    const front = frontCanvasRef.current
    if (!back || !front) return
    const backCtx = back.getContext('2d')
    const frontCtx = front.getContext('2d')
    if (!backCtx || !frontCtx) return
    paintableRef.current = true
    const { width, height, dpr } = sizeRef.current
    if (!width || !height) return
    const contexts = [backCtx, frontCtx]
    for (const ctx of contexts) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, Math.ceil(width * dpr), Math.ceil(height * dpr))
      ctx.setTransform(
        (dpr * width) / ART_W,
        0,
        0,
        (dpr * height) / ART_H,
        0,
        0,
      )
    }
    for (const [index, particle] of particles.entries()) {
      const angle = particle.angle + phaseRef.current * particle.speed
      const isFront = Math.sin(angle) > 0
      const ctx = contexts[isFront ? 1 : 0]
      const p = orbit(angle, particle.lane)
      const green = (Math.cos(angle) + 1) / 2
      const r = Math.round(255 - 102 * green)
      const g = Math.round(211 + 37 * green)
      const b = Math.round(100 + 38 * green)
      for (let i = 14; i > 0; i -= 1) {
        const a = angle - i * 0.008
        if (Math.sin(a) > 0 !== isFront) continue
        const prev = orbit(a - 0.008, particle.lane)
        const next = orbit(a, particle.lane)
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(next.x, next.y)
        ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - i / 15) * 0.58})`
        ctx.lineWidth = 2.1
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      const radius = 9 + particle.size * 2
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
      glow.addColorStop(0, `rgba(${r},${g},${b},.6)`)
      glow.addColorStop(0.25, `rgba(${r},${g},${b},.23)`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,239,.96)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      if (index % 7 === 0) {
        const length = 3.5 + Math.sin(phaseRef.current * 3 + index) * 1.2
        ctx.strokeStyle = 'rgba(255,255,237,.72)'
        ctx.lineWidth = 0.9
        ctx.beginPath()
        ctx.moveTo(p.x - length, p.y)
        ctx.lineTo(p.x + length, p.y)
        ctx.moveTo(p.x, p.y - length)
        ctx.lineTo(p.x, p.y + length)
        ctx.stroke()
      }
    }
  }, [])

  const finishCounter = useCallback(() => {
    elapsedRef.current = COUNT_DURATION_MS
    completeRef.current = true
    setCounting(false)
    setDisplayValue(formatCount(COUNT_TARGET))
    setSummary(
      `예시 절감률 ${formatCount(COUNT_TARGET)}퍼센트. 실제 분석 결과가 아닙니다.`,
    )
  }, [])

  const tickCounter = useCallback(
    (delta: number) => {
      if (completeRef.current) return
      elapsedRef.current = Math.min(
        COUNT_DURATION_MS,
        elapsedRef.current + delta,
      )
      const progress = Math.max(0, elapsedRef.current / COUNT_DURATION_MS)
      if (progress >= 1) {
        finishCounter()
        return
      }
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = formatCount(Math.floor(COUNT_TARGET * eased))
      setDisplayValue((current) => (current === next ? current : next))
    },
    [finishCounter],
  )

  const suspended = useCallback(
    () =>
      pausedRef.current ||
      overlayRef.current ||
      sceneVisibleRef.current === false ||
      (typeof document !== 'undefined' && document.hidden),
    [],
  )

  const animate = useCallback(
    (timestamp: number) => {
      frameRef.current = 0
      if (suspended()) {
        lastTimeRef.current = 0
        return
      }
      const delta = lastTimeRef.current
        ? Math.min(timestamp - lastTimeRef.current, 100)
        : 0
      phaseRef.current += delta * 0.00036
      tickCounter(delta)
      lastTimeRef.current = timestamp
      paint()
      // Keep animating while the count runs; afterwards only when the
      // orbit can actually paint so fake-timer tests never spin forever.
      if (!completeRef.current || paintableRef.current) {
        frameRef.current = raf(animate)
      }
    },
    [paint, suspended, tickCounter],
  )

  // Restart or stop the loop whenever a suspend condition changes.
  useEffect(() => {
    pausedRef.current = paused
    overlayRef.current = overlayOpen
    if (paused && !completeRef.current) finishCounter()
    caf(frameRef.current)
    frameRef.current = 0
    lastTimeRef.current = 0
    if (!suspended()) {
      frameRef.current = raf(animate)
    } else {
      paint()
    }
  }, [paused, overlayOpen, animate, paint, suspended, finishCounter])

  // Observers: visibility, resize, tab visibility, reduced-motion changes.
  useEffect(() => {
    const stage = stageRef.current
    const scene = sceneRef.current
    if (!stage || !scene) return undefined

    const resize = () => {
      const box = stage.getBoundingClientRect()
      sizeRef.current = {
        width: box.width,
        height: box.height,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      }
      const { width, height, dpr } = sizeRef.current
      for (const canvas of [backCanvasRef.current, frontCanvasRef.current]) {
        if (canvas) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
      }
      paint()
    }
    resize()

    const cleanups: Array<() => void> = []

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(resize)
      observer.observe(stage)
      cleanups.push(() => observer.disconnect())
    } else {
      window.addEventListener('resize', resize, { passive: true })
      cleanups.push(() => window.removeEventListener('resize', resize))
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          sceneVisibleRef.current = entries[0]?.isIntersecting ?? true
          if (!sceneVisibleRef.current) {
            caf(frameRef.current)
            frameRef.current = 0
            lastTimeRef.current = 0
          } else if (!suspended()) {
            frameRef.current = raf(animate)
          }
        },
        { threshold: 0 },
      )
      observer.observe(scene)
      cleanups.push(() => observer.disconnect())
    }

    const onVisibility = () => {
      if (document.hidden) {
        caf(frameRef.current)
        frameRef.current = 0
        lastTimeRef.current = 0
      } else if (!suspended()) {
        frameRef.current = raf(animate)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    cleanups.push(() =>
      document.removeEventListener('visibilitychange', onVisibility),
    )

    if (typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      const onReduced = (event: MediaQueryListEvent) => {
        setPaused(event.matches)
        if (event.matches) finishCounter()
      }
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onReduced)
        cleanups.push(() => media.removeEventListener('change', onReduced))
      }
    }

    return () => {
      caf(frameRef.current)
      frameRef.current = 0
      for (const cleanup of cleanups) cleanup()
    }
  }, [animate, paint, suspended, finishCounter])

  const togglePaused = useCallback(() => setPaused((value) => !value), [])

  const replay = useCallback(() => {
    if (pausedRef.current) return
    elapsedRef.current = 0
    completeRef.current = false
    setCounting(true)
    setDisplayValue(formatCount(0))
    setSummary('절감 효과를 설명하는 예시입니다.')
    caf(frameRef.current)
    lastTimeRef.current = 0
    if (!suspended()) frameRef.current = raf(animate)
  }, [animate, suspended])

  return {
    stageRef,
    sceneRef,
    backCanvasRef,
    frontCanvasRef,
    paused,
    counting,
    displayValue,
    summary,
    togglePaused,
    replay,
  }
}
