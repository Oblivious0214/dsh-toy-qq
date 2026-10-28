/** QQ-owned adapter over Fish's public slot registrations; Fish files stay untouched. */
import { createElement, useSyncExternalStore, type ComponentType } from 'react'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'

export class VoiceReplyPreference {
  private value = false
  private readonly listeners = new Set<() => void>()
  constructor() {
    try {
      const saved = window.localStorage.getItem('qq-skin.voice-replies')
      this.value = saved === null ? window.localStorage.getItem('fish-tts.autoplay') === '1' : saved === '1'
    } catch { /* session-only preference */ }
  }
  enabled = () => this.value
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  set = (value: boolean) => {
    this.value = value
    try { window.localStorage.setItem('qq-skin.voice-replies', value ? '1' : '0') } catch { /* session-only */ }
    for (const listener of this.listeners) listener()
  }
}

// entries() is the host's type-erased public inspection API. Only these three
// known Fish cells are shadowed; the originals remain registered for unload.
export interface FishSlots {
  entries(name: string): readonly StoredEntry[]
  subscribe(name: string, listener: () => void): () => void
  inject(name: string, mount: () => () => void): unknown
  register(options: Record<string, unknown>, component: ComponentType<Record<string, unknown>>): () => void
}

export function installFishReplies(slots: FishSlots, preference: VoiceReplyPreference) {
  if (typeof slots.entries !== 'function' || typeof slots.subscribe !== 'function') return () => {}
  const disposers: (() => void)[] = []
  for (const name of ['conversation.chat.assistant-actions', 'conversation.input.left', 'settings.section']) {
    slots.inject(name, () => {
      let original: StoredEntry | undefined
      let remove: (() => void) | undefined
      const refresh = () => {
        const candidate = slots.entries(name).find(entry => entry.options.id === 'fish-tts'
          && entry.options.priority !== -30 && entry.inject && !entry.store)
        if (candidate === original) return
        remove?.(); remove = undefined; original = candidate
        if (!candidate) return
        const Original = candidate.component as ComponentType<Record<string, unknown>>
        const inject = candidate.inject as () => Record<string, unknown>
        const Component = (props: Record<string, unknown>) => {
          const enabled = useSyncExternalStore(preference.subscribe, preference.enabled)
          if (name === 'conversation.chat.assistant-actions') {
            return enabled
              ? <span hidden data-qq-fish-final={String(props.messageId)} />
              : createElement(Original, { ...props, autoPlayEnabled: () => false })
          }
          if (name === 'conversation.input.left') return <button type="button"
            data-qq-voice-toggle="" aria-label="语音回复" aria-pressed={enabled}
            title={enabled ? '语音回复已开启：点击语音条连续播放' : '语音回复已关闭'}
            onClick={() => preference.set(!enabled)}
            style={{ border: 0, background: 'none', cursor: 'pointer', color: enabled ? 'var(--dsw-alias-brand-primary)' : 'inherit' }}
          >{enabled ? '◖ 语音回复' : '◖ 语音回复（关）'}</button>
          return createElement(Original, props)
        }
        remove = slots.register({ ...candidate.options, name, priority: -30,
          ...(candidate.locale ? { locale: candidate.locale } : {}),
          inject: () => ({ ...inject(),
            // Suppress Fish auto-play even while its saved preference is on.
            autoPlayEnabled: () => false,
            ...(name === 'settings.section' ? { autoPlay: preference.enabled,
              setAutoPlay: preference.set, subscribeAutoPlay: preference.subscribe } : {}),
          }),
        }, Component)
      }
      const unsubscribe = slots.subscribe(name, refresh)
      refresh()
      const dispose = () => { unsubscribe(); remove?.() }
      disposers.push(dispose)
      return dispose
    })
  }
  return () => { for (const dispose of disposers.splice(0)) dispose() }
}
