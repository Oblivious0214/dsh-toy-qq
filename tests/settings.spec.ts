import { describe, expect, it } from 'vitest'
import { QQ_SKIN_SETTINGS_NS, settingsToConfig, type QQSkinSettings } from '../src/client/settings.ts'
import { resolveQQSkinConfig } from '../src/client/config.ts'
import { Config } from '../src/settings-schema.ts'

describe('QQ skin settings', () => {
  it('keeps segmentation settings in the QQ schema, including an explicit disabled state', () => {
    const defaults = Config({}).segments.get()
    expect(defaults.enabled).toBe(true)
    expect(defaults.intervalMin).toBe(.5)
    expect(defaults.intervalMax).toBe(1.5)
    const config = Config({ segments: { enabled: false, regex: '.+。', repeatAvatars: false, intervalMethod: 'log' } })
    expect(config.segments.get()).toMatchObject({ enabled: false, regex: '.+。', repeatAvatars: false, intervalMethod: 'log' })
    expect(() => Config({ segments: { threshold: 0 } })).toThrow()
    expect(() => Config({ segments: { intervalMax: 11 } })).toThrow()
  })
  it('validates and persists atomic voice width limits', () => {
    expect(Config({fishVoiceWidths:{min:180,max:400}}).fishVoiceWidths.get()).toEqual({min:180,max:400})
    expect(() => Config({fishVoiceWidths:{min:139,max:180}})).toThrow()
    expect(resolveQQSkinConfig({fishVoiceWidths:{min:400,max:180}}).fishVoiceWidths).toEqual({min:160,max:360})
  })
  it('defaults to voice plus text and persists the optional transcript mode', () => {
    expect(Config({}).fishVoiceMode.get()).toBe('voice-text')
    expect(Config({fishVoiceMode: 'transcript'}).fishVoiceMode.get()).toBe('transcript')
    expect(settingsToConfig({fishVoiceMode: 'transcript'}).fishVoiceMode).toBe('transcript')
    expect(resolveQQSkinConfig({fishVoiceMode: 'invalid' as never}).fishVoiceMode).toBe('voice-text')
  })
  it('persists generation timing and always-visible text independently, preserving old defaults', () => {
    expect(Config({}).fishVoiceGeneration.get()).toBe('auto')
    const saved = Config({fishVoiceMode:'always-text',fishVoiceGeneration:'on-click'})
    const config = resolveQQSkinConfig(settingsToConfig({
      fishVoiceMode:saved.fishVoiceMode.get(),fishVoiceGeneration:saved.fishVoiceGeneration.get(),
    }))
    expect(config.fishVoiceMode).toBe('always-text')
    expect(config.fishVoiceGeneration).toBe('on-click')
    expect(settingsToConfig({}, {fishVoiceGeneration:'on-click'}).fishVoiceGeneration).toBe('on-click')
    expect(resolveQQSkinConfig({fishVoiceGeneration:'invalid' as never}).fishVoiceGeneration).toBe('auto')
    expect(() => Config({fishVoiceGeneration:'invalid'})).toThrow()
  })
  it('persists immersive mode through the host schema and respects explicit false', () => {
    expect(Config({}).immersiveQQ.get()).toBe(true)
    expect(settingsToConfig({immersiveQQ: Config({immersiveQQ: true}).immersiveQQ.get()}).immersiveQQ).toBe(true)
    expect(settingsToConfig({immersiveQQ: false}, {immersiveQQ: true}).immersiveQQ).toBe(false)
    expect(resolveQQSkinConfig({immersiveQQ: 'true' as never}).immersiveQQ).toBe(true)
    expect(Config({immersiveQQ: false}).immersiveQQ.get()).toBe(false)
    expect(resolveQQSkinConfig({immersiveQQ: false}).immersiveQQ).toBe(false)
  })
  it('addresses the profile entry id as its settings namespace', () => {
    expect(QQ_SKIN_SETTINGS_NS).toBe('qq-skin')
  })

  it('resolves to defaults when no setting section and no fallback', () => {
    expect(settingsToConfig(undefined)).toEqual({
      avatarImage: '', conversationAvatars: {}, chatBackground: '', backgroundFit: 'cover',
      palette: 'classic', bubbleTail: true, assistantAvatar: true,
      chatMaxWidth: 880, messageSound: false, typing: true, immersiveQQ: true, fishVoiceMode: 'voice-text', fishVoiceGeneration: 'auto', fishVoiceWidths: {min:160,max:360},
    })
  })

  it('prefers settings fields over fallback config', () => {
    const section: QQSkinSettings = { palette: 'vivid', chatMaxWidth: 720 }
    const config = settingsToConfig(section, { palette: 'clean', bubbleTail: false })
    expect(config).toEqual({
      avatarImage: '', conversationAvatars: {}, chatBackground: '', backgroundFit: 'cover',
      palette: 'vivid', bubbleTail: false, assistantAvatar: true,
      chatMaxWidth: 720, messageSound: false, typing: true, immersiveQQ: true, fishVoiceMode: 'voice-text', fishVoiceGeneration: 'auto', fishVoiceWidths: {min:160,max:360},
    })
  })

  it('fills unset settings fields from the fallback config', () => {
    const section: QQSkinSettings = { bubbleTail: false }
    const config = settingsToConfig(section, { palette: 'green', chatMaxWidth: 640 })
    expect(config).toEqual({
      avatarImage: '', conversationAvatars: {}, chatBackground: '', backgroundFit: 'cover',
      palette: 'green', bubbleTail: false, assistantAvatar: true,
      chatMaxWidth: 640, messageSound: false, typing: true, immersiveQQ: true, fishVoiceMode: 'voice-text', fishVoiceGeneration: 'auto', fishVoiceWidths: {min:160,max:360},
    })
  })

  it('messageSound and typing flow through settings to config', () => {
    const section: QQSkinSettings = { messageSound: true, typing: false }
    const config = settingsToConfig(section, {})
    expect(config.messageSound).toBe(true)
    expect(config.typing).toBe(false)
  })

  it('fallback config supplies messageSound and typing when settings omit them', () => {
    const config = settingsToConfig(undefined, { messageSound: true, typing: false })
    expect(config.messageSound).toBe(true)
    expect(config.typing).toBe(false)
  })
})
