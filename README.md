# Obsidian to Blog

Automated publishing pipeline that syncs tagged Obsidian notes to a public Astro blog. Write in Obsidian, commit, blog updates. No CMS, no manual steps.

**Status:** Planning -- not started

---

## How it works

1. Write notes in Obsidian as normal
2. Tag any note with `#publish` to mark it for publishing
3. Obsidian Git plugin commits and pushes on a schedule
4. GitHub Action runs a transform script (wikilinks, callouts, images) and builds the Astro site
5. Vercel deploys the new build automatically

---

## Stack

| Layer | Tool |
|-------|------|
| Blog framework | Astro (static output) |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| Vault sync | Obsidian Git plugin |
| Transform | Custom Node.js script |

---

## Publish control

- Notes with `#publish` tag are included
- Everything else stays private
- `#publish` tag is stripped from rendered output

---

## OpenSpec

Design and implementation plan: `openspec/changes/obsidian-to-blog/`

- [proposal.md](../../openspec/changes/obsidian-to-blog/proposal.md) -- what and why
- [design.md](../../openspec/changes/obsidian-to-blog/design.md) -- how
- [tasks.md](../../openspec/changes/obsidian-to-blog/tasks.md) -- implementation steps

---

## Key dates

- Idea captured: 2026-03-07
- Planning started: 2026-03-07
