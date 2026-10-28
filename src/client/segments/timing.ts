import { delay, type Settings } from './config.ts'
interface TimedReply { stages: { text: string; durationMs?: number }[] }

/** Cached clocks survive React remounts; reopening history never starts them. */
export class ReplyClocks {
  readonly openedAt = Date.now()
  private rows = new Map<string, { source: string; start: number; deadlines: number[]; done: boolean }>()
  clear(): void { this.rows.clear() }
  project(key: string, source: string, reply: TimedReply, live: boolean, config: Settings) {
    let row = this.rows.get(key)
    if (!row || row.source !== source) {
      let elapsed = 0
      row = { source, start: Date.now(), done: !live || !config.enabled || !config.animate,
        deadlines: reply.stages.map(stage => { const at = elapsed; elapsed += stage.durationMs ?? delay(stage.text, config); return at }) }
      this.rows.set(key, row)
      if (this.rows.size > 500) this.rows.delete(this.rows.keys().next().value!)
    }
    if (!config.enabled || !config.animate) row.done = true
    if (row.done) return { count: reply.stages.length, next: null }
    const elapsed = Date.now() - row.start
    const count = row.deadlines.filter(at => at <= elapsed).length
    const next = row.deadlines[count]
    if (next === undefined) row.done = true
    return { count, next: next === undefined ? null : Math.max(1, next - elapsed) }
  }
}
