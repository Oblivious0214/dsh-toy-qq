import type { QQSkinConfig } from './config.ts'
import { imageCopy, openImageEditor, type ImageKind } from './image-editor.ts'

/** Adds accessible avatar buttons to existing and streaming assistant rows. */
export class QQImageRuntime {
  private observer: MutationObserver | undefined
  private closeEditor: (() => void) | undefined
  private buttons = new Set<HTMLButtonElement>()
  private config: QQSkinConfig

  constructor(config: QQSkinConfig, private readonly save: (kind: ImageKind, image: string) => Promise<unknown>) {
    this.config = config
    // Host tests and SSR may have no live document.
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(document.body, { childList: true, subtree: true })
    this.sync()
  }

  update(config: QQSkinConfig) {
    this.config = config
    this.sync()
  }

  edit(kind: ImageKind) {
    this.closeEditor?.()
    this.closeEditor = openImageEditor(kind, image => this.save(kind, image))
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
      if (row.querySelector(':scope > [data-qq-avatar]')) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.qqAvatar = ''
      button.title = imageCopy().avatar
      button.setAttribute('aria-label', imageCopy().avatar)
      button.onclick = () => this.edit('avatar')
      row.append(button)
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
