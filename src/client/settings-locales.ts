/**
 * QQ 皮肤设置行的文案字典(zh/en 双语,注册进 locale 服务)。命名空间
 * 声明合并进 LocaleNamespaceMap,typed register 缺键/多键在编译期报错。
 */

/** 设置行命名空间(locale 字典与槽位 locale 座共用)。 */
export const QQ_SKIN_ROW_NS = 'dsh-qq-skin.settings'

/** 设置行文案键全集。 */
export type QQSkinSettingsKey =
  | 'voice.title'
  | 'layout.title'
  | 'voice.hint'
  | 'voice.alwaysText'
  | 'voice.generation'
  | 'voice.auto'
  | 'voice.onClick'
  | 'voice.autoHint'
  | 'voice.onClickHint'
  | 'row.fishVoiceMode'
  | 'voice.voiceText'
  | 'voice.transcript'
  | 'row.immersiveQQ'
  | 'row.defaultAvatar'
  | 'row.chooseDefaultAvatar'
  | 'row.background'
  | 'row.chooseBackground'
  | 'row.backgroundFit'
  | 'fit.cover'
  | 'fit.contain'
  | 'fit.fill'
  | 'row.title'
  | 'row.palette'
  | 'palette.classic'
  | 'palette.vivid'
  | 'palette.clean'
  | 'palette.green'
  | 'palette.black'
  | 'row.bubbleTail'
  | 'row.assistantAvatar'
  | 'row.chatMaxWidth'
  | 'row.messageSound'
  | 'row.typing'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** QQ 皮肤设置行的文案。 */
    'dsh-qq-skin.settings': QQSkinSettingsKey
  }
}

/** 中文文案。 */
export const zh: Record<QQSkinSettingsKey, string> = {
  'voice.title': '语音插件适配',
  'layout.title': '界面布局',
  'voice.hint': '需启用 Fish TTS，并打开输入框的“语音”开关。音色和模型在 Fish TTS 设置中调整。',
  'voice.alwaysText': '语音条 + 下方始终显示文字',
  'voice.generation': '语音生成时机',
  'voice.auto': '回复后自动生成（默认）',
  'voice.onClick': '点击语音条时生成',
  'voice.autoHint': '当前会话的新回复完成后，按段提前合成并显示真实秒数，点击后播放。历史回复仍在点击时生成。',
  'voice.onClickHint': '回复后仅显示语音条，不提前合成、不显示秒数；点击后生成并播放，生成后显示真实秒数。',
  'row.fishVoiceMode': '语音显示方式',
  'voice.voiceText': '语音条，点击后显示文字（默认）',
  'voice.transcript': '仅语音条（不显示文字）',
  'row.immersiveQQ': '沉浸式 QQ',
  'row.defaultAvatar': '默认头像',
  'row.chooseDefaultAvatar': '更换默认头像',
  'row.background': '对话背景',
  'row.chooseBackground': '自定义',
  'row.backgroundFit': '背景适应方式',
  'fit.cover': '填充（保持比例）',
  'fit.contain': '适应（显示完整图片）',
  'fit.fill': '拉伸',
  'row.title': 'QQ聊天界面',
  'row.palette': '色板',
  'palette.classic': '经典蓝',
  'palette.vivid': '炫彩紫',
  'palette.clean': '简洁白',
  'palette.green': '经典绿气泡',
  'palette.black': '深空黑',
  'row.bubbleTail': '气泡尾巴',
  'row.assistantAvatar': '企鹅头像',
  'row.chatMaxWidth': '会话宽度',
  'row.messageSound': '消息提示音',
  'row.typing': '打字机效果',
}

/** 英文文案。 */
export const en: Record<QQSkinSettingsKey, string> = {
  'voice.title': 'Voice plugin integration',
  'layout.title': 'Interface layout',
  'voice.hint': 'Enable Fish TTS and the Voice switch in the composer. Set the voice and model in Fish TTS settings.',
  'voice.alwaysText': 'Voice bar with text always shown below',
  'voice.generation': 'Generate audio',
  'voice.auto': 'Automatically after a reply (default)',
  'voice.onClick': 'When a voice bar is clicked',
  'voice.autoHint': 'Prepares each segment of new replies in the current conversation and shows real durations. Click to play. History is generated on click.',
  'voice.onClickHint': 'Shows a voice bar without a duration or synthesis request. Click to generate and play; the real duration appears once ready.',
  'row.fishVoiceMode': 'Voice display',
  'voice.voiceText': 'Voice bar, reveal text on click (default)',
  'voice.transcript': 'Voice bars only (no transcript)',
  'row.immersiveQQ': 'Immersive QQ',
  'row.defaultAvatar': 'Default avatar',
  'row.chooseDefaultAvatar': 'Change default avatar',
  'row.background': 'Chat background',
  'row.chooseBackground': 'Custom',
  'row.backgroundFit': 'Background fit',
  'fit.cover': 'Fill (keep aspect ratio)',
  'fit.contain': 'Fit (show entire image)',
  'fit.fill': 'Stretch',
  'row.title': 'QQ chat interface',
  'row.palette': 'Palette',
  'palette.classic': 'Classic Blue',
  'palette.vivid': 'Vivid Purple',
  'palette.clean': 'Clean White',
  'palette.green': 'Green Bubble',
  'palette.black': 'Deep Black',
  'row.bubbleTail': 'Bubble tail',
  'row.assistantAvatar': 'Penguin avatar',
  'row.chatMaxWidth': 'Chat width',
  'row.messageSound': 'Message sound',
  'row.typing': 'Typing effect',
}
