import type { QQSkinConfig } from './config.ts'
import { imageCopy, openImageEditor, type ImageKind } from './image-editor.ts'
import { PersonaAvatarClient, PERSONA_AVATAR_EVENT, type PersonaAvatarUpdate } from './persona-avatar.ts'
export interface ImageSaveTarget { sessionId?: string; makeDefault?: boolean }

/** Adds accessible avatar buttons to existing and streaming assistant rows. */
export class QQImageRuntime {
  private observer: MutationObserver | undefined
  private closeEditor: (() => void) | undefined
  private buttons = new Set<HTMLButtonElement>()
  private config: QQSkinConfig
  private renderedImages = new WeakMap<HTMLButtonElement, string>()
  private readonly personaAvatars = new PersonaAvatarClient(session => this.sync(
    [...this.buttons].filter(button => this.sessionOf(button) === session).map(button => button.parentElement!).filter(Boolean)))
  private readonly onPersonaAvatar = (event: Event) => {
    const detail = (event as CustomEvent<PersonaAvatarUpdate>).detail
    if (detail && typeof detail.sessionId === 'string') this.setPersonaAvatar(detail)
  }

  /** Optional integration API; manual conversation avatars always take precedence. */
  setPersonaAvatar(update: PersonaAvatarUpdate): boolean {
    return this.personaAvatars.set(update)
  }

  constructor(config: QQSkinConfig, private readonly save: (kind: ImageKind, image: string, target: ImageSaveTarget) => Promise<unknown>) {
    this.config = config
    // Host tests and SSR may have no live document.
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(records => {
      const rows = new Set<HTMLElement>()
      const collect = (node: Node) => {
        if (node.nodeType !== 1) return
        const element = node as HTMLElement
        if (element.matches("[data-chat-flow-kind='assistant-step']")) rows.add(element)
        for (const row of element.querySelectorAll<HTMLElement>("[data-chat-flow-kind='assistant-step']")) rows.add(row)
      }
      let removed = false
      for (const record of records) {
        if (record.type === 'attributes') collect(record.target)
        else {
          for (const node of record.addedNodes) collect(node)
          removed ||= [...record.removedNodes].some(node => node.nodeType === 1 && ((node as Element).matches('[data-chat-flow-kind="assistant-step"],[data-qq-avatar]')
            || (node as Element).querySelector('[data-chat-flow-kind="assistant-step"],[data-qq-avatar]')))
        }
      }
      if (removed) this.prune()
      if (rows.size) this.sync(rows)
    })
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-conversation-session'] })
    document.addEventListener(PERSONA_AVATAR_EVENT, this.onPersonaAvatar)
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

  private prune() {
    for (const button of this.buttons) {
      if (!button.isConnected || !this.config.assistantAvatar) {
        button.remove()
        this.buttons.delete(button)
      }
    }
  }

  private sync(rows?: Iterable<HTMLElement>) {
    this.prune()
    if (!this.config.assistantAvatar || typeof document === 'undefined' || !document.body) return
    for (const row of rows ?? document.querySelectorAll<HTMLElement>("[data-chat-flow-kind='assistant-step']")) {
      if (!row.isConnected) continue
      let button = row.querySelector<HTMLButtonElement>(':scope > button[data-qq-avatar]')
      if (!button) {
        button = document.createElement('button')
        button.type = 'button'
        button.dataset.qqAvatar = ''
        row.append(button)
      }
      const sessionId = this.sessionOf(row)
      if (button.disabled !== !sessionId) button.disabled = !sessionId
      const title = sessionId ? imageCopy().avatar : imageCopy().unavailable
      if (button.title !== title) button.title = title
      if (button.getAttribute('aria-label') !== title) button.setAttribute('aria-label', title)
      button.onclick = () => {
        const selected = this.sessionOf(row)
        if (selected) this.edit('avatar', selected)
      }
      const image = sessionId && Object.hasOwn(this.config.conversationAvatars, sessionId)
        ? this.config.conversationAvatars[sessionId]! : sessionId ? this.personaAvatars.get(sessionId) : ''
      if (this.renderedImages.get(button) !== image) {
        button.style.backgroundImage = image ? `url("${image}")` : ''
        button.style.backgroundColor = image ? 'transparent' : ''
        button.style.boxShadow = image ? 'none' : ''
        if (image) row.style.setProperty('--qq-avatar-image', `url("${image}")`)
        else row.style.removeProperty('--qq-avatar-image')
        this.renderedImages.set(button, image)
      }
      this.buttons.add(button)
    }
  }

  dispose() {
    this.personaAvatars.dispose()
    if (typeof document !== 'undefined') document.removeEventListener(PERSONA_AVATAR_EVENT, this.onPersonaAvatar)
    this.observer?.disconnect()
    this.closeEditor?.()
    for (const button of this.buttons) { button.parentElement?.style.removeProperty('--qq-avatar-image'); button.remove() }
    this.buttons.clear()
  }
}
