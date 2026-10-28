// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { QQImageRuntime } from '../src/client/image-runtime.ts'
import { QQFishVoiceRuntime } from '../src/client/fish-voice.ts'
import { QQ_SKIN_DEFAULT_CONFIG } from '../src/client/config.ts'
import { finalMessageTime } from '../src/client/fish-replies.tsx'
import { Model } from '../src/client/segments/model.ts'

const cleanups: (() => void)[] = []
const settle = () => new Promise(resolve => setTimeout(resolve, 20))
afterEach(() => { for (const fn of cleanups.splice(0)) fn(); document.body.replaceChildren(); vi.restoreAllMocks() })

function history(count: number) {
  document.body.innerHTML = '<aside id="widget"></aside><section data-conversation-session="a"><div data-chat-flow></div></section>'
  const flow = document.querySelector<HTMLElement>('[data-chat-flow]')!
  flow.innerHTML = Array.from({ length: count }, (_, n) => `<article data-chat-flow-kind="assistant-step" data-chat-turn="${n}">
    <div data-text-interaction-source>Reply ${n}</div></article>
    <footer data-chat-flow-kind="turn-tail" data-chat-turn="${n}"><span data-qq-fish-final="m${n}" data-qq-fish-time="1"></span></footer>`).join('')
  return flow
}
it('ignores unrelated widget changes, including replaced elements, with a long history', async () => {
  const flow = history(100)
  const images = new QQImageRuntime({ ...QQ_SKIN_DEFAULT_CONFIG, conversationAvatars: { a: 'data:image/png;base64,AAAA' } }, async () => {})
  const voice = new QQFishVoiceRuntime('voice-text', undefined, 'on-click')
  cleanups.push(() => images.dispose(), () => voice.dispose())
  await settle()
  const globalScan = vi.spyOn(document, 'querySelectorAll')
  const rowScan = vi.spyOn(flow, 'querySelectorAll')
  const source = document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!
  const writes = vi.spyOn(source, 'setAttribute')
  for (let n = 0; n < 8; n++) { document.querySelector('#widget')!.innerHTML = `<span>Balance ${n}</span>`; await settle() }
  expect(globalScan).not.toHaveBeenCalled()
  expect(rowScan).not.toHaveBeenCalled()
  expect(writes).not.toHaveBeenCalled()
})
it('indexes assistant rows once when one completed reply changes', async () => {
  const flow = history(100)
  const voice = new QQFishVoiceRuntime('voice-text', undefined, 'on-click')
  cleanups.push(() => voice.dispose())
  await settle()
  const scan = vi.spyOn(flow, 'querySelectorAll')
  flow.querySelector('[data-text-interaction-source]')!.textContent = 'Updated reply'
  await settle()
  expect(scan.mock.calls.filter(([selector]) => selector === '[data-chat-flow-kind="assistant-step"]')).toHaveLength(1)
  expect(flow.querySelectorAll('[data-qq-fish-button]')).toHaveLength(100)
})
it('shares the final timestamp index without rescanning history for every action cell', () => {
  let reads = 0
  const nodes = Array.from({ length: 100 }, (_, n) => ({ get kind() { reads++; return 'assistant' }, messageId: n, time: n + 1 }))
  for (let n = 0; n < 100; n++) expect(finalMessageTime(nodes, n)).toBe(n + 1)
  expect(reads).toBe(100)
})
it('clears transient display history on unload', () => {
  const model = new Model()
  for (let n = 0; n < 2000; n++) model.remember(String(n), 'a', [{ kind: 'text', text: String(n) }])
  const displays = (model as unknown as { displays: Map<string, unknown> }).displays
  expect(displays.size).toBe(2000)
  expect(model.frozen('0', 'a', { turn: 0, step: 0 })).toBeUndefined()
  model.dispose()
  expect(displays.size).toBe(0)
})
