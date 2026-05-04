/**
 * Multiple instances on one page.
 *
 * Each VectorAutocomplete instance manages its own state independently.
 * The HuggingFace pipeline is shared via a module-level cache (loaded once
 * regardless of how many components use the same model), so only the first
 * instance pays the model download cost.
 *
 * If the components use different models, each model is downloaded and cached
 * separately.
 */

import { useState } from 'react'
import VectorAutocomplete from 'vector-autocomplete'

const CUISINES = ['Italian', 'Japanese', 'Mexican', 'Indian', 'French', 'Thai', 'Chinese', 'Greek']
const DIETARY = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Halal', 'Kosher']
const OCCASIONS = ['Date night', 'Family dinner', 'Quick weeknight meal', 'Meal prep', 'Party food', 'Comfort food']

export default function MultipleInstances() {
  const [cuisine, setCuisine] = useState<string | null>(null)
  const [dietary, setDietary] = useState<string | null>(null)
  const [occasion, setOccasion] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2>Recipe finder</h2>

      {/* All three share the same HuggingFace model — loaded only once */}
      <VectorAutocomplete
        options={CUISINES}
        label="Cuisine type"
        topK={4}
        onChange={setCuisine}
      />

      <VectorAutocomplete
        options={DIETARY}
        label="Dietary requirement"
        topK={4}
        onChange={setDietary}
      />

      <VectorAutocomplete
        options={OCCASIONS}
        label="Occasion"
        topK={4}
        onChange={setOccasion}
      />

      {(cuisine || dietary || occasion) && (
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 4 }}>
          {JSON.stringify({ cuisine, dietary, occasion }, null, 2)}
        </pre>
      )}
    </div>
  )
}
