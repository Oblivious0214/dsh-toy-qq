# dsh-qq-skin

## Fish TTS 语音气泡

0.4.6-enhanced 配合工作区适配版 `dsh-fish-tts 0.3.1-qq.1`，提供两种显示方式。在“QQ聊天界面 → 语音显示方式”选择：默认“语音＋文字”，先语音气泡、再保留原分段文字；可选“仅语音气泡”，点击播放后在下方显示 `[正文]` 转文字样式，停止后文字保留，自动朗读不展开文字。这里展示原回复文本，不额外做语音识别。设置持久化并即时切换。秒数取真实音频元数据，首次生成前显示“语音”。浅深色跟随当前色板，支持键盘和减少动画。内嵌媒体的图文混排消息保留原生展示，独立图片不隐藏。卸载任一插件恢复正文。

需要配置 Fish Key 和音色；媒体人设绑定仍待开发。详细记录见工作区 `dsh-plugins/ENHANCEMENTS.md`。

当前本地增强版：`0.4.6-enhanced`。插件名沿用 `dsh-qq-skin`，独立设置入口为“QQ聊天界面”。若之前安装了旧名称 `qq-skin-enhanced`，先卸载旧名称再安装本包，避免两个包同时启用。

这是基于 [lispking/dsh-qq-skin](https://github.com/lispking/dsh-qq-skin) 的独立增强版，保留 MIT 许可证与原作者署名。当前提供本地预编译安装包，尚未发布 GitHub Release 或 npm。

## 沉浸式 QQ

在“设置 → QQ聊天界面”开启“沉浸式 QQ”（默认开启，可手动关闭；已有明确关闭设置仍保留），隐藏已完成回合的用时状态及其横线，以及助手回复下方的复制、评价、分支和用量控件，并隐藏角色切换等成功命令提示。执行中与失败的命令提示保留。保留双方时间戳、用户消息操作、运行中状态、正文与 Markdown 分隔线。开关即时生效并保存，关闭后恢复原控件；只改变显示，不修改消息和上下文。

## 自定义对话头像与背景

点击对话中的头像，默认只绑定当前对话，其他对话继续使用默认头像。选图时可勾选“同时设为默认头像”，同时绑定当前对话并更新默认头像，不覆盖其他对话已有的专属头像。“使用默认头像”只解除当前对话的绑定。

在“设置 → QQ聊天界面 → 默认头像”可更换默认头像，或恢复内置企鹅。0.3.x 的全局头像会自动沿用为默认头像。绑定按稳定的对话 ID 保存；裁剪过程中切换对话，也会保存到打开编辑器时选中的对话。

高级配置 `avatarBindings` 在一个字段中保存 `defaultImage` 和 `conversations` 对话映射；旧 `avatarImage` 作为尚未设置新默认头像时的兼容回退。

点击助手回复旁的企鹅头像（也支持键盘聚焦后按 Enter），可选择 PNG、JPEG 或 WebP
图片，最大 20 MB。拖动取景框、拉动边角调整大小，或缩放图片；框外部分变暗。空白区域可点击选图，已取消拖放上传。PNG 裁剪保留透明通道，自定义头像不铺白色圆底。编辑器使用随包内嵌的 Cropper.js（MIT），无需 CDN。对话头像从 22 px 放大至 33 px（50%）。确认方形取景后
点击“裁剪并保存”。

在“设置 → QQ聊天界面 → 对话背景”中选择背景，可按当前对话比例、16:9、4:3、
9:16 或原图比例裁剪；类似桌面壁纸，可选择“填充（保持比例）”“适应（显示完整图片）”
或“拉伸”。背景只作用于对话滚动区域。

两个编辑器均可“恢复默认”或“取消”；确认后才保存，保存失败可原地重试。头像最长边
不超过 512 px，背景最长边不超过 1600 px，裁剪结果保存在当前 profile 的 `qq-skin`
设置中，刷新后保留。对话头像按所选对话绑定，未绑定的对话使用默认头像；背景仍由同一 profile 共用。原图文件不保存，不向第三方图床上传，
也不会写入原始消息或模型上下文。

高级配置：`avatarImage`、`chatBackground` 为内嵌栅格图片 data URL，空字符串表示恢复默认；
`backgroundFit` 为 `cover`（默认填充）、`contain`（适应）或 `fill`（拉伸）。

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）的 **QQ NT 风格皮肤插件**：亮暗统一为 QQ NT 语言——**亮色白净克制**（表面近白、边框/hover 中性，品牌蓝 `#12B7F5` 与浅蓝气泡 `#A8E3FF` 只做辨识度点缀），**暗色沉稳蓝灰**（基座 `#101822`，降饱和耐看，蓝同样只点缀），一眼可辨。内置五种色板变体（经典蓝 / 炫彩紫 / 简洁白 / 经典绿气泡 / 深空黑），开关与尺寸均可配置，App 设置面板可视化切换 + 热更新。

[English](README.md)

> **原理。** 皮肤由两层可逆贡献组成，不注册新主题 id，也不改动用户的浅色/深色/跟随系统偏好：
> - **token 层** —— 激活时通过 `ctx.theme.overrideTokens('dsh-qq-skin', ...)` 叠加 `--dsw-*` 语义 token；每个 token 带 `{ light, dark }` 双色值，皮肤跟随当前基座而不是与它对抗。亮色蓝色贯穿表面、边框、交互与滚动条；暗色为 `#101822` 起的沉稳蓝灰刻度，蓝色只做点缀（品牌、气泡、主按钮）。token 集按色板变体生成（`buildTokenOverrides(palette)`）：五种色板共享中性蓝灰骨架，仅在人格 token 上分化。
> - **布局层** —— 注入一个全局 `<style>` 标签（`qq-layout.ts`），负责几何与结构：聊天流居中收窄、用户气泡浅蓝带"尾巴"、助手消息左侧头像圆标 + 白色卡片（按 `data-chat-flow-kind='assistant-step'` 命中）、输入区胶囊化、会话头部细分割线、时间戳与滚动条、侧边栏会话行悬停/选中态 QQ 化。品牌区保持产品原样，QQ 感完全由蓝色 token 层体现。颜色一律经 `--dsw-*` token，暗色变体由 `body[data-ds-dark-theme]` 门控。CSS 按配置生成（`buildQQLayoutCss`）。
>
> 卸载时两层都随 effect 清理完整还原，产品默认外观回归。设置与配置变更经 `QQSkinRuntime.update` 热重挂两层，无需重启插件。

## 效果预览

经典蓝色板下的聊天视图：居中收窄的聊天流、带"尾巴"的浅蓝用户气泡、助手消息左侧企鹅头像圆标：

![聊天视图](assets/chat.png)

早期设置预览（当前所有控件均已迁入独立的 **「QQ聊天界面」** 设置页），可视化切换色板 / 气泡尾巴 / 企鹅头像 / 会话宽度：

![设置面板](assets/settings.png)

## 设置面板

皮肤在 App 设置里注册独立的 **「QQ聊天界面」** 页面，不再出现在通用设置中，可视化切换色板 / 气泡尾巴 / 企鹅头像 / 会话宽度——变更立即生效（热更新重挂两层，不重启），并持久化到用户设置文档。设置面板改动优先于这里的静态配置。

## 配置

插件以 cordis 函数插件方式接收配置（`apply(ctx, config)`），未配置的字段回落默认值：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `palette` | `'classic'` | 色板变体：`classic` 经典蓝 / `vivid` 炫彩紫 / `clean` 简洁白 / `green` 经典绿气泡 / `black` 深空黑 |
| `bubbleTail` | `true` | 用户气泡右侧"尾巴"小三角 |
| `assistantAvatar` | `true` | 助手消息左侧官方 QQ 企鹅头像圆标 |
| `chatMaxWidth` | `880` | 聊天流最大宽度（px） |

示例（在 profile 的插件配置里指定）：

```json
{ "palette": "vivid", "bubbleTail": false, "chatMaxWidth": 720 }
```

## 覆盖范围

| 区域 | 机制 |
| --- | --- |
| 品牌与主操作（QQ 蓝） | `--dsw-alias-brand-primary`、`--dsw-alias-button-primary-*`、`--dsw-alias-state-business-*` |
| 画布与表面（亮色白净） | `--dsw-alias-bg-base`（`#F7F9FB`）、`--dsw-alias-bg-layer-1..3`、`--dsw-alias-bg-overlay` |
| 会话气泡（浅蓝 `#A8E3FF`） | `--dsw-specific-bubble`、`--dsw-specific-bubble-highlight` + 布局层圆角/阴影 |
| 助手消息 | 布局层头像圆标（token 色）+ 白卡片描边（`--dsw-alias-bg-layer-1` + `border-l1`） |
| 聊天流 | 布局层居中收窄（`data-chat-flow`，宽度可配置） |
| 输入区 | 布局层胶囊化（`data-composer-card`）+ 工具栏按钮圆角 + `--dsw-specific-input-major` |
| 会话头部 | 布局层细分割条（`header[class$='_header']`，不误伤侧栏面板） |
| 消息时间戳 | 布局层 QQ 风格圆片（`data-time-hover-root` + `_timeStart/_timeEnd`） |
| 侧边栏会话行 | 布局层悬停/选中态、状态点圆角（`_sessionRow`/`_projectRow`/`_dot`） |
| 滚动条 | 布局层加宽圆角（`data-conversation-scroll`）+ `--dsw-alias-scrollbar-*` |
| 侧边栏（亮色白净 / 暗色蓝灰） | `--dsw-specific-sidebar-fill`（`#F2F5F8`）、`--dsw-specific-sidebar-nav-item-*` + 布局层分割线 |
| 文字与边框 | `--dsw-alias-label-*`、`--dsw-alias-border-l1..l4`（蓝调描边） |
| 状态色（QQ 绿/红/琥珀） | `--dsw-alias-state-success/error/warn-*` |
| 静态色板（组件直引，统一天蓝） | `--dsw-static-deepseek-*`、`--dsw-static-blue-*`（重映射为 `#12B7F5` 天蓝刻度） |
| Markdown、滚动条（QQ 蓝）、菜单、提示 | `--dsw-alias-markdown-*`、`--dsw-alias-scrollbar-*`、`--dsw-specific-menu`、`--dsw-alias-tooltip-bg` |

未覆盖的 token 保持产品默认，QQ 皮肤运行中其他区域依然清晰一致。

## 环境要求(dsh 版本)

构建/运行目标为 **deepseek-harness(`dsh`) 0.2.0 及以上**。0.2 改掉了设置系统的两处契约(2026-10):

- **设置命名空间就是 profile 条目 id**:`ctx.settings.register(命名空间, schema)` 已删除。插件设置 schema 改为宿主入口的 `Config` 导出,且**每个字段都必须 `.volatile()`**——设置面板只投影 volatile 字段,非 volatile 字段既不出现在描述里也不可写。命名空间取 `cordis.patch.yml` 中该条目的 `id`(`qq-skin`),不再是插件自选字符串。
- **浏览器半区读写设置改走 `ctx.configForms`**:`ctx.settingsScope` 服务已删除。客户端用 `ctx.configForms.get('qq-skin')` 拿到该条目的表单,快照值即宿主解析后的完整配置(默认值 → profile 配置 → 用户改写),写入用 `set(field, value)`。0.2 的客户端条目也不再收到 config 参数,故出厂默认值只作首帧兜底。
- 皮肤自带独立的 QQ聊天界面设置页,故宿主侧用 `settings.configure({ auto: false })` 关掉自动生成页。

更早的 dsh 版本(0.1.x)与本插件不兼容:那时没有 `settings.configure` / `ctx.configForms`,也没有 volatile 配置投影;`pnpm i` 装的就是 0.2 的包。

## 本地安装与测试

使用 DSH 0.2.1-rc.3 或兼容的更新 0.2.x 版本。下载安装包后，将下面的路径换成实际绝对路径：

```sh
dsh plugin --profile web add "C:/Downloads/dsh-qq-skin-0.4.6-enhanced.tgz"
```

如果已安装原版，先执行 `dsh plugin --profile web remove dsh-qq-skin`，不要同时启用两个皮肤。
按 DSH 提示重启或重新加载，然后进入“设置 → QQ聊天界面”。
安装包包含编译好的宿主和浏览器代码，无需自己编译或注册 npm；已有运行依赖仍可能由包管理器下载。
也可在 DSH 的第三方插件安装入口填写 `.tgz` 的完整本地路径。

卸载：`dsh plugin --profile web remove dsh-qq-skin`。
本增强版保留原版 `qq-skin` 设置命名空间，同一 profile 的所有对话共用头像和背景。
后续计划通过 GitHub Releases 发布手动更新包，流程见 [RELEASING.md](RELEASING.md)。

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm test            # vitest（token 形状 + 布局注入 + 运行时热更新 + 设置接线）
pnpm run build       # tsc + tsdown → lib/index.js（宿主）+ lib/client.js（浏览器闭包工厂）
```

客户端 bundle 采用与 harness `clientBundle` 预设相同的双面布局：`lib/index.js`
是普通 ESM 宿主条目，`lib/client.js` 是 Web 启动消费的 `window.__ModuleLoader__`
闭包工厂格式。皮肤不经过构建期 CSS 管线：布局样式作为内联字符串打进客户端
bundle（`qq-layout.ts` 的 `QQ_LAYOUT_CSS`），运行时经 `document.createElement('style')`
注入，与 ui-theme 的 `installThemeStyles` 同构，卸载随 effect 移除。布局选择器
依赖客户端 CSS Modules 的 `[hash]_[local]` 类名模式（`[class$="_localName"]`
结尾命中）与组件源码中的 `data-*` 属性钩子，不依赖构建期 hash 值。

设置行（`settings-row.tsx`）使用内联 token 样式直读 `--dsw-*` 变量，不引入 CSS
Modules 管线；`react` 与协作服务在客户端 bundle 中作为外部模块，经平台预加载
表解析。

## License

MIT

## 0.4.6 语音回复

检测到 Fish TTS 后，输入区的自动朗读按钮由 QQ 插件接管为“语音回复”。开启后，已完成回复的每个文字分段显示为可点击的语音条，不会收到回复就自动播放。点击一条后顺序播放本次回复剩余的分段；再次点击停止，点击其他条切换。仅在点击时调用 Fish 原有合成接口，沿用它的音色、模型、音量与倍速。QQ 设置中可选择点击后展示转文字，或始终只显示语音条。

不修改 Fish 文件或保存的自动朗读偏好，不依赖配套版 data-fish-tts-* 属性。关闭语音回复恢复文字，卸载 QQ 插件恢复 Fish 原按钮。图片、思考、代码及混合媒体保留原样；合成或播放失败时显示错误并允许重试。
