/**
 * QQ 皮肤插件,宿主半区。浏览器半区通过 exports["./client"] 提供;宿主侧
 * 导出设置 schema、声明设置页策略，并按分段开关注入文字和间隔提示词。
 *
 * dsh 0.2 起没有 `ctx.settings.register`:命名空间即 profile 条目 id,schema 由
 * Loader 从本模块的 `Config` 导出读取,设置面板据此投影表单;浏览器半区经
 * `ctx.configForms.get('qq-skin')` 读写同一份配置。皮肤设置行由浏览器半区
 * 自己渲染,故关闭自动生成页。
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls dsh-settings 的 ctx.settings 服务声明。
import type {} from '@deepseek-ai/dsh-settings'
import { Config } from './settings-schema.ts'
import { segmentPrompt, type PromptRegistry } from './segment-prompt.ts'

/** 设置 schema(宿主 Loader 校验 profile 条目配置、设置面板渲染表单共用)。 */
export { Config } from './settings-schema.ts'
export type { Config as QQSkinSettingsConfig } from './settings-schema.ts'

/** 宿主插件体 —— 皮肤设置页由设置行(浏览器半区)渲染,关闭自动页生成。 */
export function apply(ctx: Context, config: Config = Config({})): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
  ctx.inject(['systemPrompt'], inner => {
    const prompt = inner.get('systemPrompt') as PromptRegistry
    inner.effect(() => prompt.section({ name: 'qq-segment-timing', order: 80,
      interpolate: false, text: () => segmentPrompt(config) }))
  })
}
