import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ModelId } from '../useEmbedder'

// Use fresh module state per test to avoid pipelineCache interference
describe('useEmbedder', () => {
  let mockExtractor: ReturnType<typeof vi.fn>
  let mockPipeline: ReturnType<typeof vi.fn>
  let useEmbedder: (model?: ModelId) => import('../useEmbedder').UseEmbedderReturn
  let MODELS: typeof import('../useEmbedder').MODELS
  let DEFAULT_MODEL: ModelId

  beforeEach(async () => {
    vi.resetModules()
    mockExtractor = vi.fn().mockResolvedValue({ data: new Float32Array([0.1, 0.5, 0.9]) })
    mockPipeline = vi.fn().mockResolvedValue(mockExtractor)
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: mockPipeline,
      env: {},
    }))
    const mod = await import('../useEmbedder')
    useEmbedder = mod.useEmbedder
    MODELS = mod.MODELS
    DEFAULT_MODEL = mod.DEFAULT_MODEL
  })

  it('starts with idle status', () => {
    const { result } = renderHook(() => useEmbedder())
    expect(result.current.status).toBe('idle')
  })

  it('transitions to ready after embedQuery resolves', async () => {
    const { result } = renderHook(() => useEmbedder())

    await act(async () => {
      await result.current.embedQuery('hello world')
    })

    expect(result.current.status).toBe('ready')
  })

  it('returns a number array from embedQuery', async () => {
    const { result } = renderHook(() => useEmbedder())

    let embedding: number[] = []
    await act(async () => {
      embedding = await result.current.embedQuery('test')
    })

    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.every((v) => typeof v === 'number')).toBe(true)
    // Float32Array loses precision vs float64, so use toBeCloseTo
    expect(embedding[0]).toBeCloseTo(0.1, 2)
    expect(embedding[1]).toBeCloseTo(0.5, 2)
    expect(embedding[2]).toBeCloseTo(0.9, 2)
  })

  it('applies query prefix for BGE models', async () => {
    const bgeModel = MODELS.find((m) => m.id === 'Xenova/bge-small-en-v1.5')!
    const { result } = renderHook(() => useEmbedder(bgeModel.id))

    await act(async () => {
      await result.current.embedQuery('search term')
    })

    const calledWith = mockExtractor.mock.calls[0][0] as string
    expect(calledWith).toBe(`${bgeModel.queryPrefix}search term`)
  })

  it('does not apply a prefix for non-BGE models', async () => {
    const miniLM = MODELS.find((m) => m.id === 'Xenova/all-MiniLM-L6-v2')!
    const { result } = renderHook(() => useEmbedder(miniLM.id))

    await act(async () => {
      await result.current.embedQuery('search term')
    })

    const calledWith = mockExtractor.mock.calls[0][0] as string
    expect(calledWith).toBe('search term')
  })

  it('sets status to error when pipeline load fails', async () => {
    mockPipeline.mockRejectedValue(new Error('Model download failed'))

    const { result } = renderHook(() => useEmbedder())

    await act(async () => {
      await result.current.embedQuery('test').catch(() => {})
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('re-throws the error from embedQuery when pipeline fails', async () => {
    mockPipeline.mockRejectedValue(new Error('Model download failed'))

    const { result } = renderHook(() => useEmbedder())

    await expect(
      act(async () => {
        await result.current.embedQuery('test')
      }),
    ).rejects.toThrow('Model download failed')
  })

  it('DEFAULT_MODEL is one of the available MODELS', () => {
    expect(MODELS.map((m) => m.id)).toContain(DEFAULT_MODEL)
  })
})
