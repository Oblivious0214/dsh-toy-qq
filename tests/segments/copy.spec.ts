// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { selectedSource } from '../../src/client/segments/copy.ts'
it('copies contiguous original prose across visual paragraph boundaries, including gaps', () => {
  const root = document.createElement('div'); root.innerHTML = '<p>你好。</p><p>再见！</p>'; document.body.append(root)
  const selection = document.getSelection()!
  const range = document.createRange(); range.selectNodeContents(root); selection.removeAllRanges(); selection.addRange(range)
  expect(selectedSource(root, '你好。\n\n再见！', selection)).toBe('你好。\n\n再见！')
  range.setStart(root.firstElementChild!.firstChild!, 1); range.setEnd(root.lastElementChild!.firstChild!, 1)
  selection.removeAllRanges(); selection.addRange(range)
  expect(selectedSource(root, '你好。\n\n再见！', selection)).toBe('好。\n\n再')
  selection.removeAllRanges(); root.remove()
})
