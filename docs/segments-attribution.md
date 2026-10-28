# 合并来源记录

2026-10-28：将本工作区 `qqbot/src/dsh-chat-segments` 的 `dsh-toy-segments@0.1.8`（提交 `494cda401aaa9acc7028a716bd7debb9a444bad8`）源码移入 QQ 分支 `feat/dsh-toy-qq` 的 `src/client/segments/`。分段算法、Worker 隔离、原生展示投影、复制与头像模块保留；设置改为 QQ 页内嵌区域并统一持久化到 `qq-skin.segments`。

对应原始 MIT 声明保存在同目录 `segments-LICENSE.txt`；Worker 的第三方组件许可由 `scripts/build-segments-worker.mjs` 生成到包根目录 `SEGMENTS-THIRD-PARTY-NOTICES.txt`。以下是原分段项目的来源说明，路径与版本描述按当时状态保留。

---

# 来源与许可说明

核对日期：2026-10-28；插件版本：0.1.6。

## 本项目

本插件是面向 DeepSeek Harness 的展示插件，本项目代码按 MIT 分发。已有 `Copyright © 2026 lispking` 声明保留；新增贡献以 `dsh-chat-segments contributors` 署名。保留既有声明不表示将整个插件归为该作者作品，也不据此推断 AstrBot 的许可。

## AstrBot：行为参考，未纳入运行依赖

- 项目：https://github.com/AstrBotDevs/AstrBot
- 许可证：AGPL-3.0，见该项目 LICENSE；本项目不对 AstrBot 源码另行授权。
- 本地参考检出提交：`f61a7f42696da6df25dc7a249ec9b8d54ed9da18`。核对的两份 Python 文件及 LICENSE 在该检出中没有工作区修改。
- `astrbot/core/pipeline/result_decorate/stage.py`：超过阈值时不分段、正则匹配片段的行为。
- `astrbot/core/pipeline/respond/stage.py`：随机间隔、ASCII 按单词计数、其他文字按字母和数字计数、对数延迟公式及底数 2.6。
- 本工作区早期 AstrBot 配置脚本：阈值 1000、0.5–1.5 秒及正则的默认配置参考。当前正则经过调整，不在冒号、逗号、分号处分段。

核对的 TypeScript 源码采用 Markdown AST 保护范围、无损原文切片、Worker 隔离与超时、React 展示投影及只读头像联动；AstrBot 参考文件处理 Python 消息链并逐项发送。共同点集中在功能规则、计数方法、数学公式及配置参数。本次未发现复制 Python 源码、注释、错误文案或非必要的表达性实现结构。未将 Python 文件翻译后作为插件运行代码分发。

这是当前可见文件的技术来源核对，不是对历史生成过程或法律结论的保证。未来如引入 AstrBot 的受版权保护代码，应重新处理许可；仅保留本说明不能替代 AGPL 义务。

## DeepSeek Harness：宿主接口参考

- 项目：https://github.com/deepseek-ai/deepseek-harness
- 本地参考提交：`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`；本地目标版本 0.2.1-rc.3。
- 根许可证：MIT，`Copyright (c) 2026 DeepSeek`。
- 参考 `packages/client/ui-chat`、`ui-renderer`、`ui-slots`、`ui-attachment` 的接口、声明与公开 Content Factory。实际原生渲染器由宿主提供，未复制进本插件运行包。
- 部分测试导入相邻宿主源码或声明产物；本项目源码 ZIP 不包含该检出。参考提交号不是对整个宿主工作区无修改的声明。

## QQ Skin：接口和打包方式参考

- 上游：https://github.com/lispking/dsh-qq-skin
- 本地增强版：https://github.com/Oblivious0214/qq-skin-enhanced
- 已有许可证：MIT，`Copyright © 2026 lispking`。
- 参考配置条目、volatile schema、客户端闭包工厂打包方式，以及头像和样式的接口标记。插件只读当前皮肤头像并转交编辑动作；没有复制皮肤功能模块进运行包。
- 头像兼容测试导入相邻皮肤模块的样式标记。源码 ZIP 不包含皮肤检出。

## 随包第三方代码

Markdown 解析器及其依赖通过 esbuild 打包进 Worker。`scripts/build-worker.mjs` 从实际构建输入收集依赖的原始许可文本，生成 THIRD-PARTY-NOTICES.txt，并保留内联法律注释。第三方代码的版权和许可证不因本项目采用 MIT 而改变。

构建工具和测试依赖不作为插件运行代码随包分发；生成文件 `src/client/worker-source.ts` 属于构建产物，不作为完全原创源码宣称。
