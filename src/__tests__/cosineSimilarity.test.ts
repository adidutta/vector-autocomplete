import { describe, it, expect } from 'vitest'
import { cosineSimilarity } from '../useEmbedder'

describe('cosineSimilarity', () => {
  it('returns ~1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })

  it('returns ~1 for scaled vectors (same direction)', () => {
    expect(cosineSimilarity([1, 0], [5, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 1], [3, 3])).toBeCloseTo(1)
  })

  it('returns ~0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0)
  })

  it('returns ~-1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
    expect(cosineSimilarity([0, 1], [0, -1])).toBeCloseTo(-1)
  })

  it('returns correct value for 45-degree angle', () => {
    // cos(45°) = 1/√2 ≈ 0.707
    expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2, 3)
  })

  it('handles negative components correctly', () => {
    expect(cosineSimilarity([-1, -1], [-1, -1])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1)
  })

  it('handles zero vectors gracefully (returns finite value)', () => {
    const result = cosineSimilarity([0, 0, 0], [1, 0, 0])
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBeCloseTo(0, 5)
  })

  it('works on higher-dimensional vectors', () => {
    const a = [1, 0, 0, 0, 0]
    const b = [1, 0, 0, 0, 0]
    const c = [0, 1, 0, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1)
    expect(cosineSimilarity(a, c)).toBeCloseTo(0)
  })
})
