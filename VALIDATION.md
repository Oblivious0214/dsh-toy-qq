# 0.4.6 voice reply verification

- 123 tests passed; TypeScript build passed.
- Headless Edge verified keyboard click, collapsed text, sequential natural-ended playback, conversation boundary, transcript reveal and restoration on unload.
- Mock audio and mocked synthesis only; no real Fish API requests or credentials used.
- QQ adapter detects Fish slot registrations; it does not require Fish DOM data attributes.
- Voice reply preference is QQ-local and does not overwrite Fish autoplay preference.

# QQ聊天界面 0.4.6-enhanced · 本地验证

日期：2026-10-28。包名和设置命名空间保持 `dsh-qq-skin` / `qq-skin`，样式标记保持 `dsh-qq-skin/layout`，不破坏分段头像的适配。

- 插件列表通过 `locale/zh.json` 的 `meta.title` 显示“QQ聊天界面”，设置页同步使用此名称；英文标题为 QQ chat interface。
- 宿主 schema、浏览器初始配置、配置合并和非法值回退均默认开启沉浸式 QQ。保留用户明确设置为 false 的选择，关闭后仍恢复原控件。
- 9 个测试文件、119 项测试通过；覆盖原有功能、默认语音加分段文字、可选点击转文字、模式持久化与热切换、状态与真实时长、跨会话隔离、卸载还原、图文保护和空壳消除。严格类型检查及两端构建通过。
- Fish 本地适配版通过 102 项测试及两端模块加载检查；浏览器验证浅深色、键盘播放/停止、文字展开、其他会话独立与卸载恢复。预览使用本地数据，不调用真实 API。
- 仍按原包机制交付编译产物，不修改宿主源码。没有执行真实消息或设备操作。
