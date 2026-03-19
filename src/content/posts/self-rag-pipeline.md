---
title: Self-RAG Pipeline with LangGraph
date: 2026-02-11
description: Build a self-evaluating RAG pipeline with LangGraph — the LLM grades its own retrieved documents, checks for hallucinations, and validates its answers before returning them.
tags: ["rag-system", "langgraph", "self-rag", "groq", "chroma"]
type: rag-system
---

---

## What if the AI graded its own answers before giving them to you?

![detective gif](https://media.giphy.com/media/3oriO8vwmRIZO6kcNO/giphy.gif)

Normal RAG retrieves docs and answers. That's it. It doesn't check if the docs were even relevant. It doesn't check if the answer is hallucinated. It just fires and forgets.

**Self-RAG** adds a self-evaluation loop. The LLM grades its own retrieved documents, checks its own answer for hallucinations, and validates whether it actually answered the question. Built as a stateful graph with LangGraph.

---

## 1. The LangGraph StateGraph

![graph network gif](https://media.giphy.com/media/3oz8xWilW3071V3BKM/giphy.gif)

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

![pipeline gif](https://media.giphy.com/media/C0yPwLH7vggdwT79Kr/giphy.gif)

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

## 3. Grading Retrieved Docs — The "Self" in Self-RAG

![robot judge gif](https://media.giphy.com/media/X8M8IALeMOugBTf5aL/giphy.gif)

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

![think smart gif](https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif)

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

![fact check gif](https://media.giphy.com/media/lVrwaz7p7aSoCiPLHl/giphy.gif)

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

![hallucination gif](https://media.giphy.com/media/xT9IgAlOUngqoa77ZS/giphy.gif)

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

![approved gif](https://media.giphy.com/media/eoFJSruUWf7qq1zNHD/giphy.gif)

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
