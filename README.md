# Vector Autocomplete

A React component that replaces the conventional substring filter inside [MUI Autocomplete](https://mui.com/material-ui/react-autocomplete/) with **vector similarity search** powered by a real language model running entirely in the browser — no server, no API key, no data leaving the device.

Typing _"AI"_ surfaces _"Machine learning model training"_ and _"Neural network architecture design"_. Typing _"deploy containers"_ surfaces _"Kubernetes container orchestration"_ and _"Docker image build pipeline"_. Things that would never match with a `string.includes()` filter.

**Live demo:** https://vector-autocomplete.vercel.app/

---

## How it works

When the user types, the query is encoded into a 384-dimensional vector by [`all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) — a small, fast sentence-embedding model. All candidate options are embedded the same way (and cached). Options are then ranked by [cosine similarity](https://en.wikipedia.org/wiki/Cosine_similarity) to the query and the top-K are shown.

### What is a feature extraction vector?

Feature extraction (also called sentence embedding) is the process of turning a piece of text into a fixed-length array of numbers — a **vector**. The model is trained so that semantically similar texts produce vectors that point in roughly the same direction in that high-dimensional space. The angle between two vectors (cosine similarity) becomes a proxy for meaning similarity: a score near `1` means very related, near `0` means unrelated.

This is why typing _"AI"_ surfaces _"Machine learning"_ — their vectors are close even though the strings share no characters. A plain `string.includes()` filter has no concept of meaning; it can only match substrings.

### Why `all-MiniLM-L6-v2`?

It hits the right trade-offs for in-browser use:

| | `all-MiniLM-L6-v2` | larger models |
|---|---|---|
| Size | 23 MB (quantized ONNX) | 85 MB – several GB |
| Vector dimensions | 384 | 768 – 4096 |
| Latency (WASM) | ~10–30 ms per query | 100 ms – seconds |
| Accuracy | Good for most use cases | Marginally better |

The model was distilled from larger transformers specifically to be fast and small while retaining strong vector understanding. For an autocomplete dropdown that needs to respond within a keystroke debounce window, it's the practical default.

```
user types "spicy noodles"
       │
       ▼
  embed("spicy noodles")  →  vector A          (via all-MiniLM-L6-v2, ONNX/WASM)
       │
       ▼
  embed(each option)      →  vector B₁…Bₙ     (cached after first query)
       │
       ▼
  cosine_similarity(A, Bᵢ) for each option
       │
       ▼
  sort descending, take topK                   (shown in MUI dropdown)
```

The model (~23 MB, quantized ONNX) is downloaded once from the HuggingFace CDN and cached in the browser. All subsequent uses are instant and offline.

---

## Tech stack

| Layer | Library |
|---|---|
| UI | [MUI](https://mui.com/) (`@mui/material`) |
| Inference | [`@huggingface/transformers`](https://github.com/huggingface/transformers.js) (Transformers.js v3) |
| Model | [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2) — 23 MB quantized ONNX (HuggingFace Hub) |
| ANN index | [`hnswlib-wasm`](https://github.com/yoshoku/hnswlib-wasm) — HNSW in WebAssembly |
| Runtime | WebAssembly (ONNX Runtime Web + Emscripten) — no GPU required |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Bundler | [Vite](https://vitejs.dev/) |

---

## Getting started

**Requirements:** Node.js 18+

```bash
git clone <repo-url>
cd vector-autocomplete
npm install
npm run dev
```

Open `http://localhost:5173`. The model downloads on first use and is cached by the browser for all future visits.

---

## Usage

```tsx
import VectorAutocomplete from './src/components/VectorAutocomplete'

const FOODS = [
  'Spaghetti carbonara',
  'Chicken tikka masala',
  'Avocado toast with poached eggs',
  // ...
]

function App() {
  return (
    <VectorAutocomplete
      options={FOODS}
      label="Search recipes"
      topK={5}
      onChange={(value) => console.log('Selected:', value)}
    />
  )
}
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `string[]` | `[]` | Full list of options to rank (used by `client` and `hnsw` build-mode) |
| `label` | `string` | `'Search'` | Text field label |
| `topK` | `number` | `8` | Maximum number of results to show |
| `threshold` | `number` | `0` | Minimum cosine similarity score to include (range `0`–`1`). Applies only to `client` mode |
| `model` | `ModelId` | `'Xenova/all-mpnet-base-v2'` | Embedding model (see [Choosing a model](#choosing-a-different-model)) |
| `searchMode` | `SearchMode` | `{ type: 'client' }` | Search backend — see [Search modes](#search-modes) |
| `onChange` | `(value: string \| null) => void` | — | Called when the user selects an option |

---

## Search modes

The `searchMode` prop controls how results are ranked. Switch modes based on dataset size and infrastructure constraints.

### Comparison

| Mode | Dataset size | Privacy | Infrastructure | Latency |
|---|---|---|---|---|
| `client` | Up to ~5 k | Full — nothing leaves the browser | None | ~10–50 ms |
| `server` | Millions | Query vector sent to your server | Vector DB required | ~50–150 ms (network) |
| `hnsw` | Up to ~100 k | Full — runs in a Web Worker | None | ~5–20 ms after index loads |

---

### `client` (default)

All search happens in the browser. Options are embedded once and cached. Every query does a linear cosine scan over all options on the main thread.

```tsx
<VectorAutocomplete
  options={MY_OPTIONS}
  searchMode={{ type: 'client' }}
/>
```

**Best for:** small to medium lists (up to ~5 k items).

---

### `server` — hybrid server-side ANN

The query is embedded in the browser, then the resulting vector is sent to your server via a single POST request. The server performs approximate nearest-neighbour (ANN) lookup over pre-computed embeddings and returns the top-K labels.

```tsx
<VectorAutocomplete
  options={[]}   // options not used in server mode
  searchMode={{
    type: 'server',
    endpoint: 'https://your-api.example.com/search',
    headers: { Authorization: 'Bearer <token>' },  // optional
  }}
/>
```

#### Server contract

```
POST /search
Content-Type: application/json

{ "vector": [0.12, -0.34, ...],  "k": 8 }

→ 200 OK
{ "results": ["Option A", "Option B", ...] }
```

#### Example server (Python / FastAPI + Qdrant)

```python
from fastapi import FastAPI
from qdrant_client import QdrantClient

app = FastAPI()
client = QdrantClient(url="http://localhost:6333")

@app.post("/search")
async def search(body: dict):
    hits = client.search(
        collection_name="options",
        query_vector=body["vector"],
        limit=body["k"],
    )
    return {"results": [hit.payload["label"] for hit in hits]}
```

#### Example server (Python / FastAPI + Oracle AI Vector Search)

If you are already on **Oracle Database 23ai**, you can skip a separate vector DB entirely — Oracle has native vector support built in via [Oracle AI Vector Search](https://www.oracle.com/database/ai-vector-search/).

```python
from fastapi import FastAPI
import oracledb, os

app = FastAPI()
pool = oracledb.create_pool(
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    dsn=os.environ["DB_DSN"],
)

@app.post("/search")
async def search(body: dict):
    vector_literal = "[" + ",".join(str(x) for x in body["vector"]) + "]"
    sql = """
        SELECT label
        FROM options_embeddings
        ORDER BY VECTOR_DISTANCE(embedding, TO_VECTOR(:vec), COSINE)
        FETCH APPROX FIRST :k ROWS ONLY
    """
    with pool.acquire() as conn:
        rows = conn.execute(sql, vec=vector_literal, k=body["k"]).fetchall()
    return {"results": [r[0] for r in rows]}
```

Pre-load the table once:

```python
# CREATE TABLE options_embeddings (label VARCHAR2(500), embedding VECTOR(384, FLOAT32));
# CREATE VECTOR INDEX idx_hnsw ON options_embeddings (embedding)
#   ORGANIZATION INMEMORY NEIGHBOR GRAPH
#   DISTANCE COSINE WITH TARGET ACCURACY 95;

with pool.acquire() as conn:
    rows = [(label, "[" + ",".join(str(x) for x in vec) + "]")
            for label, vec in zip(labels, embeddings)]
    conn.executemany(
        "INSERT INTO options_embeddings VALUES (:1, TO_VECTOR(:2))", rows
    )
    conn.commit()
```

Oracle 23ai supports both **HNSW** and **IVF** ANN indexes and lets you combine vector search with regular SQL predicates in a single query — useful if your options also have structured metadata (category, tenant, permissions, etc.).

Pre-compute embeddings once using any sentence-transformer library (Python `sentence-transformers`, Node `@huggingface/transformers`, etc.) and upsert them into your vector database.

**Best for:** very large datasets (millions of items), or when embeddings must stay server-side.

---

### `hnsw` — HNSW Web Worker

An [HNSW](https://arxiv.org/abs/1603.09320) (Hierarchical Navigable Small World) index runs inside a dedicated Web Worker powered by [`hnswlib-wasm`](https://github.com/yoshoku/hnswlib-wasm). The main thread is never blocked. Queries return in ~5–20 ms once the index is ready.

Two sub-modes:

#### Build at runtime (demos / moderate datasets)

Leave `indexUrl` unset. The component embeds the `options` prop in the browser and builds the HNSW index in the worker automatically. Index build time is proportional to the number of options (~1–2 s for 1 k items, ~30–60 s for 10 k items).

```tsx
<VectorAutocomplete
  options={MY_OPTIONS}          // embedded and indexed automatically
  searchMode={{ type: 'hnsw' }}
/>
```

#### Load pre-built binary (large datasets / production)

For 100 k+ items, pre-build the index offline and serve it as a static binary file. Provide both `indexUrl` and `labels` (the ordered list of display strings corresponding to HNSW integer labels).

```tsx
<VectorAutocomplete
  options={[]}                  // not used when indexUrl is set
  searchMode={{
    type: 'hnsw',
    indexUrl: '/assets/my-index.hnsw',
    labels: ALL_LABELS,         // string[] in the same order as the index
    dim: 384,                   // must match the embedding model
    maxElements: 100_000,
  }}
/>
```

#### Building the index offline (Node.js script)

```typescript
import { loadHnswlib } from 'hnswlib-wasm'
import { pipeline } from '@huggingface/transformers'
import { writeFileSync } from 'fs'

const items = [/* your 100k strings */]
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

const hnswlib = await loadHnswlib()
const index = new hnswlib.HierarchicalNSW('cosine', 384, '/index.bin')
index.initIndex(items.length, 16, 200, 100)

for (let i = 0; i < items.length; i++) {
  const out = await embed(items[i], { pooling: 'mean', normalize: true })
  index.addPoint(Array.from(out.data), i, false)
}

await index.writeIndex('/index.bin')
const bytes = hnswlib.FS.readFile('/index.bin')
writeFileSync('public/assets/my-index.hnsw', bytes)
writeFileSync('public/assets/my-index-labels.json', JSON.stringify(items))
```

Serve the `.hnsw` binary from your CDN or static host and load it via `indexUrl`.

**Best for:** client-side-only architectures with datasets up to ~100 k items.

---

## Project structure

```
vector-autocomplete/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx                        # React entry point
    ├── App.tsx                         # Demo: tech topics + food/recipes + mode selector
    ├── searchModes.ts                  # SearchMode type definitions
    ├── useEmbedder.ts                  # HuggingFace pipeline hook + cosine similarity
    ├── useServerSearch.ts              # Server-mode search hook
    ├── useHnswSearch.ts                # HNSW Web Worker search hook
    ├── workers/
    │   └── hnsw.worker.ts             # Web Worker: build or load HNSW index, serve queries
    └── components/
        └── VectorAutocomplete.tsx   # The component (all three modes)
```

---

## Choosing a different model

Only **feature-extraction** (sentence embedding) models work here — text-generation models like Llama or Gemma produce text, not vectors, so they are not compatible. The model must also have ONNX weights published on HuggingFace Hub (the `Xenova` and `onnx-community` namespaces are the primary sources for pre-converted ONNX models).

Available models:

| Model | Size | Dimensions | Notes |
|---|---|---|---|
| `Xenova/all-MiniLM-L6-v2` | 23 MB | 384 | Fastest |
| `Xenova/all-mpnet-base-v2` | 85 MB | 768 | **Default** — best accuracy/size balance |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 118 MB | 384 | Multilingual |
| `Xenova/bge-small-en-v1.5` | 50 MB | 384 | BGE small, English |
| `Xenova/bge-large-en-v1.5` | 250 MB | 384 | BGE large, highest accuracy |

Pass the model ID via the `model` prop or use the model selector in the demo.

> **Important:** when using `hnsw` mode with a pre-built index, the `dim` field must match the embedding model's output dimension. If you switch models you must rebuild the index.

---

## Notes on performance

- **`client` mode** runs on the main thread. For lists above ~1 k items, consider switching to `hnsw` mode to keep the UI responsive.
- **HNSW index build time** scales with the number of options and embedding speed. For the runtime-build sub-mode, the component shows "Building HNSW index…" while the index is being constructed.
- Options are re-embedded and the HNSW index is rebuilt if the `options` array reference changes. Stabilise the reference with `useMemo` or a module-level constant.
- The `threshold` prop filters weak matches in `client` mode. A value of `0.15`–`0.25` removes unrelated noise while keeping semantically close results.
- For `server` mode, ensure your endpoint sets `Access-Control-Allow-Origin` appropriately if it lives on a different origin.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
