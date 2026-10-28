/** QQ-owned voice projection and cancellable, turn-scoped audio queue. */
import type { QQSkinConfig } from './config.ts'
export const QQ_FISH_VOICE_CSS = `
[data-qq-fish-concealed] { display:none !important; }
[data-qq-fish-card] { margin:4px 0 8px; max-width:100%; }
[data-chat-segments-bubbles] [data-qq-fish-card] { padding:0 !important; border:0 !important; background:transparent !important; }
[data-qq-fish-button] { display:inline-flex; align-items:center; gap:14px; min-width:150px; min-height:48px; padding:12px 16px; border:0; border-radius:16px; cursor:pointer; font:inherit; color:var(--dsw-alias-label-primary); background:var(--dsw-specific-bubble,var(--dsw-alias-bg-layer-1)); }
[data-qq-fish-button]:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:3px; }
[data-qq-fish-wave] { display:inline-flex; align-items:center; gap:3px; height:24px; }
[data-qq-fish-wave] i { width:3px; height:14px; border-radius:2px; background:currentColor; }
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
  return Number.isFinite(value) && value > 0 ? `${Math.ceil(value)}″` : '语音'
}
/** rc.3's shipped Markdown renderer predates text-interaction attributes.
 * Match its CSS-module root name without pinning the generated hash. Keep the
 * semantic attribute path for newer hosts and exclude reasoning at the caller.
 */
export function voiceTextSources(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>('[data-text-interaction-source], div[class*="markdown"]')]
    .filter(element => element.hasAttribute('data-text-interaction-source')
      || [...element.classList].some(name => /(?:^|_)markdown(?:_|$)/.test(name)))
    .filter(element => !element.parentElement?.closest('[data-text-interaction-source]'))
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
}
export class QQFishVoiceRuntime {
  private observer: MutationObserver | undefined
  private readonly entries = new Map<HTMLElement, VoiceEntry>()
  private audio: HTMLAudioElement | undefined
  private url: string | undefined
  private request: AbortController | undefined
  private active: VoiceEntry | undefined
  private generation = 0
  private release: (() => void) | undefined
  constructor(private mode: QQSkinConfig['fishVoiceMode'] = 'transcript') {
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return
    this.observer = new MutationObserver(() => this.sync())
    this.observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true,
      attributeFilter:['data-qq-fish-final','data-streaming','data-text-interaction-source','class'] })
    this.sync()
  }
  update(mode: QQSkinConfig['fishVoiceMode']) {
    this.mode = mode
    for (const entry of this.entries.values()) {
      entry.transcript.hidden = entry.button.getAttribute('aria-expanded') !== 'true' || mode !== 'voice-text'
    }
  }
  private restore(entry: VoiceEntry) {
    entry.card.remove()
    entry.text.removeAttribute('data-qq-fish-concealed')
  }
  private sync() {
    for (const [text, entry] of this.entries) {
      if (!text.isConnected || !entry.card.isConnected || !entry.marker.isConnected || text.textContent?.trim() !== entry.content) {
        if (this.active === entry) this.stop()
        this.restore(entry); this.entries.delete(text)
      }
    }
    for (const marker of document.querySelectorAll<HTMLElement>('[data-qq-fish-final]')) {
      const tail = marker.closest('[data-chat-flow-kind="turn-tail"]')
      const flow = tail?.closest('[data-chat-flow]')
      const turn = tail?.getAttribute('data-chat-turn')
      if (!tail || !flow || turn === null || turn === undefined) continue
      const rows = [...flow.querySelectorAll<HTMLElement>('[data-chat-flow-kind="assistant-step"]')]
        .filter(row => row.getAttribute('data-chat-turn') === turn && row.dataset.chatGroupPart !== 'reasoning'
          && Boolean(row.compareDocumentPosition(tail) & Node.DOCUMENT_POSITION_FOLLOWING))
      for (const row of rows) {
        if (row.querySelector('[data-streaming]')) continue
        for (const text of voiceTextSources(row)) {
          if (this.entries.has(text) || text.closest('[data-variant="think"]')
            || text.querySelector('img,video,audio,pre,table,[data-meme]')) continue
          const content = text.textContent?.trim()
          if (!content) continue
          const card = document.createElement('div'); card.dataset.qqFishCard = ''
          const button = document.createElement('button'); button.type = 'button'; button.dataset.qqFishButton = ''
          button.setAttribute('aria-label','播放语音，自动连续播放本次回复'); button.setAttribute('aria-expanded','false')
          const icon = document.createElement('span'); icon.textContent = '▶'; icon.setAttribute('aria-hidden','true')
          const wave = document.createElement('span'); wave.dataset.qqFishWave = ''; wave.setAttribute('aria-hidden','true')
          for (let i = 0; i < 8; i++) wave.append(document.createElement('i'))
          const label = document.createElement('span'); label.dataset.qqFishDuration = ''; label.textContent = '语音'
          const error = document.createElement('div'); error.dataset.qqFishError = ''; error.setAttribute('role','status')
          const transcript = document.createElement('div'); transcript.dataset.qqFishTranscript = ''
          transcript.textContent = `[${content}]`; transcript.hidden = true
          button.append(icon,wave,label); card.append(button,error,transcript)
          const entry: VoiceEntry = { marker,flow,turn,text,content,card,button,label,error,transcript }
          button.onclick = () => {
            if (this.active === entry) this.stop()
            else { this.stop(); void this.play(entry, this.generation) }
          }
          this.entries.set(text,entry)
          text.dataset.qqFishConcealed = ''
          text.before(card)
        }
      }
    }
  }
  private clearAudio() {
    this.audio?.pause(); this.audio = undefined
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = undefined
    this.release?.(); this.release = undefined
  }
  private state(entry: VoiceEntry, state: string) {
    entry.button.dataset.state = state
    entry.button.setAttribute('aria-label', state === 'playing' || state === 'pending' ? '停止语音及连续播放' : '播放语音，自动连续播放本次回复')
    entry.button.firstElementChild!.textContent = state === 'pending' ? '…' : state === 'playing' ? 'Ⅱ' : '▶'
  }
  private async play(entry: VoiceEntry, token: number): Promise<void> {
    this.active = entry; this.state(entry,'pending'); entry.label.textContent = '生成中'; entry.error.textContent = ''
    entry.transcript.hidden = this.mode !== 'voice-text'; entry.button.setAttribute('aria-expanded','true')
    const request = new AbortController(); this.request = request
    try {
      const response = await fetch('/fish-tts/synthesize', { method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({text:entry.content}), signal:request.signal })
      if (token !== this.generation) return
      if (!response.ok) {
        let message = `语音生成失败（${response.status}）`
        try { const body = await response.json(); message = body.message ?? body.error ?? message } catch { /* HTTP fallback */ }
        throw new Error(message)
      }
      const blob = await response.blob()
      if (token !== this.generation) return
      this.url = URL.createObjectURL(blob)
      const audio = new Audio(this.url); this.audio = audio
      try {
        const volume = window.localStorage.getItem('fish-tts.volume'), speed = window.localStorage.getItem('fish-tts.speed')
        if (volume !== null && volume.trim() && Number.isFinite(Number(volume))) audio.volume = Math.max(0,Math.min(1,Number(volume)))
        else audio.volume = .6
        if ('preservesPitch' in audio && speed !== null && Number.isFinite(Number(speed)) && Number(speed) >= .5 && Number(speed) <= 2) audio.playbackRate = Number(speed)
      } catch { audio.volume = .6 }
      audio.addEventListener('loadedmetadata', () => { if (token === this.generation) entry.label.textContent = voiceDuration(String(audio.duration)) }, {once:true})
      const ended = new Promise<boolean>((resolve,reject) => {
        this.release = () => resolve(false)
        audio.addEventListener('ended', () => resolve(true), {once:true})
        audio.addEventListener('error', () => reject(new Error('音频播放失败，请重试')), {once:true})
      })
      // Attach rejection handling before play(): some browsers report media errors synchronously.
      const completion = ended.then(value => ({value}), error => ({error}))
      await audio.play()
      if (token !== this.generation) return
      this.state(entry,'playing')
      if (entry.label.textContent === '生成中') entry.label.textContent = '语音'
      const result = await completion
      if (token !== this.generation) return
      if ('error' in result) throw result.error
      this.clearAudio(); this.state(entry,'idle'); this.active = undefined
      if (!result.value) return
      // Read the current DOM order, only within the clicked reply/turn.
      const group = [...this.entries.values()].filter(item => item.flow === entry.flow && item.turn === entry.turn && item.marker === entry.marker && item.card.isConnected)
        .sort((a,b) => a.card.compareDocumentPosition(b.card) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
      const next = group[group.indexOf(entry) + 1]
      if (next) await this.play(next,token)
    } catch (error) {
      if (token !== this.generation) return
      this.clearAudio(); this.state(entry,'error'); entry.label.textContent = '重试'
      entry.error.textContent = error instanceof Error ? error.message : '语音播放失败，请重试'
      this.active = undefined
    }
  }
  private stop() {
    this.generation++; this.request?.abort(); this.request = undefined; this.clearAudio()
    if (this.active) { this.state(this.active,'idle'); if (this.active.label.textContent === '生成中') this.active.label.textContent = '语音' }
    this.active = undefined
  }
  dispose() {
    this.observer?.disconnect(); this.stop()
    for (const entry of this.entries.values()) this.restore(entry)
    this.entries.clear()
  }
}
