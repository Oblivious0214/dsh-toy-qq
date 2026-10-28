// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { Model } from '../../src/client/segments/model.ts'
import { createView } from '../../src/client/segments/view.tsx'
import { DEFAULTS } from '../../src/client/segments/config.ts'
import { split } from '../../src/client/segments/split.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const models: Model[] = []
const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount()); for (const model of models.splice(0)) model.dispose(); document.body.replaceChildren(); vi.useRealTimers() })
async function fixture(status = 'settled', text = '你好。再见。') {
  const model = new Model(); models.push(model); model.adopt(DEFAULTS)
  vi.spyOn(model.worker, 'run').mockImplementation(async (text, pattern, threshold) => split(text, pattern, threshold))
  const original = Object.freeze({ kind: 'text', text })
  const props = { node: { kind: 'assistant-step', data: { blocks: Object.freeze([original]), status } } }
  // Minimal native-renderer probe observes only the received display projection.
  const Native = ({ node }: typeof props) => <div>{node.data.blocks.map((b, i) => <p key={i}>{b.text}</p>)}</div>
  const View = createView(model, Native as unknown as Parameters<typeof createView>[1])
  const container = document.createElement('div'); document.body.append(container)
  const root = createRoot(container); roots.push(root)
  const render = async () => { await act(async () => root.render(createElement(View, props as unknown as Parameters<typeof View>[0]))) }
  await render()
  return { model, props, container, render, original }
}
it('uses externally timed toy stages immediately without re-splitting or random waits', async () => {
  vi.useFakeTimers()
  const f = await fixture('running')
  Object.assign(f.props.node.data, { dshToyTimeline: true })
  f.props.node.data.blocks = Object.freeze([Object.freeze({ kind: 'text', text: '第一段。仍是同一段。' })])
  await f.render()
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  expect(f.container.textContent).toBe('第一段。仍是同一段。')
  await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  f.props.node.data.blocks = Object.freeze([...f.props.node.data.blocks, Object.freeze({ kind: 'text', text: '第二段。' })])
  await f.render()
  expect(f.container.querySelectorAll('p')).toHaveLength(2)
  expect(f.container.textContent).toBe('第一段。仍是同一段。第二段。')
})
it('segments history immediately, preserves frozen data and restores on settings change', async () => {
  const f = await fixture()
  expect(f.container.querySelectorAll('p')).toHaveLength(2)
  expect(f.props.node.data.blocks).toEqual([{ kind: 'text', text: '你好。再见。' }])
  await act(async () => f.model.adopt({ ...DEFAULTS, enabled: false }))
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  expect(f.container.textContent).toBe('你好。再见。')
  await act(async () => f.model.adopt({ ...DEFAULTS, regex: '。' }))
  expect(f.container.querySelectorAll('p')).toHaveLength(2)
})
it('paces live replies and releases the final tail after completion', async () => {
  vi.useFakeTimers()
  const f = await fixture('running')
  expect(f.container.querySelectorAll('p')).toHaveLength(0)
  await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  f.props.node.data.status = 'settled'; await f.render()
  await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
  expect(f.container.querySelectorAll('p')).toHaveLength(2)
})
it('shows protected streaming code immediately without a playback button', async () => {
  const code = await fixture('running', '```js\nhello。\n```')
  expect(code.container.querySelector('p')?.textContent).toBe('```js\nhello。\n```')
  const f = await fixture('running')
  expect(f.container.querySelector('button')).toBeNull()
})
it('retains an already shown title while streaming prose arrives and releases the tail', async () => {
  vi.useFakeTimers()
  const f = await fixture('running', '# 标题')
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  f.props.node.data.blocks = Object.freeze([Object.freeze({ kind: 'text', text: '# 标题\n首句。第二句。' })])
  await f.render()
  expect(f.container.querySelectorAll('p')).toHaveLength(1)
  await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
  expect(f.container.querySelectorAll('p')).toHaveLength(2)
  f.props.node.data.status = 'settled'; await f.render()
  await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
  expect(f.container.querySelectorAll('p')).toHaveLength(3)
  expect(f.container.querySelector('button')).toBeNull()
})
