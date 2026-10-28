import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { Window } from 'happy-dom'
import {
  buildQQLayoutCss, installQQLayout, createQQLayoutTag, QQ_LAYOUT_CSS, QQ_LAYOUT_PLUGIN, QQ_IMMERSIVE_CSS,
} from '../src/client/qq-layout.ts'
import { QQ_SKIN_DEFAULT_CONFIG } from '../src/client/config.ts'

/** Minimal document/head stand-in for the DOM injection under node. */
function stubDocument() {
  const nodes: Array<{ dataset: Record<string, string>; textContent: string; remove: ReturnType<typeof vi.fn> }> = []
  const document = {
    head: {
      appendChild: vi.fn((el: (typeof nodes)[number]) => { nodes.push(el) }),
    },
    createElement: vi.fn(() => {
      const node = { dataset: {}, textContent: '', remove: vi.fn() }
      return node
    }),
  }
  vi.stubGlobal('document', document)
  return { document, nodes }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('QQ NT layout layer', () => {
  it('exposes a stylesheet covering the QQ NT layout hooks', () => {
    expect(QQ_LAYOUT_CSS).toContain("[data-chat-flow]")
    expect(QQ_LAYOUT_CSS).toContain("[data-composer-card]")
    expect(QQ_LAYOUT_CSS).toContain("[data-chat-flow-kind='assistant-step']")
    expect(QQ_LAYOUT_CSS).toContain("body[data-ds-dark-theme]")
  })

  it('colors follow tokens instead of hardcoded values', () => {
    // Surface colors must read --dsw-* tokens so the layer tracks the active
    // palette (qq-tokens.ts) in both modes; the assistant avatar is the one
    // exception — an embedded official QQ-penguin PNG brand asset (data URI,
    // no network).
    expect(QQ_LAYOUT_CSS).toContain('var(--dsw-alias-bg-layer-1)')
    expect(QQ_LAYOUT_CSS).toContain('var(--dsw-alias-border-l1)')
    expect(QQ_LAYOUT_CSS).not.toMatch(/#[0-9a-fA-F]{6}/)
  })

  it('embeds the official QQ-penguin avatar as a network-free data URI', () => {
    expect(QQ_LAYOUT_CSS).toContain("data:image/png;base64")
    expect(QQ_LAYOUT_CSS).toContain("[data-chat-flow-kind='assistant-step']::before")
  })

  it('injects one tagged stylesheet on activation', () => {
    const { nodes } = stubDocument()
    const ctx = new Context()
    installQQLayout(ctx as never)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].dataset.plugin).toBe(QQ_LAYOUT_PLUGIN)
    expect(nodes[0].textContent).toBe(QQ_LAYOUT_CSS)
  })

  it('removes the stylesheet through the effect cleanup on dispose', async () => {
    const { nodes } = stubDocument()
    const ctx = new Context()
    installQQLayout(ctx as never)

    const tag = nodes[0]
    expect(tag.remove).not.toHaveBeenCalled()

    await ctx.fiber.dispose()

    expect(tag.remove).toHaveBeenCalledTimes(1)
  })
})

