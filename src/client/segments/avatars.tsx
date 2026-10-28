import { useEffect, useState } from 'react'
import type { RefObject, CSSProperties } from 'react'

export const BUBBLE_SELECTOR = ':scope > div > div > div:not([data-turn-process-inline])'
/** The active toy QQ skin owns this layout marker. */
export const SKIN_LAYOUT_TAGS = ['style[data-plugin="dsh-qq-skin/layout"]']
type Avatar = { top: number; left: number }
type Snapshot = { source: HTMLButtonElement; style: CSSProperties; positions: Avatar[]; disabled: boolean; label: string }

/** Read the active skin's actual avatar, including conversation overrides.
 * New buttons belong to our React overlay. Host and skin nodes are never changed.
 */
export function readAvatars(root: HTMLElement): Snapshot | undefined {
  if (!SKIN_LAYOUT_TAGS.some(tag => document.querySelector(tag))) return
  const row = root.closest('[data-chat-flow-kind="assistant-step"]')
  const source = row?.querySelector<HTMLButtonElement>(':scope > button[data-qq-avatar]')
  if (!source) return
  const skin = getComputedStyle(source)
  if (!skin.backgroundImage || skin.backgroundImage === 'none') return
  const bubbles = [...root.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)]
  if (bubbles.length < 2) return
  const rect = root.getBoundingClientRect()
  return {
    source, disabled: source.disabled, label: source.getAttribute('aria-label') || '更换头像',
    style: { backgroundImage: skin.backgroundImage, backgroundColor: skin.backgroundColor, backgroundSize: skin.backgroundSize,
      backgroundPosition: skin.backgroundPosition, backgroundRepeat: skin.backgroundRepeat, boxShadow: skin.boxShadow,
      width: skin.width || '33px', height: skin.height || '33px', borderRadius: skin.borderRadius || '50%' },
    positions: bubbles.map(bubble => { const box = bubble.getBoundingClientRect(); return { top: box.top - rect.top + 8, left: box.left - rect.left - 47 } }),
  }
}

/** Per-mounted-row read-only observers follow skin hot updates and layout changes. */
export function useAvatars(root: RefObject<HTMLDivElement>, enabled: boolean): Snapshot | undefined {
  const [snapshot, setSnapshot] = useState<Snapshot>()
  useEffect(() => {
    if (!enabled || !root.current) { setSnapshot(undefined); return }
    const element = root.current
    const row = element.closest('[data-chat-flow-kind="assistant-step"]') ?? element
    let frame: number | undefined
    let stopped = false
    const sync = () => {
      frame = undefined
      if (stopped) return
      const next = readAvatars(element)
      setSnapshot(previous => {
        if (!previous || !next) return previous === next ? previous : next
        if (previous.source === next.source && previous.disabled === next.disabled && previous.label === next.label
          && JSON.stringify(previous.style) === JSON.stringify(next.style) && JSON.stringify(previous.positions) === JSON.stringify(next.positions)) return previous
        return next
      })
    }
    const schedule = () => { if (frame === undefined && !stopped) frame = requestAnimationFrame(sync) }
    const observer = new MutationObserver(schedule)
    observer.observe(row, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'disabled', 'aria-label'] })
    observer.observe(document.head, { subtree: true, childList: true, characterData: true })
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
    resize?.observe(element)
    window.addEventListener('resize', schedule)
    sync()
    return () => { stopped = true; if (frame !== undefined) cancelAnimationFrame(frame); observer.disconnect(); resize?.disconnect(); window.removeEventListener('resize', schedule) }
  }, [root, enabled])
  return enabled ? snapshot : undefined
}

/** Clicks delegate to the skin editor, preserving its per-conversation save behavior. */
export function AvatarOverlay({ snapshot }: { snapshot: Snapshot }) {
  return <aside data-segment-avatar-layer="" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {snapshot.positions.map((position, index) => <button key={index} type="button" data-segment-avatar=""
      aria-label={`${snapshot.label} · 第 ${index + 1} 段`} disabled={snapshot.disabled}
      onClick={() => snapshot.source.isConnected && snapshot.source.click()}
      style={{ ...snapshot.style, position: 'absolute', top: position.top, left: position.left, padding: 0, border: 0, pointerEvents: 'auto', cursor: snapshot.disabled ? 'default' : 'pointer' }} />)}
  </aside>
}
