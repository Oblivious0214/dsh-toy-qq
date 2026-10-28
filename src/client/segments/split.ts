import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { mathFromMarkdown } from 'mdast-util-math'
import { gfm } from 'micromark-extension-gfm'
import { math } from 'micromark-extension-math'

type Node = { type: string; children?: Node[] | undefined; position?: { start: { offset?: number | undefined }; end: { offset?: number | undefined } } | undefined }
type Span = { start: number; end: number }
const span = (node: Node): Span => ({ start: node.position?.start.offset ?? 0, end: node.position?.end.offset ?? 0 })

/** Worker-only: Markdown spans constrain regex cuts; results are unchanged source slices. */
export function split(text: string, pattern: string, threshold: number): string[] {
  if (!text || text.length > 40000 || Array.from(text).length > threshold || pattern.length > 512) return [text]
  const regex = new RegExp(pattern, 'gmsu')
  const root = fromMarkdown(text, {
    extensions: [gfm({ singleTilde: false }), math()],
    mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()],
  })
  const nodes: Node[] = root.children
  const boundaries = new Set<number>()
  // Keep reference links / footnotes with their definitions, without duplicating source.
  const containsReference = (node: Node): boolean => /^(?:linkReference|imageReference|footnoteReference|definition|footnoteDefinition)$/.test(node.type)
    || (node.children?.some(containsReference) ?? false)
  const references = nodes.filter(containsReference).map(span)
  const island = references.length ? { start: Math.min(...references.map(s => s.start)), end: Math.max(...references.map(s => s.end)) } : undefined
  const mathIslands: Span[] = []
  const compatibilityMath = /\\\([\s\S]*?(?:\\\)|$)|\\\[[\s\S]*?(?:\\\]|$)/g
  for (let match = compatibilityMath.exec(text); match; match = compatibilityMath.exec(text)) {
    if (nodes.some(n => n.type === 'code' && match!.index >= span(n).start && match!.index < span(n).end)) continue
    mathIslands.push({ start: match.index, end: match.index + match[0].length })
  }
  for (const node of nodes) {
    const block = span(node)
    if (island && block.start >= island.start && block.end <= island.end) {
      boundaries.add(island.start); boundaries.add(island.end); continue
    }
    boundaries.add(block.start); boundaries.add(block.end)
    if (node.type !== 'paragraph') continue
    const protectedSpans: Span[] = []
    for (const child of node.children ?? []) {
      const range = span(child)
      if (child.type !== 'text') { protectedSpans.push(range); continue }
      // Unclosed streaming inline constructs appear as text. Keep their tail intact.
      const source = text.slice(range.start, range.end)
      const markers = /`+|\*+|_+|\[|\$+|~~|\\[([]/g
      for (let match = markers.exec(source); match; match = markers.exec(source)) {
        let slashes = 0
        for (let i = match.index - 1; i >= 0 && source[i] === '\\'; i--) slashes++
        if (slashes % 2) continue
        // The host accepts CJK-adjacent emphasis that CommonMark leaves as text.
        // Pair these delimiters without reparsing or changing the authored syntax.
        const close = match[0] === '\\(' ? '\\)' : match[0] === '\\[' ? '\\]' : match[0]
        const closing = match[0] === '[' ? -1 : source.indexOf(close, match.index + match[0].length)
        if (closing >= 0) {
          const end = closing + close.length
          protectedSpans.push({ start: range.start + match.index, end: range.start + end })
          markers.lastIndex = end
          continue
        }
        protectedSpans.push({ start: range.start + match.index, end: block.end }); break
      }
    }
    const source = text.slice(block.start, block.end)
    // Host-supported TeX compatibility delimiters are atomic too.
    const mathSpans = /\\\([\s\S]*?(?:\\\)|$)|\\\[[\s\S]*?(?:\\\]|$)/g
    for (let match = mathSpans.exec(source); match; match = mathSpans.exec(source)) protectedSpans.push({ start: block.start + match.index, end: block.start + match.index + match[0].length })
    // Preserve standalone bold titles and short leading unpunctuated title lines.
    const firstLine = source.match(/^[^\r\n]+\r?\n/)
    if (firstLine) {
      const line = firstLine[0].trim()
      const end = block.start + firstLine[0].length
      if ((/^\*\*[^\n]+\*\*$/.test(line) || block.start === 0 && line.length <= 40 && !/[。？！.!?：:]/.test(line))
        && !protectedSpans.some(s => end > s.start && end < s.end)) boundaries.add(end)
    }
    regex.lastIndex = 0
    for (;;) {
      const match = regex.exec(source)
      if (!match) break
      if (!match[0].length) {
        const point = source.codePointAt(regex.lastIndex)
        regex.lastIndex += point !== undefined && point > 0xffff ? 2 : 1
        continue
      }
      const end = block.start + match.index + match[0].length
      if (!protectedSpans.some(s => end > s.start && end < s.end)) boundaries.add(end)
      if (boundaries.size >= 512) break
    }
  }
  const chunks: string[] = []
  let start = 0
  for (const end of [...boundaries, text.length].filter(end => !mathIslands.some(s => end > s.start && end < s.end)).sort((a, b) => a - b)) {
    if (end <= start) continue
    const piece = text.slice(start, end)
    if (!piece.trim()) {
      if (chunks.length) { chunks[chunks.length - 1] += piece; start = end }
      continue
    }
    if (chunks.length === 127) break
    chunks.push(piece); start = end
  }
  if (start < text.length) {
    const tail = text.slice(start)
    if (!tail.trim() && chunks.length) chunks[chunks.length - 1] += tail
    else chunks.push(tail)
  }
  return chunks.length ? chunks : [text]
}
