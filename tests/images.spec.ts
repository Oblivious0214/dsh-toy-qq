import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Window } from 'happy-dom'
import { resolveImage, resolveQQSkinConfig, QQ_SKIN_DEFAULT_CONFIG } from '../src/client/config.ts'
import { openImageEditor } from '../src/client/image-editor.ts'
import { QQImageRuntime } from '../src/client/image-runtime.ts'
import { buildQQLayoutCss } from '../src/client/qq-layout.ts'
import { settingsToConfig } from '../src/client/settings.ts'
import { Config } from '../src/settings-schema.ts'
import { nextAvatarBindings } from '../src/client/avatar-settings.ts'
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'
import type { QQSkinSettings } from '../src/client/settings.ts'

const cropperMock = vi.hoisted(() => ({ options: undefined as any, api: undefined as any, create: vi.fn() }))
vi.mock('cropperjs', () => ({ default: class {
  constructor(element: unknown, options: any) {
    cropperMock.options = options
    cropperMock.create(element, options)
    queueMicrotask(() => options.ready())
    return cropperMock.api
  }
} }))

const data = 'data:image/webp;base64,YWJjZA=='

describe('image settings and crop geometry', () => {
  it('migrates the legacy shared avatar into the default without changing saved settings', () => {
    const parsed = Config({avatarImage: data})
    expect(settingsToConfig({avatarImage: parsed.avatarImage.get(), avatarBindings: parsed.avatarBindings.get()}).avatarImage).toBe(data)
  })

  it('binds only the selected conversation and preserves other bindings', () => {
    const config = {...QQ_SKIN_DEFAULT_CONFIG, avatarImage: data, conversationAvatars: {b: data}}
    const png = 'data:image/png;base64,YWJjZA=='
    expect(nextAvatarBindings(config, png, 'a')).toEqual({defaultImage: data, conversations: {a: png, b: data}})
    expect(config.conversationAvatars).toEqual({b: data})
  })

  it('sets the default and selected conversation together in a single value', () => {
    expect(nextAvatarBindings(QQ_SKIN_DEFAULT_CONFIG, data, 'a', true)).toEqual({defaultImage: data, conversations: {a: data}})
  })

  it('restores persisted bindings and their default from a host schema round trip', () => {
    const bindings = nextAvatarBindings(QQ_SKIN_DEFAULT_CONFIG, data, 'a', true)
    const restored = JSON.parse(JSON.stringify(Config({avatarBindings: bindings}).avatarBindings.get()))
    expect(resolveQQSkinConfig(settingsToConfig({avatarBindings: restored})))
      .toMatchObject({avatarImage: data, conversationAvatars: {a: data}})
  })

  it('resets either scope independently and explicitly overrides a legacy default', () => {
    const config = {...QQ_SKIN_DEFAULT_CONFIG, avatarImage: data, conversationAvatars: {a: data, b: data}}
    expect(nextAvatarBindings(config, '', 'a', true)).toEqual({defaultImage: data, conversations: {b: data}})
    const resetDefault = nextAvatarBindings(config, '')
    expect(resetDefault).toEqual({defaultImage: '', conversations: {a: data, b: data}})
    expect(settingsToConfig({avatarImage: data, avatarBindings: resetDefault}).avatarImage).toBe('')
  })

  it('keeps bindings when changing the default and filters invalid stored images', () => {
    const next = nextAvatarBindings({...QQ_SKIN_DEFAULT_CONFIG, conversationAvatars: {a: data}}, data)
    expect(next.conversations).toEqual({a: data})
    expect(resolveQQSkinConfig({conversationAvatars: {valid: data, invalid: 'https://example.com/a.png', empty: ''}}).conversationAvatars).toEqual({valid: data})
    expect(() => nextAvatarBindings(QQ_SKIN_DEFAULT_CONFIG, data, '__proto__')).toThrow()
  })
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

  it('enlarges both fallback and interactive avatars by 50% and reserves enough space', () => {
    const css = buildQQLayoutCss()
    expect(css).toContain('width: 33px;')
    expect(css).toContain('height: 33px;')
    expect(css).toContain('margin-left: 47px;')
    expect(css).toContain('left: -47px;')
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
  let context: Context | undefined
  const draw = vi.fn()
  let loaded: { onload: () => void; onerror: () => void; naturalWidth: number; naturalHeight: number }

  beforeEach(() => {
    browser = new Window()
    cropperMock.create.mockClear()
    cropperMock.api = {
      destroy: vi.fn(), disable: vi.fn(), enable: vi.fn(), reset: vi.fn(),
      getCanvasData: vi.fn(() => ({ width: 600, naturalWidth: 1600 })),
      getData: vi.fn(() => ({ width: 900, height: 900 })),
      getCropBoxData: vi.fn(() => ({ left: 100, top: 100 })),
      setCropBoxData: vi.fn(), zoom: vi.fn(), zoomTo: vi.fn(),
      setAspectRatio: vi.fn(ratio => { cropperMock.api.getData.mockReturnValue({ width: 900 * ratio, height: 900 }) }),
      getCroppedCanvas: vi.fn(() => browser.document.createElement('canvas')),
    }
    browser.document.documentElement.lang = 'en'
    browser.document.body.setAttribute('data-conversation-session', 'session-a')
    vi.stubGlobal('document', browser.document)
    vi.stubGlobal('MutationObserver', browser.MutationObserver)
    vi.stubGlobal('Node', browser.Node)
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

  afterEach(async () => {
    runtime?.dispose()
    runtime = undefined
    await context?.fiber.dispose()
    context = undefined
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
  const drop = (files: Array<{type: string; size: number}>) => {
    const event = new browser.Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: { files } })
    browser.document.querySelector('.qq-crop-stage')!.dispatchEvent(event)
    return event
  }

  it('renders separate bindings in simultaneous conversations and updates recycled session containers', async () => {
    const png = 'data:image/png;base64,YWJjZA=='
    browser.document.body.innerHTML = '<main data-conversation-session="a"><div data-chat-flow-kind="assistant-step"></div></main><main data-conversation-session="b"><div data-chat-flow-kind="assistant-step"></div></main><main data-conversation-session="c"><div data-chat-flow-kind="assistant-step"></div></main>'
    runtime = new QQImageRuntime({...QQ_SKIN_DEFAULT_CONFIG, conversationAvatars: {a: png, b: data}}, vi.fn())
    const avatars = browser.document.querySelectorAll<HTMLButtonElement>('[data-qq-avatar]')
    expect(avatars[0]!.style.backgroundImage).toContain(png)
    expect(avatars[1]!.style.backgroundImage).toContain(data)
    expect(avatars[2]!.style.backgroundImage).toBe('')
    browser.document.querySelector('main')!.setAttribute('data-conversation-session', 'c')
    await settle()
    expect(avatars[0]!.style.backgroundImage).toBe('')
    expect(avatars[0]!.style.backgroundColor).toBe('')
    runtime.update({...QQ_SKIN_DEFAULT_CONFIG, conversationAvatars: {c: data}})
    expect(avatars[0]!.style.backgroundImage).toContain(data)
    expect(avatars[1]!.style.backgroundImage).toBe('')
  })

  it('captures the original conversation when switching during cropping', async () => {
    browser.document.body.setAttribute('data-conversation-session', 'a')
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step"></div>'
    const save = vi.fn().mockResolvedValue(true)
    runtime = new QQImageRuntime(QQ_SKIN_DEFAULT_CONFIG, save)
    browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.click()
    expect(browser.document.querySelector('input[type=checkbox]')?.checked).toBe(false)
    browser.document.body.setAttribute('data-conversation-session', 'b')
    await settle()
    button('Use default avatar').click()
    await settle()
    expect(save).toHaveBeenCalledExactlyOnceWith('avatar', '', {sessionId: 'a', makeDefault: false})
  })

  it('passes the opt-in default choice when saving a conversation avatar', async () => {
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step"></div>'
    const save = vi.fn().mockResolvedValue(true)
    runtime = new QQImageRuntime(QQ_SKIN_DEFAULT_CONFIG, save)
    browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.click()
    browser.document.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked = true
    pick(); loaded.onload(); await settle()
    button('Crop and save').click(); await settle()
    expect(save).toHaveBeenCalledExactlyOnceWith('avatar', data, {sessionId: 'session-a', makeDefault: true})
  })

  it('edits the default explicitly from settings and disables unidentifiable conversations', async () => {
    browser.document.body.removeAttribute('data-conversation-session')
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step"></div>'
    const save = vi.fn().mockResolvedValue(true)
    runtime = new QQImageRuntime(QQ_SKIN_DEFAULT_CONFIG, save)
    expect(browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.disabled).toBe(true)
    runtime.edit('avatar')
    expect(browser.document.querySelector('dialog')!.getAttribute('aria-label')).toBe('Set default avatar')
    expect(browser.document.querySelector('input[type=checkbox]')).toBeNull()
    button('Restore penguin avatar').click(); await settle()
    expect(save).toHaveBeenCalledExactlyOnceWith('avatar', '', {})
  })

  it('persists conversation/default choices through the real apply wiring and retains bindings on default reset', async () => {
    browser.document.body.setAttribute('data-conversation-session', 'a')
    browser.document.body.innerHTML = '<div data-chat-flow-kind="assistant-step"></div>'
    let state: QQSkinSettings = {avatarImage: 'data:image/png;base64,YWJjZA=='}
    const listeners = new Set<() => void>()
    let injected: {editDefaultAvatar: () => void}
    const writes = vi.fn(async (key: string, value: unknown) => {
      state = {...state, [key]: value}; for (const fn of listeners) fn(); return true
    })
    context = new Context()
    context.provide('theme', {overrideTokens: () => () => {}} as never)
    context.provide('configForms', {get: () => ({getSnapshot: () => ({value: state, revision: 0}), set: writes,
      subscribe: (fn: () => void) => {listeners.add(fn); return () => listeners.delete(fn)}})} as never)
    context.provide('locale', {register: () => () => {}} as never)
    context.provide('slots', {inject: (_: string, fn: () => void) => fn(), register: (options: any) => {
      injected = options.inject({sync() {}}); return () => {}
    }} as never)
    apply(context as never)
    browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.click()
    browser.document.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked = true
    pick(); loaded.onload(); await settle()
    button('Crop and save').click(); await settle()
    expect(writes).toHaveBeenCalledExactlyOnceWith('avatarBindings', {defaultImage: data, conversations: {a: data}})
    expect(browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.style.backgroundImage).toContain(data)
    injected!.editDefaultAvatar()
    button('Restore penguin avatar').click(); await settle()
    expect(state.avatarBindings).toEqual({defaultImage: '', conversations: {a: data}})
    expect(settingsToConfig(state).avatarImage).toBe('')
    expect(browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.style.backgroundImage).toContain(data)
    browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.click()
    button('Use default avatar').click(); await settle()
    expect(state.avatarBindings).toEqual({defaultImage: '', conversations: {}})
    expect(browser.document.querySelector<HTMLButtonElement>('[data-qq-avatar]')!.style.backgroundImage).toBe('')
  })

  it('removes explanatory text and preview while letting the empty area open the same picker', () => {
    openImageEditor('avatar', vi.fn())
    const file = browser.document.querySelector<HTMLInputElement>('input[type=file]')!
    const click = vi.spyOn(file, 'click')
    const stage = browser.document.querySelector<HTMLElement>('.qq-crop-stage')!
    stage.click()
    stage.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter' }))
    stage.dispatchEvent(new browser.KeyboardEvent('keydown', { key: ' ' }))
    button('Choose image').click()
    expect(click).toHaveBeenCalledTimes(4)
    expect(stage.getAttribute('role')).toBe('button')
    expect(browser.document.querySelector('[data-qq-crop-preview]')).toBeNull()
    expect(browser.document.body.textContent).not.toContain('The darkened area')
    expect(browser.document.body.textContent).not.toContain('Focus the image area')
  })

  it('ignores dropped files before and after selecting an image', async () => {
    openImageEditor('avatar', vi.fn())
    expect(drop([{type: 'image/png', size: 32}]).defaultPrevented).toBe(true)
    expect(cropperMock.create).not.toHaveBeenCalled()
    expect(browser.document.body.textContent).not.toContain('drop one here')
    pick(); loaded.onload(); await settle()
    drop([{type: 'image/png', size: 32}])
    expect(cropperMock.api.destroy).not.toHaveBeenCalled()
    expect(cropperMock.create).toHaveBeenCalledOnce()
    expect(button('Crop and save').disabled).toBe(false)
  })

  it('renders uploaded avatars without a white disc or circular shadow', () => {
    const png = 'data:image/png;base64,YWJjZA=='
    const css = buildQQLayoutCss({ ...QQ_SKIN_DEFAULT_CONFIG, avatarImage: png })
    expect(css).toContain('background-color: transparent;')
    expect(css).toContain(`background: transparent url("${png}")`)
    expect(css).toContain('box-shadow: none;')
  })

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
    await settle()
    expect(save).not.toHaveBeenCalled()
    button('Crop and save').click()
    await settle()
    expect(save).toHaveBeenCalledExactlyOnceWith(data, false)
    expect(cropperMock.options).toMatchObject({ aspectRatio: 1, viewMode: 1, modal: true, cropBoxMovable: true, cropBoxResizable: true })
    expect(cropperMock.api.getCroppedCanvas).toHaveBeenCalledWith(expect.objectContaining({width: 512, height: 512, maxWidth: 512, maxHeight: 512}))
    expect(cropperMock.api.getCroppedCanvas).toHaveBeenCalledWith(expect.objectContaining({ fillColor: 'transparent' }))
    expect(browser.HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png', 0.88)
    expect(cropperMock.options.background).toBe(true)
    expect(cropperMock.api.destroy).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(browser.document.querySelector('dialog')).toBeNull()
  })

  it('offers wallpaper aspect ratios and uses the selected ratio for the saved crop', async () => {
    const save = vi.fn().mockResolvedValue(true)
    openImageEditor('background', save)
    pick()
    loaded.onload()
    await settle()
    const select = browser.document.querySelector('select')!
    expect(Array.from(select.options).map(el => el.value)).toEqual(['current', '16:9', '4:3', '9:16', 'original'])
    select.value = '4:3'
    select.dispatchEvent(new browser.Event('change'))
    button('Crop and save').click()
    await settle()
    expect(cropperMock.api.setAspectRatio).toHaveBeenCalledWith(4 / 3)
    expect(cropperMock.api.getCroppedCanvas).toHaveBeenCalledWith(expect.objectContaining({width: 1200, height: 900, maxWidth: 1600}))
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

  it('supports keyboard positioning, zoom controls, and resetting the crop', async () => {
    openImageEditor('avatar', vi.fn())
    pick(); loaded.onload(); await settle()
    const stage = browser.document.querySelector('.qq-crop-stage')!
    stage.dispatchEvent(new browser.KeyboardEvent('keydown', {key: 'ArrowRight', shiftKey: true}))
    expect(cropperMock.api.setCropBoxData).toHaveBeenCalledWith({left: 110, top: 100})
    stage.dispatchEvent(new browser.KeyboardEvent('keydown', {key: '+'}))
    expect(cropperMock.api.zoom).toHaveBeenCalledWith(0.1)
    const slider = browser.document.querySelector<HTMLInputElement>('input[type=range]')!
    slider.value = '2'
    slider.dispatchEvent(new browser.Event('input'))
    expect(cropperMock.api.zoomTo).toHaveBeenCalledWith(0.75)
    button('Reset crop').click()
    expect(cropperMock.api.reset).toHaveBeenCalledOnce()
  })

  it('destroys the old cropper before choosing another image and cleans up on cancel', async () => {
    openImageEditor('avatar', vi.fn())
    pick(); loaded.onload(); await settle()
    pick(); loaded.onload(); await settle()
    expect(cropperMock.api.destroy).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
    button('Cancel').click()
    expect(cropperMock.api.destroy).toHaveBeenCalledTimes(2)
    expect(browser.document.querySelector('style')).toBeNull()
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
    expect(save).toHaveBeenNthCalledWith(2, '', false)
    expect(browser.document.querySelector('dialog')).toBeNull()
  })

  it('ignores image decoding after disposal and releases URLs', async () => {
    const save = vi.fn()
    const close = openImageEditor('avatar', save)
    pick()
    close()
    loaded.onload()
    await settle()
    expect(cropperMock.create).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
