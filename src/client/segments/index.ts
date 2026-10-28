import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PresentationInjected } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { QQSkinSettings } from '../settings.ts'
import { settings, type Settings } from './config.ts'
import { Model } from './model.ts'
import { createSettings } from './settings.tsx'
import { createView } from './view.tsx'
import { BUBBLE_CSS } from './bubbles.ts'


/** Register a reversible node renderer, keeping the original entry and message stores intact. */
export function installSegments(ctx: Context, host: ConfigForm<QQSkinSettings>) {
  const model = new Model()
  ctx.effect(() => () => model.dispose())
  const adopt = () => { const value = host.getSnapshot().value; if (value) model.adopt(value.segments ?? {}) }
  ctx.effect(() => host.subscribe(adopt)); adopt()

  ctx.slots.inject('conversation.chat.node', () => {
    const style = document.createElement('style')
    style.dataset.chatSegmentsStyle = ''
    style.textContent = BUBBLE_CSS
    document.head.append(style)
    let remove: (() => void) | undefined
    let original: unknown
    const refresh = () => {
      if (!model.getSnapshot().config.enabled) { remove?.(); remove = undefined; original = undefined; return }
      const entries = ctx.slots.entries('conversation.chat.node')
      const candidate = entries.find(e => e.options.key === 'assistant-step' && e.locale === 'chat' && e.children?.['conversation.chat.reasoning.body'] && e.children?.['conversation.chat.message.images'])
      if (candidate === original) return
      remove?.(); remove = undefined; original = candidate
      if (!candidate || candidate.store || !candidate.inject) { model.report('未找到兼容的助手渲染器，保持宿主原始展示。'); return }
      // The public inspection view erases types; this adapter is pinned to rc.3's native entry.
      const Original = candidate.component as Parameters<typeof createView>[1]
      const injectPresentation = candidate.inject as unknown as () => PresentationInjected
      remove = ctx.slots.register({ name: 'conversation.chat.node', key: 'assistant-step', priority: -20, locale: 'chat', inject: injectPresentation }, createView(model, Original))
    }
    const unsubscribe = ctx.slots.subscribe('conversation.chat.node', refresh)
    const stopSettings = model.subscribe(refresh)
    refresh()
    return () => { stopSettings(); unsubscribe(); remove?.(); style.remove() }
  })
  // Serialize nested writes: rapid changes cannot overwrite another segment field.
  let pending = Promise.resolve(true)
  const SettingsSection = createSettings(model, {
    set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<boolean> {
      const save = async () => {
        const snapshot = host.getSnapshot()
        if (snapshot.value === undefined) return false
        return host.set('segments', { ...settings(snapshot.value.segments), [key]: value })
      }
      const result = pending.then(save, save)
      pending = result.catch(() => false)
      return result
    },
  })
  return SettingsSection
}
