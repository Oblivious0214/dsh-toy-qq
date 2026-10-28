# QQ 聊天界面 · Toy 分支 v0.2.0-toy.4

基于 [lispking/dsh-qq-skin](https://github.com/lispking/dsh-qq-skin) 主分支 `ce7f443447a12437068f105c43044760719d0489`（`0.2.0`）继续修改，保留原包名 `dsh-qq-skin`、原作者署名及 MIT 许可。

## 本版功能

- QQ 气泡、五种配色、浅深色主题、可裁剪头像与聊天背景，支持按对话设置头像。
- 内置对话分段和安全隔离的正则 Worker；代码块、列表、表格保持完整，历史回复直接显示，原文和聊天记录保留。
- Fish TTS 语音条显示真实时长，支持语音与文字、点击展开文字、始终显示原文，以及自动或点击生成。
- 外观、分段、语音采用统一紧凑设置；正则失焦保存，失败保留草稿。
- 可选接收人设插件提供的默认头像，手动会话头像优先；已保存的会话头像不随角色默认头像更改。
- 可选适配联动插件的阶段展示；普通回复沿用 QQ 分段设置。

**「沉浸式 QQ」默认开启**，会隐藏部分 DSH 按钮和成功提示。需要回复下方的复制、评价等控件时，在「设置 → QQ聊天界面」关闭即可。用户已明确关闭的选择会保留。

## 兼容与安装

仅验证 DSH 测试版 **`0.2.1-rc.3-22ddee3`**。这是 Toy 维护分支的预发布版本，版本规则为 `上游主分支版本-toy.修订号`；同基础的 Toy 修订号递增。原本地 `0.4.11` 的功能保留。

下载附件 `dsh-qq-skin-0.2.0-toy.4.tgz`，按 `SHA256SUMS.txt` 核对后，在 DSH 插件页通过本地安装包入口安装并重启。也可使用命令（把 `desktop` 换成实际 profile）：

```sh
dsh plugin --profile desktop add "https://github.com/Oblivious0214/dsh-toy-qq/releases/download/v0.2.0-toy.4/dsh-qq-skin-0.2.0-toy.4.tgz"
```

从 `dsh-toy-qq` 或独立 `dsh-toy-segments` 升级前，备份 profile 配置并记录分段偏好，停用旧插件，避免重复渲染。独立分段插件的偏好需在本版设置页重新填写。工作区迁移脚本不随公开包提供。

语音需要另行安装并配置 Fish TTS；人设默认头像需要配套人设插件。无这些插件时，QQ 外观与普通分段仍可使用。联动插件不包含在本附件中。请使用 `.tgz` 安装，GitHub 自动生成的源码 ZIP 不作为安装包；不向 npm 发布同名包。

## 验证与致谢

发布准备已通过构建、TypeScript 检查及 **19 个文件、198 项测试**，覆盖配置保存、分段生命周期、语音、图片和人设头像。既有浏览器验证记录见 [VALIDATION.md](VALIDATION.md)。

感谢原作者、DeepSeek Harness、Cropper.js 及分段实现所用 Markdown 组件。分段来源为 `dsh-toy-segments@0.1.8`（`494cda401aaa9acc7028a716bd7debb9a444bad8`）；原许可、来源和第三方声明随包保留。
