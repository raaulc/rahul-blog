---
title: How Spotify Cut Its AI Coding Bill by 90%
date: 2026-09-06
slug: spotify-agent-router
description: Spotify put a bouncer in front of its coding agent — a rule that stops the expensive model from reading big files and hands the job to a cheap one. Here is how the router works, and what they deliberately left alone.
tags: ["ai-engineering", "agents", "claude-code", "cost"]
---

## Your AI coding assistant barely thinks

When you ask a coding agent to do something, you picture it *reasoning*. Mostly it isn't. Most of the work is clerical: open this file, read those 800 lines, scroll to the function, copy a bit from here to there. Moving text around.

That clerical work runs on the same expensive "frontier" model that does the actual thinking — the one you pay a premium for, priced per chunk of text (a "token"). And once a big file is in the conversation, it *stays* there. Every follow-up question re-sends the whole thing. You get billed for it again and again.

A Spotify engineer, Dimitri Mazmanov, wrote up how his team fixed this. On his own benchmark — one large Java codebase, four scenarios — it cut token usage on bulk file reads by about **90%**. (Not an audited, company-wide number, and the savings on *generated* code are fuzzier. The pattern is the interesting part.)

---

## The fix: a bouncer and a cheap intern

Two pieces.

**The bouncer.** A rule that sits in front of the agent's "Read" action and checks the file first. Small file? Go ahead. Big file — over **350 lines**? Blocked. The block message tells the agent what to do instead.

**The cheap intern.** When a read is blocked, the job goes to a small, cheap model running in a fixed "mode": low creativity, structured bullet points only, no prose, every bullet starting with a name or a line number. It reads the file, answers your question, and hands back *just the bullets*. The file itself never enters your main conversation — so asking a follow-up costs nothing extra.

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="A read request passes a 350-line gate, goes to a cheap worker, and returns bullets only">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">Read</text></g>
    <g><circle cx="200" cy="54" r="8"/><text x="200" y="84">350-line gate</text></g>
    <g><circle cx="360" cy="54" r="8"/><text x="360" y="84">cheap worker</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">bullets only</text></g>
  </g>
</svg>
<figcaption>Small files skip the gate. Big ones get summarised by a cheap model — and never enter your main chat.</figcaption>
</figure>

There is a second worker for *writing* code: give it a spec and a reference file, it copies the reference's style exactly and writes the new file **straight to disk**. The expensive model never reads back what got produced. Nothing the workers touch is stored anywhere — zero retention, on purpose.

---

## Why the first attempt failed

Version one put the routing rules in a `CLAUDE.md` file — basically a note to the model saying "for big files, do this instead."

It worked *sometimes*. The model would read the note and redirect itself. But a note is advice, not a wall. When the model was busy, or the file looked interesting, it ignored the note and read the file anyway. And every project needed its own copy of the note.

The whole fix was moving that decision out of a note the model *chooses* to follow, and into a **hook** — code that runs before the tool does and can flat-out refuse.

Spotify describes three layers, and only one of them has teeth:

- **Hooks** — intercept the action and can say *no*. The only layer with real authority. If everything else fails, the expensive read is still blocked.
- **Scripts** — the plumbing that calls the cheap worker, handles errors, counts tokens. The model never touches this directly; it passes arguments and gets a result.
- **Skills** — markdown files telling the agent *when* and *how* to call the scripts. Advisory. They make the redirect feel smooth instead of abrupt, but if one goes unread, nothing breaks.

The lesson: **if a behaviour matters, enforce it in code. Don't ask the model nicely.**

A stripped-down version of the enforced bit looks like this:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Read", "command": "check-file-size" }
    ]
  }
}
```

`check-file-size` runs, sees 900 lines, exits with a "blocked" status and a message: *use the bulk-read skill instead.*

---

## What they deliberately did NOT hand off

Just as interesting is where they drew the line. Three things always stay with the expensive model:

- **Editing a file.** The cheap worker's summaries don't come with trustworthy line numbers, and you need exact lines to make an edit. So the hook *deliberately* lets a targeted read through — one that asks for a specific slice of a file (a start line and a length) rather than the whole thing.
- **Real debugging and design.** In testing, the cheap worker skimmed the surface and missed a threading bug. The expensive model, once it had the right context, caught it in seconds. Judgment doesn't delegate.
- **Anything small.** Each hand-off is a network round trip of **10–30 seconds**. For a short file, that overhead costs more than the tokens you would save. A single worker call is capped at 30 seconds, so big jobs get split up.

<figure class="fig">
<svg class="fig-svg" viewBox="0 0 560 100" role="img" aria-label="Editing, debugging and safety-critical work stay on the expensive model">
  <line class="fx-track" x1="40" y1="54" x2="520" y2="54"/>
  <line class="fx-dash" x1="40" y1="54" x2="520" y2="54"/>
  <circle class="fx-dot" r="5"><animateMotion dur="3s" repeatCount="indefinite" path="M40,54 H520"/></circle>
  <g class="fx-nodes">
    <g><circle cx="40" cy="54" r="8"/><text x="40" y="84">edit a file</text></g>
    <g><circle cx="185" cy="54" r="8"/><text x="185" y="84">real debugging</text></g>
    <g><circle cx="335" cy="54" r="8"/><text x="335" y="84">safety-critical</text></g>
    <g><circle cx="520" cy="54" r="8"/><text x="520" y="84">expensive model</text></g>
  </g>
</svg>
<figcaption>Drawn on purpose, not discovered later. Judgment work is never routed away.</figcaption>
</figure>

---

## The one line that saves the most

The code-writing worker is told: **output only code. No explanation. No markdown fences.**

Sounds trivial. It is the highest-value instruction in the whole system. Without it, the worker wraps its answer in friendly formatting and commentary — and then the expensive model has to read all of that back and strip it out, dumping the entire payload right back into the context the router was trying to protect. The reader worker has the mirror rule: bullets only, no "Sure! Here's a summary…", no preamble.

---

## Why anyone should care

This is a cost story. A quarter of engineering leaders already spend **$200–500 per developer per month** on AI coding tokens; some are well past $2,000. Gartner expects AI coding costs to pass the average developer's *salary* by 2028.

The tools only pay off if the expensive model stops getting billed for work that carries no judgment — reading, summarising, reformatting. That is the entire point of the router.

---

## Stealing this for your own setup

You don't need Spotify's platform. The ingredients are ordinary:

- A **PreToolUse hook** that checks file size before a Read and blocks anything huge, with a message pointing at the alternative.
- A small **script** that sends the file to a cheaper model with a tight instruction ("bullets only, lead with line numbers").
- A **skill** file that tells your agent when to reach for it.
- A hard rule to leave edits, debugging, and anything safety-critical alone.

The mindset shift is the takeaway: treat your frontier model like a senior engineer whose time is expensive. Don't send it to the photocopier.

---

*Source: "Portal by Spotify cut my Claude Code token usage by 90%," Dimitri Mazmanov, Spotify Engineering, 3 September 2026. The 90% figure is the author's own measurement across four scenarios on one Java monorepo, not an audited result. Worker model names and the vendor platform are left out here because the routing pattern doesn't depend on either.*
