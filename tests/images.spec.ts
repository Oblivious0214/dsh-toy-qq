import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Window } from 'happy-dom'
import { resolveImage, resolveQQSkinConfig, QQ_SKIN_DEFAULT_CONFIG } from '../src/client/config.ts'
import { cropRect, openImageEditor } from '../src/client/image-editor.ts'
import { QQImageRuntime } from '../src/client/image-runtime.ts'
import { buildQQLayoutCss } from '../src/client/qq-layout.ts'
import { settingsToConfig } from '../src/client/settings.ts'
import { Config } from '../src/settings-schema.ts'

const data = 'data:image/webp;base64,YWJjZA=='

describe('image settings and crop geometry', () => {
  it('persists both crops and the wallpaper fit through the host schema and resolver', () => {
    const raw = { avatarImage: data, chatBackground: data, backgroundFit: 'contain' as const }
    const parsed = Config(raw)
    expect(resolveQQSkinConfig(settingsToConfig(raw))).toMatchObject(raw)
    expect(parsed.avatarImage.get()).toBe(data)
    expect(parsed.chatBackground.get()).toBe(data)
    expect(parsed.backgroundFit.get()).toBe('contain')
  })

  it('clears images explicitly rather than restoring a fallback', () => {
    expect(settingsToConfig({ avatarImage: '', chatBackground: '' }, { avatarImage: data, chatBackground: data }))
      .toMatchObject({ avatarImage: '', chatBackground: '' })
  })

  it.each(['https://example.com/image.png', 'data:image/svg+xml;base64,YWJj', 'data:image/png;base64,abc");}body{color:red}', 42, null])('rejects non-raster or unsafe settings: %s', value => {
    expect(resolveImage(value)).toBe('')
  })

  it('rejects oversized data and invalid fit settings', () => {
    expect(resolveImage(`data:image/png;base64,${'a'.repeat(3_000_000)}`)).toBe('')
    expect(resolveQQSkinConfig({ backgroundFit: 'bad' as never }).backgroundFit).toBe('cover')
  })

  it.each([[1600, 900], [900, 1600], [800, 800]])('keeps square crops inside a %s × %s image', (width, height) => {
    const crop = cropRect(width, height, 1, 1, 0.5, 0.5)
    expect(crop.width).toBe(crop.height)
    expect(crop.x).toBeGreaterThanOrEqual(0)
    expect(crop.y).toBeGreaterThanOrEqual(0)
    expect(crop.x + crop.width).toBeLessThanOrEqual(width)
    expect(crop.y + crop.height).toBeLessThanOrEqual(height)
  })

  it('zooms and pans to image boundaries at the chosen aspect ratio', () => {
    const crop = cropRect(1600, 900, 4 / 3, 2, 1, 1)
    expect(crop).toEqual({ x: 1000, y: 450, width: 600, height: 450 })
  })

  it.each(['cover', 'contain', 'fill'] as const)('limits wallpaper styling to the conversation for %s', fit => {
    const css = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, avatarImage: data, chatBackground: data, backgroundFit: fit })
    expect(css).toContain(`[data-conversation-scroll] {\n  background-image: url("${data}")`)
    expect(css).toContain(`background-size: ${fit === 'fill' ? '100% 100%' : fit}`)
    expect(css).toContain('[data-qq-avatar]')
    expect(buildQQLayoutCss()).not.toContain(data)
  })
})

