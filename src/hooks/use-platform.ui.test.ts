import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the Tauri OS plugin
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => 'macos'),
}))

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

// Import the module under test after mocks are set up
const { platform } = await import('@tauri-apps/plugin-os')
const {
  usePlatform,
  useIsMacOS,
  useIsWindows,
  useIsLinux,
  __resetPlatformCache,
} = await import('./use-platform')

describe('Platform hooks', () => {
  beforeEach(() => {
    __resetPlatformCache()
    vi.clearAllMocks()
  })
  describe('usePlatform hook', () => {
    it('returns the current platform', () => {
      vi.mocked(platform).mockReturnValue('windows')

      const { result } = renderHook(() => usePlatform())

      expect(result.current).toBe('windows')
    })
  })

  describe('convenience hooks', () => {
    it('useIsMacOS returns true on macOS', () => {
      vi.mocked(platform).mockReturnValue('macos')

      const { result } = renderHook(() => useIsMacOS())

      expect(result.current).toBe(true)
    })

    it('useIsMacOS returns false on other platforms', () => {
      vi.mocked(platform).mockReturnValue('windows')

      const { result } = renderHook(() => useIsMacOS())

      expect(result.current).toBe(false)
    })

    it('useIsWindows returns true on Windows', () => {
      vi.mocked(platform).mockReturnValue('windows')

      const { result } = renderHook(() => useIsWindows())

      expect(result.current).toBe(true)
    })

    it('useIsWindows returns false on other platforms', () => {
      vi.mocked(platform).mockReturnValue('macos')

      const { result } = renderHook(() => useIsWindows())

      expect(result.current).toBe(false)
    })

    it('useIsLinux returns true on Linux', () => {
      vi.mocked(platform).mockReturnValue('linux')

      const { result } = renderHook(() => useIsLinux())

      expect(result.current).toBe(true)
    })

    it('useIsLinux returns false on other platforms', () => {
      vi.mocked(platform).mockReturnValue('macos')

      const { result } = renderHook(() => useIsLinux())

      expect(result.current).toBe(false)
    })
  })
})
