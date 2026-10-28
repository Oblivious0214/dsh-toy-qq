// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { split } from '../../src/client/segments/split.ts'
import { DEFAULTS } from '../../src/client/segments/config.ts'
import { article } from './article.ts'
const divide = (text: string) => split(text, DEFAULTS.regex, 1000)
it.each(['好好吃饭', '**好好吃饭**', '# 好好吃饭'])('splits the complete user article with title %s', title => {
  const source = article.replace('好好吃饭', title)
  const chunks = divide(source)
  expect(chunks).toHaveLength(18)
  expect(chunks[0]?.trim()).toBe(title)
  expect(chunks.join('')).toBe(source)
})
it.each(['**重点。还在加粗。**', '*斜体。内容。*', '[链接。内容](https://example.com)', '`代码。内容`', '$a。b$', '\\(a。b\\)'])('protects inline %s while splitting surrounding prose', inline => {
  const source = `第一句。${inline}后面。最后。`
  expect(divide(source)).toEqual(['第一句。', `${inline}后面。`, '最后。'])
})
it.each(['```js\nconst s = "。"\n```', '~~~js\nx。\n~~~', '- 项目一。\n- 项目二。', '> 引用一。\n> 引用二。', '| a | b |\n|---|---|\n| 一。 | 二。 |', '$$\na。b\n$$', '\\[\na。\n\nb。\n\\]'])('keeps a structured block intact between prose: %s', block => {
  const source = `前句。下一句。\n\n${block}\n\n后句。再见。`
  const chunks = divide(source)
  expect(chunks.map(c => c.trim())).toEqual(['前句。', '下一句。', block, '后句。', '再见。'])
  expect(chunks.join('')).toBe(source)
})
it.each(['**未闭合。还在写', '`未闭合。还在写', '[未闭合。还在写', '$未闭合。还在写'])('keeps streaming inline tail intact: %s', tail => {
  expect(divide(`前句。${tail}`)).toEqual(['前句。', tail])
})
it('keeps an unfinished fenced tail then releases following prose once closed', () => {
  const prefix = '前句。\n\n```js\na。b。'
  expect(divide(prefix)).toEqual(['前句。\n\n', '```js\na。b。'])
  const closed = prefix + '\n```\n\n后句。尾句。'
  expect(divide(closed).map(c => c.trim())).toEqual(['前句。', '```js\na。b。\n```', '后句。', '尾句。'])
})
it('keeps reference definitions with their consumers, while splitting surrounding paragraphs', () => {
  const source = '前句。下一句。\n\n[链接][id]。引用句。\n\n[id]: https://example.com\n\n后句。尾句。'
  const chunks = divide(source)
  expect(chunks.map(c => c.trim())).toEqual(['前句。', '下一句。', '[链接][id]。引用句。\n\n[id]: https://example.com', '后句。', '尾句。'])
  expect(chunks.join('')).toBe(source)
})
