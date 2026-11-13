import { describe, expect, it } from 'vitest'
import { unwrapResult } from './tauri-bindings'

describe('typed IPC result contract', () => {
  it('returns successful data without losing identity', () => {
    const data = { theme: 'dark' }
    expect(unwrapResult({ status: 'ok', data })).toBe(data)
  })
  it('preserves the structured backend error', () => {
    const error = { type: 'FileNotFound' }
    expect(() => unwrapResult({ status: 'error', error })).toThrow()
    try {
      unwrapResult({ status: 'error', error })
    } catch (caught) {
      expect(caught).toBe(error)
    }
  })
  it('handles a command that succeeds without a payload', () => {
    expect(unwrapResult({ status: 'ok', data: null })).toBeNull()
  })
})
