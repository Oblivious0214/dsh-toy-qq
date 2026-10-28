import { vi } from 'vitest'

/**
 * 测试前置:node 环境没有浏览器 `window`。`dsh-client-runtime/client` 的
 * 入口 `lib/client.js` 是 `window.__ModuleLoader__.load(...)` 闭包工厂,
 * 在模块加载期顶层即执行。设置测试经 index.ts 值导入该包(设置行的
 * defineStore/store 来自 runtime/client),故须在 import 前 stub 全局
 * `window`,让工厂的注册调用被吞掉。
 */
if (typeof window === 'undefined') {
  vi.stubGlobal('window', { __ModuleLoader__: { load() {} } })
}
