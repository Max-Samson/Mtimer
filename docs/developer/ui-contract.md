# UI design contract

项目已有设计基础，不是从零创建一套样式系统：Tailwind 4、shadcn 组件、OKLCH 明暗主题和共享圆角位于 `src/theme-variables.css`。本次增加可执行约束，不改变品牌或重新设计界面。

## 单一来源

- 主窗口 `App.css` 与快捷面板 `quick-pane.css` 都引用同一份主题变量。
- 业务组件使用 `bg-background`、`text-foreground`、`border-border` 等语义颜色，而非 `bg-red-500`、`text-[#...]`。
- 颜色 token 必须同时定义浅色/深色值，并映射到 Tailwind。
- 工具栏保持原来的 32px 高度、24px 按钮、12px 图标，以 `--app-titlebar-height`、`--app-toolbar-control-size`、`--app-toolbar-icon-size` 表达，不引入新视觉尺寸。
- 交互组件应有可访问名称、键盘可用、明确焦点；本轮为设置选择框补充名称。

## 自动检查

`npm run check:ui` 检查共享主题导入、主题 token 对、Tailwind 映射，以及组件中字符串形式的原始调色板/颜色 literal。规则及负例测试位于 `scripts/check-ui.mjs`、`scripts/tooling.test.mjs`。

这是一份范围明确的轻量规则，不是完整 CSS 语义解析器：它不证明对比度合规，不检查所有动态字符串、内联颜色或任意间距。不要把通过称为完整设计/无障碍认证。

例外必须具体：macOS 原生交通灯保留系统约定颜色；shadcn 的三个模态遮罩保留 `bg-black/50`；按钮/徽章的破坏性变体保留白色文字。新增例外要说明理由并补负例，不能整目录豁免。

## 浏览器几何与功能检查

`npm run test:e2e` 运行真实 CSS，检查最小桌面窗口与较大窗口中的设置对话框是否在视口内、页面是否横向溢出，并验证真实交互。断言优先使用包含、溢出、可见性、可点击性，不依赖大面积截图基线。

截图和 trace 用于失败诊断；原生 OS 窗口、系统缩放和通知必须另行验证。后续增加控件时补对应组件和布局案例，不能用增大重试次数隐藏问题。
