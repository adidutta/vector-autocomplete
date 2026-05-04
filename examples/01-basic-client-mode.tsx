/**
 * Basic client-mode search — the default.
 *
 * Everything runs in the browser: the 23 MB MiniLM-L6-v2 model is downloaded
 * once from HuggingFace, cached, and then used to embed both the query and
 * each option. Results are ranked by cosine similarity.
 *
 * Best for: lists up to ~5 k items, no server required.
 */

import { useState } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

const PROGRAMMING_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Rust',
  'Go',
  'Java',
  'C++',
  'Ruby',
  'Swift',
  'Kotlin',
  'Scala',
  'Haskell',
  'Elixir',
  'Clojure',
  'Julia',
]

export default function BasicClientSearch() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      {/* No props required beyond `options` — client mode is the default */}
      <VectorAutocomplete
        options={PROGRAMMING_LANGUAGES}
        label="Search languages"
        topK={5}
        onChange={setSelected}
      />
      {selected && <p>Selected: {selected}</p>}
    </div>
  )
}
