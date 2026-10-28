import { DEFAULTS, settings, type Settings } from './config.ts'
import { SplitWorker } from './worker.ts'

/** Plugin-owned UI state; no session store or message write capability. */
export class Model {
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
  dispose(): void { this.worker.dispose(); this.listeners.clear() }
}
