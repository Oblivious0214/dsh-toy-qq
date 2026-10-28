# QQ聊天界面（改版）

## 0.4.9 语音条更新

开启 QQ 语音回复后，仅当前会话内新完成的回复会提前合成分段音频（最多两个并行请求），读取真实时长并显示“x秒”。历史回复不会自动调用 Fish；点击时生成。已生成音频在当前会话内复用，点击停止、自然结束接播下一段，切换会话或卸载取消并释放音频。错误可点击重试。

QQ 设置可同时保存语音条最短/最长宽度，默认 160/360 像素；每秒增加 8 像素并限制在上下限内。允许 140–640 的整数，最短宽度不可超过最长宽度。

移除 QQ 对 Fish settings.section 的额外覆盖注册。当前宿主左侧菜单读取原始注册列表，覆盖注册也会显示，导致同名入口重复。现在仅保留原版 Fish 设置页；QQ 语音回复仍由输入框开关控制，原 Fish 设置页继续管理音色、模型、音量、语速及测试朗读。原版 Fish 文件未修改。


包名：`dsh-toy-qq`；当前版本：`0.4.9`。基于 `dsh-qq-skin` 的既有版本继续更新，保留来源说明与许可证。目标宿主：DSH 0.2.1-rc.3，源码提交 `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`。

安装包名、客户端模块名和宿主 bundle 引用已统一；旧的配置条目 ID 保留以兼容已有设置。

安装：使用 `dsh-toy-qq-0.4.9.tgz` 添加到桌面 profile。请先移除旧包 `dsh-qq-skin`，避免同时加载。

## 迁移前的功能与来源说明

以下保留原项目的功能和来源记录；其中旧包名及本地路径不是新版安装入口。

## 0.4.6: QQ-owned Fish voice replies

When Fish TTS is registered, QQ shadows its action and input slots without changing Fish files. Enable Voice replies to show one clickable voice bar per text segment. Playback starts on click, advances only after the natural end of each segment, and stops at the current reply boundary. Click again to cancel. Existing Fish synthesis routes, configured voice/model, volume and speed are reused. Text remains in conversation history; only presentation changes. Mixed media, reasoning and code are preserved.

# dsh-qq-skin

Fish voice integration in 0.4.6-enhanced requires the local `dsh-fish-tts 0.3.1-qq.1` build. Settings offer two modes: voice followed by the existing segmented text (default), or voice only with a bracketed transcript revealed on click. The transcript uses the reply text, without speech recognition. Mode changes persist and apply immediately. Duration comes from audio metadata. Inline media replies retain native rendering. Removing either plugin restores text. Fish credentials and a voice ID are required; persona media bindings are planned separately.

Local enhanced build: `0.4.6-enhanced`. The package retains the original `dsh-qq-skin` name. If the earlier `qq-skin-enhanced` package is installed, remove that package before installing this one to avoid duplicate skins. Settings remain under QQ chat interface.

