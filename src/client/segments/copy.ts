/** Map a native plain-prose selection back to the exact source substring.
 * Reads DOM text only; never edits host nodes. Declines ambiguous/complex selections.
 */
export function selectedSource(root: Element, source: string, selection: Selection | null): string | undefined {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const map: { display: number; source: number; length: number }[] = []
  let display = 0, cursor = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    if (!text) continue
    const start = source.indexOf(text, cursor)
    if (start < 0) return
    map.push({ display, source: start, length: text.length })
    display += text.length; cursor = start + text.length
  }
  const offset = (node: Node, end: number) => {
    const prefix = document.createRange(); prefix.selectNodeContents(root); prefix.setEnd(node, end)
    return prefix.toString().length
  }
  const start = offset(range.startContainer, range.startOffset)
  const end = offset(range.endContainer, range.endOffset)
  if (start === 0 && end === display) return source
  const startPart = map.find(part => start >= part.display && start < part.display + part.length)
  const endPart = map.find(part => end > part.display && end <= part.display + part.length)
  if (!startPart || !endPart) return
  return source.slice(startPart.source + start - startPart.display, endPart.source + end - endPart.display)
}
