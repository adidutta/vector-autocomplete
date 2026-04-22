import React, { useState, useEffect, useRef, useCallback } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { useEmbedder, cosineSimilarity, DEFAULT_MODEL, type ModelId } from '../useEmbedder'
import { useServerSearch } from '../useServerSearch'
import { useHnswSearch } from '../useHnswSearch'
import type { SearchMode } from '../searchModes'

interface VectorAutocompleteProps {
  options?: string[]
  label?: string
  topK?: number
  threshold?: number
  model?: ModelId
  searchMode?: SearchMode
  onChange?: (value: string | null) => void
}

function useOptionEmbeddings(
  options: string[],
  embed: (text: string) => Promise<number[]>,
) {
  const cacheRef = useRef<Map<string, number[]>>(new Map())
  const prevOptionsRef = useRef<string[] | null>(null)

  useEffect(() => {
    if (prevOptionsRef.current !== options) {
      cacheRef.current = new Map()
      prevOptionsRef.current = options
    }
  }, [options])

  return useCallback(async (text: string): Promise<number[]> => {
    if (!cacheRef.current.has(text)) {
      cacheRef.current.set(text, await embed(text))
    }
    return cacheRef.current.get(text)!
  }, [embed])
}

export default function VectorAutocomplete({
  options = [],
  label = 'Search',
  topK = 8,
  threshold = 0,
  model = DEFAULT_MODEL,
  searchMode = { type: 'client' },
  onChange,
}: VectorAutocompleteProps) {
  const { embedQuery, embedPassage, status: modelStatus } = useEmbedder(model)
  const getEmbedding = useOptionEmbeddings(options, embedPassage)

  // Server mode — hook always called, only active when mode matches
  const serverEndpoint = searchMode.type === 'server' ? searchMode.endpoint : ''
  const serverHeaders = searchMode.type === 'server' ? searchMode.headers : undefined
  const { search: serverSearch } = useServerSearch(serverEndpoint, serverHeaders)

  // HNSW mode — worker created only when enabled
  const hnswEnabled = searchMode.type === 'hnsw'
  const hnswIndexUrl = searchMode.type === 'hnsw' ? searchMode.indexUrl : undefined
  const hnswLabels = searchMode.type === 'hnsw' ? searchMode.labels : undefined
  const hnswDim = searchMode.type === 'hnsw' ? searchMode.dim : undefined
  const hnswMaxElements = searchMode.type === 'hnsw' ? searchMode.maxElements : undefined
  const { search: hnswSearch, status: hnswStatus } = useHnswSearch(
    hnswEnabled,
    embedPassage,
    options,
    hnswIndexUrl,
    hnswLabels,
    hnswDim,
    hnswMaxElements,
  )

  const [inputValue, setInputValue] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options.slice(0, topK))
  const [searching, setSearching] = useState(false)
  const [value, setValue] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rankOptions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredOptions(options.slice(0, topK))
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)
    try {
      if (searchMode.type === 'server') {
        const queryVec = await embedQuery(query)
        const results = await serverSearch(queryVec, topK)
        setFilteredOptions(results)
      } else if (searchMode.type === 'hnsw') {
        const queryVec = await embedQuery(query)
        const results = await hnswSearch(queryVec, topK)
        setFilteredOptions(results)
      } else {
        // client: linear cosine scan
        const queryVec = await embedQuery(query)
        const scored = await Promise.all(
          options.map(async (opt) => ({
            opt,
            score: cosineSimilarity(queryVec, await getEmbedding(opt)),
          })),
        )
        const results = scored
          .filter(({ score }) => score >= threshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map(({ opt }) => opt)
        setFilteredOptions(results)
      }
    } catch (err) {
      setSearchError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }, [
    searchMode,
    embedQuery,
    serverSearch,
    hnswSearch,
    getEmbedding,
    options,
    topK,
    threshold,
  ])

  const handleInputChange = useCallback((_event: React.SyntheticEvent, newInput: string) => {
    setInputValue(newInput)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => rankOptions(newInput), 300)
  }, [rankOptions])

  // Warm up: embed first option so the first real query has no cold-start delay
  useEffect(() => {
    if (options.length === 0 || searchMode.type !== 'client') return
    embedPassage(options[0]).catch(() => {})
  }, [embedPassage, options, searchMode.type])

  const modeLoading = searchMode.type === 'hnsw' && (hnswStatus === 'indexing')
  const isLoading = modelStatus === 'loading' || searching || modeLoading

  const statusLabel = (() => {
    if (modelStatus === 'loading') return 'Loading embedding model…'
    if (searchMode.type === 'hnsw' && hnswStatus === 'indexing') return 'Building HNSW index…'
    if (searchMode.type === 'hnsw' && hnswStatus === 'error') return 'HNSW index error — check console'
    if (modelStatus === 'error') return 'Model error'
    if (searchError) return `Search error: ${searchError}`
    return null
  })()

  const modeLabel: Record<SearchMode['type'], string> = {
    client: 'in-browser linear scan',
    server: 'server-side ANN',
    hnsw: 'HNSW Web Worker',
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Tooltip
        title={`${model} · ${modeLabel[searchMode.type]}`}
        placement="top-start"
        arrow
      >
        <Autocomplete
          options={filteredOptions}
          value={value}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onChange={(_e, newValue) => {
            setValue(newValue)
            onChange?.(newValue)
          }}
          filterOptions={(x) => x}
          loading={isLoading}
          disabled={searchMode.type === 'hnsw' && hnswStatus === 'error'}
          noOptionsText="No vector matches found"
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder="Type to search by meaning…"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading && <CircularProgress color="inherit" size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option, { index }) => (
            <li {...props} key={option}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {option}
                </Typography>
                {index === 0 && inputValue && (
                  <Chip label="Best match" size="small" color="primary" variant="outlined" />
                )}
              </Box>
            </li>
          )}
        />
      </Tooltip>

      {statusLabel && (
        <Typography
          variant="caption"
          color={searchError || hnswStatus === 'error' ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, display: 'block' }}
        >
          {statusLabel}
        </Typography>
      )}
    </Box>
  )
}
