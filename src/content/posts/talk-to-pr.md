---
title: "Talk to PR: Because Reading a 40-File PR Shouldn't Ruin Your Day"
date: 2026-04-02
description: Build a RAG-powered chat interface that lets you have a conversation with any GitHub Pull Request. Paste a PR URL, ask questions, get answers with actual file and line references — powered by LangChain, FAISS, and SSE streaming.
tags: ["rag", "langchain", "openai", "faiss", "fastapi", "react", "github-api", "sse"]
type: talk-to-pr
---

---

## What if you could just *ask* a PR what it does?

![Developer drowning in PR reviews](https://media.giphy.com/media/l2JehQ2GitHGdVG9Y/giphy.gif)

You know that feeling. You're tagged on a PR. You open it. **47 files changed.** Your heart sinks. You start scrolling. By file 12, you've forgotten what file 3 was about. By file 30, you're just clicking "Approve" and hoping for the best.

What if you could just ask:

> "Hey, does this PR touch the payment flow?"
> "What tests were added?"
> "Why was this function removed?"

That's what we're building. **Talk to PR** — a RAG-powered chat interface that lets you have a conversation with any GitHub Pull Request. Paste the URL, ask questions, get answers with actual file references.

---

## Wait, Can't ChatGPT Do This?

Sure, paste a diff into ChatGPT. Now do it for a PR with 40 files. You just hit the token limit. And even if it fits, the model has no idea what repo it's looking at. It doesn't know your codebase. It doesn't know the context.

![Copy pasting code into ChatGPT](https://media.giphy.com/media/3o7btNa0RUYa5E7yl2/giphy.gif)

What we need is:
1. **Fetch the PR diff automatically** from GitHub
2. **Chunk it smartly** — by file and by hunk, not just wall-of-text
3. **Embed and index it** so we can retrieve only the relevant parts
4. **Add repo context** — README, repo description — so the LLM actually understands the project
5. **Stream answers** with file references, not just vague summaries

That's a RAG pipeline. And we're building it end to end.

---

## The Architecture: What Talks to What

Before we write any code, let's see the full picture:

```
GitHub PR URL
     │
     ▼
FastAPI Backend
     │
     ├── Fetch PR details + diff (GitHub API)
     ├── Fetch repo README + metadata (GitHub API)
     ├── Chunk diff by file/hunk
     ├── Embed chunks (OpenAI text-embedding-3-small)
     ├── Store in FAISS vector store (keyed by PR)
     │
     ▼
Developer asks a question
     │
     ├── Retrieve relevant chunks from FAISS
     ├── Build prompt with repo context + retrieved chunks
     ├── Stream response via SSE (Server-Sent Events)
     │
     ▼
React Frontend (chat UI with streaming answers)
```

Two systems. Backend does the heavy lifting. Frontend is just a chat window. Let's build.

---

## Step 1: Fetching the PR — Talking to GitHub

First, we need to get the PR data. GitHub's API gives us everything — PR metadata, the diff, individual file patches.

```python
# pr_fetcher.py
import requests
from urllib.parse import urlparse

def parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    """Extract owner, repo, pr_number from a GitHub PR URL."""
    path = urlparse(pr_url).path.strip("/").split("/")
    owner, repo, _, pr_number = path[0], path[1], path[2], int(path[3])
    return owner, repo, pr_number

def fetch_pr_details(owner: str, repo: str, pr_number: int) -> dict:
    """Fetch PR metadata from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    resp = requests.get(url, headers={"Accept": "application/vnd.github.v3+json"})
    resp.raise_for_status()
    data = resp.json()
    return {
        "title": data["title"],
        "body": data.get("body") or "",
        "user": data["user"]["login"],
        "additions": data["additions"],
        "deletions": data["deletions"],
        "changed_files": data["changed_files"],
    }
```

Nothing fancy. Parse the URL, hit the API, get the goods.

But here's the important part — we also fetch **each file's patch separately**:

```python
def fetch_pr_files(owner: str, repo: str, pr_number: int) -> list[dict]:
    """Fetch list of changed files with patch data."""
    files = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files?per_page=100&page={page}"
        resp = requests.get(url, headers={"Accept": "application/vnd.github.v3+json"})
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        for f in data:
            files.append({
                "filename": f["filename"],
                "status": f["status"],
                "additions": f["additions"],
                "deletions": f["deletions"],
                "patch": f.get("patch", ""),
            })
        page += 1
    return files
```

Why individual files and not the raw diff? Because we want to **chunk by file**, not parse one giant string. Each file's patch becomes its own document.

---

## Step 2: Chunking the Diff — The Part Everyone Gets Wrong

![Cutting things precisely](https://media.giphy.com/media/3o6Zt6Jdnh4pbBqBHi/giphy.gif)

Here's where most RAG tutorials fail. They'd just split the entire diff into 500-token chunks. That's terrible for code. You'd get half a function in one chunk and the other half in another.

We chunk **by file first, then by hunk** if the file is large:

```python
# diff_chunker.py
from langchain.schema import Document

def chunk_pr_files(files, pr_details, repo_info=None, readme=None):
    documents = []

    # Repo context — so the LLM knows what project this is
    if repo_info:
        repo_context = f"Repository: {repo_info.get('description', '')}\n"
        repo_context += f"Language: {repo_info.get('language', '')}\n"
        repo_context += f"Topics: {', '.join(repo_info.get('topics', []))}"
        documents.append(Document(
            page_content=repo_context,
            metadata={"source": "repo_info", "filename": "Repository Info", "type": "repo_info"}
        ))

    if readme:
        documents.append(Document(
            page_content=f"Repository README:\n{readme[:3000]}",
            metadata={"source": "readme", "filename": "README", "type": "readme"}
        ))

    # PR description
    if pr_details.get("body"):
        documents.append(Document(
            page_content=f"PR Title: {pr_details['title']}\n\nPR Description:\n{pr_details['body']}",
            metadata={"source": "pr_description", "filename": "PR Description", "type": "description"}
        ))

    # Each file's diff
    for file_info in files:
        patch = file_info.get("patch", "")
        if not patch:
            continue

        filename = file_info["filename"]
        hunks = split_into_hunks(patch, filename)

        if len(hunks) <= 1:
            documents.append(Document(
                page_content=f"File: {filename} ({file_info['status']})\n\n{patch}",
                metadata={"filename": filename, "type": "file_diff"}
            ))
        else:
            for i, hunk in enumerate(hunks):
                documents.append(Document(
                    page_content=f"File: {filename} - Hunk {i+1}/{len(hunks)}\n\n{hunk}",
                    metadata={"filename": filename, "type": "hunk_diff"}
                ))

    return documents
```

Notice three things:

1. **Repo context goes in first.** The README and repo description become searchable documents. So when someone asks "what is this project?", the retriever finds it.

2. **PR description is its own chunk.** The author already explained what the PR does — that's gold for answering "what does this PR do?".

3. **File diffs are split by hunk, not by token count.** A hunk is a logical group of changes (the `@@` sections in a unified diff). This keeps related changes together.

```python
def split_into_hunks(patch, filename):
    lines = patch.split("\n")
    hunks = []
    current_hunk = []
    for line in lines:
        if line.startswith("@@") and current_hunk:
            hunks.append("\n".join(current_hunk))
            current_hunk = [line]
        else:
            current_hunk.append(line)
    if current_hunk:
        hunks.append("\n".join(current_hunk))
    return hunks
```

Small function. Big impact on retrieval quality.

---

## Step 3: The RAG Engine — Embed, Store, Retrieve, Generate

![Connecting the dots](https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif)

This is the core. Take our chunks, embed them, store them, and build a retrieval chain that the LLM can use.

```python
# rag_engine.py
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough

_pr_stores: dict[str, FAISS] = {}

SYSTEM_PROMPT = """You are "Talk to PR", an AI assistant that helps developers understand Pull Requests.

You have access to the repository context and the diff/changes from a specific PR. Use both to give informed answers.

When referencing code changes:
- Always mention the filename
- Mention if lines were added (+) or removed (-)
- Be specific about what changed and why it likely changed

Use the repo context to explain how changes fit into the broader project."""

def index_pr(pr_key, documents):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = FAISS.from_documents(documents, embeddings)
    _pr_stores[pr_key] = vectorstore
    return len(documents)

def build_chain(pr_key):
    retriever = _pr_stores[pr_key].as_retriever(search_kwargs={"k": 6})
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT + "\n\nPR Context:\n{context}"),
        ("human", "{question}"),
    ])

    def format_docs(docs):
        return "\n\n---\n\n".join(
            f"[{doc.metadata.get('filename', 'unknown')}]\n{doc.page_content}"
            for doc in docs
        )

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
    )
    return chain
```

Let's break down what happens when a question comes in:

1. **Retriever** searches FAISS for the 6 most relevant chunks (could be diff hunks, README sections, or PR description)
2. **format_docs** joins them with filenames — so the LLM knows where each piece came from
3. **Prompt** tells the LLM to reference files and explain changes in context
4. **LLM** generates a streamed response

Why `k=6`? It's a balance. Too few and you miss relevant context. Too many and you flood the context window with noise. Six chunks usually covers the relevant files + repo context for a focused question.

Why `text-embedding-3-small`? Cheap, fast, good enough for code search. You don't need `text-embedding-3-large` here — the chunks are relatively short and the vocabulary is code, not poetry.

---

## Step 4: The API — FastAPI with SSE Streaming

Two endpoints. Load a PR, ask it questions.

```python
# main.py
from fastapi import FastAPI, HTTPException
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="Talk to PR")

@app.post("/api/load-pr")
def load_pr(req: LoadPRRequest):
    owner, repo, pr_number = parse_pr_url(req.pr_url)
    pr_key = f"{owner}/{repo}/{pr_number}"

    details = fetch_pr_details(owner, repo, pr_number)
    files = fetch_pr_files(owner, repo, pr_number)
    repo_info = fetch_repo_info(owner, repo)
    readme = fetch_repo_readme(owner, repo)

    documents = chunk_pr_files(files, details, repo_info=repo_info, readme=readme)
    num_chunks = index_pr(pr_key, documents)

    return {"pr_key": pr_key, "details": details, "num_chunks": num_chunks}

@app.post("/api/ask")
async def ask(req: AskRequest):
    chain = build_chain(req.pr_key)

    async def event_generator():
        async for chunk in chain.astream(req.question):
            if chunk.content:
                yield {"event": "message", "data": json.dumps({"content": chunk.content})}
        yield {"event": "done", "data": json.dumps({"content": ""})}

    return EventSourceResponse(event_generator())
```

Why SSE and not WebSockets? Because we're doing **one-directional streaming** — server sends tokens to client. SSE is simpler, works with standard HTTP, and you don't need a persistent connection. WebSockets would be overkill here.

### The Webhook — Auto-Index Every PR

This is what makes it feel like a real product, not a toy:

```python
@app.post("/api/webhook/github")
async def github_webhook(request: Request):
    payload = await request.json()
    action = payload.get("action")

    if action not in ("opened", "synchronize", "reopened"):
        return {"status": "ignored"}

    pr = payload.get("pull_request", {})
    owner = pr["base"]["repo"]["owner"]["login"]
    repo = pr["base"]["repo"]["name"]
    pr_number = pr["number"]

    details = fetch_pr_details(owner, repo, pr_number)
    files = fetch_pr_files(owner, repo, pr_number)
    repo_info = fetch_repo_info(owner, repo)
    readme = fetch_repo_readme(owner, repo)
    documents = chunk_pr_files(files, details, repo_info=repo_info, readme=readme)
    index_pr(f"{owner}/{repo}/{pr_number}", documents)

    return {"status": "indexed"}
```

Every time a PR is opened or updated, GitHub sends a webhook, we index it. By the time you open the chat, the PR is already ready to talk. No loading spinner. No waiting. Just ask.

---

## Step 5: The Frontend — React Chat That Streams

![Chat interface in action](https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif)

The frontend has three pieces:

**PRLoader** — Input field for the GitHub PR URL. Calls `/api/load-pr`, displays the PR summary.

**PRInfo** — Shows the PR title, author, additions/deletions, and changed file tags. One glance and you know the PR's shape.

**Chat** — The main event. A chat interface with streaming responses via SSE.

The streaming part is where it gets fun:

```jsx
const handleSend = async () => {
  const question = input.trim();
  setMessages(prev => [...prev, { role: "user", content: question }]);
  setMessages(prev => [...prev, { role: "assistant", content: "" }]);

  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pr_key: prKey, question }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + data.content,
            };
            return updated;
          });
        }
      }
    }
  }
};
```

We add an empty assistant message first, then append each SSE chunk to it. The user sees tokens appear one by one — exactly like ChatGPT. No waiting for the full response.

The suggestion buttons are a nice touch:

```jsx
const suggestions = [
  "What does this PR do?",
  "Are there any breaking changes?",
  "What files were modified and why?",
  "Does this PR touch any tests?",
];
```

New PR reviewer? Click a button. Start understanding immediately.

---

## The Design Decision That Matters

You might wonder — why not just post questions as GitHub comments and have a bot reply?

We considered it. Here's why we didn't:

1. **Comment spam.** 10 questions = 20 comments on the PR. Your actual code review gets buried.
2. **Privacy.** Maybe I want to ask "I don't understand this function" without the PR author seeing it. Learning shouldn't be public by default.
3. **Speed.** GitHub comment → webhook → process → post comment = seconds of latency. Direct chat = streaming starts in milliseconds.

The solution: **one comment on the PR** with a link to the chat app. Your conversation is private. The PR stays clean.

---

## Trying It Out — A Real LangChain PR

Let's test with a real merged PR from LangChain: [#36433 — feat(core): impute placeholder filenames for OpenAI file inputs](https://github.com/langchain-ai/langchain/pull/36433).

Load it up. Ask "What does this PR do?"

> This PR introduces a feature that imputes placeholder filenames for OpenAI file inputs in the LangChain framework. Specifically, it addresses the requirement from OpenAI for a "filename" field in file inputs, which is not originally included in the standard format for file types. The changes ensure that when constructing content blocks for OpenAI models, a default filename (e.g., "LC_AUTOGENERATED") is added to the file inputs.

Now ask "What is this repo about?"

> This repository is focused on LangChain, a framework designed for building agents and applications powered by large language models (LLMs). It aims to simplify the development of AI applications by allowing developers to chain together various components and third-party integrations.

It knows the diff AND the repo. That's the power of indexing both layers.

---

## The Full Pipeline

| Step | What Happens | Tech |
|---|---|---|
| PR URL pasted | Parse owner/repo/PR number | Python urllib |
| Fetch PR data | Get metadata, diff, file patches | GitHub REST API |
| Fetch repo context | Get README + repo description | GitHub REST API |
| Chunk | Split by file, then by hunk. Add repo context as docs | LangChain Documents |
| Embed | Convert chunks to vectors | OpenAI text-embedding-3-small |
| Store | Index in vector store, keyed by PR | FAISS |
| Question asked | Retrieve top 6 relevant chunks | FAISS retriever |
| Generate answer | Stream response with file references | GPT-4o-mini via SSE |

---

## What's Next?

This is the MVP. Here's where it goes:

- **Full repo indexing** — Two-layer architecture. Index the entire codebase once, PR diff per PR. The LLM gets the full picture.
- **Smart file fetching** — Fetch full content of files touched by the PR, not just the diff. Context around the changes, not just the changes.
- **GitHub App** — One-click install. Auto-indexes every PR. Posts the chat link as a comment.
- **Team analytics** — Track what questions reviewers ask most. If everyone asks "does this affect payments?", your PR description needs a section about payments.

---

## Tools Used

- **FastAPI** — Backend API with SSE streaming
- **LangChain** — RAG chain, document loading, prompt templates
- **FAISS** — In-memory vector store for fast retrieval
- **OpenAI** — text-embedding-3-small for embeddings, GPT-4o-mini for generation
- **React + Vite + Tailwind** — Frontend chat interface
- **GitHub REST API** — PR data, repo metadata, webhooks

---

*Stop reading 40-file PRs line by line. Talk to them instead.*
