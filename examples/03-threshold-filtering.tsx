/**
 * Threshold filtering — remove weak matches from results.
 *
 * `threshold` is a cosine similarity floor applied in client mode.
 * Without it every option gets a score and the top-K are always returned
 * even if semantically unrelated. A threshold between 0.15 and 0.30 removes
 * noise while keeping close semantic neighbours.
 *
 * Try typing "spicy food" — unrelated options like "Chocolate lava cake" will
 * be filtered out with threshold=0.25 but would appear without it.
 */

import VectorAutocomplete from 'vector-autocomplete'

const DISHES = [
  'Beef tacos with jalapeño salsa',
  'Thai green curry',
  'Sichuan mapo tofu',
  'Korean kimchi jjigae',
  'Grilled chicken Caesar salad',
  'Chocolate lava cake',
  'Vanilla ice cream',
  'Strawberry cheesecake',
  'Lemon tart',
  'Mango sorbet',
]

export function NoThreshold() {
  return (
    // Returns top-K regardless of relevance — desserts will appear for "spicy food"
    <VectorAutocomplete
      options={DISHES}
      label="No threshold (topK always filled)"
      topK={5}
      threshold={0}
    />
  )
}

export function WithThreshold() {
  return (
    // Only shows options with cosine similarity >= 0.25
    <VectorAutocomplete
      options={DISHES}
      label="threshold=0.25 (filters weak matches)"
      topK={5}
      threshold={0.25}
    />
  )
}
