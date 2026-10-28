/** QQ-owned voice projection and cancellable, turn-scoped audio queue. */
import type { QQSkinConfig } from './config.ts'
import { resolveVoiceWidths } from './config.ts'
export const QQ_FISH_VOICE_CSS = `
[data-qq-fish-concealed] { display:none !important; }
[data-qq-fish-card] { margin:4px 0 8px; max-width:100%; }
[data-chat-segments-bubbles] [data-qq-fish-card] { padding:0 !important; border:0 !important; background:transparent !important; }
[data-chat-segments-bubbles] > div > div > div:has([data-qq-fish-concealed]) { padding:0 !important; border:0 !important; background:transparent !important; }
[data-chat-segments-bubbles] div:has(> [data-qq-fish-concealed]) > [data-qq-fish-card] { margin:0; }
[data-qq-fish-button] { display:inline-flex; align-items:center; gap:14px; box-sizing:border-box; max-width:100%; flex-wrap:nowrap; min-height:calc(46px + var(--dsh-content-font-delta, 0px)); padding:10px 14px; border:1px solid var(--dsw-alias-border-l1); border-radius:16px 16px 16px 6px; cursor:pointer; font:inherit; line-height:calc(24px + var(--dsh-content-font-delta, 0px)); color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-1, #fff); }
[data-qq-fish-button]:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:3px; }
[data-qq-fish-duration] { margin-left:auto; white-space:nowrap; }
[data-qq-fish-wave] { flex-shrink:0; display:inline-flex; align-items:center; gap:3px; height:calc(24px + var(--dsh-content-font-delta, 0px)); }
[data-qq-fish-wave] i { width:3px; height:14px; max-height:100%; border-radius:2px; background:currentColor; }
[data-qq-fish-wave] i:nth-child(2n) { height:22px; }
[data-state=playing] [data-qq-fish-wave] i { animation:qq-fish-wave .7s ease-in-out infinite alternate; }
[data-qq-fish-transcript] { margin-top:8px; white-space:pre-wrap; overflow-wrap:anywhere; }
[data-qq-fish-transcript][hidden] { display:none !important; }
[data-qq-fish-error] { font-size:13px; color:var(--dsw-alias-label-secondary); }
[data-qq-fish-error]:empty { display:none; }
@keyframes qq-fish-wave { to { transform:scaleY(.45); } }
@media(prefers-reduced-motion:reduce) { [data-qq-fish-wave] i { animation:none !important; } }
`
export function voiceDuration(raw: string | undefined): string {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? `${Math.ceil(value)}秒` : '语音'
}
export function voiceWidth(duration: number, min: number, max: number): number {
  return Math.min(max, min + Math.max(0, duration - 1) * 8)
}
interface VoiceAsset {
  key: string
  content: string
  request: AbortController
  promise?: Promise<void>
  audio?: HTMLAudioElement
  url?: string
  duration?: number
  error?: string
  attempted: boolean
}
interface VoiceEntry {
  marker: HTMLElement
  flow: Element
  turn: string
  text: HTMLElement
  content: string
  card: HTMLElement
  button: HTMLButtonElement
  label: HTMLElement
  error: HTMLElement
  transcript: HTMLElement
  revealed: boolean
  asset: VoiceAsset
}
export class QQFishVoiceRuntime {
  private observer: MutationObserver | undefined
  private readonly entries = new Map<HTMLElement, VoiceEntry>()
  private readonly assets = new Map<string, VoiceAsset>()
  private readonly jobs: (() => void)[] = []
  private busy = 0
  private active: VoiceEntry | undefined
  private generation = 0
  private release: (() => void) | undefined
  private session: string | undefined
  private sessionSince = Date.now()
  private widths = { min:160, max:360 }
  constructor(private mode: QQSkinConfig['fishVoiceMode'] = 'transcript', widths?: QQSkinConfig['fishVoiceWidths'],
    private synthesisMode: QQSkinConfig['fishVoiceGeneration'] = 'auto') {
    this.widths = resolveVoiceWidths(widths)
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(records => {
      if (records.some(record => this.affectsChat(record))) this.sync()
    })
    this.observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true,
      attributeFilter:['data-qq-fish-final','data-qq-fish-time','data-conversation-session','data-streaming','data-text-interaction-source'] })
    this.sync()
  }
  update(mode: QQSkinConfig['fishVoiceMode'], widths?: QQSkinConfig['fishVoiceWidths'],
    synthesisMode: QQSkinConfig['fishVoiceGeneration'] = this.synthesisMode) {
    this.mode = mode
    if (synthesisMode !== this.synthesisMode && synthesisMode === 'on-click') {
      for (const asset of this.assets.values()) {
        if (asset.promise && this.active?.asset !== asset) asset.request.abort()
      }
    }
    this.synthesisMode = synthesisMode
    if (widths) this.widths = resolveVoiceWidths(widths)
    for (const entry of this.entries.values()) {
      this.displayText(entry)
      this.render(entry)
    }
    if (this.observer) this.sync()
  }
  private displayText(entry: VoiceEntry) {
    // Keep the original Markdown and links when text is always visible.
    entry.text.toggleAttribute('data-qq-fish-concealed', this.mode !== 'always-text')
    entry.transcript.hidden = this.mode !== 'voice-text' || !entry.revealed
    entry.button.setAttribute('aria-expanded', String(this.mode === 'always-text' || !entry.transcript.hidden))
  }
  private render(entry: VoiceEntry) {
    const { asset } = entry
    const label = asset.duration ? voiceDuration(String(asset.duration)) : asset.promise ? '生成中' : asset.error ? '重试' : '语音'
    if (entry.label.textContent !== label) entry.label.textContent = label
    if (entry.error.textContent !== (asset.error ?? '')) entry.error.textContent = asset.error ?? ''
    entry.button.style.width = `${voiceWidth(asset.duration ?? 0,this.widths.min,this.widths.max)}px`
  }
  private renderAsset(asset: VoiceAsset) {
    for (const entry of this.entries.values()) if (entry.asset === asset) this.render(entry)
  }
  private restore(entry: VoiceEntry) {
    entry.card.remove(); entry.text.removeAttribute('data-qq-fish-concealed')
  }
  private drop(asset: VoiceAsset) {
    asset.request.abort(); asset.audio?.pause()
    asset.audio?.removeAttribute('src'); asset.audio?.load()
    if (asset.url) URL.revokeObjectURL(asset.url)
    delete asset.url; delete asset.audio
  }
  private reset() {
    this.stop()
    for (const entry of this.entries.values()) this.restore(entry)
    this.entries.clear()
    for (const asset of this.assets.values()) this.drop(asset)
    this.assets.clear()
  }
  /** Ignore widget, composer and our own control changes before touching history. */
  private affectsChat(record: MutationRecord): boolean {
    const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement
    if (target?.closest('[data-qq-fish-card]')) return false
    if (record.type === 'attributes') return true
    if (record.type === 'characterData') return !!target?.closest('[data-text-interaction-source]')
    const changed = [...record.addedNodes, ...record.removedNodes].filter(node => node.nodeType !== 1
      || !(node as Element).matches('[data-qq-fish-card],[data-qq-avatar],[data-segment-avatar]'))
    if (!changed.length) return false
    if (target?.closest('[data-chat-flow]')) return true
    return changed.some(node => node.nodeType === 1 && ((node as Element).matches('[data-chat-flow],[data-conversation-session],[data-qq-fish-final]')
      || (node as Element).querySelector('[data-chat-flow],[data-conversation-session],[data-qq-fish-final]')))
  }
  private sync() {
    const session = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? undefined
    if (session !== this.session) {
      this.reset(); this.session = session; this.sessionSince = Date.now()
    }
    for (const [text, entry] of this.entries) {
      if (!text.isConnected || !entry.card.isConnected || !entry.marker.isConnected || text.textContent?.trim() !== entry.content) {
        if (this.active === entry) this.stop()
        this.restore(entry); this.entries.delete(text)
      }
    }
    const rowsByFlow = new Map<Element, Map<string, HTMLElement[]>>()
    const entriesByMarker = new Map<HTMLElement, VoiceEntry[]>()
    for (const entry of this.entries.values()) {
      const group = entriesByMarker.get(entry.marker) ?? []
      group.push(entry); entriesByMarker.set(entry.marker, group)
    }
    for (const marker of document.querySelectorAll<HTMLElement>('[data-qq-fish-final]')) {
      const tail = marker.closest('[data-chat-flow-kind="turn-tail"]')
      const flow = tail?.closest('[data-chat-flow]')
      const turn = tail?.getAttribute('data-chat-turn')
      if (!tail || !flow || turn == null) continue
      if ((marker.closest('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? undefined) !== this.session) continue
      let byTurn = rowsByFlow.get(flow)
      if (!byTurn) {
        byTurn = new Map(); rowsByFlow.set(flow, byTurn)
        for (const row of flow.querySelectorAll<HTMLElement>('[data-chat-flow-kind="assistant-step"]')) {
          if (row.dataset.chatGroupPart === 'reasoning') continue
          const key = row.getAttribute('data-chat-turn') ?? ''
          const group = byTurn.get(key) ?? []; group.push(row); byTurn.set(key, group)
        }
      }
      const rows = (byTurn.get(turn) ?? []).filter(row => Boolean(row.compareDocumentPosition(tail) & Node.DOCUMENT_POSITION_FOLLOWING))
      const markerEntries = entriesByMarker.get(marker) ?? []
      let index = 0
      for (const row of rows) {
        if (row.querySelector('[data-streaming]')) continue
        for (const text of row.querySelectorAll<HTMLElement>('[data-text-interaction-source]')) {
          const position = index++
          if (this.entries.has(text) || text.closest('[data-variant="think"]') || text.querySelector('img,video,audio,pre,table,[data-meme]')) continue
          const content = text.textContent?.trim()
          if (!content) continue
          const key = JSON.stringify([marker.dataset.qqFishFinal,position,content])
          let asset = this.assets.get(key)
          if (!asset) { asset = {key,content,request:new AbortController(),attempted:false}; this.assets.set(key,asset) }
          const card = document.createElement('div'); card.dataset.qqFishCard = ''
          const button = document.createElement('button'); button.type = 'button'; button.dataset.qqFishButton = ''
          button.setAttribute('aria-label','播放语音，自动连续播放本次回复'); button.setAttribute('aria-expanded','false')
          const icon = document.createElement('span'); icon.textContent = '▶'; icon.setAttribute('aria-hidden','true')
          const wave = document.createElement('span'); wave.dataset.qqFishWave = ''; wave.setAttribute('aria-hidden','true')
          for (let i = 0; i < 8; i++) wave.append(document.createElement('i'))
          const label = document.createElement('span'); label.dataset.qqFishDuration = ''
          const error = document.createElement('div'); error.dataset.qqFishError = ''; error.setAttribute('role','status')
          const transcript = document.createElement('div'); transcript.dataset.qqFishTranscript = ''
          transcript.textContent = `[${content}]`; transcript.hidden = true
          button.append(icon,wave,label); card.append(button,error,transcript)
          const entry: VoiceEntry = {marker,flow,turn,text,content,card,button,label,error,transcript,asset,revealed:false}
          button.onclick = () => {
            if (this.active === entry) this.stop()
            else { this.stop(); void this.play(entry,this.generation) }
          }
          this.entries.set(text,entry); markerEntries.push(entry); this.render(entry)
          this.displayText(entry); text.before(card)
        }
      }
      // Timestamp fence advances on every session switch, including history reloads.
      // Only finalized replies from this viewing session are automatically synthesized.
      if (this.synthesisMode === 'auto' && this.session && Number(marker.dataset.qqFishTime) > this.sessionSince) {
        for (const entry of markerEntries) if (!entry.asset.attempted) void this.prepare(entry.asset).catch(() => {})
      }
    }
    const used = new Set([...this.entries.values()].map(entry => entry.asset))
    for (const [key,asset] of this.assets) if (!used.has(asset)) { this.drop(asset); this.assets.delete(key) }
  }
  private pump() {
    while (this.busy < 2 && this.jobs.length) this.jobs.shift()!()
  }
  private prepare(asset: VoiceAsset): Promise<void> {
    if (asset.audio && asset.duration) return Promise.resolve()
    if (asset.promise) {
      if (!asset.request.signal.aborted) return asset.promise
      // A click immediately after changing settings waits for cancellation to finish.
      return asset.promise.catch(() => {}).then(() => {
        if (this.assets.get(asset.key) !== asset) throw new DOMException('Cancelled','AbortError')
        return this.prepare(asset)
      })
    }
    asset.request = new AbortController(); asset.attempted = true; delete asset.error
    const signal = asset.request.signal
    const task = new Promise<void>((resolve,reject) => {
      const job = () => {
        if (signal.aborted) { reject(new DOMException('Cancelled','AbortError')); return }
        this.busy++
        void this.synthesize(asset,signal).then(resolve,reject).finally(() => { this.busy--; this.pump() })
      }
      this.jobs.push(job)
      signal.addEventListener('abort', () => {
        const index = this.jobs.indexOf(job)
        if (index >= 0) { this.jobs.splice(index,1); reject(new DOMException('Cancelled','AbortError')) }
      }, {once:true})
    })
    asset.promise = task.catch(error => {
      const cancelled = signal.aborted
      this.drop(asset)
      delete asset.duration
      if (cancelled && this.synthesisMode === 'on-click') asset.attempted = false
      if (!cancelled) {
        asset.error = error instanceof Error ? error.message : '语音生成失败，请点击重试'
      }
      throw error
    }).finally(() => { delete asset.promise; this.renderAsset(asset) })
    this.renderAsset(asset); this.pump()
    return asset.promise
  }
  private async synthesize(asset: VoiceAsset, signal: AbortSignal) {
    const response = await fetch('/fish-tts/synthesize', {method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({text:asset.content}),signal})
    signal.throwIfAborted()
    if (!response.ok) {
      let message = `语音生成失败（${response.status}），请点击重试`
      try { const body = await response.json(); message = body.message ?? body.error ?? message } catch { /* HTTP fallback */ }
      throw new Error(message)
    }
    const blob = await response.blob(); signal.throwIfAborted()
    asset.url = URL.createObjectURL(blob)
    const audio = new Audio(); asset.audio = audio; audio.preload = 'metadata'
    await new Promise<void>((resolve,reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer); audio.removeEventListener('loadedmetadata',ready); audio.removeEventListener('durationchange',ready)
        audio.removeEventListener('error',failed); signal.removeEventListener('abort',cancel)
        if (error) reject(error); else resolve()
      }
      const ready = () => { if (Number.isFinite(audio.duration) && audio.duration > 0) { asset.duration = audio.duration; finish() } }
      const failed = () => finish(new Error('无法读取音频时长，请点击重试'))
      const cancel = () => finish(new DOMException('Cancelled','AbortError'))
      const timer = setTimeout(failed,15000)
      audio.addEventListener('loadedmetadata',ready); audio.addEventListener('durationchange',ready)
      audio.addEventListener('error',failed); signal.addEventListener('abort',cancel,{once:true})
      audio.src = asset.url!; audio.load()
    })
    signal.throwIfAborted()
  }
  private state(entry: VoiceEntry, state: string) {
    entry.button.dataset.state = state
    entry.button.setAttribute('aria-label', state === 'playing' || state === 'pending' ? '停止语音及连续播放' : '播放语音，自动连续播放本次回复')
    entry.button.firstElementChild!.textContent = state === 'pending' ? '…' : state === 'playing' ? 'Ⅱ' : '▶'
  }
  private async play(entry: VoiceEntry, token: number): Promise<void> {
    this.active = entry; this.state(entry,'pending')
    entry.revealed = true; this.displayText(entry)
    try {
      await this.prepare(entry.asset)
      if (token !== this.generation || !entry.card.isConnected) return
      const audio = entry.asset.audio!
      audio.currentTime = 0; audio.volume = .6; audio.playbackRate = 1
      try {
        const volume = window.localStorage.getItem('fish-tts.volume'), speed = window.localStorage.getItem('fish-tts.speed')
        if (volume?.trim() && Number.isFinite(Number(volume))) audio.volume = Math.max(0,Math.min(1,Number(volume)))
        if ('preservesPitch' in audio && speed !== null && Number(speed) >= .5 && Number(speed) <= 2) audio.playbackRate = Number(speed)
      } catch { /* defaults */ }
      const ended = new Promise<boolean>((resolve,reject) => {
        const cleanup = () => { audio.removeEventListener('ended',done); audio.removeEventListener('error',failed) }
        const done = () => { cleanup(); resolve(true) }
        const failed = () => { cleanup(); reject(new Error('音频播放失败，请点击重试')) }
        this.release = () => { cleanup(); resolve(false) }
        audio.addEventListener('ended',done); audio.addEventListener('error',failed)
      })
      const completion = ended.then(value => ({value}),error => ({error}))
      await audio.play()
      if (token !== this.generation) return
      this.state(entry,'playing')
      const result = await completion
      if (token !== this.generation) return
      if ('error' in result) throw result.error
      this.release = undefined; this.state(entry,'idle'); this.active = undefined
      if (!result.value) return
      const group = [...this.entries.values()].filter(item => item.flow === entry.flow && item.turn === entry.turn && item.marker === entry.marker && item.card.isConnected)
        .sort((a,b) => a.card.compareDocumentPosition(b.card) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
      const next = group[group.indexOf(entry)+1]
      if (next) await this.play(next,token)
    } catch (error) {
      if (token !== this.generation) return
      this.release?.(); this.release = undefined; entry.asset.audio?.pause()
      this.state(entry,'error'); entry.error.textContent = error instanceof Error ? error.message : '语音播放失败，请点击重试'
      this.active = undefined
    }
  }
  private stop() {
    this.generation++; this.release?.(); this.release = undefined
    if (this.active) {
      this.active.asset.audio?.pause()
      if (!this.active.asset.duration) this.active.asset.request.abort()
      this.state(this.active,'idle')
    }
    this.active = undefined
  }
  dispose() { this.observer?.disconnect(); this.reset() }
}
