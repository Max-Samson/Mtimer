# Builds and releases

## Commands

| Command                  | Result                                    |
| ------------------------ | ----------------------------------------- |
| `npm run dev`            | 完整 Tauri 开发应用                       |
| `npm run dev:web`        | 仅 Vite 浏览器开发                        |
| `npm run build:frontend` | 前端 `dist/`，不是安装包                  |
| `npm run build`          | 当前平台本地测试安装包，不生成更新签名    |
| `npm run build:release`  | 先校验公开发布配置，再构建正式更新产物    |
| `npm run build:e2e`      | 独立浏览器测试产物 `test-dist/`，不可发布 |

环境：Node 24+、Rust stable、目标系统的 Tauri 2 构建依赖。Cargo 必须已在 PATH。参见 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)。

Tauri 的 `beforeDevCommand` 调用 `dev:web`，`beforeBuildCommand` 调用 `build:frontend`；不要改回 `dev` / `build`，否则递归调用 Tauri。

## Platforms and output

对应平台配置明确指定：macOS `app,dmg`，Windows `msi`，Linux `appimage,deb`。默认生成当前宿主架构，通常输出 `src-tauri/target/release/bundle/`。

```bash
# 在对应系统上运行
npm run build

# Mac Universal：先安装两个 Rust target，再显式选择
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run build -- --target universal-apple-darwin
```

显式 target 输出位于 `src-tauri/target/<target>/release/bundle/`。不能把跨架构编译理解为任意宿主都能生成所有系统安装包。MSI 在 Windows 上构建。

`tauri.local-build.conf.json` 只覆盖本地构建：关闭更新产物生成并清空更新 endpoint；不等于正式代码签名/公证。原始正式 updater 配置保持独立。

## Release safety

`check-release.mjs` 只读公开配置，检查三个版本号、模板名称/identifier、HTTPS updater endpoint 和公钥是否仍是占位内容。它不访问/验证签名私钥，也不证明签名、公证和安装已经通过。

当前模板占位内容尚未填写，因此 `npm run build:release` 应明确失败；不要关闭校验绕过。私钥、证书、密码由维护者自行通过安全设置管理，不提交仓库或粘贴到聊天。

```bash
# 仅准备版本；会改版本文件和 lock，需要审阅
npm run release:prepare -- v0.1.1
```

准备脚本先跑完整检查，再更新版本；不自动提交、创建标签、推送或发布。随后维护者单独审阅、提交，推送指定的 `v*` 标签触发发布。避免 `--tags` 意外推送无关标签。

## CI and release pipeline

- `.github/workflows/ci.yml` 在 PR / main 上运行前端静态/逻辑/组件检查、浏览器 E2E，以及三平台 Rust 检查/测试；也支持被发布流程调用。
- 发布 workflow 的构建任务依赖这份校验，不能仅以“构建成功”替代测试。
- 标签推送或手动输入版本后创建 Draft Release；手动输入优先于分支名，并检查 tag 与应用版本匹配。
- 默认 main 推送不会发布安装包。Draft 必须在目标平台验收后再手动发布。
- 浏览器失败报告上传为 artifact。CI 尚未运行前只能说配置已建立，不能宣称三平台已通过。

正式发布仍需配置真实产品信息、updater endpoint/public key、OS 签名/公证。macOS 当前 `signingIdentity: "-"` 为 ad-hoc；Windows 未签名安装可能受到系统安全策略限制。
