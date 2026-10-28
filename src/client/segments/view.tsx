import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentType } from 'react'
import type { AssistantBlock, ChatNodeViewProps, PresentationInjected } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { InjectFace, PropsRenderSlots, FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import { delay } from './config.ts'
import type { Model } from './model.ts'
import { eligible } from './plain.ts'
import { selectedSource } from './copy.ts'
import { AvatarOverlay, useAvatars } from './avatars.tsx'

type Props = ChatNodeViewProps<'assistant-step'> & InjectFace<PresentationInjected>
type OriginalProps = Props & Pick<PropsRenderSlots<'conversation.chat.reasoning.body' | 'conversation.chat.message.images'>, 'renderSlot'>

/** Create a React-owned display projection around the inspected native renderer. */
export function createView(model: Model, Original: ComponentType<OriginalProps>) {
  return function SegmentedView(props: Props) {
    const { config, status } = useSyncExternalStore(model.subscribe, model.getSnapshot)
    const blocks = props.node.data.blocks
    // The toy plugin has already projected the stages on its shared motion/text clock.
    // This is a renderer-only flag, never taken from model text or persisted history.
    const timeline = (props.node.data as typeof props.node.data & { dshToyTimeline?: boolean }).dshToyTimeline === true
    const running = props.node.data.status === 'running'
    const live = useRef(running)
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
      if (!config.enabled || timeline) return () => controller.abort()
      void Promise.all(blocks.map(async block => {
        if (block.kind !== 'text') return [block]
        const chunks = await model.worker.run(block.text, config.regex, config.threshold, controller.signal)
        return chunks.map(text => ({ ...block, text }))
      })).then(groups => {
        if (!controller.signal.aborted) setResult({ source: blocks, rule, parts: groups.flat() })
      })
      return () => controller.abort()
    }, [blocks, rule, config.enabled, model, timeline])

    const current = result?.source === blocks && result.rule === rule
    // Pending history uses the native body; pending live output retains its previous projection.
    const parts = timeline ? blocks : current ? result.parts : live.current && result?.rule === rule ? result.parts : blocks
    const textCount = parts.filter(b => b.kind === 'text').length
    const count = running ? Math.max(0, textCount - 1) : textCount
    latest.current = { parts, count: current ? count : Math.min(count, visibleRef.current), config }
    useEffect(() => { clearTimeout(timer.current); timer.current = undefined }, [rule])
    useEffect(() => {
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
          visibleRef.current += 1
          setVisible(visibleRef.current)
          tick()
        }, delay(next?.kind === 'text' ? next.text : '', state.config))
      }
      if (!timer.current) tick()
    }, [parts, count, current, paced, config.enabled, rule])
    useEffect(() => () => clearTimeout(timer.current), [])

    let index = 0
    const projected = config.enabled ? parts.filter(block => block.kind !== 'text' || !paced || index++ < visible) : blocks
    const node = config.enabled ? { ...props.node, data: { ...props.node.data, blocks: projected } } : props.node
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
