import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock HuggingFace so useEmbedder never tries to load a real model
vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn(),
  env: {},
}))

// Mock useHnswSearch to avoid the Web Worker / WASM import chain
vi.mock('../useHnswSearch', () => ({
  useHnswSearch: vi.fn(() => ({ search: vi.fn(), status: 'idle' as const })),
}))

import VectorAutocomplete from '../components/VectorAutocomplete'

const OPTIONS = ['apple', 'banana', 'cherry', 'date', 'elderberry']

// User without delays — types are instant, debounce timer still advances via real clock
const user = userEvent.setup({ delay: null })

afterEach(() => {
  vi.clearAllMocks()
})

describe('VectorAutocomplete', () => {
  it('renders the text field with the provided label', () => {
    render(<VectorAutocomplete label="Fruit search" embedFn={vi.fn()} />)
    expect(screen.getByLabelText('Fruit search')).toBeInTheDocument()
  })

  it('shows the placeholder text', () => {
    render(<VectorAutocomplete embedFn={vi.fn()} />)
    expect(screen.getByPlaceholderText('Type to search by meaning…')).toBeInTheDocument()
  })

  it('calls embedFn with the search query after the 300 ms debounce', async () => {
    const embedFn = vi.fn().mockResolvedValue([1, 0, 0])
    render(<VectorAutocomplete options={OPTIONS} embedFn={embedFn} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'tropical')

    // The debounce fires 300 ms after the last keystroke — waitFor polls until it's called
    await waitFor(() => {
      expect(embedFn).toHaveBeenCalledWith('tropical')
    }, { timeout: 1000 })
  }, 3000)

  it('does not call embedFn for an empty query', async () => {
    const embedFn = vi.fn().mockResolvedValue([1, 0, 0])
    render(<VectorAutocomplete options={OPTIONS} embedFn={embedFn} />)

    // Let warm-up run
    await waitFor(() => expect(embedFn).toHaveBeenCalledWith('apple'), { timeout: 500 })
    embedFn.mockClear()

    // Dispatch an empty change — debounce fires, rankOptions returns early
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '' } })
    await new Promise((r) => setTimeout(r, 400))

    expect(embedFn).not.toHaveBeenCalled()
  }, 3000)

  it('calls onChange when the user selects a value', async () => {
    const embedFn = vi.fn().mockResolvedValue([1, 0, 0])
    const onChange = vi.fn()
    render(
      <VectorAutocomplete options={OPTIONS} embedFn={embedFn} topK={5} onChange={onChange} />,
    )

    const input = screen.getByRole('combobox')
    await user.type(input, 'apple')

    // Wait for search results to appear
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0), {
      timeout: 1000,
    })

    fireEvent.click(screen.getAllByRole('option')[0])
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(expect.any(String))
  }, 5000)

  it('filters out options below the threshold', async () => {
    // query → [1,0,0]; apple → [1,0,0] (sim=1); banana → [0,1,0] (sim≈0)
    const embedFn = vi.fn()
      .mockResolvedValueOnce([1, 0, 0]) // warm-up: embedPassage('apple')
      .mockResolvedValueOnce([1, 0, 0]) // query embed
      .mockResolvedValueOnce([1, 0, 0]) // getEmbedding('apple')
      .mockResolvedValueOnce([0, 1, 0]) // getEmbedding('banana')

    render(
      <VectorAutocomplete
        options={['apple', 'banana']}
        embedFn={embedFn}
        topK={5}
        threshold={0.5}
      />,
    )

    const input = screen.getByRole('combobox')
    await user.type(input, 'x')

    await waitFor(
      () => {
        const opts = screen.queryAllByRole('option')
        expect(opts).toHaveLength(1)
        expect(opts[0]).toHaveTextContent('apple')
      },
      { timeout: 1000 },
    )
  }, 3000)

  it('marks the first result as "Best match"', async () => {
    const embedFn = vi.fn().mockResolvedValue([1, 0, 0])
    render(<VectorAutocomplete options={OPTIONS} embedFn={embedFn} topK={3} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'query')

    await waitFor(() => {
      expect(screen.getByText('Best match')).toBeInTheDocument()
    }, { timeout: 1000 })
  }, 3000)

  it('shows no-options text when all results are below threshold', async () => {
    const embedFn = vi.fn()
      .mockResolvedValueOnce([1, 0, 0]) // warm-up
      .mockResolvedValueOnce([1, 0, 0]) // query
      .mockResolvedValueOnce([0, 1, 0]) // apple embed (sim≈0 < 0.9)

    render(
      <VectorAutocomplete options={['apple']} embedFn={embedFn} threshold={0.9} />,
    )

    const input = screen.getByRole('combobox')
    await user.type(input, 'q')

    await waitFor(() => {
      expect(screen.getByText('No vector matches found')).toBeInTheDocument()
    }, { timeout: 1000 })
  }, 3000)
})
