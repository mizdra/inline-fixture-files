import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sep as sepForPosix } from 'node:path/posix';
import { IFFFixtureCreationError } from './error.js';

/** @public */
export type FileType = string | ((path: string) => void) | ((path: string) => Promise<void>) | null;

/** @public */
// eslint-disable-next-line no-use-before-define
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

export function isDirectory(item: DirectoryItem): item is Directory {
  return item !== null && typeof item === 'object';
}

function throwFixtureCreationError(path: string, cause: unknown, throwByFlexibleFileCreationAPI = false): never {
  throw new IFFFixtureCreationError(path, { cause, throwByFlexibleFileCreationAPI });
}

export async function createIFFImpl(directory: Directory, baseDir: string): Promise<void> {
  await mkdir(baseDir, { recursive: true }).catch((cause) => throwFixtureCreationError(baseDir, cause));

  for (const [name, item] of Object.entries(directory)) {
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
}
