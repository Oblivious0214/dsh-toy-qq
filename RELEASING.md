# Toy 分支发布约定

当前包名 `dsh-qq-skin`，版本 `0.2.0-toy.4`，基于上游主分支 `ce7f443` 的 `0.2.0`。原本地 `0.4.11` 的功能完整保留；同一基础上递增 `toy.N`，合入新上游版本后从新基础的 `toy.1` 开始。

插件管理页显示「QQ聊天界面 · Toy 分支」，内部设置、按钮和提示只使用「QQ聊天界面」。保留原作者署名、MIT 和第三方来源记录。

`-toy.N` 按 SemVer 排序低于同基础正式版，更新时明确选择维护分支的安装包；`+toy.N` 不参与排序，不用于分支修订。当前不发布 npm 同名包。发布状态以 GitHub 分支和 Release 为准。

# GitHub Releases 发布流程

本分支通过 GitHub Releases 分发预编译 `.tgz`，目前不发布 npm。
开发环境沿用 README 所述的相邻 `deepseek-harness` 源码工作区；构建依赖需先就绪。

1. 在 `feat/dsh-toy-qq` 分支修改版本号，并同步中英文 README 和 `cordis.yml` 的下载链接。仓库名和分支名保持现状，不必与包名同步改名。
2. 执行 `pnpm run build`、`pnpm test`；构建同时完成类型检查。
3. 执行 `pnpm pack --pack-destination ../../../dsh-plugins/dist`。该命令先构建两端代码，再把 `workspace:` 依赖转换成可安装的版本范围；不要用源码 ZIP 代替安装包。
4. 检查 `.tgz` 中有 `lib/index.js`、`lib/client.js`、`cordis.patch.yml` 和 `package.json`。浏览器模块 id 必须与包名 `dsh-qq-skin` 一致。
5. 对安装包计算 SHA-256，提交版本修改并推送分支。
6. 创建对应的 GitHub 预发布 Release，tag 为 `v0.2.0-toy.4`，准确指向验证过的源码提交，使用 `RELEASE.md` 作为正文，上传 `.tgz` 与 `SHA256SUMS.txt`。

用户更新时，用新版本附件地址再次执行 `dsh plugin --profile web add <完整的 .tgz 地址>`，并按 DSH 提示重启或重新加载。
这是一条手动更新渠道，不包含后台自动更新。用户也可先下载附件，再使用安装包的绝对路径安装。

提交上游时，使用 `feat/chat-avatar-and-background` 分支：它只包含头像和背景功能，保留原项目包名。
维护发行的命名、版本和下载说明位于 `feat/dsh-toy-qq` 分支。从旧 `dsh-toy-qq` 升级时，使用工作区 `work/plugin-naming-20261028/migrate-desktop.mjs`；默认仅预检，`--apply` 才写入，保留 `qq-skin` 配置和内置分段。
