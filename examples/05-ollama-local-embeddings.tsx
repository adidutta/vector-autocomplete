/**
 * Ollama local embeddings — no API key, no data leaves the machine.
 *
 * Ollama runs embedding models locally on your CPU/GPU. Ideal for:
 *   - Air-gapped or corporate environments where HuggingFace CDN is blocked
 *   - Development workflows where you want no external calls
 *   - Sharing an embedding model across multiple browser tabs / services
 *
 * Setup:
 *   brew install ollama          (macOS)
 *   OLLAMA_ORIGINS=* ollama serve
 *   ollama pull nomic-embed-text
 *
 * Common models:
 *   nomic-embed-text   768d   good general-purpose
 *   all-minilm         384d   fast, small
 *   mxbai-embed-large  1024d  highest accuracy
 */

import { useCallback } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_MODEL = 'nomic-embed-text'

const TECH_TOPICS = [
  'Machine learning model training',
  'Kubernetes container orchestration',
  'GraphQL API schema design',
  'PostgreSQL query optimisation',
  'Redis caching strategy',
  'React component lifecycle',
  'TypeScript type inference',
  'CI/CD deployment automation',
  'OAuth2 authentication flow',
  'WebSocket real-time communication',
]

export default function OllamaEmbeddings() {
  const embedFn = useCallback(async (text: string): Promise<number[]> => {
    const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`)
    const { embedding } = await res.json()
    return embedding as number[]
  }, [])

  return (
    <VectorAutocomplete
      options={TECH_TOPICS}
      label="Search (via Ollama)"
      topK={5}
      embedFn={embedFn}
    />
  )
}
