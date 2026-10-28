import { afterEach, expect, it, vi } from 'vitest'
import { parseTimedReply, stripTimedReply } from '../../vendor/dialogue-timing/protocol.js'
import { ReplyClocks } from '../../src/client/segments/timing.ts'
import { DEFAULTS } from '../../src/client/segments/config.ts'
import { segmentPrompt } from '../../src/segment-prompt.ts'

afterEach(() => vi.useRealTimers())
const encode = (stages: unknown[]) => '[qq]' + JSON.stringify({ version: 1, stages }) + '[/qq]'
it('the QQ enabled switch alone controls the prompt, without device state', () => {
  let enabled = false
  const config = { segments: { get: () => ({ ...DEFAULTS, enabled }) } }
  expect(segmentPrompt(config)).toBe('')
  enabled = true
  expect(segmentPrompt(config)).toContain('QQ 分段与显示间隔')
  expect(segmentPrompt(config)).toContain('durationMs')
  expect(segmentPrompt(config)).not.toContain('speed')
  enabled = false
  expect(segmentPrompt(config)).toBe('')
})
it('validates text timing while leaving device extensions uninterpreted', () => {
  const input = encode([{ text: 'a', durationMs: 0, motion: { arbitrary: 'not a device command here' } }, { text: 'b' }])
  expect(parseTimedReply(input)?.stages).toHaveLength(2)
  expect(parseTimedReply('```\n' + input + '\n```')).toBeNull()
  expect(parseTimedReply('> ' + input)).toBeNull()
  for (const stages of [[], [{ text: '', durationMs: 100 }], [{ text: 'a', durationMs: -1 }],
    [{ text: 'a', durationMs: 120001 }], [{ text: 'a', durationMs: '100' }]]) expect(() => parseTimedReply(encode(stages))).toThrow()
  expect(stripTimedReply('hi[qq]{"version":')).toBe('hi')
  expect(stripTimedReply('hi[q')).toBe('hi')
})
it('explicit intervals override random timing and incomplete generation never starts a clock', () => {
  vi.useFakeTimers()
  const clock = new ReplyClocks(), source = encode([{ text: 'a', durationMs: 500 }, { text: 'b', durationMs: 1500 }, { text: 'c' }])
  const reply = parseTimedReply(source)!
  const config = { ...DEFAULTS, intervalMin: 8, intervalMax: 8 }
  expect(clock.project('s:1', source, reply, true, config).count).toBe(1)
  vi.advanceTimersByTime(499); expect(clock.project('s:1', source, reply, true, config).count).toBe(1)
  vi.advanceTimersByTime(1); expect(clock.project('s:1', source, reply, true, config).count).toBe(2)
  vi.advanceTimersByTime(1500); expect(clock.project('s:1', source, reply, true, config).count).toBe(3)
  expect(clock.project('s:1', source, reply, true, config).next).toBeNull()
})
it('missing intervals use configured fallback once; history and disabling reveal without replay', () => {
  vi.useFakeTimers()
  const clock = new ReplyClocks(), source = encode([{ text: 'a' }, { text: 'b' }]), reply = parseTimedReply(source)!
  const config = { ...DEFAULTS, intervalMin: .1, intervalMax: .1 }
  expect(clock.project('live', source, reply, true, config).count).toBe(1)
  vi.advanceTimersByTime(100); expect(clock.project('live', source, reply, true, config).count).toBe(2)
  expect(clock.project('history', source, reply, false, config).count).toBe(2)
  expect(clock.project('off', source, reply, true, { ...config, enabled: false }).count).toBe(2)
  expect(clock.project('off', source, reply, true, config).count).toBe(2)
})
