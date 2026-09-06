---
title: AI Anime Chatbot with RAG
date: 2025-12-22
description: Build an anime chatbot that scrapes any URL, embeds it with FAISS, augments with DuckDuckGo search, and answers via Groq's Llama 3.3. Full RAG pipeline with source citations.
tags: ["rag-system", "rag", "langchain", "faiss", "groq", "streamlit"]
type: rag-system
---

---

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 150" role="img" aria-label="Nearest-neighbour search in embedding space">
  <g class="fx-pts">
    <circle cx="70" cy="40" r="4"/><circle cx="120" cy="98" r="4"/><circle cx="185" cy="55" r="4"/>
    <circle cx="235" cy="122" r="4"/><circle cx="305" cy="30" r="4"/><circle cx="365" cy="92" r="4"/>
    <circle cx="415" cy="46" r="4"/><circle cx="475" cy="112" r="4"/><circle cx="505" cy="62" r="4"/>
    <circle cx="150" cy="132" r="4"/><circle cx="335" cy="136" r="4"/><circle cx="445" cy="30" r="4"/>
  </g>
  <circle class="fx-radius" cx="282" cy="78"/>
  <g class="fx-near"><circle cx="247" cy="70" r="4.5"/><circle cx="305" cy="30" r="4.5"/><circle cx="332" cy="96" r="4.5"/></g>
  <circle class="fx-query" cx="282" cy="78" r="6"/>
</svg>
<figcaption>scraped chunks, embedded, searched by the question</figcaption>
</figure>

## What if you could interrogate any anime page — and get real answers?

Not summaries. Not Wikipedia. A chatbot that **reads the actual page**, understands the content, cross-checks the web, and answers your questions — in bullet points, with sources.

That's AnimeSensei. And in this post, we're going to build it from scratch using RAG, FAISS, Groq, and DuckDuckGo.

---

## 1. What Even Is RAG?

LLMs have a problem. They know a lot — but they can't know *everything*, especially recent or niche content. And they hallucinate.

**RAG (Retrieval Augmented Generation)** fixes this by giving the LLM a context window full of *real, retrieved information* before it answers.

```
User Question
     ↓
[ Retrieve relevant docs from vector store ]
     ↓
[ Inject docs as context into LLM prompt ]
     ↓
[ LLM answers using context, not memory ]
```

Instead of the model guessing, it reads. That's the whole trick.

---

## 2. Step 1 — Scrape the Anime Page

We use LangChain's `WebBaseLoader` to pull down the raw content from any anime URL (e.g., a MyAnimeList page):

```python
from langchain_community.document_loaders import WebBaseLoader

loader = WebBaseLoader(url)
docs = loader.load()
```

One URL in, a list of `Document` objects out — each one carrying the page's text content. No scraping library needed. No CSS selectors. Just give it a URL.

---

## 3. Step 2 — Chunk It Up

A full web page is too big to stuff into a single context window. We split it into overlapping chunks:

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
split_docs = text_splitter.split_documents(docs)
```

- **chunk_size=1000** — each chunk is at most 1000 characters
- **chunk_overlap=200** — chunks overlap by 200 chars so context doesn't get cut at awkward boundaries

The recursive splitter tries to split on `\n\n`, then `\n`, then spaces — preserving natural paragraph structure wherever possible.

---

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="Pipeline: scrape to chunk to embed to search to answer">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">scrape</text></g>
    <g><circle cx="160" cy="54" r="8"/><text x="160" y="84">chunk</text></g>
    <g><circle cx="280" cy="54" r="8"/><text x="280" y="84">embed</text></g>
    <g><circle cx="400" cy="54" r="8"/><text x="400" y="84">search</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">answer</text></g>
  </g>
</svg>
<figcaption>scrape any URL, then answer from it</figcaption>
</figure>

## 4. Step 3 — Embed + Store in FAISS

Every chunk gets converted to a dense vector using a sentence transformer model, then stored in a FAISS index:

```python
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vector_store = FAISS.from_documents(split_docs, embeddings)
retriever = vector_store.as_retriever(search_kwargs={'k': 5})
```

- **all-MiniLM-L6-v2** — lightweight, fast, 384-dimensional embeddings
- **FAISS** — Facebook's vector similarity library, runs entirely in memory, sub-millisecond search
- **k=5** — retrieve the 5 most semantically similar chunks to any query

This is the core of RAG. Semantically similar chunks float to the top, even if the exact words don't match.

---

## 5. Step 4 — Augment with DuckDuckGo

The scraped page is great — but what about things not on that page? Episode recaps, community discussions, recent news?

We augment with a live DuckDuckGo search:

```python
from duckduckgo_search import DDGS

def search_duckduckgo(query):
    with DDGS() as ddgs:
        results = [r["body"] for r in ddgs.text(query, max_results=1)]
        return "\n".join(results)
```

No API key. No rate limits. Just a search query in, a text snippet out. The result gets concatenated with the FAISS-retrieved chunks to form the full context.

---

## 6. Step 5 — Ask Llama 3.3 via Groq

Both sources — RAG context and web search — get merged and sent to Llama 3.3 70B running on Groq's inference API:

```python
from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=1, api_key=os.getenv("GROQ_API_KEY"))

final_context = f"RAG Data:\n{rag_context}\n\nWeb Search:\n{duckduckgo_results}"

prompt = ChatPromptTemplate.from_template("""
    Answer the following question based on the provided context.
    Answer in Bullet points only not in paragraph.
    Always tell source of your answer between [Search , RAG].

    Context: {context}
    Question: {input}
    Answer:
""")
```

The prompt enforces bullet point answers, source citations, and an honest fallback when context is missing.

---

## 7. The Streamlit UI

Everything wraps into a clean Streamlit app with session state:

```python
mal_url = st.text_input("Enter Anime URL:")
st.session_state.retriever = setup_rag_chain(mal_url)

question = st.text_input("Ask a question about this anime:")
retrieved_docs = st.session_state.retriever.invoke(question)
```

Session state caches the vector store per URL — no rebuilds on every keystroke.

---

## The Full Pipeline

| Component | Role |
|-----------|------|
| WebBaseLoader | Scrape any URL into text |
| RecursiveCharacterTextSplitter | Chunk text with overlap |
| HuggingFace MiniLM | Embed chunks into vectors |
| FAISS | Index + retrieve similar chunks |
| DuckDuckGo | Live web search augmentation |
| Groq + Llama 3.3 70B | Generate grounded, cited answers |
| Streamlit | UI + session state management |

RAG is what separates a useful AI assistant from a confident hallucinator. Ground the model in real content, force it to cite its sources, and you get something you can actually trust.

---

*Built with LangChain · FAISS · HuggingFace · Groq · DuckDuckGo · Streamlit*
