import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// vi.mock is hoisted before all top-level code, so MockWorker would be TDZ.
// Define everything inside vi.hoisted so it's available when the factory runs.
const { MockWorker, workerRef } = vi.hoisted(() => {
  const ref: { current: InstanceType<ReturnType<typeof makeClass>> | null } = { current: null }

  function makeClass() {
    class MockWorker {
      postMessage = vi.fn()
      terminate = vi.fn()
      onmessage: ((event: { data: unknown }) => void) | null = null
      onerror: ((event: { message: string }) => void) | null = null

      constructor() {
        ref.current = this as InstanceType<typeof MockWorker>
      }

      emit(data: unknown) {
        this.onmessage?.({ data })
      }
    }
    return MockWorker
  }

  const MockWorker = makeClass()
  return { MockWorker, workerRef: ref }
})

vi.mock('../workers/hnsw.worker.ts?worker&inline', () => ({
  default: MockWorker,
}))

import { useHnswSearch } from '../useHnswSearch'

// Stable references — inline arrays inside renderHook callbacks cause a new
// reference on every render, which re-triggers the useEffect and resets status.
const TWO_OPTIONS = ['a', 'b']
const ONE_OPTION = ['a']
const FRUIT_OPTIONS = ['apple', 'banana', 'cherry']
const XY_OPTIONS = ['x', 'y']

describe('useHnswSearch', () => {
  const mockEmbedPassage = vi.fn().mockResolvedValue([1, 0, 0])

  beforeEach(() => {
    vi.clearAllMocks()
    workerRef.current = null
    mockEmbedPassage.mockResolvedValue([1, 0, 0])
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('stays idle when disabled', () => {
    const { result } = renderHook(() =>
      useHnswSearch(false, mockEmbedPassage, TWO_OPTIONS),
    )
    expect(result.current.status).toBe('idle')
  })

  it('sets status to indexing when enabled', () => {
    const { result } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, TWO_OPTIONS),
    )
    expect(result.current.status).toBe('indexing')
  })

  it('creates a worker when enabled', () => {
    renderHook(() => useHnswSearch(true, mockEmbedPassage, ONE_OPTION))
    expect(workerRef.current).not.toBeNull()
  })

  it('sets status to ready when worker emits ready', async () => {
    const { result } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, TWO_OPTIONS),
    )

    await act(async () => {
      workerRef.current!.emit({ type: 'ready' })
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('sets status to error when worker emits error', async () => {
    const { result } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, ONE_OPTION),
    )

    await act(async () => {
      workerRef.current!.emit({ type: 'error', message: 'WASM init failed' })
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('resolves search promise when worker returns search-result', async () => {
    const { result } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, FRUIT_OPTIONS),
    )

    await act(async () => {
      workerRef.current!.emit({ type: 'ready' })
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Start the search (don't await yet — we need to send the reply first).
    // Storing the act promise and awaiting it later is the correct pattern here.
    let searchResult: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    const searchPromise = act(async () => {
      searchResult = await result.current.search([1, 0, 0], 2)
    })

    await act(async () => {
      const lastCall = workerRef.current!.postMessage.mock.calls.at(-1)![0] as { id: number }
      workerRef.current!.emit({ type: 'search-result', id: lastCall.id, neighbors: [0, 2] })
    })

    await searchPromise
    expect(searchResult).toEqual(['apple', 'cherry'])
  })

  it('rejects search promise when worker returns an error for the search', async () => {
    const { result } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, TWO_OPTIONS),
    )

    await act(async () => {
      workerRef.current!.emit({ type: 'ready' })
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let caughtError: Error | null = null
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    const searchPromise = act(async () => {
      await result.current.search([1, 0], 1).catch((e: Error) => {
        caughtError = e
      })
    })

    await act(async () => {
      const lastCall = workerRef.current!.postMessage.mock.calls.at(-1)![0] as { id: number }
      workerRef.current!.emit({ type: 'search-result', id: lastCall.id, error: 'index corrupted' })
    })

    await searchPromise
    expect(caughtError?.message).toBe('index corrupted')
  })

  it('terminates the worker on unmount', () => {
    const { unmount } = renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, ONE_OPTION),
    )
    const worker = workerRef.current!
    unmount()
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('throws if search is called before worker is created', async () => {
    const { result } = renderHook(() =>
      useHnswSearch(false, mockEmbedPassage, ONE_OPTION),
    )

    await expect(result.current.search([1], 1)).rejects.toThrow('HNSW worker not ready')
  })

  it('posts build message with embedded options when no indexUrl', async () => {
    renderHook(() =>
      useHnswSearch(true, mockEmbedPassage, XY_OPTIONS, undefined, undefined, 3),
    )

    await waitFor(() => {
      const calls = workerRef.current?.postMessage.mock.calls ?? []
      return calls.some(([msg]) => (msg as { type: string }).type === 'build')
    })

    const buildCall = workerRef.current!.postMessage.mock.calls.find(
      ([msg]) => (msg as { type: string }).type === 'build',
    )
    const msg = buildCall![0] as { type: string; count: number; dim: number }
    expect(msg.count).toBe(2)
    expect(msg.dim).toBe(3)
  })

  it('posts load message when indexUrl is provided', () => {
    renderHook(() =>
      useHnswSearch(
        true,
        mockEmbedPassage,
        [],
        'https://cdn.example.com/index.bin',
        TWO_OPTIONS,
        128,
      ),
    )

    expect(workerRef.current!.postMessage).toHaveBeenCalledWith({
      type: 'load',
      url: 'https://cdn.example.com/index.bin',
      dim: 128,
      maxElements: 200_000,
    })
  })
})
