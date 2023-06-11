import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Directory, createIFF } from './create-iff.js';

export const DEFAULT_RM_FIXTURES_BEFORE_CREATING = true;

export type IFFCreatorResult = {
  /** The resolved `rootDir`. */
  rootDir: string;
  resolve: (path: string) => string;
  rmRootDir: () => Promise<void>;
  rmFixtures: () => Promise<void>;
  addFixtures: (items: Directory) => Promise<void>;
  maskRootDir: (str: string) => string;
};
export type IFFCreator = (directory: Directory) => Promise<IFFCreatorResult>;

export type InitIFFCreatorOptions = {
  /** Root directory for fixtures. */
  rootDir: string;
  /**
   * Call `rmFixtures` before creating fixtures.
   * @default true
   */
  rmFixturesBeforeCreating?: boolean;
};

export function initIFFCreator({
  rootDir,
  rmFixturesBeforeCreating = DEFAULT_RM_FIXTURES_BEFORE_CREATING,
}: InitIFFCreatorOptions): IFFCreator {
  const resolvedRootDir = resolve(rootDir);
  function getRealPath(path: string): string {
    return resolve(resolvedRootDir, path);
  }
  async function rmRootDir(): Promise<void> {
    await rm(resolvedRootDir, { recursive: true, force: true });
  }
  async function rmFixtures(): Promise<void> {
    const files = await readdir(resolvedRootDir);
    await Promise.all(files.map(async (file) => rm(getRealPath(file), { recursive: true, force: true })));
  }
  async function addFixtures(items: Directory): Promise<void> {
    await createIFF(items, resolvedRootDir);
  }
  function maskRootDir(str: string): string {
    return str.replaceAll(resolvedRootDir, '<iff.rootDir>');
  }
  return async (directory: Directory) => {
    if (rmFixturesBeforeCreating) await rmRootDir();
    await createIFF(directory, rootDir);
    return {
      rootDir: resolvedRootDir,
      resolve: getRealPath,
      rmRootDir,
      rmFixtures,
      addFixtures,
      maskRootDir,
    };
  };
}
