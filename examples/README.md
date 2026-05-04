# Examples

Copy-pasteable examples for common setups. Each file is a self-contained React component — add your imports and drop it into your project.

| File | What it shows |
|---|---|
| [01-basic-client-mode.tsx](./01-basic-client-mode.tsx) | Default setup — in-browser model, linear scan, no server needed |
| [02-model-selection.tsx](./02-model-selection.tsx) | Switching between the five built-in HuggingFace models (fast, multilingual, high-accuracy) |
| [03-threshold-filtering.tsx](./03-threshold-filtering.tsx) | Using `threshold` to remove semantically unrelated results |
| [04-openai-embeddings.tsx](./04-openai-embeddings.tsx) | OpenAI `text-embedding-3-small` via `embedFn`, search stays in the browser |
| [05-ollama-local-embeddings.tsx](./05-ollama-local-embeddings.tsx) | Ollama local embeddings — no API key, no data leaves the machine |
| [06-server-search-mode.tsx](./06-server-search-mode.tsx) | Server ANN mode — query vector POSTed to your endpoint; also full server pipeline |
| [07-hnsw-runtime-build.tsx](./07-hnsw-runtime-build.tsx) | HNSW Web Worker with index built at runtime; `useMemo` tip for dynamic option lists |
| [08-hnsw-prebuilt-index.tsx](./08-hnsw-prebuilt-index.tsx) | HNSW loading a pre-built binary (production path for 100 k+ items); includes build script |
| [09-form-integration.tsx](./09-form-integration.tsx) | Controlled field inside a plain form and inside React Hook Form |
| [10-multiple-instances.tsx](./10-multiple-instances.tsx) | Multiple autocomplete fields on one page sharing one model download |

## Which example should I start with?

```
Small list, no server?              → 01 (client mode, default)
Need multilingual support?          → 02 (multilingual model)
Too many irrelevant results?        → 03 (threshold)
Already using OpenAI?               → 04
Corporate network, no HuggingFace?  → 05 (Ollama)
Dataset > 5 k, have a server?       → 06 (server mode)
Dataset 5 k–50 k, no server?        → 07 (HNSW runtime)
Dataset 100 k+, production?         → 08 (HNSW pre-built)
Inside a form?                      → 09
Multiple fields on one page?        → 10
```
