import { DEFAULTS, settings, type Settings } from './config.ts'
import { SplitWorker } from './worker.ts'
import { ReplyClocks } from './timing.ts'
import { Interruptions } from '../../../vendor/dialogue-timing/interruptions.js'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-chat/client'

/** Plugin-owned UI state; no session store or message write capability. */
export class Model {
  readonly clocks = new ReplyClocks()
  interruptions = new Interruptions()
  private displays = new Map<string, { session: string; blocks: readonly AssistantBlock[]; frozen: boolean }>()
  observeInput(session: string, chat: string, submissions: string): void {
    if (!this.interruptions.observe(session, chat, submissions)) return
    for (const row of this.displays.values()) if (row.session === session) row.frozen = true
    this.snapshot = { ...this.snapshot }; this.emit()
  }
  frozen(key: string, session: string, reply: { turn?: number; step?: number }): readonly AssistantBlock[] | undefined {
    const row = this.displays.get(key)
    return row?.frozen || this.interruptions.blocked(session, reply) ? row?.blocks ?? [] : undefined
  }
  remember(key: string, session: string, blocks: readonly AssistantBlock[]): void {
    if (!this.displays.get(key)?.frozen) this.displays.set(key, { session, blocks, frozen: false })
  }
  private listeners = new Set<() => void>()
  private snapshot = { config: { ...DEFAULTS, enabled: false }, status: '正在读取设置…' }
  readonly worker = new SplitWorker(message => this.report(message))
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  adopt(value: Partial<Settings>): void {
    const config = settings(value)
    if (JSON.stringify(config) === JSON.stringify(this.snapshot.config) && !this.snapshot.status) return
    if (config.regex !== this.snapshot.config.regex) this.worker.reset()
    this.snapshot = { config, status: '' }; this.emit()
  }
  report(status: string): void { this.snapshot = { ...this.snapshot, status }; this.emit() }
  private emit(): void { for (const listener of this.listeners) listener() }
  dispose(): void { this.worker.dispose(); this.listeners.clear(); this.displays.clear(); this.clocks.clear(); this.interruptions = new Interruptions() }
}
