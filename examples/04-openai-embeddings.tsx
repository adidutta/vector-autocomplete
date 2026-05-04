/**
 * OpenAI embeddings via the `embedFn` prop.
 *
 * Pass any async function that returns a number[] to bypass HuggingFace
 * entirely. Here we call the OpenAI Embeddings API and keep search in the
 * browser (client mode). Useful when you need a specific commercial model
 * or already have an OpenAI subscription.
 *
 * Model dimensions:
 *   text-embedding-3-small  — 1536d (default), supports dimensions param
 *   text-embedding-3-large  — 3072d
 *   text-embedding-ada-002  — 1536d (legacy)
 *
 * Note: `embedFn` must be stable (useCallback or module-level) — a new
 * function reference on every render re-triggers the warm-up embed.
 */

import { useCallback } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string

const CLOUD_SERVICES = [
  'AWS Lambda serverless functions',
  'Google Cloud Run containers',
  'Azure Functions event-driven compute',
  'Vercel Edge Functions',
  'Cloudflare Workers',
  'Fly.io global deployment',
  'Railway app hosting',
  'Render managed PostgreSQL',
  'PlanetScale serverless MySQL',
  'Supabase realtime database',
]

export default function OpenAIEmbeddings() {
  const embedFn = useCallback(async (text: string): Promise<number[]> => {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
    const { data } = await res.json()
    return data[0].embedding as number[]
  }, [])  // stable reference — no deps change after mount

  return (
    <VectorAutocomplete
      options={CLOUD_SERVICES}
      label="Search cloud services"
      topK={5}
      embedFn={embedFn}
    />
  )
}
