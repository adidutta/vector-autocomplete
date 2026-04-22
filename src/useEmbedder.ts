import { useRef, useState, useCallback } from 'react'
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false

export const MODELS = [
  { id: 'Xenova/all-MiniLM-L6-v2',                        label: 'MiniLM-L6-v2 (fast, 23 MB)',          queryPrefix: '' },
  { id: 'Xenova/all-mpnet-base-v2',                        label: 'MPNet-base-v2 (accurate, 85 MB)',      queryPrefix: '' },
  { id: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',   label: 'Multilingual MiniLM-L12 (118 MB)',     queryPrefix: '' },
  { id: 'Xenova/bge-small-en-v1.5',                        label: 'BGE-small-en v1.5 (50 MB)',            queryPrefix: 'Represent this sentence for searching relevant passages: ' },
  { id: 'Xenova/bge-large-en-v1.5',                        label: 'BGE-large-en v1.5 (250 MB)',           queryPrefix: 'Represent this sentence for searching relevant passages: ' },
] as const

export type ModelId = typeof MODELS[number]['id']

export const DEFAULT_MODEL: ModelId = 'Xenova/all-mpnet-base-v2'

type EmbedderStatus = 'idle' | 'loading' | 'ready' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelineCache = new Map<string, Promise<any>>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPipeline(model: string): Promise<any> {
  if (!pipelineCache.has(model)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipelineCache.set(model, pipeline('feature-extraction', model, { dtype: 'q8' } as any))
  }
  return pipelineCache.get(model)!
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8)
}

export interface UseEmbedderReturn {
  embedQuery: (text: string) => Promise<number[]>
  embedPassage: (text: string) => Promise<number[]>
  status: EmbedderStatus
}

export function useEmbedder(model: ModelId = DEFAULT_MODEL): UseEmbedderReturn {
  const [status, setStatus] = useState<EmbedderStatus>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractorRef = useRef<{ model: string; extractor: any } | null>(null)

  const modelDef = MODELS.find((m) => m.id === model)!

  const embedRaw = useCallback(async (text: string): Promise<number[]> => {
    if (!extractorRef.current || extractorRef.current.model !== model) {
      setStatus('loading')
      try {
        const extractor = await getPipeline(model)
        extractorRef.current = { model, extractor }
        setStatus('ready')
      } catch (err) {
        setStatus('error')
        throw err
      }
    }
    const output = await extractorRef.current.extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }, [model])

  const embedQuery = useCallback(
    (text: string) => embedRaw(modelDef.queryPrefix + text),
    [embedRaw, modelDef.queryPrefix],
  )

  const embedPassage = embedRaw

  return { embedQuery, embedPassage, status }
}
