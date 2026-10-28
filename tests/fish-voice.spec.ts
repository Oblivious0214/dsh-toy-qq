import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Window } from 'happy-dom'
import { QQFishVoiceRuntime, voiceDuration } from '../src/client/fish-voice.ts'
import { installFishReplies, VoiceReplyPreference, type FishSlots } from '../src/client/fish-replies.tsx'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
let window: Window
let runtime: QQFishVoiceRuntime | undefined
let clips: FakeAudio[]
class FakeAudio {
  duration = 2.1
  volume = 1
  playbackRate = 1
  preservesPitch = true
  listeners = new Map<string, (() => void)[]>()
  play = vi.fn(async () => {})
  pause = vi.fn()
  src = ''
  currentTime = 0
  preload = ''
  constructor(src = '') { this.src = src; clips.push(this) }
  load() { if (this.src) queueMicrotask(() => this.emit('loadedmetadata')) }
  removeAttribute() { this.src = '' }
  removeEventListener(name: string, listener: () => void) { this.listeners.set(name,(this.listeners.get(name) ?? []).filter(fn => fn !== listener)) }
  addEventListener(name: string, listener: () => void) { this.listeners.set(name,[...(this.listeners.get(name) ?? []),listener]) }
  emit(name: string) { for (const listener of this.listeners.get(name) ?? []) listener() }
}
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  window = new Window(); clips = []
  vi.stubGlobal('window',window); vi.stubGlobal('document',window.document)
  vi.stubGlobal('MutationObserver',window.MutationObserver); vi.stubGlobal('Node',window.Node)
  vi.stubGlobal('Audio',FakeAudio)
  vi.stubGlobal('URL',{createObjectURL:vi.fn(() => 'blob:test'),revokeObjectURL:vi.fn()})
  fetcher = vi.fn(async () => ({ok:true,blob:async () => new Blob(['audio'])}))
  vi.stubGlobal('fetch',fetcher)
})
afterEach(() => { runtime?.dispose(); runtime = undefined; window.close(); vi.unstubAllGlobals() })
function fixture(turn = '1', message = 'm1') {
  const flow = window.document.createElement('div'); flow.setAttribute('data-chat-flow','')
  flow.innerHTML = `<div data-chat-flow-kind="assistant-step" data-chat-turn="${turn}">
    <button data-qq-avatar></button><div data-slot><div><div data-text-interaction-source>第一段</div>
    <div data-text-interaction-source>第二段</div><div data-gallery><img src="/image.png"></div></div></div></div>
    <div data-chat-flow-kind="turn-tail" data-chat-turn="${turn}"><span hidden data-qq-fish-final="${message}"></span></div>`
  window.document.body.append(flow)
  return { flow, texts:[...flow.querySelectorAll<HTMLElement>('[data-text-interaction-source]')],
    marker:flow.querySelector<HTMLElement>('[data-qq-fish-final]')!,
    buttons:() => [...flow.querySelectorAll<HTMLButtonElement>('[data-qq-fish-button]')] }
}
const tick = () => new Promise(resolve => setTimeout(resolve,20))
describe('QQ voice replies', () => {
  it.each(['always-text', 'voice-text', 'transcript'] as const)('keeps %s display independent from generation timing', async mode => {
    const root = document.createElement('section'); root.dataset.conversationSession = 'current'; document.body.append(root)
    const f = fixture(); root.append(f.flow)
    f.texts[0]!.innerHTML = '<strong>第一段</strong><a href="/details">详情</a>'
    runtime = new QQFishVoiceRuntime(mode,undefined,'on-click')
    f.marker.dataset.qqFishTime = String(Date.now()+1); await tick()
    expect(fetcher).not.toHaveBeenCalled()
    expect(f.buttons().every(button => button.textContent === '▶语音')).toBe(true)
    expect(f.texts[0]!.hasAttribute('data-qq-fish-concealed')).toBe(mode !== 'always-text')
    expect(f.texts[0]!.querySelector('a')?.getAttribute('href')).toBe('/details')
    const transcript = f.flow.querySelector<HTMLElement>('[data-qq-fish-transcript]')!
    expect(transcript.hidden).toBe(true)
    f.buttons()[0]!.click(); await tick()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(f.buttons()[0]!.textContent).toContain('3秒')
    expect(transcript.hidden).toBe(mode !== 'voice-text')
    expect(clips[0]!.play).toHaveBeenCalledOnce()
    runtime.update(mode,undefined,'auto'); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(f.buttons()[1]!.textContent).toContain('3秒')
    // Automatic generation never starts the second clip playing.
    expect(clips[1]!.play).not.toHaveBeenCalled()
  })
  it('hot-switches text visibility without generating audio or losing the original markup', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime('voice-text',undefined,'on-click')
    const transcript = f.flow.querySelector<HTMLElement>('[data-qq-fish-transcript]')!
    runtime.update('always-text')
    expect(f.texts[0]!.hasAttribute('data-qq-fish-concealed')).toBe(false)
    expect(transcript.hidden).toBe(true)
    runtime.update('voice-text')
    expect(f.texts[0]!.hasAttribute('data-qq-fish-concealed')).toBe(true)
    expect(transcript.hidden).toBe(true)
    f.buttons()[0]!.click(); await tick()
    runtime.update('transcript'); expect(transcript.hidden).toBe(true)
    runtime.update('always-text'); expect(f.texts[0]!.hasAttribute('data-qq-fish-concealed')).toBe(false)
    runtime.update('voice-text'); expect(transcript.hidden).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('switching to click generation cancels background work and leaves subsequent segments ungenerated', async () => {
    const root = document.createElement('section'); root.dataset.conversationSession = 'current'; document.body.append(root)
    const f = fixture(); root.append(f.flow)
    f.texts[0]!.insertAdjacentHTML('afterend','<div data-text-interaction-source>第三段</div>')
    const finishes: ((value: unknown) => void)[] = []
    fetcher.mockImplementation(() => new Promise(resolve => finishes.push(resolve)))
    runtime = new QQFishVoiceRuntime('voice-text')
    f.marker.dataset.qqFishTime = String(Date.now()+1); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    runtime.update('voice-text',undefined,'on-click')
    expect(fetcher.mock.calls.every(call => call[1].signal.aborted)).toBe(true)
    for (const finish of finishes) finish({ok:true,blob:async () => new Blob(['audio'])})
    await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(clips).toHaveLength(0)
    expect(f.buttons().every(button => button.textContent === '▶语音')).toBe(true)
    fetcher.mockResolvedValue({ok:true,blob:async () => new Blob(['audio'])})
    f.buttons()[0]!.click(); await tick()
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(clips[0]!.play).toHaveBeenCalledOnce()
  })
  it('prepares only new current-session replies, deduplicates click, uses duration widths and cancels on switch', async () => {
    const root = document.createElement('section'); root.dataset.conversationSession = 'current'; document.body.append(root)
    const f = fixture(); root.append(f.flow)
    runtime = new QQFishVoiceRuntime()
    await tick(); expect(fetcher).not.toHaveBeenCalled()
    let finish!: (value: unknown) => void
    fetcher.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    f.marker.dataset.qqFishTime = String(Date.now()+1)
    await tick(); expect(fetcher).toHaveBeenCalledTimes(2)
    f.buttons()[0]!.click(); await tick(); expect(fetcher).toHaveBeenCalledTimes(2)
    finish({ok:true,blob:async () => new Blob(['audio'])}); await tick()
    expect(f.buttons()[0]!.textContent).toContain('3秒')
    expect(parseFloat(f.buttons()[0]!.style.width)).toBeGreaterThan(160)
    expect(clips.filter(clip => clip.play.mock.calls.length)).toHaveLength(1)
    runtime.update('voice-text',{min:180,max:185}); expect(f.buttons()[0]!.style.width).toBe('185px')
    f.buttons()[0]!.click(); f.buttons()[0]!.click(); await tick(); expect(fetcher).toHaveBeenCalledTimes(2)
    root.dataset.conversationSession = 'other'; await tick()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('cancels queued and in-flight preparation on disposal, ignoring late responses', async () => {
    const root = document.createElement('section'); root.dataset.conversationSession = 'current'; document.body.append(root)
    const f = fixture(); root.append(f.flow)
    f.texts[0]!.insertAdjacentHTML('afterend','<div data-text-interaction-source>第三段</div>')
    let finish!: (value: unknown) => void
    fetcher.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    runtime = new QQFishVoiceRuntime(); f.marker.dataset.qqFishTime = String(Date.now()+1); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    runtime.dispose()
    expect(fetcher.mock.calls.every(call => call[1].signal.aborted)).toBe(true)
    finish({ok:true,blob:async () => new Blob(['audio'])}); await tick()
    expect(clips).toHaveLength(0); expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('reuses prepared assets across DOM replacement', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime(); f.buttons()[0]!.click(); await tick()
    const copy = f.texts[0]!.cloneNode(true); f.texts[0]!.replaceWith(copy); await tick()
    f.buttons()[0]!.click(); await tick(); expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('creates one collapsed voice bar per segment without calling Fish on arrival', () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime('voice-text')
    expect(f.buttons()).toHaveLength(2)
    expect(f.texts.every(text => text.hasAttribute('data-qq-fish-concealed'))).toBe(true)
    expect([...f.flow.querySelectorAll<HTMLElement>('[data-qq-fish-transcript]')].every(text => text.hidden)).toBe(true)
    expect(f.flow.querySelector('img')?.closest('[data-qq-fish-concealed]')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('waits for natural end before playing the next segment, then stops at the turn boundary', async () => {
    const f = fixture(); const other = fixture('2','m2'); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).text).toBe('第一段')
    clips[0]!.emit('loadedmetadata'); expect(f.buttons()[0]!.textContent).toContain('3秒')
    clips[0]!.emit('ended'); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetcher.mock.calls[1]![1].body).text).toBe('第二段')
    clips[1]!.emit('ended'); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(other.buttons()[0]!.dataset.state).toBeUndefined()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    f.buttons()[0]!.click(); await tick(); expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('clicking the active bar stops playback and never advances', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick(); f.buttons()[0]!.click()
    clips[0]!.emit('ended'); await tick()
    expect(clips[0]!.pause).toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(f.buttons()[0]!.dataset.state).toBe('idle')
  })
  it('starting a different bar cancels the old queue and starts from the clicked bar', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick(); f.buttons()[1]!.click(); await tick()
    clips[0]!.emit('ended'); clips[1]!.emit('ended'); await tick()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(clips[0]!.pause).toHaveBeenCalled()
  })
  it('discards a synthesis response that arrives after cancellation', async () => {
    let resolve!: (value: unknown) => void
    fetcher.mockImplementation(() => new Promise(r => { resolve = r }))
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); f.buttons()[0]!.click()
    expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(true)
    resolve({ok:true,blob:async () => new Blob()}); await tick()
    expect(clips).toHaveLength(0)
  })
  it('restores text and cancels playback when Fish or the conversation unmounts', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick(); f.marker.remove(); await tick()
    clips[0]!.emit('ended'); await tick()
    expect(f.buttons()).toHaveLength(0)
    expect(f.texts.every(text => !text.hasAttribute('data-qq-fish-concealed'))).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('reports synthesis errors and retries without advancing to the next bar', async () => {
    fetcher.mockResolvedValueOnce({ok:false,status:400,json:async () => ({message:'请配置音色'})})
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick()
    expect(f.flow.querySelector('[role=status]')?.textContent).toBe('请配置音色')
    expect(fetcher).toHaveBeenCalledTimes(1)
    f.buttons()[0]!.click(); await tick(); expect(clips).toHaveLength(1)
  })
  it('media errors and blocked playback end the queue', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime()
    f.buttons()[0]!.click(); await tick(); clips[0]!.emit('error'); await tick()
    expect(f.buttons()[0]!.dataset.state).toBe('error')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('only reveals transcript after click when selected, including mode changes', async () => {
    const f = fixture(); runtime = new QQFishVoiceRuntime('transcript')
    f.buttons()[0]!.click(); await tick()
    const transcript = f.flow.querySelector<HTMLElement>('[data-qq-fish-transcript]')!
    expect(transcript.hidden).toBe(true)
    runtime.update('voice-text'); expect(transcript.hidden).toBe(false)
    expect(transcript.textContent).toBe('[第一段]')
  })
  it('skips reasoning, streaming and mixed media, and discovers finalized content later', async () => {
    const f = fixture()
    f.texts[0]!.innerHTML = '<img src="/meme.gif">表情'
    f.texts[1]!.setAttribute('data-streaming','true')
    runtime = new QQFishVoiceRuntime(); expect(f.buttons()).toHaveLength(0)
    f.texts[1]!.removeAttribute('data-streaming'); await tick()
    expect(f.buttons()).toHaveLength(1)
    expect(f.texts[0]!.hasAttribute('data-qq-fish-concealed')).toBe(false)
  })
  it('does nothing without a Fish registration marker, including legacy Fish DOM attributes', () => {
    const f = fixture(); f.marker.remove()
    f.flow.insertAdjacentHTML('beforeend','<button data-fish-tts-message="old"></button>')
    runtime = new QQFishVoiceRuntime()
    expect(f.buttons()).toHaveLength(0)
  })
  it('uses the existing Fish volume and speed without changing its preferences', async () => {
    window.localStorage.setItem('fish-tts.volume','.3'); window.localStorage.setItem('fish-tts.speed','1.5')
    const f = fixture(); runtime = new QQFishVoiceRuntime(); f.buttons()[0]!.click(); await tick()
    expect(clips[0]!.volume).toBe(.3); expect(clips[0]!.playbackRate).toBe(1.5)
  })
  it('never invents a duration', () => {
    expect(voiceDuration(undefined)).toBe('语音'); expect(voiceDuration('Infinity')).toBe('语音')
    expect(voiceDuration('0')).toBe('语音'); expect(voiceDuration('3.01')).toBe('4秒'); expect(voiceDuration('0.1')).toBe('1秒')
  })
})
describe('optional Fish slot adapter', () => {
  it('migrates Fish toggle once, saves only QQ preference and works without storage', () => {
    window.localStorage.setItem('fish-tts.autoplay','1')
    const preference = new VoiceReplyPreference(); expect(preference.enabled()).toBe(true)
    preference.set(false); expect(window.localStorage.getItem('fish-tts.autoplay')).toBe('1')
    expect(new VoiceReplyPreference().enabled()).toBe(false)
    vi.spyOn(window.localStorage,'setItem').mockImplementation(() => { throw Error('denied') })
    preference.set(true); expect(preference.enabled()).toBe(true)
  })
  it('shadows only detected Fish slots, suppresses original autoplay and fully releases registrations', () => {
    const entries = new Map<string,StoredEntry[]>()
    const callbacks = new Map<string,() => void>()
    const registered: {options:Record<string,unknown>; component:unknown}[] = []
    const removed = vi.fn()
    const slots: FishSlots = {
      entries:name => entries.get(name) ?? [], subscribe:(name,listener) => {callbacks.set(name,listener); return vi.fn()},
      inject:(_name,mount) => mount(), register:(options,component) => {registered.push({options,component}); return removed},
    }
    const preference = new VoiceReplyPreference()
    const dispose = installFishReplies(slots,preference)
    expect(registered).toHaveLength(0)
    for (const name of callbacks.keys()) {
      entries.set(name,[{ options:{id:'fish-tts'},component:() => null,inject:() => ({autoPlayEnabled:() => true}) }])
      callbacks.get(name)!()
    }
    expect(callbacks.has('settings.section')).toBe(false)
    expect(registered).toHaveLength(2)
    for (const {options} of registered) {
      expect(options.priority).toBe(-30)
      const injection = (options.inject as () => Record<string,unknown>)()
      expect((injection.autoPlayEnabled as () => boolean)()).toBe(false)
    }
    entries.clear(); for (const fn of callbacks.values()) fn()
    expect(removed).toHaveBeenCalledTimes(2)
    dispose()
  })
})
