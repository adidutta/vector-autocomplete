# Release Notes

## v0.1.0 — Initial Release

**April 18, 2026**

### Overview

First release of `vector-autocomplete` — a React component that replaces substring filtering in MUI Autocomplete with in-browser vector similarity search. No server, no API key, no data leaves the device.

---

### Features

#### Vector search
Queries are encoded into 384-dimensional vectors and ranked by cosine similarity against all candidate options. Typing "AI" surfaces "Machine learning model training" and "Neural network architecture design" — matches that `string.includes()` would miss entirely.

#### Five model choices
Switch between embedding models at runtime to trade off size, speed, and accuracy:

| Model | Size | Notes |
|---|---|---|
| `all-MiniLM-L6-v2` | 23 MB | Fastest |
| `all-mpnet-base-v2` | 85 MB | Default — best accuracy/size balance |
| `paraphrase-multilingual-MiniLM-L12-v2` | 118 MB | Multilingual support |
| `bge-small-en-v1.5` | 50 MB | BGE small, English |
| `bge-large-en-v1.5` | 250 MB | BGE large, highest accuracy |

Models are fetched once from the HuggingFace Hub (quantized ONNX, int8), then cached in the browser for offline use.

#### Option embedding cache
Each option is embedded once per options array and cached in memory. Re-renders and repeated queries do not re-embed.

#### Debounced input
Queries are debounced at 300 ms to avoid firing embeddings on every keystroke.

#### Loading states
A spinner appears while the model initialises or a query is in-flight. A status caption surfaces model load and error states.

#### "Best match" chip
The top-ranked result is visually distinguished with a **Best match** chip.

#### Configurable props

| Prop | Default | Description |
|---|---|---|
| `options` | `[]` | Candidate strings to search over |
| `label` | `"Search"` | TextField label |
| `topK` | `8` | Maximum results shown |
| `threshold` | `0` | Minimum cosine similarity to include a result |
| `model` | `all-mpnet-base-v2` | Embedding model to use |
| `onChange` | — | Callback fired when a value is selected |

---

### Tech stack

| Layer | Library / Version |
|---|---|
| UI | MUI v6 (`@mui/material`) |
| Inference | Transformers.js v3 (`@huggingface/transformers`) |
| Runtime | WebAssembly (ONNX Runtime Web) |
| Language | TypeScript |
| Build | Vite 6 |

---

### Known limitations

- First query requires downloading the selected model (~23–250 MB depending on choice). Subsequent sessions load from the browser cache.
- Inference runs on the CPU via WebAssembly. Very large option sets (thousands of items) will be slower.
- No server-side rendering support — the ONNX runtime is browser-only.
