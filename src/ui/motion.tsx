import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { cx } from './primitives'

/**
 * Soft circle that blooms where the finger lands on anything tappable inside the phone frame.
 * One listener on the frame covers every screen and every sheet portalled into it.
 */
export function TapRipples({ target }: { target: RefObject<HTMLElement | null> }) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const nextId = useRef(0)

  useEffect(() => {
    const frame = target.current
    if (!frame) return
    const onPointerDown = (event: PointerEvent) => {
      const hit = (event.target as Element | null)?.closest('button, label, a, [role="radio"], [role="switch"]')
      if (!hit || hit.matches(':disabled, [aria-disabled="true"], [data-disabled]')) return
      const rect = frame.getBoundingClientRect()
      const id = ++nextId.current
      setRipples((list) => [...list, { id, x: event.clientX - rect.left, y: event.clientY - rect.top }])
      window.setTimeout(() => setRipples((list) => list.filter((ripple) => ripple.id !== id)), 650)
    }
    frame.addEventListener('pointerdown', onPointerDown)
    return () => frame.removeEventListener('pointerdown', onPointerDown)
  }, [target])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[70] overflow-hidden">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute size-[72px] animate-tap-ripple rounded-full bg-brand-accent/20 shadow-[0_0_0_7px_rgb(8_127_114_/_0.02)]"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  )
}

/** Donut gauge. `value` is 0-1; the arc draws in from empty on mount and eases between values. */
export function ProgressRing({ value, size = 88, stroke = 9, tone = 'brand', children, label }: {
  value: number
  size?: number
  stroke?: number
  tone?: 'brand' | 'caution'
  label: string
  children?: ReactNode
}) {
  const gradientId = useId()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped])

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {tone === 'brand' ? (
              <>
                <stop offset="0%" stopColor="#14957f" />
                <stop offset="100%" stopColor="#0b5d58" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#e8a83d" />
                <stop offset="100%" stopColor="#8a5300" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-brand-soft" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - drawn)}
          className={cx('transition-[stroke-dashoffset] duration-[900ms] ease-(--ease-sheet)', drawn === 0 && 'opacity-0')}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

/** Blurred cover with a spinning arc while a transfer is processed (mirrors the reference "sending" state). */
export function ProcessingOverlay({ active, title, detail }: { active: boolean; title: string; detail: string }) {
  return (
    <div
      inert={!active}
      className={cx(
        'absolute inset-0 z-[45] grid place-items-center bg-canvas/55 backdrop-blur-md transition-opacity duration-300',
        active ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div role="status" aria-live="polite" className={cx('flex flex-col items-center text-center transition-transform duration-300 ease-(--ease-sheet)', active ? 'scale-100' : 'scale-95')}>
        {active && (
          <>
            <span className="relative grid size-[76px] place-items-center rounded-full bg-surface shadow-[0_14px_34px_rgb(11_93_88_/_0.036)]">
              <svg viewBox="0 0 48 48" className="size-14 animate-spin-arc" aria-hidden="true">
                <circle cx="24" cy="24" r="19" fill="none" strokeWidth="4" className="stroke-brand-soft" />
                <circle cx="24" cy="24" r="19" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="40 120" className="stroke-brand-accent" />
              </svg>
            </span>
            <p className="mt-4 text-[16px] font-semibold text-ink">{title}</p>
            <p className="mt-1 text-[13px] text-ink-muted">{detail}</p>
          </>
        )}
      </div>
    </div>
  )
}

/** Round icon badge that sits across the top edge of a card or sheet, with a soft pulse behind it. */
export function EdgeBadge({ children, tone = 'brand', className }: { children: ReactNode; tone?: 'brand' | 'pass'; className?: string }) {
  return (
    <span aria-hidden="true" className={cx('pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2', className)}>
      <span className="grid size-[68px] animate-badge-pop place-items-center rounded-full bg-surface shadow-[0_10px_26px_rgb(11_93_88_/_0.04)]">
        <span className="relative grid size-[50px] place-items-center">
          <span className={cx('absolute inset-0 animate-badge-pulse rounded-full', tone === 'pass' ? 'bg-pass' : 'bg-brand-accent')} />
          <span className={cx('relative grid size-full place-items-center rounded-full text-white', tone === 'pass' ? 'bg-pass' : 'bg-brand-accent')}>{children}</span>
        </span>
      </span>
    </span>
  )
}
