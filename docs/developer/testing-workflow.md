# 测试与构建工作流

本页是日常入口和旧命令迁移指南。测试收集、Mock 和覆盖率细节见 [Testing](./testing.md)，样式规则见 [UI Design Contract](./ui-contract.md)，安装包与发布见 [Releases](./releases.md)。

## 先选要验证的边界

| 改动                                | 开发中快速反馈          | 提交前补充验证                               |
| ----------------------------------- | ----------------------- | -------------------------------------------- |
| 纯函数、Zustand、命令适配、工具脚本 | `npm run test:frontend` | 前端静态检查、完整单元测试                   |
| React 组件、Hooks、Query 缓存       | `npm run test:ui`       | 浏览器中涉及的交互、布局流程                 |
| 主题、尺寸、窗口布局                | `npm run check:ui`      | 组件测试 + `npm run test:e2e`                |
| Rust 校验、配置、序列化             | `npm run test:backend`  | `npm run check:backend`、目标 OS 原生验证    |
| IPC、持久化、系统集成               | 前后端对应测试          | 真实桌面应用验证；浏览器 Mock 不足以证明通过 |
| 构建、平台配置、发布脚本            | 工具规则测试、前端构建  | 目标平台本地打包与安装验收                   |

通常提交前运行以下命令，而不是逐个记忆底层工具：

```bash
npm ci --include=dev
npm run check:all
npm exec playwright -- install chromium  # 首次安装/升级浏览器版本后
npm run test:e2e
npm run build:frontend
```

`check:all` 不包括浏览器 E2E、覆盖率阈值和安装包验收。没有 Cargo 的前端环境可以运行 `check:frontend`、`test:web` 和浏览器测试，但只能记录这些组通过，不能写“全部检查通过”。命令缺失/失败必须保留在提交或 PR 的验证记录中。

开发调试由开发者启动 `npm run dev`；它现在是完整 Tauri 应用。只需要浏览器时使用 `npm run dev:web`。自动化浏览器测试不需要也不会启动这两个开发服务器。

## 命令迁移：注意语义变化

| 旧入口/含义                      | 当前入口/处理                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `dev` 仅 Vite                    | `dev:web`；`dev` 改为 Tauri 开发                                                  |
| `build` 仅前端产物               | `build:frontend`；`build` 改为当前宿主本地安装包                                  |
| `test` 监听模式                  | `test:watch`；`npm test` 改为执行一次前端两组 + Rust                              |
| `test:run`                       | `test:web`，只执行前端两组一次                                                    |
| `test:all`                       | `npm test`，不包括浏览器 E2E                                                      |
| `test:ui` 为 Vitest 结果查看器   | 现在是真正的 jsdom 组件/Hooks 测试；不保留查看器入口                              |
| `rust:test`                      | `test:backend`                                                                    |
| `rust:fmt:check` / `rust:clippy` | `check:backend`，只检查、不改代码                                                 |
| `rust:bindings`                  | `bindings:generate`，显式运行被忽略的绑定导出测试                                 |
| `rust:fmt` / `rust:clippy:fix`   | 需要时显式运行 Cargo 修复命令并审阅 diff，不隐式批量修复                          |
| `tauri:dev` / `tauri:build`      | `dev` / `build`；正式发布用 `build:release`                                       |
| `tauri:check`                    | 移除不支持的 `tauri build --check`；静态检查用 `check:all`，构建用对应 build 入口 |
| `fix:all`                        | 分别使用 `lint:fix`、`format`、`ast:fix` 和 Cargo 修复，逐项审阅                  |
| `build:analyze`                  | `build:frontend` 查看产物；原入口没有真正的分析器                                 |
| `check:all`                      | 保留兼容别名，等价于 `check`                                                      |

具体实现始终以根目录 `package.json` 为准。不要在 Tauri hooks 中调用新的 `dev` / `build`，否则会递归启动 Tauri；hooks 只调用 `dev:web` / `build:frontend`。

## 为一个新功能添加测试

