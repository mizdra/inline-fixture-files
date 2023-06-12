import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Directory, createIFF as createIFFImpl } from './create-iff.js';

export const DEFAULT_RM_FIXTURES_BEFORE_CREATING = true;

export type CreateIFFResult = {
  /** The resolved `rootDir`. */
  rootDir: string;
  /** Join `rootDir` and `path`. */
  join: (...paths: string[]) => string;
  rmRootDir: () => Promise<void>;
  rmFixtures: () => Promise<void>;
  addFixtures: (items: Directory) => Promise<void>;
  maskRootDir: (str: string) => string;
};
export type IFFCreator = (directory: Directory) => Promise<CreateIFFResult>;

export type CreateIFFOptions = {
  /** Root directory for fixtures. */
  rootDir: string;
  /**
   * Call `rmFixtures` before creating fixtures.
   * @default true
   */
  rmFixturesBeforeCreating?: boolean;
  /**
   * If `true`, `createIFF` does not write files.
   * This option does not affect `CreateIFFResult#addFixtures`.
   * @default false
   */
  noWrite?: boolean;
};

export async function createIFF(directory: Directory, options: CreateIFFOptions): Promise<CreateIFFResult> {
  const { rmFixturesBeforeCreating = DEFAULT_RM_FIXTURES_BEFORE_CREATING } = options;
  const rootDir = resolve(options.rootDir); // normalize path

  function getRealPath(...paths: string[]): string {
    return join(rootDir, ...paths);
  }
  async function rmRootDir(): Promise<void> {
    await rm(rootDir, { recursive: true, force: true });
  }
  async function rmFixtures(): Promise<void> {
    const files = await readdir(rootDir);
    await Promise.all(files.map(async (file) => rm(getRealPath(file), { recursive: true, force: true })));
  }
  async function addFixtures(items: Directory): Promise<void> {
    await createIFFImpl(items, rootDir);
  }
  function maskRootDir(str: string): string {
    return str.replaceAll(rootDir, '<iff.rootDir>');
  }

  if (rmFixturesBeforeCreating) await rmRootDir();
  await createIFFImpl(directory, rootDir);
  return {
    rootDir,
    join: getRealPath,
    rmRootDir,
    rmFixtures,
    addFixtures,
    maskRootDir,
  };
}
