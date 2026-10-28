# GitHub Releases 发布流程

本增强版通过 GitHub Releases 分发预编译 `.tgz`，目前不发布 npm。
开发环境沿用 README 所述的相邻 `deepseek-harness` 源码工作区；构建依赖需先就绪。

1. 在 `release/qq-skin-enhanced` 分支修改版本号，并同步中英文 README 和 `cordis.yml` 的下载链接。
2. 执行 `pnpm run typecheck`、`pnpm test`。
3. 执行 `pnpm pack --pack-destination output`。该命令先构建两端代码，再把 `workspace:` 依赖转换成可安装的版本范围；不要用源码 ZIP 代替安装包。
4. 检查 `.tgz` 中有 `lib/index.js`、`lib/client.js`、`cordis.patch.yml` 和 `package.json`。浏览器模块 id 必须与包名 `qq-skin-enhanced` 一致。
5. 对安装包计算 SHA-256，提交版本修改并推送分支。
6. 创建对应的 GitHub Release，上传 `.tgz` 与校验文件；附上本版改动、支持的 DSH 版本和安装命令。

用户更新时，用新版本附件地址再次执行 `dsh plugin --profile web add <完整的 .tgz 地址>`，并按 DSH 提示重启或重新加载。
这是一条手动更新渠道，不包含后台自动更新。用户也可先下载附件，再使用安装包的绝对路径安装。

提交上游时，使用 `feat/chat-avatar-and-background` 分支：它只包含头像和背景功能，保留原项目包名。
独立发行的命名、版本和下载说明仅位于 `release/qq-skin-enhanced` 分支。
