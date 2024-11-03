import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sep as sepForPosix } from 'node:path/posix';
import { IFFFixtureCreationError } from './error.js';

/** @public */
export type FileType = string | ((path: string) => void) | ((path: string) => Promise<void>) | null;

/** @public */
export type DirectoryItem = FileType | Directory;

/**
 * @public
 * @example
 * ```ts
 * const directory: Directory = {
 *  'a.txt': 'a',
 *   'b': {
 *     'a.txt': 'b-a',
 *   },
 *   'c/a/a.txt': 'c-a-a',
 * };
 * ```
 */
export interface Directory {
  [name: string]: DirectoryItem;
}

/**
 * `MergeDirectory<{ file1: string }, { file2: string }>` is `{ file1: string, file2: string }`.
 * `MergeDirectory<{ dir1: { file1: string } }, { dir1: { file2: string } }>` is `{ dir1: { file1: string, file2: string } }`.
 * `MergeDirectory<{ dir1: string }, { dir1: { file1: string } }>` is `{ dir1: { file1: string } }`.
 * `MergeDirectory<{ dir1: { file1: string } }, { dir1: string }>` is `{ dir1: { file1: string } }`.
 */
export type MergeDirectory<T extends DirectoryItem, U extends DirectoryItem> = T extends Directory
  ? U extends Directory
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? MergeDirectory<T[K], U[K]>
            : T[K]
          : K extends keyof U
          ? U[K]
          : never;
      }
    : T
  : U extends Directory
  ? U
  : T;

export function isDirectory(item: DirectoryItem): item is Directory {
  return item !== null && typeof item === 'object';
}

function throwFixtureCreationError(path: string, cause: unknown, throwByFlexibleFileCreationAPI = false): never {
  throw new IFFFixtureCreationError(path, { cause, throwByFlexibleFileCreationAPI });
}

export async function createIFFImpl(directory: Directory, baseDir: string): Promise<void> {
  await mkdir(baseDir, { recursive: true }).catch((cause) => throwFixtureCreationError(baseDir, cause));

  async function processItem(name: string, item: DirectoryItem): Promise<void> {
    // TODO: Extract to `validateDirectory` function
    if (name.startsWith(sepForPosix)) throw new Error(`Item name must not start with separator: ${name}`);
    if (name.endsWith(sepForPosix)) throw new Error(`Item name must not end with separator: ${name}`);
    if (name.includes(sepForPosix.repeat(2)))
      throw new Error(`Item name must not contain consecutive separators: ${name}`);

    const path = join(baseDir, name);
    if (item === null) {
      // noop
    } else if (typeof item === 'string') {
      // `item` is file.
      await mkdir(dirname(path), { recursive: true }).catch((cause) => throwFixtureCreationError(dirname(path), cause));
      await writeFile(path, item).catch((cause) => throwFixtureCreationError(path, cause));
    } else if (typeof item === 'function') {
      // `item` is file.
      try {
        await item(path);
      } catch (cause) {
        throwFixtureCreationError(path, cause, true);
      }
    } else {
      // `item` is directory.
      await createIFFImpl(item, path);
    }
  }

  await Promise.all(Object.entries(directory).map(async ([name, item]) => processItem(name, item)));
}
