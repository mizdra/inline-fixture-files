import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Directory, createIFF as createIFFImpl } from './create-iff.js';

export type CleanUpBeforeWriting = 'rmRootDir' | 'rmFixtures' | false;
export const DEFAULT_CLEAN_UP_BEFORE_WRITING = 'rmRootDir' satisfies CleanUpBeforeWriting;

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
   * Whether the fixture should be cleaned up before export.
   * If `'rmRootDir'` is passed, `rmRootDir` is called before writing.
   * If `'rmFixtures'` is passed, `rmFixtures` is called before writing.
   * If `false` is passed, no clean-up is done.
   * @default 'rmRootDir'
   */
  cleanUpBeforeWriting?: CleanUpBeforeWriting | undefined;
  /**
   * If `true`, `createIFF` does not write files.
   * This option does not affect `CreateIFFResult#addFixtures`.
   * @default false
   */
  noWrite?: boolean;
};

export async function createIFF(directory: Directory, options: CreateIFFOptions): Promise<CreateIFFResult> {
  const { cleanUpBeforeWriting = DEFAULT_CLEAN_UP_BEFORE_WRITING } = options;
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

  if (cleanUpBeforeWriting === 'rmRootDir') await rmRootDir();
  if (cleanUpBeforeWriting === 'rmFixtures') await rmFixtures();
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
