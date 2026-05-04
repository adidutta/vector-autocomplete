/**
 * Server search mode — query vector sent to your ANN endpoint.
 *
 * The query is embedded in the browser (HuggingFace or embedFn), then the
 * resulting vector is POSTed to your server for ANN lookup over pre-computed
 * option embeddings. The raw query text never reaches the search server.
 *
 * Use this when your dataset is too large for a browser scan (>5 k items) and
 * you don't want to build an HNSW index in the client.
 *
 * Required server contract:
 *   POST <endpoint>
 *   { "vector": number[], "k": number }
 *   → { "results": string[] }
 *
 * Example servers: see FastAPI + Qdrant and Oracle AI Vector Search in README.
 */

import VectorAutocomplete from 'vector-autocomplete'

export default function ServerSearchMode() {
  return (
    <VectorAutocomplete
      options={[]}   // options are not used — the server owns the candidate list
      label="Search (server ANN)"
      topK={8}
      searchMode={{
        type: 'server',
        endpoint: 'https://your-api.example.com/search',
        headers: {
          Authorization: 'Bearer YOUR_TOKEN',
        },
      }}
    />
  )
}

/**
 * Variant: embed on the server too.
 *
 * When you pass both `embedFn` and server search mode, the full pipeline is
 * server-side. The query text goes to your embedding service, the resulting
 * vector goes to your search endpoint, and the browser never runs a model.
 */
export function FullServerPipeline() {
  // embedFn must be stable — define outside the component or in useCallback
  return (
    <VectorAutocomplete
      options={[]}
      label="Full server pipeline"
      topK={8}
      embedFn={async (text) => {
        // Replace with your embedding service
        const res = await fetch('https://embed.example.com/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer TOKEN' },
          body: JSON.stringify({ text }),
        })
        return (await res.json()).embedding as number[]
      }}
      searchMode={{
        type: 'server',
        endpoint: 'https://search.example.com/search',
        headers: { Authorization: 'Bearer TOKEN' },
      }}
    />
  )
}
