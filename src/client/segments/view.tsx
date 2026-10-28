import { createElement, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentType } from 'react'
import type { AssistantBlock, ChatNodeViewProps, PresentationInjected } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { InjectFace, PropsRenderSlots, FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import { delay } from './config.ts'
import type { Model } from './model.ts'
import { eligible } from './plain.ts'
import { selectedSource } from './copy.ts'
import { AvatarOverlay, useAvatars } from './avatars.tsx'
import { parseTimedReply, stripTimedReply } from '../../../vendor/dialogue-timing/protocol.js'

type Props = ChatNodeViewProps<'assistant-step'> & InjectFace<PresentationInjected>
type OriginalProps = Props & Pick<PropsRenderSlots<'conversation.chat.reasoning.body' | 'conversation.chat.message.images'>, 'renderSlot'>

/** Create a React-owned display projection around the inspected native renderer. */
export function createView(model: Model, Original: ComponentType<OriginalProps>) {
  return function SegmentedView(props: Props) {
    const { config, status } = useSyncExternalStore(model.subscribe, model.getSnapshot)
    const originalBlocks = props.node.data.blocks
    // The toy plugin has already projected the stages on its shared motion/text clock.
    // This is a renderer-only flag, never taken from model text or persisted history.
    const externalTimeline = (props.node.data as typeof props.node.data & { dshToyTimeline?: boolean }).dshToyTimeline === true
    const running = props.node.data.status === 'running'
    const final = props.node.data.finalNode
    const replyIdentity = final ?? props.node.data
    const displayKey = `${props.sessionId}:${props.node.data.turn ?? ''}:${props.node.data.step ?? final?.messageId ?? ''}`
    const frozen = externalTimeline ? undefined : model.frozen(displayKey, props.sessionId, replyIdentity)
    const identity = `${props.sessionId}:${final?.messageId ?? ''}`
    const previousIdentity = useRef(identity)
    const live = useRef(running)
    if (previousIdentity.current !== identity) {
      previousIdentity.current = identity
      live.current = running
    }
    if (running) live.current = true
    const source = originalBlocks.filter(block => block.kind === 'text').map(block => block.text).join('')
    const decoded = useMemo(() => {
      try { return { reply: externalTimeline ? null : parseTimedReply(source), error: '' } }
      catch { return { reply: null, error: '分段回复格式无效，请让 AI 重试。' } }
    }, [source, externalTimeline])
    const reply = decoded.reply
    const key = `${props.sessionId}:${final?.messageId ?? source}`
    const progress = reply && !running ? model.clocks.project(key, source, reply,
      live.current || (final?.time ?? 0) > model.clocks.openedAt, config) : null
    const [, tick] = useState(0)
    useEffect(() => {
      if (frozen || externalTimeline || running || progress?.next == null) return
      const timer = setTimeout(() => tick(value => value + 1), progress.next)
      return () => clearTimeout(timer)
    }, [frozen, externalTimeline, running, source, progress?.count, progress?.next])
    const wrapped = !externalTimeline && /\[(?:qq\]|q?$)/.test(source)
    const blocks = useMemo(() => {
      if (externalTimeline) return originalBlocks
      if (reply) return [...originalBlocks.filter(block => block.kind !== 'text'),
        ...reply.stages.slice(0, running ? 0 : progress?.count ?? reply.stages.length).map(stage => ({ kind: 'text' as const, text: stage.text }))]
      if (!wrapped) return originalBlocks
      const text = stripTimedReply(source)
      return [...originalBlocks.filter(block => block.kind !== 'text'),
        { kind: 'text' as const, text: text || (running ? '' : decoded.error || '分段回复未完整生成，请重试。') }]
    }, [originalBlocks, externalTimeline, reply, running, progress?.count, wrapped, source, decoded.error])
    const timeline = externalTimeline || !!reply || wrapped
    const [result, setResult] = useState<{ source: typeof blocks; rule: string; parts: readonly AssistantBlock[] }>()
    const [visible, setVisible] = useState(0)
    const visibleRef = useRef(0)
    const timer = useRef<ReturnType<typeof setTimeout>>()
    const anchor = useRef<HTMLSpanElement>(null)
    const bubbleRoot = useRef<HTMLDivElement>(null)
    const avatars = useAvatars(bubbleRoot, config.enabled && config.repeatAvatars)
    const rule = JSON.stringify(config)
    const latest = useRef({ parts: blocks, count: 0, config })
    const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const pacingParts = result?.rule === rule ? result.parts : blocks
    const withinLimit = blocks.some(b => b.kind === 'text' && b.text.length <= 40000 && Array.from(b.text).length <= config.threshold)
    const paced = !timeline && live.current && config.animate && !reducedMotion && !status && config.regex.length <= 512 && !model.worker.isBlocked(config.regex) && withinLimit && (!result || pacingParts.some(b => b.kind === 'text' && eligible(b.text, config.threshold)))

    useEffect(() => {
      const controller = new AbortController()
      if (frozen || !config.enabled || timeline) return () => controller.abort()
      void Promise.all(blocks.map(async block => {
        if (block.kind !== 'text') return [block]
        const chunks = await model.worker.run(block.text, config.regex, config.threshold, controller.signal)
        return chunks.map(text => ({ ...block, text }))
      })).then(groups => {
        if (!controller.signal.aborted) setResult({ source: blocks, rule, parts: groups.flat() })
      })
      return () => controller.abort()
    }, [frozen, blocks, rule, config.enabled, model, timeline])

    const current = result?.source === blocks && result.rule === rule
    // Pending history uses the native body; pending live output retains its previous projection.
    const parts = timeline ? blocks : current ? result.parts : live.current && result?.rule === rule ? result.parts : blocks
    const textCount = parts.filter(b => b.kind === 'text').length
    const count = running ? Math.max(0, textCount - 1) : textCount
    latest.current = { parts, count: current ? count : Math.min(count, visibleRef.current), config }
    useEffect(() => { clearTimeout(timer.current); timer.current = undefined }, [rule])
    useEffect(() => {
      if (frozen) { clearTimeout(timer.current); timer.current = undefined; return }
      if (!config.enabled || !paced) {
        clearTimeout(timer.current); timer.current = undefined
        visibleRef.current = Math.max(visibleRef.current, textCount)
        setVisible(visibleRef.current)
        return
      }
      const tick = () => {
        timer.current = undefined
        const state = latest.current
        if (visibleRef.current >= state.count) return
        const next = state.parts.filter(b => b.kind === 'text')[visibleRef.current]
        timer.current = setTimeout(() => {
          if (model.frozen(displayKey, props.sessionId, replyIdentity)) return
          visibleRef.current += 1
          setVisible(visibleRef.current)
          tick()
        }, delay(next?.kind === 'text' ? next.text : '', state.config))
      }
      if (!timer.current) tick()
    }, [frozen, parts, count, current, paced, config.enabled, rule])
    useEffect(() => () => clearTimeout(timer.current), [])

    let index = 0
    const projected = frozen ?? (config.enabled ? parts.filter(block => block.kind !== 'text' || !paced || index++ < visible) : blocks)
    if (!externalTimeline && !frozen) model.remember(displayKey, props.sessionId, projected)
    const node = frozen || config.enabled || blocks !== originalBlocks ? { ...props.node, data: { ...props.node.data, blocks: projected } } : props.node
    useEffect(() => {
      const parent = anchor.current?.parentElement
      const root = anchor.current?.nextElementSibling
      if (!parent || !root || !config.enabled || !projected.every(b => b.kind === 'text' && eligible(b.text, config.threshold))) return
      const source = projected.map(b => b.kind === 'text' ? b.text : '').join('')
      const copy = (event: ClipboardEvent) => {
        if (!event.clipboardData || event.defaultPrevented) return
        const text = selectedSource(root, source, document.getSelection())
        if (text === undefined) return
        event.clipboardData.setData('text/plain', text); event.preventDefault()
      }
      parent.addEventListener('copy', copy)
      return () => parent.removeEventListener('copy', copy)
    }, [projected, config.enabled, config.threshold])
    // Public Content Factories preserve the native gallery and reasoning implementation.
    // The original registration remains installed and owns its children throughout.
    const renderSlot: OriginalProps['renderSlot'] = (key, owner) => {
      if (key === 'conversation.chat.reasoning.body') return props.renderFactorySlot('conversation.chat.reasoning.content', owner as unknown as { text: string; running: boolean })
      return props.renderFactorySlot('conversation.images.content', owner as unknown as Pick<FactoryComponentPropsOf<'conversation.images.content'>, 'images' | 'loadImage' | 'align'>)
    }
    return <>
      <span hidden aria-hidden="true" ref={anchor} />
      {config.enabled
        ? <div ref={bubbleRoot} data-chat-segments-bubbles="" data-repeat-avatars={avatars ? '' : undefined}>
          {createElement(Original, { ...props, node, renderSlot })}
          {avatars && <AvatarOverlay snapshot={avatars} />}
        </div>
        : createElement(Original, { ...props, node, renderSlot })}
    </>
  }
}
