# Testing

日常命令选择、旧命令迁移与新功能测试清单见 [测试与构建工作流](./testing-workflow.md)。

## 分层与边界

当前项目保留 Vitest / Testing Library / Cargo，增加 Playwright，不迁移到 Rome 的 Rstest、pnpm 或 Electron。学习的是分层、确定性环境和失败证据。

| 入口                    | 范围                                                         | 不证明什么                               |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `npm run test:frontend` | Node 逻辑、状态、IPC Result/recovery 适配、测试/发布工具规则 | DOM、原生 IO                             |
| `npm run test:ui`       | jsdom 组件/Hooks、Query 与模拟命令交互                       | CSS 布局、真实 Rust                      |
| `npm run test:web`      | 上述两个互斥项目，执行后退出                                 | 原生应用                                 |
| `npm run test:backend`  | Cargo 测试：平台工具、输入校验、配置兼容及错误序列化         | 真正的桌面 IPC、系统通知                 |
| `npm test`              | `test:web` + `test:backend`                                  | 浏览器 E2E、安装包验收                   |
| `npm run test:e2e`      | 构建真实前端、Chromium 用户流程与几何布局，模拟 Tauri 边界   | Rust、WebView2/WebKit、OS 窗口、安装升级 |
| `npm run test:watch`    | 监听前端两组变化                                             | 完整提交检查                             |
| `npm run test:coverage` | 前端覆盖率报告和阈值检查                                     | Rust 覆盖率、产品验收                    |

`check` / `check:all` = 前后端静态检查 + `npm test`；浏览器 E2E 独立运行，CI 和发布前验证会运行它。任何必需工具缺失均返回失败，不把跳过报告为通过。

## 前端测试约定

- 测试与被测代码相邻。
- 逻辑使用 `*.test.ts`；组件/Hooks 使用 `*.ui.test.ts` 或 `*.ui.test.tsx`。
- Vitest `frontend` 项目明确排除 `*.ui.test.*`，`ui` 仅收集该类型，因此每个用例只执行一次。
- `src/test/setup.ui.ts` 只供 UI 项目使用。不要把 `window` 或 jest-dom 初始化重新放进 Node 项目。
- `src/test/test-utils.tsx` 提供稳定的 QueryClient、i18n 和主题；Query 测试关闭自动重试，主动验证成功、失败和缓存边界。
- `scripts/test-env.mjs` 以白名单继承 OS/工具链变量，固定 `NODE_ENV=test`、UTC；不读取真实应用数据或依赖终端的 production 模式。
- 原生命令用类型化 Mock。Mock 成功不等于 Rust 实现通过。
- 新计时业务应注入时钟，不在测试中真实等待 25 分钟。当前尚未实现计时状态机。

原有 32 条前端断言全部保留：混合平台测试拆为 6 条逻辑 + 7 条 Hooks；App 的 2 条归入组件组。新增回归应验证实际错误，而不是复制实现计算预期值。

## 浏览器 E2E：不需要开发服务器

```bash
npm ci --include=dev
npm exec playwright -- install chromium
npm run test:e2e
```

Linux CI 使用 `npm exec playwright -- install --with-deps chromium` 安装运行库。

`vite.e2e.config.ts` 从真实 Vite 配置继承插件，单独输出 `test-dist/`。入口 `tests/e2e/harness.js` 在加载真正的 `src/main.tsx` 前使用 Tauri 官方 `mockIPC` / `mockWindows`。模拟命令必须显式列出，未知命令使测试失败。

Playwright fixture 拦截 `https://mtimer.test` 的请求，从构建目录响应文件，并拒绝外部网络；无监听端口、无真实用户数据、不启动或复用 Vite 开发服务器。正常构建入口不引用该 harness，不应把测试控制接口打进正式包。

现有流程覆盖：打开/关闭设置、键盘命令面板、主题持久化及失败保存、跨窗口提交事件、三种平台外观在 1000×700 / 1440×900 下的对话框包含关系，以及最小窗口下深色语义颜色的真实 CSS 解析。平台外观模拟不等于在三种 OS 上实际运行。

- 固定 locale / timezone，禁止 CI 中 `.only`，不靠重试掩盖不稳定布局。
- 失败截图、trace、HTML 报告在 `test-results/`、`playwright-report/`；CI 失败时上传。
- 这些是浏览器用户流程测试，不命名为“原生桌面全链路通过”。

## Rust 与原生验收

Cargo 已加入 PATH 后直接运行，无需脚本内 `source ~/.cargo/env`。CI 对 macOS、Windows、Linux 执行 Rust 格式、Clippy 和测试。

新增原生持久化集成测试时必须使用临时目录/测试数据库并清理；不可读取真实 app-data。当前已有测试不覆盖真实偏好文件 IO、系统通知、全局快捷键冲突和休眠恢复，这些仍需后续原生测试/人工验收。

安装包验收清单：安装/卸载、首次启动、设置保存并重启恢复、通知权限、窗口关闭/退出差异、快捷键注册与冲突、升级与失败回退。测试必须在目标系统执行，不能由 jsdom 或 Chromium 代替。

## 覆盖率现状（不要和测试通过率混淆）

2026-11-13 架构改造后：44 条逻辑 + 16 条组件/Hooks 测试通过，原有 32 条保留；13 条 Chromium 用户流程/布局测试通过（Tauri 边界模拟，不代表原生应用通过）。完整源码统计初次测得行 32.56%、函数 28%、分支 19.96%，低于保留的 60% 全局阈值，因此 `test:coverage` **应失败**。统计包含尚未覆盖的 UI primitives、菜单、通知、窗口动作等；不通过删除统计范围或降低阈值制造绿灯。

目前关键适配和规则模块（命令 registry、recovery、typed Result、context-menu、preferences service、platform、UI store）合计行约 85.71%，这只是局部读数，不能冒充全项目覆盖率。新增功能时优先补窗口/菜单异常、快捷键回滚、主题同步等行为；覆盖率阈值尚未纳入 PR 必过门禁，完整报告保持可运行并暴露缺口。
