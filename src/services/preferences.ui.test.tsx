import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { commands, type AppPreferences } from '@/lib/tauri-bindings'
import {
  preferencesQueryKeys,
  usePreferences,
  useSavePreferences,
} from './preferences'

const clients: QueryClient[] = []
afterEach(() => {
  clients.forEach(client => client.clear())
  clients.length = 0
})

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  clients.push(client)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
const preferences: AppPreferences = {
  theme: 'dark',
  language: 'en',
  quick_pane_shortcut: null,
}

beforeEach(() => vi.clearAllMocks())

describe('preferences query/command integration (mocked IPC)', () => {
  it('loads typed preferences', async () => {
    vi.mocked(commands.loadPreferences).mockResolvedValueOnce({
      status: 'ok',
      data: preferences,
    })
    const { wrapper } = setup()
    const { result } = renderHook(usePreferences, { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(preferences))
  })
  it('provides the documented defaults on a backend error', async () => {
    vi.mocked(commands.loadPreferences).mockResolvedValueOnce({
      status: 'error',
      error: 'unavailable',
    })
    const { wrapper } = setup()
    const { result } = renderHook(usePreferences, { wrapper })
    await waitFor(() =>
      expect(result.current.data).toEqual({
        theme: 'system',
        language: null,
        quick_pane_shortcut: null,
      })
    )
  })
  it('updates the cache only after successful persistence', async () => {
    vi.mocked(commands.savePreferences).mockResolvedValueOnce({
      status: 'ok',
      data: null,
    })
    const { wrapper, client } = setup()
    const { result } = renderHook(useSavePreferences, { wrapper })
    await act(() => result.current.mutateAsync(preferences))
    expect(client.getQueryData(preferencesQueryKeys.preferences())).toEqual(
      preferences
    )
  })
  it('rejects failed saves and preserves the last stored cache value', async () => {
    vi.mocked(commands.savePreferences).mockResolvedValueOnce({
      status: 'error',
      error: 'disk full',
    })
    const { wrapper, client } = setup()
    client.setQueryData(preferencesQueryKeys.preferences(), preferences)
    const { result } = renderHook(useSavePreferences, { wrapper })
    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...preferences, theme: 'light' })
      ).rejects.toThrow('disk full')
    })
    expect(client.getQueryData(preferencesQueryKeys.preferences())).toEqual(
      preferences
    )
    expect(commands.savePreferences).toHaveBeenCalledTimes(1)
  })
})
