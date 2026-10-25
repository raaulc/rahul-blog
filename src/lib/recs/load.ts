// Loads the model once per function instance; warm invocations reuse it.
import { join } from 'node:path';
import { loadModel, type Model } from './model.ts';

let model: Model | undefined;

export function getModel(): Model {
  model ??= loadModel(join(process.cwd(), 'recs-artifacts') + '/');
  return model;
}
