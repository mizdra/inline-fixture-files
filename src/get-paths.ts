import { join } from 'node:path';
import { join as joinForPosix, dirname as dirnameForPosix, sep as sepForPosix } from 'node:path/posix';
import { Directory, isDirectory } from './create-iff-impl.js';

/** Utility type that converts `{ a: string, [key: string]: any; }` to `{ a: string }`. */
// ref: https://github.com/type-challenges/type-challenges/issues/3542
type RemoveIndexSignature<Type> = {
  [Key in keyof Type as Key extends `${infer ConcreteKey}` ? ConcreteKey : never]: Type[Key];
};

/** Utility type that converts `{ a: string, b: string, [key: string]: any }` to `'a' | 'b'`. */
type FiniteStringKeyOf<T> = keyof RemoveIndexSignature<T>;

/**
 * Utility type that converts `{ 'file-1.txt': string, 'dir-1/dir-2': { 'file-2.txt': string } }`
 * to 'file-1.txt' | 'dir-1/dir-2/file-2.txt'.
 */
type FlattenDirectoryObjectKeys<T extends Record<string, unknown>, Key = FiniteStringKeyOf<T>> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}/${FlattenDirectoryObjectKeys<T[Key]>}`
    : `${Key}`
  : never;

/** Utility type that converts `'dir-1/dir2/file-1.txt' to 'dir-1' | 'dir-1/dir2' | 'dir-1/dir2/file-1.txt'`. */
type SelfAndUpperPath<T extends string, Prefix extends string = ''> = T extends `${infer First}/${infer Rest}`
  ? `${Prefix}${First}` | SelfAndUpperPath<Rest, `${Prefix}${First}/`>
  : `${Prefix}${T}`;

/**
 * Utility type that converts `{ 'file-1.txt': string, 'dir-1/dir-2': { 'file-2.txt': string } }`
 * to `{ 'file-1.txt': string, 'dir-1': string, 'dir-1/dir-2': string, 'dir-1/dir-2/file-2.txt': string }`.
 */
export type FlattenDirectory<T extends Directory> = {
  [Path in SelfAndUpperPath<FlattenDirectoryObjectKeys<T>>]: string;
};

/** Convert `'a/b/c'` to `['a/b/c', 'a/b', 'a']` */
export function getSelfAndUpperPaths(path: string): string[] {
  const parent = dirnameForPosix(path);
  if (parent === '.') return [path];
  return [path, ...getSelfAndUpperPaths(parent)];
}

export function getPaths<T extends Directory>(directory: T, rootDir: string, prefix = ''): FlattenDirectory<T> {
  let paths: Record<string, string> = {};
  for (const [name, item] of Object.entries(directory)) {
    // TODO: Extract to `validateDirectory` function
    if (name.startsWith(sepForPosix)) throw new Error(`Item name must not start with separator: ${name}`);
    if (name.endsWith(sepForPosix)) throw new Error(`Item name must not end with separator: ${name}`);
    if (name.includes(sepForPosix.repeat(2)))
      throw new Error(`Item name must not contain consecutive separators: ${name}`);

    for (const n of getSelfAndUpperPaths(name)) {
      // NOTE: Use `Object.defineProperty(obj, prop, { value })` instead of `obj[prop] = value` to allow `paths['__proto__']`.
      // ref: https://2ality.com/2015/09/proto-es6.html#defining-__proto__
      Object.defineProperty(paths, joinForPosix(prefix, n), {
        value: join(rootDir, prefix, n),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    if (isDirectory(item)) {
      const newPaths = getPaths(item, rootDir, joinForPosix(prefix, name));
      paths = { ...paths, ...newPaths };
    }
  }
  return paths as unknown as FlattenDirectory<T>;
}
