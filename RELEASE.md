# QQ 聊天界面 · Toy 分支 v0.2.0-toy.4

基于 [lispking/dsh-qq-skin](https://github.com/lispking/dsh-qq-skin) 主分支 `0.2.0` 继续修改。

## 兼容与安装

DSH 建议使用测试版 **`0.2.1-rc.3-22ddee3`**。语音功能需另装并配置 Fish TTS，人设默认头像需搭配人设切换插件。

下载附件 `dsh-qq-skin-0.2.0-toy.4.tgz`，在 DSH 插件页通过本地安装包入口安装并重启。也可使用命令（把 `desktop` 换成实际 profile）：

```sh
dsh plugin --profile desktop add "https://github.com/Oblivious0214/dsh-toy-qq/releases/download/v0.2.0-toy.4/dsh-qq-skin-0.2.0-toy.4.tgz"
```

如已安装旧版 `dsh-toy-qq` 或独立分段插件，请先备份设置并停用旧插件，避免重复加载。

## 本版功能

- QQ 风格气泡、五种配色、浅深色主题，支持裁剪头像、聊天背景和按对话设置头像。
- 内置对话分段，一条回复可分成多个气泡；代码块、列表和表格保持完整，不修改聊天原文和记录。
- Fish TTS 语音条显示真实时长，支持文字显示方式切换，以及自动或点击生成。
- 外观、分段和语音设置采用统一紧凑布局，分段正则编辑后失焦保存。
- 可使用人设插件提供的默认头像；手动会话头像优先，已有会话头像不随角色默认头像更改。
- 支持联动插件的阶段展示，普通回复保持原有分段行为。

**「沉浸式 QQ」默认开启**，会隐藏部分 DSH 按钮和成功提示。需要回复下方的复制、评价等控件时，在「设置 → QQ聊天界面」关闭即可。已有关闭设置会保留。

## 验证与致谢

发布准备已通过构建、类型检查和 198 项测试，覆盖设置保存、对话分段、语音、图片和人设头像。浏览器验证记录见 [VALIDATION.md](VALIDATION.md)。

感谢原作者 lispking、DeepSeek Harness、Cropper.js 及分段实现所用 Markdown 组件。原许可与来源说明随包保留。
