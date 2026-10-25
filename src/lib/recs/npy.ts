// Minimal reader for the NumPy .npy files exported by the research pipeline (little-endian f4 / i4, C order).
import { readFileSync } from 'node:fs';

export interface NpyArray<T extends Float32Array | Int32Array> {
  data: T;
  shape: number[];
}

export function readNpy(path: string): NpyArray<Float32Array | Int32Array> {
  const buf = readFileSync(path);
  if (buf.toString('latin1', 1, 6) !== 'NUMPY') throw new Error(`${path}: not an .npy file`);
  const major = buf[6];
  const headerLen = major === 1 ? buf.readUInt16LE(8) : buf.readUInt32LE(8);
  const offset = (major === 1 ? 10 : 12) + headerLen;
  const header = buf.toString('latin1', offset - headerLen, offset);

  const descr = /'descr':\s*'([^']+)'/.exec(header)?.[1];
  const shape = /'shape':\s*\(([^)]*)\)/.exec(header)![1].split(',').map((s) => s.trim()).filter(Boolean).map(Number);
  if (/'fortran_order':\s*True/.test(header)) throw new Error(`${path}: fortran order not supported`);

  // Copy into an aligned buffer: the data offset is not guaranteed to be 4-byte aligned.
  const bytes = buf.subarray(offset);
  const aligned = new ArrayBuffer(bytes.length);
  new Uint8Array(aligned).set(bytes);
  if (descr === '<f4') return { data: new Float32Array(aligned), shape };
  if (descr === '<i4') return { data: new Int32Array(aligned), shape };
  throw new Error(`${path}: unsupported dtype ${descr}`);
}

export function readF32(path: string): NpyArray<Float32Array> {
  const a = readNpy(path);
  if (!(a.data instanceof Float32Array)) throw new Error(`${path}: expected float32`);
  return a as NpyArray<Float32Array>;
}

export function readI32(path: string): NpyArray<Int32Array> {
  const a = readNpy(path);
  if (!(a.data instanceof Int32Array)) throw new Error(`${path}: expected int32`);
  return a as NpyArray<Int32Array>;
}
