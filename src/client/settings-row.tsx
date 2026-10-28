/**
 * QQ界面独立设置页(注册进 settings.section 槽):色板与自定义背景六列布局、气泡
 * 尾巴/企鹅头像开关、会话宽度输入。
 *
 * 视觉语言与宿主设置行对齐:
 * - 色板用 ui-theme AppearanceRow 同款 16px 圆角卡片(grid 布局 + hover
 *   底色 + 选中态 `bg-module-platform`/bluish-400 描边),卡片内以
 *   渐变色块预览该色板,文案在下;
 * - 开关用 QQ NT 风格圆角 switch(非原生 checkbox),轨道/滑块走
 *   `--dsw-*` token;
 * - 标题与「标题+控件左右排布」对齐 locale LanguageRow 的 14px 行。
 *
 * 样式用内联 style 直读 `--dsw-*` token(跟随色板与亮暗),不依赖构建期
 * CSS Modules 管线——本插件的客户端 bundle 无 CSS 处理步骤。
 */
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-settings 的 SlotMap 声明合并(声明 settings.section
// 槽),与 ui-theme 的 AppearanceRow 同款——交叉插件协作始终走类型引用,
// 客户端 bundle 纯净性门禁不允许 value import。
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { QQ_SKIN_PALETTES, type QQSkinPalette, type QQSkinConfig } from './config.ts'
import type { createQQSkinRowStore } from './settings-store.ts'
import type { QQSkinSettingsKey } from './settings-locales.ts'
import { QQ_AVATAR_DATA_URI } from './qq-avatar.ts'
import {
  settingsGroupStyle as groupStyle, settingsRowStyle as fieldRowStyle,
  settingsLabelStyle as fieldLabelStyle, settingsControlStyle as controlStyle,
  settingsSectionTitleStyle, settingsHintStyle, SettingsToggle as ToggleRow,
  SETTINGS_LAYOUT_CSS,
} from './settings-ui.tsx'

/** 注入的业务面:各字段的持久化写入口(经 SettingsScope.set 排队)。 */
export interface QQSkinRowInjected {
  setFishVoiceWidths: (value: QQSkinConfig['fishVoiceWidths']) => void
  setFishVoiceMode: (value: QQSkinConfig['fishVoiceMode']) => void
  setFishVoiceGeneration: (value: QQSkinConfig['fishVoiceGeneration']) => void
  setImmersiveQQ: (value: boolean) => void
  editDefaultAvatar: () => void
  editBackground: () => void
  setBackgroundFit: (value: QQSkinConfig['backgroundFit']) => void
  /** 切换色板变体。 */
  setPalette: (palette: QQSkinPalette) => void
  /** 开关用户气泡尾巴。 */
  setBubbleTail: (value: boolean) => void
  /** 开关助手企鹅头像。 */
  setAssistantAvatar: (value: boolean) => void
  /** 设置会话最大宽度(px)。 */
  setChatMaxWidth: (width: number) => void
  /** 开关消息提示音。 */
  setMessageSound: (value: boolean) => void
  /** 开关打字机揭示动效。 */
  setTyping: (value: boolean) => void
}

/** 完整组件 props:运行时份额 + store 份额 + locale 座 + 注入面。 */
export type QQSkinRowComponentProps =
  PropsRuntime<'settings.section'>
  & PropsStore<ReturnType<typeof createQQSkinRowStore>>
  & PropsLocale<'dsh-qq-skin.settings'>
  & QQSkinRowInjected
  & { segmentSettings?: ReactNode }

/** 色板选项文案键。 */
const PALETTE_LABEL_KEYS: Record<QQSkinPalette, QQSkinSettingsKey> = {
  classic: 'palette.classic',
  vivid: 'palette.vivid',
  clean: 'palette.clean',
  green: 'palette.green',
  black: 'palette.black',
}

/** 色板卡片的渐变色块预览(亮色代表色,纯辨识度点缀,不参与主题)。 */
const PALETTE_PREVIEW: Record<QQSkinPalette, string> = {
  classic: 'linear-gradient(135deg, #12B7F5 0%, #A8E3FF 100%)',
  vivid: 'linear-gradient(135deg, #8A5CF5 0%, #E3D9FF 100%)',
  clean: 'linear-gradient(135deg, #12B7F5 0%, #EAF4FB 100%)',
  green: 'linear-gradient(135deg, #95EC69 0%, #E4F7D6 100%)',
  black: 'linear-gradient(135deg, #0B0F16 0%, #1D2937 100%)',
}

const titleStyle = {
  margin: 0, fontSize: '19px', fontWeight: 600, lineHeight: '28px',
  color: 'var(--dsw-alias-label-primary)',
} satisfies CSSProperties

/** 单个色板卡片:渐变色块在上、文案在下,与 AppearanceRow 的 cube 同款。 */
function PaletteCard({ preview, label, selected, onSelect, radio = true }: {
  preview: string
  label: string
  selected: boolean
  onSelect: () => void
  radio?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? selected : undefined}
      onClick={onSelect}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      style={{
        boxSizing: 'border-box',
        minWidth: 0, width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '6px',
        padding: '12px 4px',
        border: `1px solid ${selected ? 'var(--dsw-static-neutral-bluish-400)' : 'var(--dsw-alias-border-l2)'}`,
        borderRadius: '16px',
        background: selected
          ? 'var(--dsw-alias-bg-module-platform)'
          : hovered ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
        font: 'inherit',
        color: 'var(--dsw-alias-label-primary)',
        cursor: 'pointer',
        transition: 'background 0.12s ease, border-color 0.12s ease',
      }}
    >
      <span style={{
        width: '28px', height: '28px', borderRadius: '10px',
        background: preview,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid var(--dsw-alias-border-l2)',
      }} />
      {label}
    </button>
  )
}

