# Career Game

A small personal web app: turns long-term career goals into daily quests.
Framework: **SEE → CHOOSE → PLAY → ADJUST**.

- React + TypeScript + Vite + Tailwind v3
- localStorage only, no backend
- Served on the main site at `/career-game` (built output committed to
  `../../public/career-game/`)

## Develop

```bash
npm install
npm run dev
```

## Build & publish to the site

```bash
npm run build            # -> ./dist  (base = /career-game/)
rm -rf ../../public/career-game
cp -r dist ../../public/career-game
```

Then commit `../../public/career-game/`. The Astro site copies `public/`
straight into its deploy, so `/career-game` goes live with the next push.

## Data

One JSON blob in `localStorage` under `career-game:v1`. See
`src/lib/types.ts` (`CareerData`) and `src/lib/storage.ts` (`migrate()`),
which shallow-merges older/partial saves so the schema can evolve — or a
real backend can be dropped in later.

Levels: edit `src/lib/levels.ts` (`LEVELS`).
