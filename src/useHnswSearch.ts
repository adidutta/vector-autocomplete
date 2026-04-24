import { useEffect, useRef, useState, useCallback } from 'react'
import HnswWorker from './workers/hnsw.worker.ts?worker&inline'

export type HnswStatus = 'idle' | 'indexing' | 'ready' | 'error'

interface Pending {
  resolve: (results: string[]) => void
  reject: (err: Error) => void
}

export function useHnswSearch(
  enabled: boolean,
  embedPassage: (text: string) => Promise<number[]>,
  options: string[],
  indexUrl?: string,
  labels?: string[],
  dim = 384,
  maxElements = 200_000,
) {
  const [status, setStatus] = useState<HnswStatus>('idle')
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef(new Map<number, Pending>())
  const idRef = useRef(0)
  const labelsRef = useRef<string[]>([])

  useEffect(() => {
    if (!enabled) return

    setStatus('indexing')
    const worker = new HnswWorker()
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'ready') {
        setStatus('ready')
      } else if (msg.type === 'error') {
        setStatus('error')
        console.error('[HnswSearch] worker error:', msg.message)
      } else if (msg.type === 'search-result') {
        const pending = pendingRef.current.get(msg.id)
        if (!pending) return
        pendingRef.current.delete(msg.id)
        if (msg.error) {
          pending.reject(new Error(msg.error))
        } else {
          pending.resolve((msg.neighbors as number[]).map((i) => labelsRef.current[i]).filter(Boolean))
        }
      }
    }

    worker.onerror = (e) => {
      setStatus('error')
      console.error('[HnswSearch] worker uncaught error:', e.message)
    }

    if (indexUrl) {
      labelsRef.current = labels ?? []
      worker.postMessage({ type: 'load', url: indexUrl, dim, maxElements })
    } else {
      labelsRef.current = options
      // Build index at runtime by embedding all options
      ;(async () => {
        try {
          const embeddings = await Promise.all(options.map((o) => embedPassage(o)))
          const flat = new Float32Array(embeddings.length * dim)
          embeddings.forEach((vec, i) => flat.set(vec, i * dim))
          const buf = flat.buffer
          worker.postMessage({ type: 'build', vectors: buf, count: embeddings.length, dim }, [buf])
        } catch (err) {
          setStatus('error')
          console.error('[HnswSearch] failed to build index:', err)
        }
      })()
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      pendingRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, indexUrl, dim, maxElements, options, embedPassage])

  const search = useCallback(
    async (vector: number[], k: number): Promise<string[]> => {
      const worker = workerRef.current
      if (!worker) throw new Error('HNSW worker not ready')
      const id = ++idRef.current
      const buf = new Float32Array(vector).buffer
      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject })
        worker.postMessage({ type: 'search', id, vector: buf, k }, [buf])
      })
    },
    [],
  )

  return { search, status }
}
