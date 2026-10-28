import type { QQSkinConfig } from './config.ts'
import { imageCopy, openImageEditor, type ImageKind } from './image-editor.ts'
export interface ImageSaveTarget { sessionId?: string; makeDefault?: boolean }

/** Adds accessible avatar buttons to existing and streaming assistant rows. */
export class QQImageRuntime {
  private observer: MutationObserver | undefined
  private closeEditor: (() => void) | undefined
  private buttons = new Set<HTMLButtonElement>()
  private config: QQSkinConfig
  private renderedImages = new WeakMap<HTMLButtonElement, string>()

  constructor(config: QQSkinConfig, private readonly save: (kind: ImageKind, image: string, target: ImageSaveTarget) => Promise<unknown>) {
    this.config = config
    // Host tests and SSR may have no live document.
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-conversation-session'] })
    this.sync()
  }

  update(config: QQSkinConfig) {
    this.config = config
    this.sync()
  }

  edit(kind: ImageKind, sessionId?: string) {
    this.closeEditor?.()
    // Capture the selected conversation; switching tabs during cropping must not change the target.
    this.closeEditor = openImageEditor(kind, (image, makeDefault = false) =>
      this.save(kind, image, sessionId ? { sessionId, makeDefault } : {}),
    kind === 'avatar' ? { avatarScope: sessionId ? 'conversation' : 'default' } : {})
  }

  private sessionOf(row: HTMLElement) {
    const id = row.closest('[data-conversation-session]')?.getAttribute('data-conversation-session')
    return id && id.length <= 512 && id !== '__proto__' ? id : undefined
  }

  private sync() {
    for (const button of this.buttons) {
      if (!button.isConnected || !this.config.assistantAvatar) {
        button.remove()
        this.buttons.delete(button)
      }
    }
    if (!this.config.assistantAvatar || typeof document === 'undefined' || !document.body) return
    for (const row of document.querySelectorAll<HTMLElement>("[data-chat-flow-kind='assistant-step']")) {
      let button = row.querySelector<HTMLButtonElement>(':scope > button[data-qq-avatar]')
      if (!button) {
        button = document.createElement('button')
        button.type = 'button'
        button.dataset.qqAvatar = ''
        row.append(button)
      }
      const sessionId = this.sessionOf(row)
      button.disabled = !sessionId
      button.title = sessionId ? imageCopy().avatar : imageCopy().unavailable
      button.setAttribute('aria-label', button.title)
      button.onclick = () => {
        const selected = this.sessionOf(row)
        if (selected) this.edit('avatar', selected)
      }
      const image = sessionId && Object.hasOwn(this.config.conversationAvatars, sessionId)
        ? this.config.conversationAvatars[sessionId]! : ''
      if (this.renderedImages.get(button) !== image) {
        button.style.backgroundImage = image ? `url("${image}")` : ''
        button.style.backgroundColor = image ? 'transparent' : ''
        button.style.boxShadow = image ? 'none' : ''
        this.renderedImages.set(button, image)
      }
      this.buttons.add(button)
    }
  }

  dispose() {
    this.observer?.disconnect()
    this.closeEditor?.()
    for (const button of this.buttons) button.remove()
    this.buttons.clear()
  }
}
