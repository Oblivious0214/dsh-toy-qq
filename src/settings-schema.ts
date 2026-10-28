/**
 * QQ 皮肤设置 schema —— 插件自身的 cordis `Config`(schemastery)。
 *
 * dsh 0.2 起设置命名空间不再由插件注册任意字符串:命名空间就是 profile
 * 条目 id(本插件为 `qq-skin`,见 cordis.patch.yml),schema 由 Loader 从宿主
 * 入口模块的 `Config` 导出读取。设置面板只投影 volatile 字段——非 volatile
 * 字段既不出现在描述里也不可写(settings 的 `volatileForm` 直接返回
 * undefined),故每个字段都必须 `.volatile()`。
 *
 * 仅宿主进程引用,客户端 bundle 不 import 本文件(schemastery 是宿主侧依赖,
 * 不进浏览器);浏览器半区经 `ctx.configForms` 读写同一份配置。
 */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { QQ_SKIN_PALETTES, type QQSkinPalette, type QQSkinConfig } from './client/config.ts'
import { DEFAULTS as SEGMENT_DEFAULTS, type Settings as SegmentSettings } from './client/segments/config.ts'
import type { AvatarBindings } from './client/settings.ts'

/** 设置字段的运行时形状:volatile 字段在 Live 配置里以 ref 形式存在。 */
export interface Config {
  segments: Volatile<SegmentSettings>
  avatarImage: Volatile<string>
  avatarBindings: Volatile<AvatarBindings>
  chatBackground: Volatile<string>
  backgroundFit: Volatile<'cover' | 'contain' | 'fill'>
  /** 色板变体。 */
  palette: Volatile<QQSkinPalette>
  /** 用户气泡右侧"尾巴"伪元素开关。 */
  bubbleTail: Volatile<boolean>
  /** 助手消息左侧官方 QQ 企鹅头像开关。 */
  assistantAvatar: Volatile<boolean>
  /** 聊天流最大宽度(px)。 */
  chatMaxWidth: Volatile<number>
  /** 新助手消息"滴滴"提示音开关(默认关,避免打扰)。 */
  messageSound: Volatile<boolean>
  /** 助手消息打字机揭示动效开关(默认开)。 */
  typing: Volatile<boolean>
  immersiveQQ: Volatile<boolean>
  fishVoiceWidths: Volatile<{ min: number; max: number }>
  fishVoiceMode: Volatile<QQSkinConfig['fishVoiceMode']>
  fishVoiceGeneration: Volatile<QQSkinConfig['fishVoiceGeneration']>
}

/** 设置分节 schema:宿主校验条目配置、设置面板渲染表单共用。 */
export const Config = z.object({
  segments: z.object({
    enabled: z.boolean().default(true),
    repeatAvatars: z.boolean().default(true),
    regex: z.string().default(SEGMENT_DEFAULTS.regex),
    threshold: z.number().min(1).max(20000).default(1000),
    animate: z.boolean().default(true),
    intervalMin: z.number().min(0).max(10).default(.5),
    intervalMax: z.number().min(0).max(10).default(1.5),
    intervalMethod: z.union(['random', 'log']).default('random'),
    logBase: z.number().min(1.1).max(10).default(2.6),
  }).default(SEGMENT_DEFAULTS).volatile(),
  avatarImage: z.string().default('').volatile(),
  avatarBindings: z.object({
    defaultImage: z.string(),
    conversations: z.dict(z.string()).default({}),
  }).default({ conversations: {} }).volatile(),
  chatBackground: z.string().default('').volatile(),
  backgroundFit: z.union(['cover', 'contain', 'fill']).default('cover').volatile(),
  palette: z.union([...QQ_SKIN_PALETTES]).default('classic').volatile(),
  bubbleTail: z.boolean().default(true).volatile(),
  assistantAvatar: z.boolean().default(true).volatile(),
  chatMaxWidth: z.number().min(480).max(1600).default(880).volatile(),
  messageSound: z.boolean().default(false).volatile(),
  typing: z.boolean().default(true).volatile(),
  immersiveQQ: z.boolean().default(true).volatile(),
  fishVoiceWidths: z.object({ min:z.number().min(140).max(640).required(), max:z.number().min(140).max(640).required() })
    .default({min:160,max:360}).volatile(),
  fishVoiceMode: z.union(['always-text', 'voice-text', 'transcript']).default('voice-text').volatile(),
  fishVoiceGeneration: z.union(['auto', 'on-click']).default('auto').volatile(),
})
