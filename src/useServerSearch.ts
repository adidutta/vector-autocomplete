import { useCallback } from 'react'

export function useServerSearch(endpoint: string, headers?: Record<string, string>) {
  const search = useCallback(
    async (vector: number[], k: number): Promise<string[]> => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ vector, k }),
      })
      if (!res.ok) throw new Error(`Server search failed: ${res.status} ${res.statusText}`)
      const data = await res.json()
      return data.results as string[]
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, JSON.stringify(headers)],
  )

  return { search }
}
