import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commands } from './tauri-bindings'
import {
  cleanupOldFiles,
  loadEmergencyData,
  saveEmergencyData,
} from './recovery'

vi.mock('./tauri-bindings', () => ({
  commands: {
    loadEmergencyData: vi.fn(),
    saveEmergencyData: vi.fn(),
    cleanupOldRecoveryFiles: vi.fn(),
  },
}))

beforeEach(() => vi.resetAllMocks())

describe('recovery adapter', () => {
  it('returns null only for a missing file', async () => {
    vi.mocked(commands.loadEmergencyData).mockResolvedValue({
      status: 'error',
      error: { type: 'FileNotFound' },
    })
    expect(await loadEmergencyData('draft')).toBeNull()
  })
  it('returns successful recovered data', async () => {
    vi.mocked(commands.loadEmergencyData).mockResolvedValue({
      status: 'ok',
      data: { text: 'draft' },
    })
    expect(await loadEmergencyData('draft')).toEqual({ text: 'draft' })
    expect(commands.loadEmergencyData).toHaveBeenCalledWith('draft')
  })
  it.each([
    [
      { type: 'ValidationError', message: 'invalid name' },
      'Validation error: invalid name',
    ],
    [{ type: 'IoError', message: 'denied' }, 'IO error: denied'],
    [{ type: 'ParseError', message: 'bad JSON' }, 'Parse error: bad JSON'],
    [{ type: 'DataTooLarge', max_bytes: 10 }, 'Data too large (max 10 bytes)'],
  ] as const)('does not silently swallow %j', async (error, message) => {
    vi.mocked(commands.loadEmergencyData).mockResolvedValue({
      status: 'error',
      error,
    })
    await expect(loadEmergencyData('draft')).rejects.toThrow(message)
  })
  it('forwards a save once and exposes backend failure', async () => {
    vi.mocked(commands.saveEmergencyData).mockResolvedValue({
      status: 'error',
      error: { type: 'IoError', message: 'disk full' },
    })
    await expect(saveEmergencyData('draft', { text: 'keep' })).rejects.toThrow(
      'disk full'
    )
    expect(commands.saveEmergencyData).toHaveBeenCalledExactlyOnceWith(
      'draft',
      { text: 'keep' }
    )
  })
  it('returns the backend cleanup count', async () => {
    vi.mocked(commands.cleanupOldRecoveryFiles).mockResolvedValue({
      status: 'ok',
      data: 2,
    })
    expect(await cleanupOldFiles()).toBe(2)
  })
})
