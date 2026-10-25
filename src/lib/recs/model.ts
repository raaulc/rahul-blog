// Loads the artifacts exported by research/recs/pipeline.py and research/recs/export.py.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Gbdt, type LightGbmDump } from './gbdt.ts';
import { readF32, readI32 } from './npy.ts';

export interface ItemMeta {
  item_id: string;
  title: string;
  genres: string[];
  price: number;
}

// Column order of item_ctx.npy.
export const CTX = { popLog: 0, avgHoursLog: 1, price: 2, isFree: 3, year: 4 } as const;

export interface Model {
  version: string;
  nItems: number;
  dim: number;
  vectors: Float32Array; // nItems x dim
  knnK: number;
  knnIdx: Int32Array; // nItems x knnK
  knnVal: Float32Array;
  ctxCols: number;
  ctx: Float32Array; // nItems x ctxCols
  nGenres: number;
  genres: Float32Array; // nItems x nGenres, rows sum to 1
  items: ItemMeta[];
  indexOf: Map<string, number>; // Steam item id -> row
  popularOrder: Int32Array; // item rows by popularity, for cold start
  ranker: Gbdt;
}

export function loadModel(dir: string): Model {
  const vectors = readF32(join(dir, 'item_vectors.npy'));
  const knnIdx = readI32(join(dir, 'knn_indices.npy'));
  const knnVal = readF32(join(dir, 'knn_values.npy'));
  const ctx = readF32(join(dir, 'item_ctx.npy'));
  const genres = readF32(join(dir, 'item_genres.npy'));
  const items: ItemMeta[] = JSON.parse(readFileSync(join(dir, 'items.json'), 'utf8'));
  const dump: LightGbmDump = JSON.parse(readFileSync(join(dir, 'ranker.json'), 'utf8'));

  const nItems = items.length;
  for (const [name, a] of [['vectors', vectors], ['knn', knnIdx], ['ctx', ctx], ['genres', genres]] as const) {
    if (a.shape[0] !== nItems) throw new Error(`${name} has ${a.shape[0]} rows, items.json has ${nItems}`);
  }

  const ctxCols = ctx.shape[1];
  const popularOrder = Int32Array.from({ length: nItems }, (_, i) => i).sort(
    (a, b) => ctx.data[b * ctxCols + CTX.popLog] - ctx.data[a * ctxCols + CTX.popLog],
  );
  const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));

  return {
    version: `two-stage-ndcg${metrics.results.two_stage['ndcg@10'].toFixed(3)}`,
    nItems,
    dim: vectors.shape[1],
    vectors: vectors.data,
    knnK: knnIdx.shape[1],
    knnIdx: knnIdx.data,
    knnVal: knnVal.data,
    ctxCols,
    ctx: ctx.data,
    nGenres: genres.shape[1],
    genres: genres.data,
    items,
    indexOf: new Map(items.map((it, i) => [it.item_id, i])),
    popularOrder,
    ranker: new Gbdt(dump),
  };
}
