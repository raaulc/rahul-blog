// Retrieval and candidate features. Mirrors research/recs/models.py and ranker.py; the parity test keeps them in step.
import { CTX, type Model } from './model.ts';

export interface HistoryEntry {
  item: number; // model row
  weight: number; // log1p(hours) + 1, as in research/recs/data.py
}

export const N_CANDIDATES = 100;
export const N_FEATURES = 12;

export function svdScores(m: Model, history: HistoryEntry[]): Float32Array {
  const u = new Float32Array(m.dim);
  for (const { item, weight } of history) {
    const o = item * m.dim;
    for (let d = 0; d < m.dim; d++) u[d] += weight * m.vectors[o + d];
  }
  const scores = new Float32Array(m.nItems);
  for (let i = 0; i < m.nItems; i++) {
    const o = i * m.dim;
    let s = 0;
    for (let d = 0; d < m.dim; d++) s += m.vectors[o + d] * u[d];
    scores[i] = s;
  }
  return scores;
}

export function knnScores(m: Model, history: HistoryEntry[]): Float32Array {
  const scores = new Float32Array(m.nItems);
  for (const { item } of history) {
    const o = item * m.knnK;
    for (let j = 0; j < m.knnK; j++) scores[m.knnIdx[o + j]] += m.knnVal[o + j];
  }
  return scores;
}

/** Indices of the k highest scores, best first, skipping `exclude`. */
export function topK(scores: ArrayLike<number>, k: number, exclude: Set<number>): number[] {
  // A small sorted buffer beats a full sort when k << n.
  const idx: number[] = [];
  const val: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (exclude.has(i)) continue;
    const s = scores[i];
    let p: number;
    if (idx.length < k) {
      p = idx.push(i) - 1;
      val.push(s);
    } else if (s > val[k - 1]) {
      p = k - 1;
      idx[p] = i;
      val[p] = s;
    } else {
      continue;
    }
    for (; p > 0 && val[p - 1] < val[p]; p--) {
      [idx[p - 1], idx[p]] = [idx[p], idx[p - 1]];
      [val[p - 1], val[p]] = [val[p], val[p - 1]];
    }
  }
  return idx;
}

export interface Candidates {
  items: number[];
  features: Float64Array; // items.length x N_FEATURES, same column order as research FEATURES
}

export function candidateFeatures(m: Model, history: HistoryEntry[], exclude: Set<number>): Candidates {
  const sSvd = svdScores(m, history);
  const sKnn = knnScores(m, history);
  const seen = new Set(history.map((h) => h.item));
  for (const e of exclude) seen.add(e);
  const cSvd = topK(sSvd, N_CANDIDATES, seen);
  const cKnn = topK(sKnn, N_CANDIDATES, seen);
  const rankSvd = new Map(cSvd.map((it, r) => [it, r]));
  const rankKnn = new Map(cKnn.map((it, r) => [it, r]));
  const items = [...new Set([...cSvd, ...cKnn])].sort((a, b) => a - b);

  // Genre profile from the distinct items played, L2-normalised.
  const userGenre = new Float64Array(m.nGenres);
  for (const item of new Set(history.map((h) => h.item))) {
    const o = item * m.nGenres;
    for (let g = 0; g < m.nGenres; g++) userGenre[g] += m.genres[o + g];
  }
  const norm = Math.max(Math.hypot(...userGenre), 1e-9);
  const nItemsLog = Math.log1p(history.length);

  const f = new Float64Array(items.length * N_FEATURES);
  items.forEach((it, r) => {
    const o = r * N_FEATURES, c = it * m.ctxCols, g = it * m.nGenres;
    let affinity = 0;
    for (let k = 0; k < m.nGenres; k++) affinity += m.genres[g + k] * userGenre[k];
    f[o + 0] = sSvd[it];
    f[o + 1] = rankSvd.get(it) ?? N_CANDIDATES;
    f[o + 2] = sKnn[it];
    f[o + 3] = rankKnn.get(it) ?? N_CANDIDATES;
    f[o + 4] = rankSvd.has(it) && rankKnn.has(it) ? 1 : 0;
    f[o + 5] = m.ctx[c + CTX.popLog];
    f[o + 6] = m.ctx[c + CTX.avgHoursLog];
    f[o + 7] = m.ctx[c + CTX.price];
    f[o + 8] = m.ctx[c + CTX.isFree];
    f[o + 9] = m.ctx[c + CTX.year];
    f[o + 10] = Math.fround(affinity / norm);
    f[o + 11] = Math.fround(nItemsLog);
  });
  return { items, features: f };
}

export function scoreCandidates(m: Model, c: Candidates): Float64Array {
  const out = new Float64Array(c.items.length);
  for (let r = 0; r < c.items.length; r++) out[r] = m.ranker.predict(c.features, r * N_FEATURES);
  return out;
}

export interface Explanation {
  item: number; // the history item that best explains the recommendation
  via: 'co-play' | 'taste';
}

/**
 * Why each target was recommended: the played game with the strongest item-kNN link to it
 * ("players who played X also played this"); if none links, the closest game in SVD space.
 */
export function explain(m: Model, history: HistoryEntry[], targets: number[]): Map<number, Explanation> {
  const want = new Set(targets);
  const best = new Map<number, { item: number; sim: number }>();
  for (const { item } of history) {
    const o = item * m.knnK;
    for (let j = 0; j < m.knnK; j++) {
      const t = m.knnIdx[o + j];
      if (!want.has(t)) continue;
      const sim = m.knnVal[o + j];
      if (sim > (best.get(t)?.sim ?? 0)) best.set(t, { item, sim });
    }
  }
  const out = new Map<number, Explanation>();
  for (const t of targets) {
    const b = best.get(t);
    if (b) {
      out.set(t, { item: b.item, via: 'co-play' });
      continue;
    }
    let bestItem = -1, bestDot = -Infinity;
    for (const { item } of history) {
      let dot = 0;
      for (let d = 0; d < m.dim; d++) dot += m.vectors[item * m.dim + d] * m.vectors[t * m.dim + d];
      if (dot > bestDot) [bestItem, bestDot] = [item, dot];
    }
    if (bestItem >= 0) out.set(t, { item: bestItem, via: 'taste' });
  }
  return out;
}
