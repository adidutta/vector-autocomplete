import { loadHnswlib } from 'hnswlib-wasm'
import type { HnswlibModule, HierarchicalNSW } from 'hnswlib-wasm'

type InMsg =
  | { type: 'build'; vectors: ArrayBuffer; count: number; dim: number }
  | { type: 'load'; url: string; dim: number; maxElements: number }
  | { type: 'search'; id: number; vector: ArrayBuffer; k: number }

let lib: HnswlibModule | null = null
let index: HierarchicalNSW | null = null

async function getLib(): Promise<HnswlibModule> {
  if (!lib) lib = await loadHnswlib()
  return lib
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data

  if (msg.type === 'build') {
    try {
      const hnswlib = await getLib()
      const { count, dim } = msg
      const vectors = new Float32Array(msg.vectors)

      index = new hnswlib.HierarchicalNSW('cosine', dim, '')
      index.initIndex(count, 16, 200, 100)

      for (let i = 0; i < count; i++) {
        const vec = vectors.subarray(i * dim, (i + 1) * dim)
        index.addPoint(vec, i, false)
      }

      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message })
    }
    return
  }

  if (msg.type === 'load') {
    try {
      const hnswlib = await getLib()
      const res = await fetch(msg.url)
      if (!res.ok) throw new Error(`Failed to fetch index: ${res.status} ${res.statusText}`)
      const bytes = new Uint8Array(await res.arrayBuffer())

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(hnswlib as any).FS.writeFile('/index.bin', bytes)
      index = new hnswlib.HierarchicalNSW('cosine', msg.dim, '')
      await index.readIndex('/index.bin', msg.maxElements)
      index.setEfSearch(Math.max(50, Math.ceil(msg.maxElements / 1000)))

      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message })
    }
    return
  }

  if (msg.type === 'search') {
    if (!index) {
      self.postMessage({ type: 'search-result', id: msg.id, error: 'Index not loaded' })
      return
    }
    try {
      const vec = new Float32Array(msg.vector)
      const result = index.searchKnn(vec, msg.k, undefined)
      self.postMessage({ type: 'search-result', id: msg.id, neighbors: result.neighbors })
    } catch (err) {
      self.postMessage({ type: 'search-result', id: msg.id, error: (err as Error).message })
    }
  }
}
