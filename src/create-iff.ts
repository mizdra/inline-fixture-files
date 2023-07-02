import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sep as sepForPosix } from 'node:path/posix';

/** @public */
export type FileType = string; // TODO: support `File` class

/** @public */
// eslint-disable-next-line no-use-before-define
export type DirectoryItem = FileType | Directory;

/** @public */
export type Directory = {
  [name: string]: DirectoryItem;
};

export function isFile(item: DirectoryItem): item is FileType {
  return typeof item === 'string';
}

export async function createIFF(directory: Directory, baseDir: string): Promise<void> {
  for (const [name, item] of Object.entries(directory)) {
    if (name.startsWith(sepForPosix)) throw new Error(`Item name must not start with separator: ${name}`);
    if (name.endsWith(sepForPosix)) throw new Error(`Item name must not end with separator: ${name}`);
    if (name.includes(sepForPosix.repeat(2)))
      throw new Error(`Item name must not contain consecutive separators: ${name}`);

    const path = join(baseDir, name);
    if (isFile(item)) {
      // `item` is file.
      await mkdir(dirname(path), { recursive: true });
      if (typeof item === 'string') {
        await writeFile(path, item);
      }
    } else {
      // `item` is directory.
      await mkdir(path, { recursive: true });
      await createIFF(item, path);
    }
  }
}
