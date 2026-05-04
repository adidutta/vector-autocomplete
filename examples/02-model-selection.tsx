/**
 * Choosing a different in-browser embedding model.
 *
 * Five quantized ONNX models are built in. Trade off download size against
 * accuracy. The default is all-mpnet-base-v2 (85 MB, 768d, best balance).
 *
 * Model reference:
 *   Xenova/all-MiniLM-L6-v2                      — 23 MB,  384d, fastest
 *   Xenova/all-mpnet-base-v2                      — 85 MB,  768d, default
 *   Xenova/paraphrase-multilingual-MiniLM-L12-v2  — 118 MB, 384d, 50+ languages
 *   Xenova/bge-small-en-v1.5                      — 50 MB,  384d, BGE small
 *   Xenova/bge-large-en-v1.5                      — 250 MB, 384d, highest accuracy
 */

import VectorAutocomplete from 'vector-autocomplete'

const RECIPES = [
  'Spaghetti carbonara',
  'Chicken tikka masala',
  'Avocado toast',
  'Beef ramen',
  'Caesar salad',
  'Mushroom risotto',
  'Pad Thai',
  'Greek moussaka',
  'Butter chicken',
  'Vegan Buddha bowl',
]

export function FastModel() {
  return (
    <VectorAutocomplete
      options={RECIPES}
      label="Fast model — 23 MB"
      model="Xenova/all-MiniLM-L6-v2"
      topK={5}
    />
  )
}

export function MultilingualModel() {
  return (
    // Try queries in French, Spanish, German, Japanese, etc.
    <VectorAutocomplete
      options={RECIPES}
      label="Multilingual — 118 MB"
      model="Xenova/paraphrase-multilingual-MiniLM-L12-v2"
      topK={5}
    />
  )
}

export function HighAccuracyModel() {
  return (
    <VectorAutocomplete
      options={RECIPES}
      label="High accuracy — 250 MB"
      model="Xenova/bge-large-en-v1.5"
      topK={5}
    />
  )
}
