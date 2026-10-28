// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { AvatarOverlay, readAvatars, useAvatars } from '../../src/client/segments/avatars.tsx'
import { QQ_LAYOUT_PLUGIN } from '../../src/client/qq-layout.ts'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => { document.body.replaceChildren(); document.head.querySelectorAll('[data-plugin]').forEach(node => node.remove()) })

function skin(marker = QQ_LAYOUT_PLUGIN) {
  const style = document.createElement('style'); style.dataset.plugin = marker; document.head.append(style)
  const row = document.createElement('div'); row.dataset.chatFlowKind = 'assistant-step'; document.body.append(row)
  const source = document.createElement('button'); source.dataset.qqAvatar = ''; source.setAttribute('aria-label', '修改会话头像')
  source.style.cssText = 'background-image: url("data:image/png;base64,AAAA"); width:33px; height:33px; border-radius:50%'
  row.append(source)
  return { style, row, source }
}
it('reads the active conversation avatar and positions each repeated avatar beside its own bubble', () => {
  const { row, source, style } = skin()
  const root = document.createElement('div'); root.innerHTML = '<div><div><div>一</div><div>二</div></div></div>'; row.append(root)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ top: 20, left: 100 } as DOMRect)
  root.querySelectorAll(':scope > div > div > div').forEach((bubble, i) => vi.spyOn(bubble, 'getBoundingClientRect').mockReturnValue({ top: 20 + i * 60, left: 100 } as DOMRect))
  const before = source.outerHTML
  expect(readAvatars(root)?.positions).toEqual([{ top: 8, left: -47 }, { top: 68, left: -47 }])
  expect(readAvatars(root)?.style.backgroundImage).toContain('AAAA')
  expect(source.outerHTML).toBe(before)
  style.remove()
  expect(readAvatars(root)).toBeUndefined()
})
it('updates per-conversation images, delegates editing, and restores on toggle/skin removal', async () => {
  const { row, source, style } = skin()
  const edit = vi.fn(); source.onclick = edit
  const mount = document.createElement('div'); row.append(mount)
  function View({ enabled }: { enabled: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    const avatar = useAvatars(ref, enabled)
    return <div ref={ref} data-repeat-avatars={avatar ? '' : undefined}>
      <div><div><div>一</div><div>二</div></div></div>
      {avatar && <AvatarOverlay snapshot={avatar} />}
    </div>
  }
  const root = createRoot(mount)
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 45)) }) }
  try {
    await act(async () => root.render(<View enabled />))
    expect(mount.querySelectorAll('[data-segment-avatar]')).toHaveLength(2)
    await act(async () => (mount.querySelector('[data-segment-avatar]') as HTMLButtonElement).click())
    expect(edit).toHaveBeenCalledTimes(1)
    source.style.backgroundImage = 'url("data:image/png;base64,BBBB")'; await settle()
    expect((mount.querySelector('[data-segment-avatar]') as HTMLElement).style.backgroundImage).toContain('BBBB')
    await act(async () => root.render(<View enabled={false} />))
    expect(mount.querySelector('[data-repeat-avatars]')).toBeNull()
    expect(source.isConnected).toBe(true)
    await act(async () => root.render(<View enabled />))
    expect(mount.querySelectorAll('[data-segment-avatar]')).toHaveLength(2)
    style.remove(); await settle()
    expect(mount.querySelector('[data-segment-avatar]')).toBeNull()
  } finally { act(() => root.unmount()) }
})
it('does not synthesize avatars with no source avatar or only one bubble', () => {
  const { row, source } = skin()
  const root = document.createElement('div'); root.innerHTML = '<div><div><div>一</div></div></div>'; row.append(root)
  expect(readAvatars(root)).toBeUndefined()
  root.innerHTML = '<div><div><div>一</div><div>二</div></div></div>'; source.remove()
  expect(readAvatars(root)).toBeUndefined()
})
