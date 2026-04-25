import { useState, useCallback } from 'react'
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
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import readme from '../README.md?raw'
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
type EmbedSource = 'huggingface' | 'ollama' | 'custom'

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

const EMBED_SOURCE_LABELS: Record<EmbedSource, string> = {
  huggingface: 'In-browser (HuggingFace)',
  ollama: 'Ollama (local, no key)',
  custom: 'Custom endpoint',
}

const OLLAMA_MODELS = [
  { id: 'nomic-embed-text', label: 'nomic-embed-text (768d)' },
  { id: 'all-minilm', label: 'all-minilm (384d)' },
  { id: 'mxbai-embed-large', label: 'mxbai-embed-large (1024d)' },
]

export default function App() {
  const [selectedTech, setSelectedTech] = useState<string | null>(null)
  const [selectedFood, setSelectedFood] = useState<string | null>(null)
  const [docsOpen, setDocsOpen] = useState(false)
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL)
  const [modeKey, setModeKey] = useState<ModeKey>('client')
  const [serverEndpoint, setServerEndpoint] = useState('https://your-api.example.com/search')
  const [embedSource, setEmbedSource] = useState<EmbedSource>('huggingface')
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('nomic-embed-text')
  const [customEndpoint, setCustomEndpoint] = useState('')

  const searchMode: SearchMode = (() => {
    if (modeKey === 'server') return { type: 'server', endpoint: serverEndpoint }
    if (modeKey === 'hnsw') return { type: 'hnsw' }
    return { type: 'client' }
  })()

  const ollamaEmbedFn = useCallback(async (text: string): Promise<number[]> => {
    const res = await fetch(`${ollamaHost}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel, prompt: text }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return data.embedding as number[]
  }, [ollamaHost, ollamaModel])

  const customEmbedFn = useCallback(async (text: string): Promise<number[]> => {
    const res = await fetch(customEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error(`Embed error: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return (data.embedding ?? data.vector) as number[]
  }, [customEndpoint])

  const embedFn =
    embedSource === 'ollama' ? ollamaEmbedFn :
    embedSource === 'custom' && customEndpoint ? customEmbedFn :
    undefined

  const demoKey = `${model}-${modeKey}-${embedSource}-${ollamaModel}-${customEndpoint}`

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Vector Autocomplete
          </Typography>
          <Button
            size="small"
            startIcon={<MenuBookIcon />}
            onClick={() => setDocsOpen(true)}
            variant="outlined"
          >
            Docs
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Search by meaning, not just keywords. Powered by transformer embeddings. Try{' '}
          <em>"AI"</em>, <em>"deploy"</em>, or <em>"Italian food"</em>.
        </Typography>

        {/* ── Docs drawer ── */}
        <Drawer anchor="right" open={docsOpen} onClose={() => setDocsOpen(false)}>
          <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 3, overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>README</Typography>
              <IconButton onClick={() => setDocsOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{
              '& h1': { fontSize: '1.5rem', fontWeight: 700, mt: 3, mb: 1 },
              '& h2': { fontSize: '1.2rem', fontWeight: 700, mt: 3, mb: 1 },
              '& h3': { fontSize: '1rem', fontWeight: 700, mt: 2, mb: 0.5 },
              '& p': { mb: 1.5, lineHeight: 1.7 },
              '& pre': { bgcolor: 'grey.100', p: 2, borderRadius: 1, overflowX: 'auto', fontSize: '0.8rem' },
              '& code': { bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5, fontSize: '0.85em' },
              '& pre code': { bgcolor: 'transparent', p: 0 },
              '& table': { borderCollapse: 'collapse', width: '100%', mb: 2, fontSize: '0.85rem' },
              '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
              '& th': { bgcolor: 'grey.100', fontWeight: 600 },
              '& ul, & ol': { pl: 3, mb: 1.5 },
              '& li': { mb: 0.5 },
              '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, ml: 0, color: 'text.secondary' },
              '& hr': { my: 3, borderColor: 'divider' },
              '& a': { color: 'primary.main' },
            }}>
              <ReactMarkdown>{readme}</ReactMarkdown>
            </Box>
          </Box>
        </Drawer>

        {/* ── Controls ── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
            <InputLabel>Embedding source</InputLabel>
            <Select
              value={embedSource}
              label="Embedding source"
              onChange={(e) => setEmbedSource(e.target.value as EmbedSource)}
            >
              {(Object.keys(EMBED_SOURCE_LABELS) as EmbedSource[]).map((k) => (
                <MenuItem key={k} value={k}>{EMBED_SOURCE_LABELS[k]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {embedSource === 'huggingface' && (
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
          )}

          {embedSource === 'ollama' && (
            <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel>Ollama model</InputLabel>
              <Select
                value={ollamaModel}
                label="Ollama model"
                onChange={(e) => setOllamaModel(e.target.value)}
              >
                {OLLAMA_MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

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

        {/* ── Ollama config ── */}
        {embedSource === 'ollama' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Requires <strong>Ollama</strong> running locally with CORS enabled.{' '}
            Start it with: <code>OLLAMA_ORIGINS=* ollama serve</code>, then pull a model:{' '}
            <code>ollama pull {ollamaModel}</code>
          </Alert>
        )}
        {embedSource === 'ollama' && (
          <TextField
            fullWidth
            size="small"
            label="Ollama host"
            value={ollamaHost}
            onChange={(e) => setOllamaHost(e.target.value)}
            sx={{ mb: 3 }}
            helperText="POST /api/embeddings → { embedding: number[] }"
          />
        )}

        {/* ── Custom endpoint config ── */}
        {embedSource === 'custom' && (
          <TextField
            fullWidth
            size="small"
            label="Embedding endpoint"
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
            placeholder="https://your-embed-api.example.com/embed"
            sx={{ mb: 3 }}
            helperText='POST { "text": "..." } → { "embedding": [...] } or { "vector": [...] }'
          />
        )}

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
            key={`${demoKey}-tech`}
            options={TECH_OPTIONS}
            label="Search tech topics"
            topK={6}
            model={model}
            embedFn={embedFn}
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
            key={`${demoKey}-food`}
            options={FOOD_OPTIONS}
            label="Search recipes"
            topK={5}
            model={model}
            embedFn={embedFn}
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
