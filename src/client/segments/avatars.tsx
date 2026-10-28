import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'

export const BUBBLE_SELECTOR = ':scope > div > div > div:not([data-turn-process-inline])'
type Snapshot = { source: HTMLButtonElement; bubbles: HTMLElement[]; disabled: boolean; label: string }

/** Native bubble containers provide positioning; no geometry or computed-style reads. */
export function readAvatars(root: HTMLElement): Snapshot | undefined {
  const row = root.closest('[data-chat-flow-kind="assistant-step"]')
  const source = row?.querySelector<HTMLButtonElement>(':scope > button[data-qq-avatar]')
  if (!source) return
  const bubbles = [...root.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)]
  if (bubbles.length < 2) return
  return { source, bubbles, disabled: source.disabled, label: source.getAttribute('aria-label') || '更换头像' }
}

/** Only structural changes in this reply can change the portal targets. */
export function useAvatars(root: RefObject<HTMLDivElement>, enabled: boolean): Snapshot | undefined {
  const [snapshot, setSnapshot] = useState<Snapshot>()
  useEffect(() => {
    if (!enabled || !root.current) { setSnapshot(undefined); return }
    const element = root.current
    const row = element.closest('[data-chat-flow-kind="assistant-step"]') ?? element
    const sync = () => {
      const next = readAvatars(element)
      setSnapshot(previous => {
        if (!previous || !next) return previous === next ? previous : next
        return previous.source === next.source && previous.disabled === next.disabled && previous.label === next.label
          && previous.bubbles.length === next.bubbles.length && previous.bubbles.every((bubble, i) => bubble === next.bubbles[i]) ? previous : next
      })
    }
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes]
        .some(node => node.nodeType === 1 && !(node as Element).matches('[data-segment-avatar]')))) sync()
    })
    observer.observe(row, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-label'] })
    sync()
    return () => observer.disconnect()
  }, [root, enabled])
  return enabled ? snapshot : undefined
}

/** React owns each button; CSS inherits the conversation avatar and anchors it to its bubble. */
export function AvatarOverlay({ snapshot }: { snapshot: Snapshot }) {
  return <>{snapshot.bubbles.map((bubble, index) => createPortal(
    <button type="button" data-segment-avatar="" aria-label={snapshot.label + ' · 第 ' + (index + 1) + ' 段'} disabled={snapshot.disabled}
      onClick={() => snapshot.source.isConnected && snapshot.source.click()} />, bubble, String(index)))}</>
}
