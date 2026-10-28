// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '../../../deepseek-harness/packages/client/ui-renderer/lib/types/client/registry.js'
import { apply } from '../../src/client/index.ts'
import { DEFAULTS } from '../../src/client/segments/config.ts'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'

let builtApply: typeof apply
runInNewContext(readFileSync(resolve('lib/client.js'), 'utf8'), { window: { __ModuleLoader__: { load: ({ id, factory }: { id: string; factory: (require: ReturnType<typeof createRequire>) => { apply: typeof apply } }) => {
  expect(id).toBe('dsh-qq-skin'); builtApply = factory(createRequire(resolve('package.json'))).apply
} } }, setTimeout, clearTimeout, URL, Blob, Worker: undefined, document, console })

it.each([['source', apply], ['compiled closure', builtApply!]] as const)('%s registers through real Cordis and restores native entry on disable/unload', async (_label, apply) => {
  const ctx = new Context()
  new SlotRegistry(ctx)
  const changes = new Set<() => void>()
  let config = { segments: { ...DEFAULTS } }
  ctx.provide('theme', { overrideTokens: () => () => {} } as never)
  ctx.provide('locale', { register: () => () => {}, bind: () => () => 'QQ聊天界面' } as never)
  ctx.provide('configForms', { get: () => ({ getSnapshot: () => ({ value: config }), subscribe: (fn: () => void) => { changes.add(fn); return () => changes.delete(fn) } }) } as never)
  ctx.slots.register({ name: 'root', children: { 'conversation.chat.node': { kind: 'keyed', scope: 'session' }, 'settings.general.item': { kind: 'list', scope: 'root' }, 'settings.section': { kind: 'list', scope: 'root' } } } as never, (() => null) as never)
  const Native = () => null
  ctx.slots.register({ name: 'conversation.chat.node', key: 'assistant-step', locale: 'chat', children: { 'conversation.chat.reasoning.body': { kind: 'single', scope: 'session' }, 'conversation.chat.message.images': { kind: 'single', scope: 'session' } }, inject: () => ({ hooks: { presentation: {} } }) } as never, Native as never)
  const native = ctx.slots.entries('conversation.chat.node')[0]
  const fiber = ctx.plugin({ apply })
  await new Promise(resolve => setTimeout(resolve, 20))
  expect(ctx.slots.entries('conversation.chat.node')).toHaveLength(2)
  expect(ctx.slots.entriesOfSlot('conversation.chat.node')[0]).not.toBe(native)
  expect(native?.component).toBe(Native)
  expect(ctx.slots.entries('settings.general.item')).toHaveLength(0)
  expect(ctx.slots.entries('settings.section').map(entry => [entry.options.id, entry.options.label])).toEqual([['qq-interface', expect.any(Function)]])
  config = { segments: { ...config.segments, enabled: false } }; for (const fn of changes) fn()
  expect(ctx.slots.entriesOfSlot('conversation.chat.node')[0]).toBe(native)
  config = { segments: { ...config.segments, enabled: true } }; for (const fn of changes) fn()
  expect(ctx.slots.entries('conversation.chat.node')).toHaveLength(2)
  await fiber.dispose()
  expect(ctx.slots.entriesOfSlot('conversation.chat.node')[0]).toBe(native)
  expect(ctx.slots.entries('settings.general.item')).toHaveLength(0)
  expect(ctx.slots.entries('settings.section')).toHaveLength(0)
  expect(changes.size).toBe(0)
  expect(document.querySelector('[data-chat-segments-style]')).toBeNull()
  await ctx.fiber.dispose()
})
