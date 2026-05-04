import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useServerSearch } from '../useServerSearch'

describe('useServerSearch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to the endpoint with vector and k in the body', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: ['apple', 'banana'] }),
    } as Response)

    const { result } = renderHook(() => useServerSearch('https://api.example.com/search'))
    const results = await result.current.search([0.1, 0.2, 0.3], 5)

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector: [0.1, 0.2, 0.3], k: 5 }),
    })
    expect(results).toEqual(['apple', 'banana'])
  })

  it('merges custom headers with Content-Type', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    } as Response)

    const { result } = renderHook(() =>
      useServerSearch('https://api.example.com/search', {
        Authorization: 'Bearer secret-token',
        'X-Custom': 'value',
      }),
    )
    await result.current.search([1], 1)

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret-token',
          'X-Custom': 'value',
        },
      }),
    )
  })

  it('throws with status text on non-ok HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)

    const { result } = renderHook(() => useServerSearch('https://api.example.com/search'))
    await expect(result.current.search([1], 1)).rejects.toThrow(
      'Server search failed: 500 Internal Server Error',
    )
  })

  it('throws on network-level failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'))

    const { result } = renderHook(() => useServerSearch('https://api.example.com/search'))
    await expect(result.current.search([1], 1)).rejects.toThrow('Network unavailable')
  })

  it('returns empty array when server returns empty results', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    } as Response)

    const { result } = renderHook(() => useServerSearch('https://api.example.com/search'))
    const results = await result.current.search([1, 0], 10)
    expect(results).toEqual([])
  })
})
