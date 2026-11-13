import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'
import { emit } from '@tauri-apps/api/event'

// 使用官方 IPC Mock，保留真实 generated bindings、Query、组件和事件处理代码。
// 本文件只在独立 E2E 入口中引用，不能被正式应用入口导入。
mockWindows('main')
window.__TAURI_OS_PLUGIN_INTERNALS__ = {
  platform: new URLSearchParams(location.search).get('platform') ?? 'windows',
}
let resource = 1
let failNextSave = false
const unexpected = []
const key = 'mtimer-e2e-preferences'
const defaults = { theme: 'light', language: 'en', quick_pane_shortcut: null }
const preferences = () =>
  JSON.parse(localStorage.getItem(key) ?? JSON.stringify(defaults))

mockIPC(
  (command, args) => {
    switch (command) {
      case 'load_preferences':
        return preferences()
      case 'save_preferences':
        if (failNextSave) {
          return Promise.reject('Disk full (test fixture)')
        }
        localStorage.setItem(key, JSON.stringify(args.preferences))
        return null
      case 'cleanup_old_recovery_files':
        return 0
      case 'get_default_quick_pane_shortcut':
        return 'CommandOrControl+Shift+.'
      case 'get_quick_pane_shortcut':
        return preferences().quick_pane_shortcut
      case 'update_quick_pane_shortcut':
        return null
      case 'plugin:os|locale':
        return 'en-US'
      case 'plugin:window|is_maximized':
      case 'plugin:window|is_fullscreen':
        return false
      case 'plugin:window|is_focused':
        return true
      case 'plugin:menu|new':
        return [resource++, `menu-${resource}`]
      case 'plugin:menu|set_as_app_menu':
      case 'plugin:resources|close':
      case 'plugin:window|minimize':
      case 'plugin:window|maximize':
      case 'plugin:window|unmaximize':
      case 'plugin:window|close':
      case 'plugin:updater|check':
        return null
      default:
        unexpected.push(command)
        throw new Error(`Unmocked native command: ${command}`)
    }
  },
  { shouldMockEvents: true }
)

// 仅测试驱动：不暴露 Store 或直接改 React 状态，交互仍走真实 UI/事件边界。
window.__MTIMER_E2E__ = {
  emit,
  failSave: () => {
    failNextSave = true
  },
  preferences,
  unexpected,
}
localStorage.setItem('i18nextLng', 'en')
await import('../../src/main')
