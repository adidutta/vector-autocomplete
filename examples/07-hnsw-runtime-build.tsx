/**
 * HNSW mode — index built at runtime in a Web Worker.
 *
 * Best for 5 k–50 k items where client-mode linear scan becomes slow but you
 * don't want to pre-build a binary index. The component embeds all options and
 * constructs the HNSW graph in a background worker so the main thread is never
 * blocked. Shows "Building HNSW index…" while indexing.
 *
 * Query latency after the index is ready: ~5–20 ms regardless of dataset size.
 *
 * Trade-off vs. client mode: index build can take 30–90 s for 10 k+ items
 * (embedding time dominates). Consider pre-building the index for production
 * (see example 08).
 *
 * Important: pass a stable `options` reference. A new array on every render
 * causes the index to rebuild.
 */

import { useMemo } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

// Stable module-level constant — no rebuild on re-renders
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
  'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada',
  'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark', 'Egypt', 'Finland', 'France', 'Germany',
  'Ghana', 'Greece', 'Hungary', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kenya', 'Malaysia', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
  'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Saudi Arabia', 'South Africa', 'South Korea',
  'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey',
  'Ukraine', 'United Kingdom', 'United States', 'Vietnam', 'Zimbabwe',
]

export default function HnswRuntimeBuild() {
  return (
    <VectorAutocomplete
      options={COUNTRIES}
      label="Search countries (HNSW)"
      topK={6}
      searchMode={{ type: 'hnsw' }}
    />
  )
}

/**
 * Variant: options come from an API response.
 * Use useMemo so the reference is stable between renders.
 */
export function HnswFromApiData({ items }: { items: string[] }) {
  // Without useMemo, every re-render creates a new array → index rebuilds
  const stableOptions = useMemo(() => items, [items])

  return (
    <VectorAutocomplete
      options={stableOptions}
      label="Search"
      topK={8}
      searchMode={{ type: 'hnsw' }}
    />
  )
}
