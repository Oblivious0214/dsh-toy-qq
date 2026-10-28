import { describe, expect, it, vi } from 'vitest'
import { PersonaAvatarClient } from '../src/client/persona-avatar.ts'

const image = 'data:image/png;base64,YWJjZA=='
const settle = async () => { for (let n=0;n<10;n++) await Promise.resolve() }
describe('persona avatar integration', () => {
  it('binds the requested session once and reuses its confirmed avatar', async () => {
    const request = vi.fn(async () => Response.json({ok:true,sessionId:'a',avatar:image}))
    const changed = vi.fn()
    const client = new PersonaAvatarClient(changed,request)
    expect(client.get('a')).toBe('')
    expect(client.get('a')).toBe('')
    await settle()
    expect(client.get('a')).toBe(image)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]?.[1]).toMatchObject({method:'POST',body:JSON.stringify({sessionId:'a'})})
    client.dispose()
  })
  it('ignores wrong session and unsafe images, tolerates missing persona plugin', async () => {
    const request = vi.fn(async () => Response.json({ok:true,sessionId:'b',avatar:image}))
    const client = new PersonaAvatarClient(vi.fn(),request)
    client.get('a'); await settle()
    expect(client.get('a')).toBe('')
    expect(client.set({sessionId:'a',image:'https://example.com/a.png'})).toBe(false)
    expect(client.set({sessionId:'__proto__',image})).toBe(false)
    client.dispose()
    const absent = new PersonaAvatarClient(vi.fn(),async () => new Response('',{status:404}))
    absent.get('a'); await settle(); expect(absent.get('a')).toBe(''); absent.dispose()
  })
  it('late responses cannot overwrite an explicit update or mutate a disposed client', async () => {
    let release!: (response:Response) => void
    const changed = vi.fn()
    const client = new PersonaAvatarClient(changed,() => new Promise(resolve => {release=resolve}))
    client.get('a')
    client.set({sessionId:'a',image})
    release(Response.json({ok:true,sessionId:'a',avatar:'data:image/webp;base64,YWJjZA=='}))
    await settle()
    expect(client.get('a')).toBe(image)
    client.get('b'); client.dispose(); changed.mockClear()
    release(Response.json({ok:true,sessionId:'b',avatar:image})); await settle()
    expect(changed).not.toHaveBeenCalled()
  })
})
