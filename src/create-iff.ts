import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sep as sepForPosix } from 'node:path/posix';
import { sep as sepForWin32 } from 'node:path/win32';

export type FileType = string; // TODO: support `File` class

// eslint-disable-next-line no-use-before-define
export type DirectoryItem = FileType | Directory;

export type Directory = {
  [name: string]: DirectoryItem;
};

function isFile(item: DirectoryItem): item is FileType {
  return typeof item === 'string';
}

export async function createIFF(items: Directory, baseDir: string): Promise<void> {
  for (const [name, item] of Object.entries(items)) {
    if (name.startsWith(sepForPosix) || name.startsWith(sepForWin32))
      throw new Error(`Item name must not start with separator: ${name}`);
    if (name.endsWith(sepForPosix) || name.endsWith(sepForWin32))
      throw new Error(`Item name must not end with separator: ${name}`);
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
