import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import VectorAutocomplete from './components/VectorAutocomplete'
import { MODELS, DEFAULT_MODEL, type ModelId } from './useEmbedder'
import type { SearchMode } from './searchModes'

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#6750A4' } },
  shape: { borderRadius: 12 },
})

const TECH_OPTIONS: string[] = [
  'Machine learning model training',
  'Neural network architecture design',
  'Natural language processing pipeline',
  'Computer vision object detection',
  'Reinforcement learning from human feedback',
  'Transformer attention mechanism',
  'Gradient descent optimization',
  'Convolutional neural network',
  'Recurrent neural network',
  'Generative adversarial network',
  'Large language model fine-tuning',
  'Retrieval augmented generation',
  'Vector database similarity search',
  'Vector embeddings and cosine similarity',
  'Kubernetes container orchestration',
  'Docker image build pipeline',
  'CI/CD deployment automation',
  'GraphQL API schema design',
  'REST API endpoint design',
  'WebSocket real-time communication',
  'React component lifecycle',
  'Redux state management',
  'Next.js server-side rendering',
  'TypeScript type inference',
  'PostgreSQL query optimization',
  'Redis caching strategy',
  'Elasticsearch full-text search',
  'Apache Kafka message streaming',
  'AWS Lambda serverless function',
  'OAuth2 authentication flow',
]

const FOOD_OPTIONS: string[] = [
  'Spaghetti carbonara',
  'Margherita pizza',
  'Caesar salad',
  'Beef ramen with soft-boiled egg',
  'Avocado toast with poached eggs',
  'Grilled salmon with asparagus',
  'Chicken tikka masala',
  'Vegetable stir fry with tofu',
  'French onion soup',
  'Mushroom risotto',
  'Tacos al pastor',
  'Pad Thai noodles',
  'Butter chicken curry',
  'Greek moussaka',
  'Pulled pork sandwich',
  'Lobster bisque',
  'Shrimp scampi linguine',
  'Eggs Benedict',
  'Beef Wellington',
  'Vegan Buddha bowl',
]

type ModeKey = 'client' | 'server' | 'hnsw'

const MODE_LABELS: Record<ModeKey, string> = {
  client: 'Client — linear scan (default)',
  server: 'Server — ANN via REST endpoint',
  hnsw: 'HNSW Web Worker (large datasets)',
}

const MODE_DESCRIPTIONS: Record<ModeKey, string> = {
  client:
    'All search happens in the browser. Works well up to ~5 k options. No extra infrastructure.',
  server:
    'The query is embedded in the browser, then the vector is sent to your server for ANN lookup over pre-computed embeddings. Scales to millions of items.',
  hnsw:
    'HNSW index runs in a dedicated Web Worker — non-blocking and scales to 100 k+ items. The index is built at runtime from the options list in this demo. In production you would pre-build and serve the binary.',
}

export default function App() {
  const [selectedTech, setSelectedTech] = useState<string | null>(null)
  const [selectedFood, setSelectedFood] = useState<string | null>(null)
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL)
  const [modeKey, setModeKey] = useState<ModeKey>('client')
  const [serverEndpoint, setServerEndpoint] = useState('https://your-api.example.com/search')

  const searchMode: SearchMode = (() => {
    if (modeKey === 'server') return { type: 'server', endpoint: serverEndpoint }
    if (modeKey === 'hnsw') return { type: 'hnsw' }
    return { type: 'client' }
  })()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Vector Autocomplete
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Search by meaning, not just keywords. Powered by transformer embeddings. Try{' '}
          <em>"AI"</em>, <em>"deploy"</em>, or <em>"Italian food"</em>.
        </Typography>

        {/* ── Controls ── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
            <InputLabel>Embedding model</InputLabel>
            <Select
              value={model}
              label="Embedding model"
              onChange={(e) => setModel(e.target.value as ModelId)}
            >
              {MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
            <InputLabel>Search mode</InputLabel>
            <Select
              value={modeKey}
              label="Search mode"
              onChange={(e) => setModeKey(e.target.value as ModeKey)}
            >
              {(Object.keys(MODE_LABELS) as ModeKey[]).map((k) => (
                <MenuItem key={k} value={k}>{MODE_LABELS[k]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Alert severity="info" sx={{ mb: modeKey === 'server' ? 1 : 3 }}>
          {MODE_DESCRIPTIONS[modeKey]}
        </Alert>

        {modeKey === 'server' && (
          <TextField
            fullWidth
            size="small"
            label="Server endpoint"
            value={serverEndpoint}
            onChange={(e) => setServerEndpoint(e.target.value)}
            placeholder="https://your-api.example.com/search"
            sx={{ mb: 3 }}
            helperText="POST { vector: number[], k: number } → { results: string[] }"
          />
        )}

        {/* ── Tech topics ── */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Tech topics
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Try: "AI", "ML ops", "deploy containers", "realtime", "auth"
          </Typography>
          <VectorAutocomplete
            key={`${model}-${modeKey}-tech`}
            options={TECH_OPTIONS}
            label="Search tech topics"
            topK={6}
            model={model}
            searchMode={searchMode}
            onChange={setSelectedTech}
          />
          {selectedTech && (
            <Box sx={{ mt: 2 }}>
              <Chip label={`Selected: ${selectedTech}`} color="primary" />
            </Box>
          )}
        </Paper>

        <Divider sx={{ mb: 4 }} />

        {/* ── Food & recipes ── */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Food &amp; recipes
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Try: "pasta", "spicy curry", "healthy bowl", "seafood", "egg breakfast"
          </Typography>
          <VectorAutocomplete
            key={`${model}-${modeKey}-food`}
            options={FOOD_OPTIONS}
            label="Search recipes"
            topK={5}
            model={model}
            searchMode={searchMode}
            onChange={setSelectedFood}
          />
          {selectedFood && (
            <Box sx={{ mt: 2 }}>
              <Chip label={`Selected: ${selectedFood}`} color="primary" />
            </Box>
          )}
        </Paper>
      </Container>
    </ThemeProvider>
  )
}
