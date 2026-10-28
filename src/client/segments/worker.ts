import { WORKER_SOURCE } from './worker-source.ts'

type Job = { text: string; pattern: string; threshold: number; resolve: (chunks: string[]) => void; signal: AbortSignal }
/** One worker per plugin, bounded queue and a hard timeout for untrusted regex. */
export class SplitWorker {
  private queue: Job[] = []
  private active: Job | undefined
  private worker: Worker | undefined
  private url: string | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private blocked = new Set<string>()
  private disposed = false
  constructor(private report: (message: string) => void) {}
  isBlocked(pattern: string): boolean { return this.blocked.has(pattern) }
  run(text: string, pattern: string, threshold: number, signal: AbortSignal): Promise<string[]> {
    if (this.disposed || signal.aborted || this.blocked.has(pattern) || this.queue.length >= 64) return Promise.resolve([text])
    return new Promise(resolve => {
      this.queue.push({ text, pattern, threshold, signal, resolve })
      this.next()
    })
  }
  private next(): void {
    if (this.active || this.disposed) return
    const job = this.queue.shift()
    if (!job) return
    if (job.signal.aborted || this.blocked.has(job.pattern)) { job.resolve([job.text]); this.next(); return }
    this.active = job
    try {
      if (!this.worker) {
        this.url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
        this.worker = new Worker(this.url)
      }
      this.worker.onmessage = event => {
        if (event.data.error) this.fail('正则无效，已显示原文。修改规则后重试。')
        else {
          const chunks: unknown = event.data.chunks
          if (!Array.isArray(chunks) || chunks.length > 128 || !chunks.every(c => typeof c === 'string') || chunks.join('') !== job.text) this.fail('分段结果无效，已显示原文。')
          else this.finish(chunks)
        }
      }
      this.worker.onerror = () => this.fail('后台分段不可用，已显示原文。')
      this.timer = setTimeout(() => this.fail('正则执行超时，已停用此规则并显示原文。请简化规则。'), 500)
      this.worker.postMessage({ text: job.text, pattern: job.pattern, threshold: job.threshold })
    } catch { this.fail('浏览器不允许后台分段，已显示原文。') }
  }
  private finish(chunks: string[]): void {
    clearTimeout(this.timer)
    const job = this.active
    this.active = undefined
    job?.resolve(chunks)
    this.next()
  }
  private fail(message: string): void {
    if (this.active) this.blocked.add(this.active.pattern)
    this.stopWorker()
    this.report(message)
    this.finish([this.active?.text ?? ''])
  }
  private stopWorker(): void {
    this.worker?.terminate(); this.worker = undefined
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = undefined
  }
  reset(): void { this.blocked.clear() }
  dispose(): void {
    this.disposed = true
    clearTimeout(this.timer)
    this.stopWorker()
    this.active?.resolve([this.active.text]); this.active = undefined
    for (const job of this.queue) job.resolve([job.text])
    this.queue = []
  }
}
