/**
 * HNSW mode — loading a pre-built binary index.
 *
 * For production with 100 k+ items, pre-build the index offline and serve the
 * binary. The Web Worker fetches and deserialises it (~100–200 ms for a 10 MB
 * file) instead of re-embedding all options at runtime.
 *
 * Build the index with the Node.js script below (run once, check in or upload
 * to your CDN):
 *
 * ---
 * // build-index.mts  (run with: node --loader ts-node/esm build-index.mts)
 * import { loadHnswlib } from 'hnswlib-wasm'
 * import { pipeline } from '@huggingface/transformers'
 * import { readFileSync, writeFileSync } from 'fs'
 *
 * const labels: string[] = JSON.parse(readFileSync('items.json', 'utf8'))
 * const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
 * const DIM = 384
 *
 * const hnswlib = await loadHnswlib()
 * const index = new hnswlib.HierarchicalNSW('cosine', DIM, '/index.bin')
 * index.initIndex(labels.length, 16, 200, 100)
 *
 * for (let i = 0; i < labels.length; i++) {
 *   const out = await embed(labels[i], { pooling: 'mean', normalize: true })
 *   index.addPoint(Array.from(out.data as Float32Array), i, false)
 *   if (i % 1000 === 0) console.log(`${i}/${labels.length}`)
 * }
 *
 * await index.writeIndex('/index.bin')
 * writeFileSync('public/my-index.hnsw', hnswlib.FS.readFile('/index.bin'))
 * writeFileSync('public/my-index-labels.json', JSON.stringify(labels))
 * ---
 *
 * The model used at query time must match the model used to build the index,
 * and `dim` must match the model's output dimension.
 */

import VectorAutocomplete from 'vector-autocomplete'

// Labels file is the ordered string[] written by the build script.
// Serve both files from the same CDN or public folder.
const INDEX_URL = '/assets/my-index.hnsw'
const LABELS: string[] = await fetch('/assets/my-index-labels.json').then((r) => r.json())

export default function HnswPrebuiltIndex() {
  return (
    <VectorAutocomplete
      options={[]}        // not used when indexUrl is provided
      label="Search (pre-built index)"
      topK={8}
      model="Xenova/all-MiniLM-L6-v2"   // must match the build-time model
      searchMode={{
        type: 'hnsw',
        indexUrl: INDEX_URL,
        labels: LABELS,
        dim: 384,           // must match the model's output dimension
        maxElements: 100_000,
      }}
    />
  )
}
