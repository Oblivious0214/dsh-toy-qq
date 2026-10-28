// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Worker } from 'node:worker_threads'
import { DEFAULTS, delay, settings } from '../../src/client/segments/config.ts'
import { split } from '../../src/client/segments/split.ts'
import { WORKER_SOURCE } from '../../src/client/segments/worker-source.ts'

describe('lossless AstrBot-style segmentation', () => {
  it('matches the v4.2 punctuation, hearts, whitespace and final tail', () => {
    const text = '你好。开心～❤\uFE0F  ❤\uFE0F再聊？尾句'
    expect(split(text, DEFAULTS.regex, 1000)).toEqual(['你好。', '开心～❤\uFE0F  ❤\uFE0F', '再聊？', '尾句'])
  })
  it.each([
    ['提醒：先吃饭，再休息；别着急。下一句。', ['提醒：先吃饭，再休息；别着急。', '下一句。']],
    ['时间 12:30，说明: 保持原句; 不拆开。尾句', ['时间 12:30，说明: 保持原句; 不拆开。', '尾句']],
    ['说明：\n这一行仍是同一句。下一句。', ['说明：\n这一行仍是同一句。', '下一句。']],
    ['标题: 内容, 仍在同一句; 没有句末标点', ['标题: 内容, 仍在同一句; 没有句末标点']],
  ])('does not split at colons, commas or semicolons: %s', (text, chunks) => {
    expect(split(text, DEFAULTS.regex, 1000)).toEqual(chunks)
  })
  it('retains unmatched prefixes, gaps, capturing groups and tails', () => {
    for (const pattern of ['(。)', '(?=好)', 'x', '.*?', '']) {
      const text = ' 空白\n你好。尾句 😀'
      expect(split(text, pattern, 1000).join('')).toBe(text)
    }
  })
  it('uses the threshold as an upper limit in Unicode code points', () => {
    expect(split('😀。好。', DEFAULTS.regex, 4)).toHaveLength(2)
    expect(split('😀。好。', DEFAULTS.regex, 3)).toEqual(['😀。好。'])
    expect(split('好。'.repeat(500), DEFAULTS.regex, 1000).join('')).toHaveLength(1000)
    expect(split('好。'.repeat(500) + '尾', DEFAULTS.regex, 1000)).toHaveLength(1)
  })
  it.each(['```js\na。b！\n```', '~~~\na。b！', '`a。b！`', '**你好。再见。**', '[你好。](https://x)', '- 一。\n- 二。', 'a | b\n--- | ---', '$a。b$', '    a。b。'])('keeps formatted or incomplete Markdown intact: %s', text => {
    expect(split(text, DEFAULTS.regex, 1000)).toEqual([text])
  })
  it('bounds output and preserves every code unit', () => {
    const text = '字。'.repeat(1000)
    const result = split(text, DEFAULTS.regex, 20000)
    expect(result.length).toBeLessThanOrEqual(128)
    expect(result.join('')).toBe(text)
  })
  it('runs the shipped worker source off-thread', async () => {
    const worker = new Worker(`const {parentPort}=require('node:worker_threads'); globalThis.postMessage=x=>parentPort.postMessage(x); ${WORKER_SOURCE}; parentPort.on('message', data=>globalThis.onmessage({data}));`, { eval: true })
    try {
      const result = new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject) })
      worker.postMessage({ text: '你好。再见！', pattern: DEFAULTS.regex, threshold: 1000 })
      expect(await result).toEqual({ chunks: ['你好。', '再见！'] })
    } finally { await worker.terminate() }
  })
  it('terminates a genuinely catastrophic regex without blocking the main thread', async () => {
    const worker = new Worker(`const {parentPort}=require('node:worker_threads'); globalThis.postMessage=x=>parentPort.postMessage(x); ${WORKER_SOURCE}; parentPort.on('message', data=>globalThis.onmessage({data}));`, { eval: true })
    worker.postMessage({ text: 'a'.repeat(100) + '!', pattern: '(a+)+$', threshold: 1000 })
    const start = Date.now()
    await new Promise(resolve => setTimeout(resolve, 80))
    await worker.terminate()
    expect(Date.now() - start).toBeLessThan(1500)
  })
  it('uses installer random timing and AstrBot word-based timing', () => {
    expect(delay('你好', DEFAULTS, () => 0)).toBe(500)
    expect(delay('你好', DEFAULTS, () => 1)).toBe(1500)
    expect(delay('hello world', { ...DEFAULTS, intervalMethod: 'log' }, () => 0)).toBeCloseTo(Math.log(3) / Math.log(2.6) * 1000)
    expect(delay('hello world', { ...DEFAULTS, intervalMethod: 'log' }, () => 1)).toBeCloseTo(Math.log(3) / Math.log(2.6) * 1000 + 500)
    expect(settings({ threshold: Infinity, intervalMin: -10 }).threshold).toBe(1000)
    expect(settings({ intervalMin: -10 }).intervalMin).toBe(0)
  })
})