1. **先拆逻辑和界面。** 纯规则放 `lib/` 等模块，使用相邻的 `*.test.ts`，不要为了方便引入 DOM。组件/Hooks 使用 `*.ui.test.ts(x)`，通过 `@/test/test-utils` 获取必要 Provider。
2. **验证用户可观察结果。** 组件按 role/可访问名称查找，断言点击、错误、空状态、缓存更新；不要只断言内部函数调用，也不要用复制业务实现的算法计算预期值。
3. **清理状态。** 每个用例隔离 Zustand、QueryClient、Mock、事件监听和计时器。复用 `setup.ui.ts` 的 DOM 清理，不重复创建全局初始化。涉及时间时使用注入时钟/受控计时器，不真实等待计时结束。
4. **跨边界增加对应证据。** UI 测试中 Mock 成功只证明前端契约；Rust 测试验证输入、序列化和错误。真实 IO 集成使用临时目录，原生系统行为在目标 OS 验证，不访问个人应用数据。
5. **重要用户流程写浏览器测试。** 放入 `tests/e2e/app.spec.ts` 或同目录 `*.spec.ts`；复用 fixture 的离线产物和显式命令模拟。优先断言可见性、包含关系、无溢出与交互结果，不用增加重试掩盖不稳定性。
6. **同步规则和文档。** 新颜色在共享主题中定义明暗语义 token；必要例外必须精确并附负例。调整命令、测试范围、安装包配置时同步本页及对应专题。

可直接参考现有测试：

- 纯逻辑与错误：`src/lib/tauri-bindings.test.ts`、`src/lib/recovery.test.ts`。
- 组件与 Query：`src/components/layout/MainWindowContent.ui.test.tsx`、`src/services/preferences.ui.test.tsx`。
- Rust 输入和数据契约：`src-tauri/src/types.rs` 的 `#[cfg(test)]` 模块。
- 可执行 UI/环境/发布规则及负例：`scripts/tooling.test.mjs`。
- 真实 CSS 与用户流程：`tests/e2e/app.spec.ts`；此处原生边界仍是模拟的。

## 从 Rome 学习了什么

参考基线为 [Rome 47a0cfa0](https://github.com/rome-os/rome/tree/47a0cfa0e1fad38a34432c33c57fd28e7192fa1f)，不是对上游测试运行结果的背书。

- **采用：** Node 逻辑与 DOM 组件边界、测试环境白名单与固定时区、真实浏览器几何断言、失败截图/trace、PR 校验与发布分离。
- **按本项目适配：** 使用现有 npm / Vitest / Tauri / Rust，而不是换成 pnpm / Rstest / Electron。UI 静态契约、组件行为、浏览器布局分别验证，不混称“UI 测试”。
- **暂不引入：** monorepo 变更图 preflight、复杂分片或完整截图基线。先测量成本和不稳定性，再决定是否需要；快速反馈永远不替代完整 CI。

## 当前验证限制与交付记录

2026-11-13 本地基线：60 条前端测试（44 逻辑/工具 + 16 组件/Hooks）、13 条 Chromium 用例通过；前端静态检查、生产前端构建和依赖审计通过。原有 32 条测试保留并重新分组。以下事项不能因此标为完成：

- 当前执行环境缺少 Cargo，`check:all` 在 Rust 检查处失败；新增 Rust 测试、格式/Clippy 和原生安装包未在此环境验证。
- 全源码覆盖率仍低于保留的 60% 阈值，`test:coverage` 失败是已知缺口；具体基线见 [覆盖率现状](./testing.md#覆盖率现状不要和测试通过率混淆)。不以缩小统计范围或降低阈值替代测试。
- CI workflow 已配置不等于 GitHub 上已执行通过；平台外观模拟不等于 macOS/Windows/Linux WebView 和安装验收。
- 正式产品/updater 配置仍是模板占位，发布校验应阻止 `build:release`。本地包不提供正式签名/公证保证。
- 尚未实现计时业务状态机及其测试；本轮建立的是现有模板功能的测试基础，不代表完成番茄钟产品功能。

提交/PR 的验证记录至少包含：运行命令、通过组与数量、失败/未执行项及原因、是否涉及打包/发布。本地提交与推送、标签、Release 是不同操作，提交不会自动触发后几项。
