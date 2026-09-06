---
title: Your AI Agent Is Writing Broken Code (And You Don't Know It)
date: 2026-03-09
slug: context-hub-vs-context7
description: How Context Hub and Context7 fix the silent bug that every AI coding assistant has.
tags: ["ai-engineering"]
---

You ask your AI coding assistant to write some code.

It looks great. You ship it. It breaks in production.

Why? Because your AI was working from memory -- and memory goes stale.

---

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="Pipeline: your prompt to stale memory to guessed API to broken code">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">your prompt</text></g>
    <g><circle cx="200" cy="54" r="8"/><text x="200" y="84">stale memory</text></g>
    <g><circle cx="360" cy="54" r="8"/><text x="360" y="84">guessed API</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">broken code</text></g>
  </g>
</svg>
<figcaption>what the model writes without current docs</figcaption>
</figure>

## The Problem Nobody Talks About

Every AI coding assistant -- Copilot, Cursor, Claude -- was trained on data up to a certain date.

After that date? It knows nothing.

```mermaid
flowchart LR
    A[👨‍💻 You] -->|ask for code| B[🤖 AI Agent]
    B -->|reads from| C[🧠 Training Data\ncutoff: 2024]
    C -->|writes| D[💥 Broken Code\ndeprecated API]
    D -->|ships to| E[🔥 Production]
```

So when you ask it to write code using the OpenAI SDK, it might write this:

```python
# What your AI writes from memory
openai.ChatCompletion.create(model="gpt-3.5-turbo", ...)
```

That method does not exist anymore. Deprecated. Gone.

You just shipped a bug because your AI was reading from an old textbook.

---

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="Pipeline: your prompt to fetch live docs to grounded context to working code">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">your prompt</text></g>
    <g><circle cx="200" cy="54" r="8"/><text x="200" y="84">fetch live docs</text></g>
    <g><circle cx="360" cy="54" r="8"/><text x="360" y="84">grounded context</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">working code</text></g>
  </g>
</svg>
<figcaption>inject current docs before it writes</figcaption>
</figure>

## The Fix: Give Your AI Current Docs Before It Writes Code

Both Context Hub and Context7 solve this exact problem -- in different ways.

The idea is simple:

> Before the AI writes code, make it read the actual current documentation first.

That is it. Nothing more complicated.

---

## Context Hub -- The Manual Way

```mermaid
flowchart TD
    A[👨‍💻 Developer] -->|chub get openai/chat| B[📦 Context Hub CLI]
    B -->|fetches| C[📄 Current Docs\nupdated March 2026]
    C -->|fed into| D[🤖 AI Agent]
    D -->|writes| E[✅ Correct Code]
    F[🗒️ Team Annotations\nhardcoded keys, gotchas] -->|auto-attached| C
```

[Context Hub](https://github.com/andrewyng/context-hub) by Andrew Ng is a CLI tool.

You run a command:

```bash
chub get openai/chat --lang py
```

It fetches the current, up-to-date OpenAI docs. Your agent reads them. Writes correct code.

**The interesting bit -- team annotations:**

Say your team got burned once. Someone hardcoded an API key and it leaked. You add a note:

```bash
chub annotate openai/chat "Never hardcode API keys -- always use environment variables"
```

Now every time anyone on the team fetches those docs, that warning shows up automatically. Team knowledge that sticks. Survives session resets. Survives new hires.

**Best for:** Teams without MCP setup. Corp environments. Internal private APIs.

---

## Context7 -- The Automatic Way

```mermaid
flowchart LR
    A[👨‍💻 You\n'use context7'] -->|prompt| B[🤖 AI Agent\nCursor / Claude Code]
    B -->|auto calls| C[⚡ Context7\nMCP Server]
    C -->|fetches| D[📄 Current Docs]
    D -->|injected into| B
    B -->|writes| E[✅ Correct Code]
```

[Context7](https://github.com/upstash/context7) by Upstash is an MCP server.

You connect it once to your coding agent. After that -- you just add "use context7" to your prompt.

```
Write me code to call the OpenAI API. use context7
```

That is it. Context7 automatically:
1. Detects you need OpenAI docs
2. Fetches the current version in the background
3. Your agent writes correct, up-to-date code

No commands. No copy-pasting. Completely invisible.

**Best for:** Solo devs. Teams already using MCP. Anyone on Cursor or Claude Code.

---

## Side By Side

| | Context Hub | Context7 |
|---|---|---|
| How it works | CLI -- you fetch manually | MCP server -- fully automatic |
| Setup | `npm install -g @aisuite/chub` | Connect MCP once |
| Team annotations | Yes -- knowledge sticks | No |
| Private/internal APIs | Yes -- host your own docs | No |
| Free tier | Completely free | 1,000 calls/month free |
| Best for | Corp teams, internal APIs | Solo devs, public libraries |

---

## Real Example

Without Context Hub or Context7, an AI agent writes:

```python
# BROKEN -- deprecated since 2023
import openai
openai.api_key = "your-key"
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Tell me a joke"}]
)
print(response["choices"][0]["message"]["content"])
```

With Context Hub or Context7, the same agent writes:

```python
# CORRECT -- current as of March 2026
from openai import OpenAI
client = OpenAI()  # picks up OPENAI_API_KEY from environment
response = client.responses.create(
    model="gpt-4o",
    input="Tell me a joke"
)
print(response.output_text)
```

Same task. Completely different result. One breaks. One works.

---

## Which One Should You Use?

```mermaid
flowchart TD
    A[Which tool?] --> B{Do you have MCP\nset up?}
    B -->|Yes| C{Solo dev or\nsmall team?}
    B -->|No| D[Context Hub\n✅ works today, no setup]
    C -->|Solo dev| E[Context7\n✅ invisible, automatic]
    C -->|Corp team| F[Both\nContext7 for public APIs\nContext Hub for internal]
```

**Solo dev using Claude Code or Cursor?** Set up Context7 today. Takes 5 minutes, works forever.

**Working in a corp team without MCP?** Start with Context Hub. No approvals needed, works immediately.

**Both?** Use Context7 for public libraries (OpenAI, Stripe, React) and Context Hub for your internal APIs and team annotations. They are not mutually exclusive.

---

## The Bigger Picture

This is not just about fixing broken imports.

It is about making AI agents reliable. Right now, every AI coding assistant has a built-in expiry date on its knowledge. Context Hub and Context7 are the first practical tools that patch that gap.

As agentic AI becomes standard in engineering teams, tools like these will not be optional. They will be table stakes.

The teams that figure this out now will ship faster and break less.

---

*Built a demo of this? Trying it in your team? I would love to hear how it goes.*