/**
 * 渲染 QQ界面独立设置页。
 * @param props - 组合后的槽位 props。
 * @returns 行元素树。
 */
export function QQSkinSettingsRow({
  segmentSettings,
  t, useStore, setPalette, setBubbleTail, setAssistantAvatar, setChatMaxWidth,
  setMessageSound, setTyping, editBackground, setBackgroundFit, editDefaultAvatar, setImmersiveQQ, setFishVoiceMode, setFishVoiceGeneration,
}: QQSkinRowComponentProps) {
  const config = useStore(s => s.config)
  const [widthDraft, setWidthDraft] = useState(String(config.chatMaxWidth))
  const [widthFocused, setWidthFocused] = useState(false)

  const commitWidth = (): void => {
    const parsed = Number(widthDraft)
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== config.chatMaxWidth) {
      setChatMaxWidth(parsed)
    } else {
      setWidthDraft(String(config.chatMaxWidth))
    }
  }

  return (
    <div style={groupStyle} data-qq-interface-settings="">
      <style>{SETTINGS_LAYOUT_CSS}</style>
      <h2 style={titleStyle}>{t('row.title')}</h2>
      <h3 style={settingsSectionTitleStyle}>{t('layout.title')}</h3>
      <div style={fieldRowStyle}>
        <span style={fieldLabelStyle}>{t('row.defaultAvatar')}</span>
        <span style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <img src={config.avatarImage || QQ_AVATAR_DATA_URI} alt={t('row.defaultAvatar')}
            width={33} height={33} style={{borderRadius: '50%', objectFit: 'cover'}} />
          <button type="button" style={controlStyle} onClick={editDefaultAvatar}>{t('row.chooseDefaultAvatar')}</button>
        </span>
      </div>
      <div style={fieldRowStyle}>
        <span style={fieldLabelStyle}>{t('row.background')}</span>
      </div>
      {config.chatBackground && <div style={fieldRowStyle}>
        <label htmlFor="qq-background-fit" style={fieldLabelStyle}>{t('row.backgroundFit')}</label>
        <select style={controlStyle} id="qq-background-fit" value={config.backgroundFit}
          onChange={event => setBackgroundFit(event.currentTarget.value as QQSkinConfig['backgroundFit'])}>
          <option value="cover">{t('fit.cover')}</option>
          <option value="contain">{t('fit.contain')}</option>
          <option value="fill">{t('fit.fill')}</option>
        </select>
      </div>}

      {/* 色板与自定义背景:六列等宽卡片(渐变色块 + 文案,选中描边对齐宿主 cube) */}
      <div data-qq-palette-grid="">
        <div role="radiogroup" aria-label={t('row.palette')} style={{display: 'contents'}}>
        {QQ_SKIN_PALETTES.map(palette => (
          <PaletteCard
            key={palette}
            preview={PALETTE_PREVIEW[palette]}
            label={t(PALETTE_LABEL_KEYS[palette])}
            selected={config.palette === palette}
            onSelect={() => { setPalette(palette) }}
          />
        ))}
        </div>
        <PaletteCard
          preview={config.chatBackground ? `url(${JSON.stringify(config.chatBackground)})` : 'linear-gradient(135deg, #d7e3ed, #f5f7fa)'}
          label={t('row.chooseBackground')}
          selected={Boolean(config.chatBackground)}
          onSelect={editBackground}
          radio={false}
        />
      </div>

      {/* 两列设置:四个开关,最后一行是会话宽度与沉浸式 QQ */}
      <div data-qq-settings-grid="">
        <ToggleRow
          label={t('row.bubbleTail')}
          checked={config.bubbleTail}
          onChange={setBubbleTail}
        />
        <ToggleRow
          label={t('row.assistantAvatar')}
          checked={config.assistantAvatar}
          onChange={setAssistantAvatar}
        />
        <ToggleRow
          label={t('row.messageSound')}
          checked={config.messageSound}
          onChange={setMessageSound}
        />
        <ToggleRow
          label={t('row.typing')}
          checked={config.typing}
          onChange={setTyping}
        />

        {/* 会话宽度:暂存草稿,失焦/回车提交(与插件卡片相同的 staged 哲学) */}
        <div style={fieldRowStyle}>
          <label htmlFor="qq-chat-max-width" style={fieldLabelStyle}>{t('row.chatMaxWidth')}</label>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              id="qq-chat-max-width"
              type="number"
              min={480}
              max={1600}
              value={widthDraft}
              onChange={event => { setWidthDraft(event.currentTarget.value) }}
              onFocus={() => { setWidthFocused(true) }}
              onBlur={() => { setWidthFocused(false); commitWidth() }}
              onKeyDown={event => { if (event.key === 'Enter') commitWidth() }}
              style={{
                ...controlStyle, width: '96px', flex: '0 1 96px',
                border: `1px solid ${widthFocused ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}`,
              }}
            />
            <span style={settingsHintStyle}>px</span>
          </span>
        </div>
        <ToggleRow label={t('row.immersiveQQ')} checked={config.immersiveQQ} onChange={setImmersiveQQ} />
      </div>
      {segmentSettings && <>
        <hr style={{width:'100%',margin:'8px 0 0',border:0,borderTop:'1px solid var(--dsw-alias-border-l2)'}} />
        {segmentSettings}
      </>}
      <hr style={{width:'100%',margin:'8px 0 0',border:0,borderTop:'1px solid var(--dsw-alias-border-l2)'}} />
      <section aria-labelledby="qq-voice-settings-title" data-qq-voice-settings="" style={groupStyle}>
        <h3 id="qq-voice-settings-title" style={settingsSectionTitleStyle}>{t('voice.title')}</h3>
        <p style={settingsHintStyle}>{t('voice.hint')}</p>
        <div data-qq-settings-grid="" data-qq-voice-options="">
        <div style={{display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0}}>
          <label htmlFor="qq-fish-voice-mode" style={fieldLabelStyle}>{t('row.fishVoiceMode')}</label>
          <select style={{...controlStyle, width: '100%'}} id="qq-fish-voice-mode" value={config.fishVoiceMode}
            onChange={event => setFishVoiceMode(event.currentTarget.value as QQSkinConfig['fishVoiceMode'])}>
            <option value="always-text">{t('voice.alwaysText')}</option>
            <option value="voice-text">{t('voice.voiceText')}</option>
            <option value="transcript">{t('voice.transcript')}</option>
          </select>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0}}>
          <label htmlFor="qq-fish-voice-generation" style={fieldLabelStyle}>{t('voice.generation')}</label>
          <select style={{...controlStyle, width: '100%'}} id="qq-fish-voice-generation" value={config.fishVoiceGeneration}
            onChange={event => setFishVoiceGeneration(event.currentTarget.value as QQSkinConfig['fishVoiceGeneration'])}>
            <option value="auto">{t('voice.auto')}</option>
            <option value="on-click">{t('voice.onClick')}</option>
          </select>
        </div>
        </div>
      </section>
    </div>
  )
}