describe('QQ NT layout config branches', () => {
  it('enables immersive mode by default and allows opting out', () => {
    expect(buildQQLayoutCss()).toContain(QQ_IMMERSIVE_CSS)
    expect(buildQQLayoutCss({...QQ_SKIN_DEFAULT_CONFIG, immersiveQQ: false})).not.toContain(QQ_IMMERSIVE_CSS)
  })

  it('hides completion, its divider, assistant actions and usage while retaining clocks/content, then restores them', async () => {
    const browser = new Window()
    vi.stubGlobal('document', browser.document)
    browser.document.body.innerHTML = `<main data-chat-flow>
      <div data-chat-flow-kind="user"><div data-clock="start"><span class="native_timeStart" id="user-time">11:37</span><button id="user-copy">Copy</button></div></div>
      <div data-chat-flow-kind="turn-process" id="completion"><button data-turn-process="1" style="border-bottom:1px solid" id="divider">Completed in 1s</button></div>
      <div data-chat-flow-kind="command" id="role-notice"><div data-state="ok">role · Switched this session</div></div>
      <div data-chat-flow-kind="command" id="running-command"><div data-state="running">Running</div></div>
      <div data-chat-flow-kind="command" id="failed-command"><div data-state="error">Failed</div></div>
      <div data-chat-flow-kind="assistant-step" id="reply">Reply<hr id="markdown-rule"></div>
      <div data-turn-tail="1"><div data-clock="end">
        <button id="copy">Copy</button><div data-slot="assistant-actions" id="feedback"><button>Like</button></div><button id="branch">Branch</button>
        <span class="native_endInfo"><button id="usage">16.7K tokens</button><span class="native_timeEnd" id="assistant-time">11:37</span></span>
      </div></div>
      <div data-running-status id="running">Working</div>
      </main><button id="composer-action">Send</button>`
    const hidden = (id: string) => {
      let el = browser.document.getElementById(id)
      while (el) {
        if (browser.getComputedStyle(el).display === 'none') return true
        el = el.parentElement
      }
      return false
    }
    const before = browser.document.body.innerHTML
    const remove = createQQLayoutTag({...QQ_SKIN_DEFAULT_CONFIG, immersiveQQ: true})
    try {
      for (const id of ['completion', 'divider', 'copy', 'feedback', 'branch', 'usage', 'role-notice']) expect(hidden(id), id).toBe(true)
      for (const id of ['user-time', 'user-copy', 'assistant-time', 'reply', 'markdown-rule', 'running', 'composer-action', 'running-command', 'failed-command']) expect(hidden(id), id).toBe(false)
      expect(browser.document.body.innerHTML).toBe(before)
      remove()
      for (const id of ['completion', 'divider', 'copy', 'feedback', 'branch', 'usage', 'role-notice']) expect(hidden(id), id).toBe(false)
    } finally { remove(); await browser.happyDOM.abort() }
  })
  it('bubble tail rule appears by default and can be disabled', () => {
    const tailRule = `[class$='_bubble']::after`
    expect(QQ_LAYOUT_CSS).toContain(tailRule)
    const off = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, bubbleTail: false })
    expect(off).not.toContain(tailRule)
    // The dark-mode tail companion follows the same switch.
    expect(off).not.toContain(`body[data-ds-dark-theme] [class$='_bubble']::after`)
  })

  it('assistant avatar rule appears by default and can be disabled', () => {
    const avatarRule = "[data-chat-flow-kind='assistant-step']::before"
    expect(QQ_LAYOUT_CSS).toContain(avatarRule)
    const off = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, assistantAvatar: false })
    expect(off).not.toContain(avatarRule)
  })

  it('chat flow width follows the config value', () => {
    expect(QQ_LAYOUT_CSS).toContain(`max-width: ${QQ_SKIN_DEFAULT_CONFIG.chatMaxWidth}px`)
    const narrow = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, chatMaxWidth: 720 })
    expect(narrow).toContain('max-width: 720px')
    expect(narrow).not.toContain(`max-width: ${QQ_SKIN_DEFAULT_CONFIG.chatMaxWidth}px`)
  })

  it('typing keyframes are present by default and removable', () => {
    expect(QQ_LAYOUT_CSS).toContain('@keyframes dsh-qq-typing')
    expect(QQ_LAYOUT_CSS).toContain('animation: dsh-qq-typing 0.2s ease-out')
    const off = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, typing: false })
    expect(off).not.toContain('dsh-qq-typing')
  })

  it('selected session row carries a brand-color dot', () => {
    expect(QQ_LAYOUT_CSS).toContain("[class$='_sessionRow'][class$='_selected']::after")
    expect(QQ_LAYOUT_CSS).toContain('var(--dsw-alias-brand-primary)')
  })

  it('covers the QQ NT conversation chrome hooks', () => {
    expect(QQ_LAYOUT_CSS).toContain("header[class$='_header']")
    expect(QQ_LAYOUT_CSS).toContain("[data-time-hover-root]")
    expect(QQ_LAYOUT_CSS).toContain("[data-conversation-scroll]")
    expect(QQ_LAYOUT_CSS).toContain("[class$='_tools'] button")
  })
})