An independently maintained enhancement of [lispking/dsh-qq-skin](https://github.com/lispking/dsh-qq-skin), retaining the MIT license and original author attribution. Currently supplied as a prebuilt local test package; no GitHub Release or npm publication yet.

A **QQ NT messenger skin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`). Light and dark share one QQ NT language — **light mode is clean and restrained** (near-white surfaces, neutral borders/hover, brand blue `#12B7F5` and light-blue bubbles `#A8E3FF` as recognition accents), **dark mode is a calm blue-gray** (base `#101822`, desaturated, blue reserved for accents), instantly recognizable. Ships with five palette variants (Classic Blue / Vivid Purple / Clean White / Green Bubble / Deep Black), configurable toggles and sizing, plus a settings-panel visual switcher with hot reload.

[中文](README.zh.md)

> **How it works.** The skin is two reversible layers; it never registers a new theme id and never touches the user's Light/Dark/System preference.
> - **Token layer** — stacks one `--dsw-*` semantic-token override via `ctx.theme.overrideTokens('dsh-qq-skin', ...)`. Every token carries a `{ light, dark }` pair, so the skin follows the active base palette instead of fighting it. Light mode runs blue through surfaces, borders, interactions, and scrollbars; the dark palette is a `#101822`-based calm blue-gray scale where blue only accents (brand, bubbles, primary buttons). The set is generated per palette (`buildTokenOverrides(palette)`): the five palettes share the neutral blue-gray skeleton and differ only in the personality tokens.
> - **Layout layer** — injects one global `<style>` tag (`qq-layout.ts`) for geometry and structure: the chat flow is centered and narrowed, user bubbles are light blue with a "tail", assistant rows get an avatar disc + white card (matched via `data-chat-flow-kind='assistant-step'`), the input area becomes a capsule, plus a slim conversation-header divider, QQ-styled timestamps and scrollbar, and sidebar session-row hover/selected states. The brand area stays product-native — the QQ feel comes entirely from the blue token layer. Colors always come from `--dsw-*` tokens, and dark variants are gated by `body[data-ds-dark-theme]`. The CSS is generated from the config (`buildQQLayoutCss`).
>
> On unload both layers are fully removed through effect cleanup and the product look returns. Settings and config changes hot-reapply both layers via `QQSkinRuntime.update` without restarting the plugin.

## Screenshots

The chat view in the Classic Blue palette: centered, narrowed chat flow, light-blue user bubbles with a "tail", and the penguin avatar disc on assistant rows:

![Chat view](assets/chat.png)

An earlier settings screenshot (all controls now live under **QQ chat interface**), with the palette / bubble tail / assistant avatar / chat width toggles:

![Settings panel](assets/settings.png)

## Settings panel

**Immersive QQ** (on by default; existing explicit opt-outs are preserved) hides the completed-turn duration header and its divider, plus assistant copy, feedback, branch and token-usage controls, and successful slash-command notices such as role switches. Running or failed command notices remain visible. Message clocks, user-message actions, running status and reply/Markdown content stay visible. Toggle it under Settings → QQ chat interface; changes apply immediately and persist across reloads. Disabling it restores the original controls.

The skin registers a dedicated **QQ chat interface** settings section, separate from General, with visual toggles for palette / bubble tail / assistant avatar / chat width. Changes apply immediately (hot reload remounts both layers) and are persisted to the user-settings document. The settings panel overrides the static config below.

## Configuration

### Custom avatar and chat wallpaper

Clicking an avatar now edits only that conversation. Check **Also set as default avatar** to apply the crop to that conversation and update the default for all unbound conversations. Existing conversation overrides are preserved. **Use default avatar** removes only the selected conversation's binding.

Under **Settings → QQ chat interface → Default avatar**, edit the profile default or restore the built-in penguin. Old shared avatars from 0.3.x become the default automatically. Avatars are keyed by stable session IDs, and switching conversations during cropping does not retarget the pending save. The `avatarBindings` settings field stores `defaultImage` and the `conversations` map atomically; `avatarImage` remains the legacy fallback.

Click the penguin beside an assistant reply (or focus it and press Enter) to
choose a PNG, JPEG or WebP image, up to 20 MB. The editor previews a square crop;
drag the crop box or resize its corners, zoom the image, then **Crop and save**. The area outside the box is darkened. Click the empty crop area or Choose image to select a file. File drop upload is disabled. PNG crops retain their alpha channel, and uploaded avatars have no background disc. The editor uses bundled Cropper.js (MIT); no CDN is needed. Chat avatars are 33 px (50% larger than the original 22 px).

In **Settings → QQ chat interface → Chat background**, choose and crop a wallpaper.
Use the current conversation aspect ratio, 16:9, 4:3, 9:16, or the original image
ratio. Like desktop wallpaper settings, **Fill** preserves the ratio and covers
the view, **Fit** shows the whole crop, and **Stretch** fills both dimensions.
The wallpaper affects only the conversation scroll area.

Both editors offer **Restore default** and **Cancel**. Changes are saved only on
confirmation; errors leave the editor open for retry. The cropped image is resized
(avatar: at most 512 px; wallpaper: at most 1600 px on its longest edge) and embedded
in the existing `qq-skin` profile settings. It persists across reloads. Conversation avatars are bound to the selected session; unbound sessions use the default avatar. The wallpaper remains shared by the profile. The original file is not stored. Images
are not sent to an external image host, added to messages, or added to model context.

Advanced config fields: `avatarImage` and `chatBackground` accept embedded raster
data URLs (empty strings restore defaults), and `backgroundFit` is `cover` (default),
`contain`, or `fill`.

The plugin receives config the cordis function-plugin way (`apply(ctx, config)`); unset fields fall back to defaults:

| Option | Default | Meaning |
| --- | --- | --- |
| `palette` | `'classic'` | Palette variant: `classic` Classic Blue / `vivid` Vivid Purple / `clean` Clean White / `green` Green Bubble / `black` Deep Black |
| `bubbleTail` | `true` | Small triangular "tail" on the right of user bubbles |
| `assistantAvatar` | `true` | Official QQ-penguin avatar disc left of assistant messages |
| `chatMaxWidth` | `880` | Max width of the chat flow (px) |

Example (set in the profile's plugin config):

```json
{ "palette": "vivid", "bubbleTail": false, "chatMaxWidth": 720 }
```

## What it covers

| Area | Mechanism |
| --- | --- |
| Brand & primary actions (QQ blue) | `--dsw-alias-brand-primary`, `--dsw-alias-button-primary-*`, `--dsw-alias-state-business-*` |
| Canvas & surfaces (clean light) | `--dsw-alias-bg-base` (`#F7F9FB`), `--dsw-alias-bg-layer-1..3`, `--dsw-alias-bg-overlay` |
| Conversation bubbles (light blue `#A8E3FF`) | `--dsw-specific-bubble`, `--dsw-specific-bubble-highlight` + layout-layer radius/shadow |
| Assistant messages | layout-layer avatar disc (token colors) + white card with border (`--dsw-alias-bg-layer-1` + `border-l1`) |
| Chat flow | layout-layer centering (via `data-chat-flow`, width configurable) |
| Input bar | layout-layer capsule (`data-composer-card`) + toolbar button radius + `--dsw-specific-input-major` |
| Conversation header | layout-layer slim divider (`header[class$='_header']`, never hits side panels) |
| Message timestamps | layout-layer QQ-style chips (`data-time-hover-root` + `_timeStart/_timeEnd`) |
| Sidebar session rows | layout-layer hover/selected fill + status-dot radius (`_sessionRow`/`_projectRow`/`_dot`) |
| Scrollbar | layout-layer widening + radius (`data-conversation-scroll`) + `--dsw-alias-scrollbar-*` |
| Sidebar (clean light / blue-gray dark) | `--dsw-specific-sidebar-fill` (`#F2F5F8`), `--dsw-specific-sidebar-nav-item-*` + layout-layer divider |
| Text & borders | `--dsw-alias-label-*`, `--dsw-alias-border-l1..l4` (blue-tinted strokes) |
| Status colors (QQ green/red/amber) | `--dsw-alias-state-success/error/warn-*` |
| Static palette (component-direct, unified sky blue) | `--dsw-static-deepseek-*`, `--dsw-static-blue-*` (remapped to the `#12B7F5` sky-blue scale) |
| Markdown, scrollbar (QQ blue), menus, tooltips | `--dsw-alias-markdown-*`, `--dsw-alias-scrollbar-*`, `--dsw-specific-menu`, `--dsw-alias-tooltip-bg` |

Tokens that are **not** overridden keep the product default, so a QQ-skin run stays readable and consistent everywhere else.

## Requirements (dsh version)

Built and run against **deepseek-harness (`dsh`) 0.2.0 or later**. dsh 0.2 changed two settings-system contracts (2026-10):

- **The settings namespace IS the profile entry id.** `ctx.settings.register(ns, schema)` is gone: the plugin's settings schema is now the `Config` export of its host entry, and **every field must be `.volatile()`** — the settings panel projects volatile fields only, so a non-volatile field appears in no descriptor and accepts no write. The namespace comes from the `id` of the entry in `cordis.patch.yml` (`qq-skin`), not from a string the plugin picks.
- **The browser half reads and writes settings through `ctx.configForms`.** The `ctx.settingsScope` service is gone: the client uses `ctx.configForms.get('qq-skin')`, whose snapshot value is the fully resolved host config (schema defaults → profile config → user edits) and whose `set(field, value)` persists an edit. A 0.2 client entry no longer receives a `config` argument at all, so the built-in defaults only cover the first frame.
- The skin ships its own dedicated settings section, hence the host half calls `settings.configure({ auto: false })` to suppress the auto-generated page.

Earlier dsh versions (0.1.x) are not compatible: they have no `settings.configure`, no `ctx.configForms`, and no volatile config projection.

## Local installation and testing

Use DSH 0.2.1-rc.3 or a compatible later 0.2.x release. Replace the example with the archive's absolute path:

```sh
dsh plugin --profile web add "C:/Downloads/dsh-qq-skin-0.4.6-enhanced.tgz"
```

If the original is installed, remove it first with `dsh plugin --profile web remove dsh-qq-skin`; do not enable both skins.
Follow DSH's restart/reload prompt and open Settings → QQ chat interface.
The archive is prebuilt. No npm account is needed; the package manager may still fetch existing runtime dependencies.
You can also enter the archive's full local path in DSH's third-party plugin installer.

Uninstall with `dsh plugin --profile web remove dsh-qq-skin`.
The original `qq-skin` settings namespace is retained. All conversations in a profile share the avatar and wallpaper.
Future manual releases can use GitHub Releases; see [RELEASING.md](RELEASING.md).

## Development

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm test            # vitest (token shape + layout injection + runtime hot reload + settings wiring)
pnpm run build       # tsc + tsdown → lib/index.js (host) + lib/client.js (browser closure-factory)
```

The client bundle is produced by the same two-face layout as the harness
`clientBundle` preset: `lib/index.js` is the plain ESM host row, `lib/client.js`
is the `window.__ModuleLoader__` closure-factory the Web boot consumes. Cropper.js styles are embedded by the small inline CSS loader in tsdown; the layout styles ship as an inline string
inside the client bundle (`QQ_LAYOUT_CSS` in `qq-layout.ts`) and are injected at
runtime via `document.createElement('style')` — the same shape as ui-theme's
`installThemeStyles` — then removed on effect dispose. Layout selectors rely on
the client CSS Modules `[hash]_[local]` naming (`[class$="_localName"]`
suffix matches) and the components' own `data-*` hooks, never on build-time
hash values.

The settings row (`settings-row.tsx`) uses inline token styles reading `--dsw-*`
directly, so it adds no CSS Modules pipeline; `react` and the collaboration
services stay external to the client bundle and resolve through the platform
module table.

## License

MIT
