// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { installSegments } from '../../src/client/segments/index.ts'
import type { QQSkinSettings } from '../../src/client/settings.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it.each([true, false])('saves through the QQ form and reports rejected writes (accepted=%s)', async accepted => {
  const ctx = new Context()
  ctx.provide('slots', { inject: () => {} } as never)
  let value: QQSkinSettings = { palette: 'green', segments: { repeatAvatars: false, intervalMin: .8 } }
  const listeners = new Set<() => void>()
  const set = vi.fn(async (key: string, next: unknown) => {
    if (accepted) { value = { ...value, [key]: next }; for (const fn of listeners) fn() }
    return accepted
  })
  const Settings = installSegments(ctx, {
    getSnapshot: () => ({ value }), set,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) },
  } as never)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(Settings)) })
    await act(async () => { container.querySelector<HTMLButtonElement>('[role=switch]')!.click() })
    expect(set).toHaveBeenCalledExactlyOnceWith('segments', expect.objectContaining({
      enabled: false, repeatAvatars: false, intervalMin: .8,
    }))
    expect(value.palette).toBe('green')
    if (accepted) {
      expect(value.segments?.enabled).toBe(false)
      expect(container.querySelector<HTMLButtonElement>('[role=switch]')!.getAttribute('aria-checked')).toBe('false')
    } else {
      expect(container.querySelector('[role=status]')?.textContent).toContain('设置保存失败')
      expect(container.querySelector<HTMLButtonElement>('[role=switch]')!.getAttribute('aria-checked')).toBe('true')
    }
  } finally {
    await act(async () => root.unmount())
    container.remove()
    await ctx.fiber.dispose()
  }
  expect(listeners.size).toBe(0)
})
