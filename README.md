# qq-skin-enhanced

An independently maintained enhancement of [lispking/dsh-qq-skin](https://github.com/lispking/dsh-qq-skin), retaining the MIT license and original author attribution. Currently supplied as a prebuilt local test package; no GitHub Release or npm publication yet.

A **QQ NT messenger skin** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`). Light and dark share one QQ NT language — **light mode is clean and restrained** (near-white surfaces, neutral borders/hover, brand blue `#12B7F5` and light-blue bubbles `#A8E3FF` as recognition accents), **dark mode is a calm blue-gray** (base `#101822`, desaturated, blue reserved for accents), instantly recognizable. Ships with five palette variants (Classic Blue / Vivid Purple / Clean White / Green Bubble / Deep Black), configurable toggles and sizing, plus a settings-panel visual switcher with hot reload.

[中文](README.zh.md)

> **How it works.** The skin is two reversible layers; it never registers a new theme id and never touches the user's Light/Dark/System preference.
> - **Token layer** — stacks one `--dsw-*` semantic-token override via `ctx.theme.overrideTokens('qq-skin-enhanced', ...)`. Every token carries a `{ light, dark }` pair, so the skin follows the active base palette instead of fighting it. Light mode runs blue through surfaces, borders, interactions, and scrollbars; the dark palette is a `#101822`-based calm blue-gray scale where blue only accents (brand, bubbles, primary buttons). The set is generated per palette (`buildTokenOverrides(palette)`): the five palettes share the neutral blue-gray skeleton and differ only in the personality tokens.
> - **Layout layer** — injects one global `<style>` tag (`qq-layout.ts`) for geometry and structure: the chat flow is centered and narrowed, user bubbles are light blue with a "tail", assistant rows get an avatar disc + white card (matched via `data-chat-flow-kind='assistant-step'`), the input area becomes a capsule, plus a slim conversation-header divider, QQ-styled timestamps and scrollbar, and sidebar session-row hover/selected states. The brand area stays product-native — the QQ feel comes entirely from the blue token layer. Colors always come from `--dsw-*` tokens, and dark variants are gated by `body[data-ds-dark-theme]`. The CSS is generated from the config (`buildQQLayoutCss`).
>
> On unload both layers are fully removed through effect cleanup and the product look returns. Settings and config changes hot-reapply both layers via `QQSkinRuntime.update` without restarting the plugin.

## Screenshots

The chat view in the Classic Blue palette: centered, narrowed chat flow, light-blue user bubbles with a "tail", and the penguin avatar disc on assistant rows:

![Chat view](assets/chat.png)

The **QQ Skin** settings row in the App settings General section, with the palette / bubble tail / assistant avatar / chat width toggles:

![Settings panel](assets/settings.png)

## Settings panel

The skin registers a **QQ Skin** settings row in the App settings General section, with visual toggles for palette / bubble tail / assistant avatar / chat width. Changes apply immediately (hot reload remounts both layers) and are persisted to the user-settings document. The settings panel overrides the static config below.

## Configuration

### Custom avatar and chat wallpaper

Click the penguin beside an assistant reply (or focus it and press Enter) to
choose a PNG, JPEG or WebP image, up to 20 MB. The editor previews a square crop;
drag to position it or use the zoom and position sliders, then **Crop and save**.

In **Settings → General → QQ Skin → Chat background**, choose and crop a wallpaper.
Use the current conversation aspect ratio, 16:9, 4:3, 9:16, or the original image
ratio. Like desktop wallpaper settings, **Fill** preserves the ratio and covers
the view, **Fit** shows the whole crop, and **Stretch** fills both dimensions.
The wallpaper affects only the conversation scroll area.

Both editors offer **Restore default** and **Cancel**. Changes are saved only on
confirmation; errors leave the editor open for retry. The cropped image is resized
(avatar: at most 512 px; wallpaper: at most 1600 px on its longest edge) and embedded
in the existing `qq-skin` profile settings. It persists across reloads and applies
to all conversations using that profile; the original file is not stored. Images
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
- The skin ships its own settings row in the General section, hence the host half calls `settings.configure({ auto: false })` to suppress the auto-generated page.

Earlier dsh versions (0.1.x) are not compatible: they have no `settings.configure`, no `ctx.configForms`, and no volatile config projection.

## Local installation and testing

Use DSH 0.2.1-rc.3 or a compatible later 0.2.x release. Replace the example with the archive's absolute path:

```sh
dsh plugin --profile web add "C:/Downloads/qq-skin-enhanced-0.3.0.tgz"
```

If the original is installed, remove it first with `dsh plugin --profile web remove dsh-qq-skin`; do not enable both skins.
Follow DSH's restart/reload prompt and open Settings → General → QQ Skin.
The archive is prebuilt. No npm account is needed; the package manager may still fetch existing runtime dependencies.
You can also enter the archive's full local path in DSH's third-party plugin installer.

Uninstall with `dsh plugin --profile web remove qq-skin-enhanced`.
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
is the `window.__ModuleLoader__` closure-factory the Web boot consumes. No
build-time CSS pipeline is needed: the layout styles ship as an inline string
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
