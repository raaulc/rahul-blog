import { cooldown, DEFAULT_POLICY, diversify, exclusions, type GuardrailPolicy, type GuardrailReason } from './guardrails.ts';
import type { Model } from './model.ts';
import { candidateFeatures, scoreCandidates } from './ranking.ts';
import { historyOf, type PlayerState } from './store.ts';

export interface Recommendation {
  itemId: string;
  title: string;
  genres: string[];
  score: number | null;
}

export interface RecommendResult {
  items: Recommendation[];
  guardrails: GuardrailReason[];
  /** Milliseconds per stage, also sent as a Server-Timing header. */
  timings: Record<'retrieval' | 'ranking' | 'policy' | 'total', number>;
  modelVersion: string;
}

const since = (t: number) => Math.round((performance.now() - t) * 1000) / 1000;

export function recommend(
  m: Model,
  state: PlayerState | undefined,
  k = 10,
  policy: GuardrailPolicy = DEFAULT_POLICY,
): RecommendResult {
  const t0 = performance.now();
  const guardrails: GuardrailReason[] = [];
  const timings = { retrieval: 0, ranking: 0, policy: 0, total: 0 };
  const done = (items: Recommendation[]): RecommendResult => {
    timings.total = since(t0);
    return { items, guardrails, timings, modelVersion: m.version };
  };
  const toRec = (i: number, score: number | null): Recommendation => ({
    itemId: m.items[i].item_id, title: m.items[i].title, genres: m.items[i].genres, score,
  });

  const cool = cooldown(state, policy);
  if (cool) {
    guardrails.push(cool);
    return done([]);
  }

  const excluded = exclusions(m, state, policy);
  if (excluded.size) guardrails.push({ code: 'excluded', count: excluded.size });
  const history = state ? historyOf(state) : [];

  if (!history.length) {
    guardrails.push({ code: 'cold_start' });
    const ranked = [...m.popularOrder].filter((i) => !excluded.has(i));
    const { items } = diversify(m, ranked, k, policy.maxPerGenre);
    return done(items.map((i) => toRec(i, null)));
  }

  let t = performance.now();
  const cands = candidateFeatures(m, history, excluded);
  timings.retrieval = since(t);

  t = performance.now();
  const scores = scoreCandidates(m, cands);
  const order = [...scores.keys()].sort((a, b) => scores[b] - scores[a]);
  timings.ranking = since(t);

  t = performance.now();
  const ranked = order.map((r) => cands.items[r]);
  const { items, demoted } = diversify(m, ranked, k, policy.maxPerGenre);
  if (demoted) guardrails.push({ code: 'diversity', demoted });
  const scoreOf = new Map(order.map((r) => [cands.items[r], scores[r]]));
  timings.policy = since(t);

  return done(items.map((i) => toRec(i, Math.round(scoreOf.get(i)! * 1e4) / 1e4)));
}
