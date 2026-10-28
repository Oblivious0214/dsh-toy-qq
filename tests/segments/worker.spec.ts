// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { SplitWorker } from '../../src/client/segments/worker.ts'
class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage?: (event: { data: unknown }) => void
  onerror?: () => void
  terminate = vi.fn()
  postMessage = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); FakeWorker.instances = [] })
function setup() {
  vi.useFakeTimers()
  vi.stubGlobal('Worker', FakeWorker)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const report = vi.fn()
  return { worker: new SplitWorker(report), report }
}
it('times out, restores original text, blocks the rule and disposes resources', async () => {
  const { worker, report } = setup()
  const result = worker.run('original', '(a+)+$', 1000, new AbortController().signal)
  await vi.advanceTimersByTimeAsync(500)
  expect(await result).toEqual(['original'])
  expect(report).toHaveBeenCalled()
  expect(FakeWorker.instances[0]?.terminate).toHaveBeenCalled()
  expect(await worker.run('next', '(a+)+$', 1000, new AbortController().signal)).toEqual(['next'])
  expect(FakeWorker.instances).toHaveLength(1)
  worker.dispose()
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})
it('rejects lossy results and settles active and queued jobs on teardown', async () => {
  const { worker } = setup()
  const a = worker.run('abc', 'a', 1000, new AbortController().signal)
  FakeWorker.instances[0]?.onmessage?.({ data: { chunks: ['a'] } })
  expect(await a).toEqual(['abc'])
  const b = worker.run('b', 'b', 1000, new AbortController().signal)
  const c = worker.run('c', 'c', 1000, new AbortController().signal)
  worker.dispose()
  expect(await b).toEqual(['b']); expect(await c).toEqual(['c'])
})
