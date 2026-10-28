// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { createElement, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { AssistantNodeView } from '../../../deepseek-harness/packages/client/ui-chat/src/client/chat/AssistantNodeView.tsx'
import { Model } from '../../src/client/segments/model.ts'
import { createView } from '../../src/client/segments/view.tsx'
import { DEFAULTS } from '../../src/client/segments/config.ts'
import { split } from '../../src/client/segments/split.ts'
import { BUBBLE_CSS } from '../../src/client/segments/bubbles.ts'
import { article } from './article.ts'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it.each([
  ['你好。再见！', 2, 3, '你好。', '再见！'],
  [article.replace('好好吃饭', '**好好吃饭**'), 18, 19, '好好吃饭', '一个人住的第三年，我学会了一件事：再忙，也要坐下来吃饭。'],
  [article.replace('好好吃饭', '# 好好吃饭'), 17, 19, '好好吃饭', '一个人住的第三年，我学会了一件事：再忙，也要坐下来吃饭。'],
] as const)('renders native Markdown with individual bubbles for %s', async (text, paragraphCount, bubbleCount, first, second) => {
  const model = new Model(); model.adopt(DEFAULTS)
  vi.spyOn(model.worker, 'run').mockImplementation(async (text, pattern, threshold) => split(text, pattern, threshold))
  const View = createView(model, AssistantNodeView)
  const data = Object.freeze({ status: 'settled', blocks: Object.freeze([{ kind: 'text', text }, { kind: 'text', text: '```js\nconst x = "你好。"\n```' }]) })
  const props = {
    node: { kind: 'assistant-step', location: { kind: 'unresolved' }, data },
    useTurnData: () => undefined,
    usePresentation: (select: (policy: object) => unknown) => select({ foldedReplies: 'all' }),
    useDisclosure: () => { const [expanded, setExpanded] = useState(false); return { expanded, setExpanded, toggle: () => setExpanded(!expanded) } },
    useGroupAction: () => useRef(null), t: (key: string) => key,
    renderFactorySlot: () => null,
  }
  const container = document.createElement('div'); container.dataset.chatFlowKind = 'assistant-step'; document.body.append(container)
  const slot = document.createElement('div'); slot.dataset.slot = 'conversation.chat.node'; container.append(slot)
  const root = createRoot(slot)
  const style = document.createElement('style'); style.textContent = BUBBLE_CSS; document.head.append(style)
  try {
    await act(async () => root.render(createElement(View, props as never)))
    expect(slot.querySelectorAll('p')).toHaveLength(paragraphCount)
    expect(slot.querySelector('code')?.textContent).toContain('const x = "你好。"')
    expect(container.querySelector("[data-slot] > [class*='_root']")).toBeNull()
    const bubbles = slot.querySelectorAll('[data-chat-segments-bubbles] > div > div > div:not([data-turn-process-inline])')
    expect(bubbles).toHaveLength(bubbleCount)
    expect(bubbles[0]?.textContent).toBe(first)
    expect(bubbles[1]?.textContent).toBe(second)
    expect(getComputedStyle(bubbles[0]!).borderRadius).toBe('16px 16px 16px 6px')
    expect(data.blocks[0]?.text).toBe(text)
  } finally { act(() => root.unmount()); model.dispose(); container.remove(); style.remove() }
})
