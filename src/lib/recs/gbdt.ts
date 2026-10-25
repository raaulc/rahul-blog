// Evaluates a LightGBM model from its JSON dump (booster.dump_model()).
// Trees are flattened into typed arrays so scoring a candidate is a tight loop with no allocation.
// Only numerical '<=' splits are supported, which is all the exported ranker uses; anything else fails at load.

interface SplitNode {
  split_feature: number;
  threshold: number;
  decision_type: string;
  missing_type: string;
  left_child: TreeNode;
  right_child: TreeNode;
}
interface LeafNode {
  leaf_value: number;
}
type TreeNode = SplitNode | LeafNode;

export interface LightGbmDump {
  feature_names: string[];
  tree_info: { tree_structure: TreeNode }[];
}

export class Gbdt {
  readonly featureNames: string[];
  readonly nTrees: number;
  private feature: Int32Array;
  private threshold: Float64Array;
  // Child pointers: >= 0 is a node index, < 0 is ~leafIndex.
  private left: Int32Array;
  private right: Int32Array;
  private leafValue: Float64Array;
  private roots: Int32Array;

  constructor(dump: LightGbmDump) {
    this.featureNames = dump.feature_names;
    const feature: number[] = [], threshold: number[] = [], left: number[] = [], right: number[] = [];
    const leafValue: number[] = [], roots: number[] = [];

    const add = (node: TreeNode): number => {
      if ('leaf_value' in node) {
        leafValue.push(node.leaf_value);
        return ~(leafValue.length - 1);
      }
      if (node.decision_type !== '<=' || node.missing_type !== 'None') {
        throw new Error(`unsupported split: ${node.decision_type} / missing=${node.missing_type}`);
      }
      const id = feature.length;
      feature.push(node.split_feature);
      threshold.push(node.threshold);
      left.push(0);
      right.push(0);
      left[id] = add(node.left_child);
      right[id] = add(node.right_child);
      return id;
    };
    for (const t of dump.tree_info) roots.push(add(t.tree_structure));

    this.nTrees = roots.length;
    this.feature = Int32Array.from(feature);
    this.threshold = Float64Array.from(threshold);
    this.left = Int32Array.from(left);
    this.right = Int32Array.from(right);
    this.leafValue = Float64Array.from(leafValue);
    this.roots = Int32Array.from(roots);
  }

  /** Raw score for one row of `x` starting at `offset`. */
  predict(x: ArrayLike<number>, offset = 0): number {
    let sum = 0;
    for (let t = 0; t < this.nTrees; t++) {
      let n = this.roots[t];
      while (n >= 0) n = x[offset + this.feature[n]] <= this.threshold[n] ? this.left[n] : this.right[n];
      sum += this.leafValue[~n];
    }
    return sum;
  }
}