describe('image controls in the browser DOM', () => {
  let browser: Window
  let runtime: QQImageRuntime | undefined
  const draw = vi.fn()
  let loaded: { onload: () => void; onerror: () => void; naturalWidth: number; naturalHeight: number }

  beforeEach(() => {
    browser = new Window()
    browser.document.documentElement.lang = 'en'
    vi.stubGlobal('document', browser.document)
    vi.stubGlobal('MutationObserver', browser.MutationObserver)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
    vi.stubGlobal('Image', class {
      naturalWidth = 1600
      naturalHeight = 900
      onload = () => {}
      onerror = () => {}
      constructor() { loaded = this }
    })
    vi.spyOn(browser.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw, clearRect: vi.fn() } as never)
    vi.spyOn(browser.HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(data)
  })

  afterEach(() => {
    runtime?.dispose()
    runtime = undefined
    browser.happyDOM.abort()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    draw.mockClear()
  })

  const settle = async () => { await new Promise(resolve => setTimeout(resolve, 0)) }
  const button = (label: string) => Array.from(browser.document.querySelectorAll('button')).find(el => el.textContent === label)!
  const pick = (type = 'image/png', size = 32) => {
    const input = browser.document.querySelector('input[type=file]')!
    Object.defineProperty(input, 'files', { value: [{ type, size }], configurable: true })
    input.dispatchEvent(new browser.Event('change'))
  }

  it('adds keyboard-accessible avatars to existing and newly rendered rows, and cleans them up', async () => {
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step">Original reply</div>'
    runtime = new QQImageRuntime(QQ_SKIN_DEFAULT_CONFIG, vi.fn())
    const avatar = browser.document.querySelector('[data-qq-avatar]')!
    expect(avatar.tagName).toBe('BUTTON')
    expect(avatar.getAttribute('aria-label')).toBe('Change chat avatar')
    browser.document.body.insertAdjacentHTML('beforeend', '<div data-chat-flow-kind="assistant-step">Next reply</div>')
    await settle()
    expect(browser.document.querySelectorAll('[data-qq-avatar]')).toHaveLength(2)
    runtime.update({ ...QQ_SKIN_DEFAULT_CONFIG, assistantAvatar: false })
    expect(browser.document.querySelectorAll('[data-qq-avatar]')).toHaveLength(0)
    runtime.update(QQ_SKIN_DEFAULT_CONFIG)
    expect(browser.document.querySelectorAll('[data-qq-avatar]')).toHaveLength(2)
    runtime.dispose()
    expect(browser.document.body.textContent).toBe('Original replyNext reply')
  })

  it('opens one editor when an avatar is clicked and restores focus on cancel without writing', () => {
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step"></div>'
    const save = vi.fn()
    runtime = new QQImageRuntime(QQ_SKIN_DEFAULT_CONFIG, save)
    const avatar = browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!
    avatar.focus()
    avatar.click()
    expect(browser.document.querySelector('dialog')?.getAttribute('aria-label')).toBe('Change chat avatar')
    button('Cancel').click()
    expect(browser.document.querySelector('dialog')).toBeNull()
    expect(browser.document.activeElement).toBe(avatar)
    expect(save).not.toHaveBeenCalled()
  })

  it('exports a square crop, persists only after confirmation and releases the file URL', async () => {
    const save = vi.fn().mockResolvedValue(true)
    openImageEditor('avatar', save)
    pick()
    expect(button('Crop and save').disabled).toBe(true)
    loaded.onload()
    expect(save).not.toHaveBeenCalled()
    button('Crop and save').click()
    await settle()
    expect(save).toHaveBeenCalledExactlyOnceWith(data)
    expect(draw.mock.calls.at(-1)?.slice(1)).toEqual([350, 0, 900, 900, 0, 0, 512, 512])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(browser.document.querySelector('dialog')).toBeNull()
  })

  it('offers wallpaper aspect ratios and uses the selected ratio for the saved crop', async () => {
    const save = vi.fn().mockResolvedValue(true)
    openImageEditor('background', save)
    pick()
    loaded.onload()
    const select = browser.document.querySelector('select')!
    expect(Array.from(select.options).map(el => el.value)).toEqual(['current', '16:9', '4:3', '9:16', 'original'])
    select.value = '4:3'
    select.dispatchEvent(new browser.Event('change'))
    button('Crop and save').click()
    await settle()
    expect(draw.mock.calls.at(-1)?.slice(1)).toEqual([200, 0, 1200, 900, 0, 0, 1200, 900])
  })

  it.each([['image/svg+xml', 32], ['image/png', 21 * 1024 * 1024]])('rejects unsupported or oversized files', (type, size) => {
    openImageEditor('avatar', vi.fn())
    pick(type, size)
    expect(browser.document.querySelector('[role=status]')?.textContent).toContain('up to 20 MB')
    expect(button('Crop and save').disabled).toBe(true)
  })

  it('reports a decoding error and never saves an unreadable file', () => {
    const save = vi.fn()
    openImageEditor('avatar', save)
    pick()
    loaded.onerror()
    expect(browser.document.querySelector('[role=status]')?.textContent).toContain('Could not read or save')
    expect(save).not.toHaveBeenCalled()
  })

  it('preserves the editor after a rejected write and allows retry', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    openImageEditor('background', save)
    button('Restore default').click()
    await settle()
    expect(browser.document.querySelector('dialog')).not.toBeNull()
    expect(browser.document.querySelector('[role=status]')?.textContent).toContain('Could not read or save')
    button('Restore default').click()
    await settle()
    expect(save).toHaveBeenNthCalledWith(2, '')
    expect(browser.document.querySelector('dialog')).toBeNull()
  })

  it('ignores image decoding after disposal and releases URLs', () => {
    const save = vi.fn()
    const close = openImageEditor('avatar', save)
    pick()
    close()
    loaded.onload()
    expect(draw).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
