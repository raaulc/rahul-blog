---
title: Self-RAG Pipeline with LangGraph
date: 2026-02-11
description: Build a self-evaluating RAG pipeline with LangGraph — the LLM grades its own retrieved documents, checks for hallucinations, and validates its answers before returning them.
tags: ["rag-system", "langgraph", "self-rag", "groq", "chroma"]
type: rag-system
---

---

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="Pipeline: retrieve to grade to generate to check to validate">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">retrieve</text></g>
    <g><circle cx="160" cy="54" r="8"/><text x="160" y="84">grade</text></g>
    <g><circle cx="280" cy="54" r="8"/><text x="280" y="84">generate</text></g>
    <g><circle cx="400" cy="54" r="8"/><text x="400" y="84">check</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">validate</text></g>
  </g>
</svg>
<figcaption>a RAG loop that inspects its own work</figcaption>
</figure>

## What if the AI graded its own answers before giving them to you?

Normal RAG retrieves docs and answers. That's it. It doesn't check if the docs were even relevant. It doesn't check if the answer is hallucinated. It just fires and forgets.

**Self-RAG** adds a self-evaluation loop. The LLM grades its own retrieved documents, checks its own answer for hallucinations, and validates whether it actually answered the question. Built as a stateful graph with LangGraph.

---

## 1. The LangGraph StateGraph

The entire pipeline is a `StateGraph` — a directed graph where each node is a function that reads and writes shared state:

```python
from langgraph.graph import END, StateGraph, START

class WorkflowState(TypedDict):
    user_question: str
    answer_draft: str
    retrieved_docs: List[str]
    llm_model: ChatGroq
    retriever: Chroma
    has_hallucination: bool
    is_valid_answer: bool
```

Every node takes `WorkflowState` in and returns `WorkflowState` out. The state flows through the graph, accumulating results at each step. No globals. No side effects.

---

## 2. The Knowledge Base — Chroma + Embeddings

Two URLs scraped, chunked, embedded, and stored in a Chroma vector database:

```python
splitter = RecursiveCharacterTextSplitter(chunk_size=250, chunk_overlap=0)
split_docs = splitter.split_documents(flat_docs)

vector_db = Chroma.from_documents(
    documents=split_docs,
    collection_name="custom_rag_store",
    embedding=HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2"),
)
state["retriever"] = vector_db.as_retriever()
```

`all-mpnet-base-v2` — higher quality embeddings than MiniLM, 768-dimensional. Chunk size 250 with no overlap keeps chunks tight and focused.

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
<figcaption>grade each retrieved chunk before trusting it</figcaption>
</figure>

## 3. Grading Retrieved Docs — The "Self" in Self-RAG

After retrieval, every document is graded for relevance by the LLM itself using structured output:

```python
class DocRelevanceScore(BaseModel):
    binary_score: str = Field(description="'yes' if document is relevant, otherwise 'no'")

grader = state["llm_model"].with_structured_output(DocRelevanceScore)

for doc in state["retrieved_docs"]:
    score = evaluation_chain.invoke({"document": doc.page_content, "question": state["user_question"]})
    if score.binary_score.lower() == "yes":
        filtered.append(doc)
```

`with_structured_output` forces the LLM to return a Pydantic model — no string parsing, no regex. Binary `yes/no` only.

---

## 4. Conditional Routing — Answer or Stop

After filtering, if no relevant docs remain — the graph routes to `END` instead of generating:

```python
def should_generate_answer(state: WorkflowState) -> str:
    return "answer" if state["retrieved_docs"] else "stop"

workflow.add_conditional_edges(
    "filter_docs_by_relevance",
    should_generate_answer,
    {"answer": "produce_answer", "stop": END}
)
```

Clean, explicit branching. No if/else spaghetti — just a routing function that returns a string key.

---

## 5. Generate the Answer

A standard RAG prompt pulled from LangChain Hub:

```python
prompt_template = hub.pull("rlm/rag-prompt")
rag_chain = prompt_template | state["llm_model"] | StrOutputParser()
state["answer_draft"] = rag_chain.invoke({
    "context": state["retrieved_docs"],
    "question": state["user_question"]
})
```

The answer goes into `answer_draft` — not final yet. It still has to pass two checks.

---

## 6. Hallucination Detection

The LLM checks its own answer against the retrieved facts:

```python
class HallucinationScore(BaseModel):
    binary_score: str = Field(description="'yes' if grounded in facts, otherwise 'no'")

result = chain.invoke({
    "documents": state["retrieved_docs"],
    "generation": state["answer_draft"]
})
state["has_hallucination"] = (result.binary_score.lower() != "yes")
```

`has_hallucination` is `True` when the answer is NOT grounded. Flagged in the final output.

---

## 7. Answer Validation

One final check — does the answer actually address the question?

```python
class AnswerValidityScore(BaseModel):
    binary_score: str = Field(description="'yes' if answer addresses the question, otherwise 'no'")

state["is_valid_answer"] = (result.binary_score.lower() == "yes")
```

An answer can be factually grounded but still not answer the question. This catches that case.

---

## The Full Graph

```
START → init_groq_model → prepare_vector_database
      → fetch_relevant_docs → filter_docs_by_relevance
      → [no docs → END] or [docs → produce_answer]
      → detect_hallucination → validate_answer → END
```

| Node | What it does |
|------|-------------|
| init_groq_model | Load Llama 3.3 70B via Groq |
| prepare_vector_database | Scrape → chunk → embed → Chroma |
| fetch_relevant_docs | Vector similarity search |
| filter_docs_by_relevance | LLM grades each doc |
| should_generate_answer | Route: answer or stop |
| produce_answer | RAG prompt → answer draft |
| detect_hallucination | Is answer grounded in facts? |
| validate_answer | Does answer address the question? |

Self-RAG turns a one-shot pipeline into a self-auditing system. Every stage is a deliberate gate.

---

*Built with LangGraph · LangChain · Groq · Chroma · HuggingFace · Python*
