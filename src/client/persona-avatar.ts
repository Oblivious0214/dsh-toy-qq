import { resolveImage } from './config.ts'

export interface PersonaAvatarUpdate { sessionId: string; image: string | null }
export const PERSONA_AVATAR_EVENT = 'qq-skin:persona-avatar'

/** Optional persona API. No dependency on the persona package or global QQ
 * avatar settings. Unknown sessions retry after the host binds their persona.
 */
export class PersonaAvatarClient {
  private entries = new Map<string, { image: string; checked: number; pending?: boolean }>()
  private controllers = new Set<AbortController>()
  private disposed = false
  constructor(private readonly changed: (sessionId: string) => void, private readonly request: typeof fetch = (...args) => fetch(...args)) {}

  set({ sessionId, image }: PersonaAvatarUpdate): boolean {
    if (!sessionId || sessionId.length > 512 || sessionId === '__proto__') return false
    const safe = image === null ? '' : resolveImage(image)
    if (image !== null && !safe) return false
    this.entries.set(sessionId, {image:safe, checked:Date.now()})
    this.changed(sessionId)
    return true
  }

  get(sessionId: string): string {
    if (this.disposed) return ''
    const entry = this.entries.get(sessionId)
    if (!entry?.image && !entry?.pending && (!entry || Date.now() - entry.checked >= 3000)) {
      const pending = {image:'', checked:Date.now(), pending:true}
      this.entries.set(sessionId,pending)
      const controller = new AbortController()
      this.controllers.add(controller)
      const timeout = setTimeout(() => controller.abort(), 10000)
      void this.request('/persona-switcher/session-avatar', {
        method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({sessionId}), signal:controller.signal
      }).then(async response => {
        if (!response.ok) return
        const data = await response.json() as {ok?:boolean; sessionId?:string; avatar?:unknown}
        if (!this.disposed && this.entries.get(sessionId) === pending && data.ok && data.sessionId === sessionId) {
          pending.image = resolveImage(data.avatar)
        }
      }).catch(() => {}).finally(() => {
        clearTimeout(timeout)
        this.controllers.delete(controller)
        pending.pending = false
        pending.checked = Date.now()
        if (!this.disposed && this.entries.get(sessionId) === pending) this.changed(sessionId)
      })
    }
    return entry?.image ?? ''
  }

  dispose() {
    this.disposed = true
    for (const controller of this.controllers) controller.abort()
    this.controllers.clear()
    this.entries.clear()
  }
}
