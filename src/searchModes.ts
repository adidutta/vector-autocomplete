export type SearchMode =
  | { type: 'client' }
  | {
      type: 'server'
      /** POST endpoint that accepts { vector: number[], k: number } and returns { results: string[] } */
      endpoint: string
      headers?: Record<string, string>
    }
  | {
      type: 'hnsw'
      /**
       * When omitted the index is built at runtime by embedding the `options` prop —
       * great for demos and datasets up to ~10 k items.
       * For large datasets (100 k+) pre-build the index offline and serve it as a binary file.
       */
      indexUrl?: string
      /** Required when indexUrl is provided — maps HNSW integer labels to display strings. */
      labels?: string[]
      /** Vector dimension. Must match the embedding model. Defaults to 384 (MiniLM / MPNet). */
      dim?: number
      /** Upper bound on the number of elements in the index. Defaults to 200 000. */
      maxElements?: number
    }
