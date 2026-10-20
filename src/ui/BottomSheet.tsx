import type { ReactNode, RefObject } from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { X } from 'lucide-react'
import { cx } from './primitives'
import { EdgeBadge } from './motion'

/**
 * Bottom sheet rendered inside the phone frame (not the whole desktop window).
 * Swipe down, the close button, or a tap on the backdrop dismiss it.
 */
export function BottomSheet({ open, onOpenChange, container, title, description, children, closeLabel, badge }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: RefObject<HTMLElement | null>
  title: ReactNode
  description?: ReactNode
  closeLabel: string
  children: ReactNode
  /** Icon for a round badge across the sheet's top edge; the header is then centred under it. */
  badge?: ReactNode
}) {
  const hasBadge = badge !== undefined
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal container={container}>
        <Drawer.Backdrop className="absolute inset-0 z-40 bg-[#06201d]/45 backdrop-blur-[3px] opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[400ms] ease-(--ease-sheet) data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
        <Drawer.Viewport className="absolute inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup className={cx('relative -mb-12 flex w-full flex-col rounded-t-[32px] bg-canvas pb-12 shadow-float outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] ease-(--ease-sheet) data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-swiping:select-none', hasBadge ? 'max-h-[calc(100%-2.5rem+3rem)]' : 'max-h-[calc(92%+3rem)]')}>
            {hasBadge && <EdgeBadge>{badge}</EdgeBadge>}
            <div aria-hidden="true" className={cx('mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong', hasBadge && 'invisible')} />
            <Drawer.Content className="flex min-h-0 flex-1 flex-col">
              <div className={cx('relative flex shrink-0 items-start gap-3 px-5 pb-3 short:pb-2', hasBadge ? 'pt-9 text-center short:pt-8' : 'pt-3')}>
                <div className={cx('min-w-0 flex-1', hasBadge && 'px-9')}>
                  <Drawer.Title className="text-[22px] font-bold leading-tight tracking-tight text-ink short:text-[20px]">{title}</Drawer.Title>
                  {description && <Drawer.Description className="mt-1 text-sm leading-snug text-ink-muted">{description}</Drawer.Description>}
                </div>
                <Drawer.Close aria-label={closeLabel} className={cx('grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-muted shadow-card hover:text-ink', hasBadge && 'absolute -top-1 right-4')}>
                  <X size={19} />
                </Drawer.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
