import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Directory, createIFF as createIFFImpl } from './create-iff.js';
import { FlattenDirectory, getPaths } from './get-paths.js';

type AddFixturesResult<T extends Directory> = {
  /**
   * The paths of the added fixtures.
   * @see CreateIFFResult#paths
   */
  paths: FlattenDirectory<T>;
};

export type CreateIFFResult<T extends Directory> = {
  /**
   * The directory where fixtures are written.
   * This directory is obtained by processing the directory specified in `CreateIFFOptions#rootDir`
   * using `path.resolve`.
   */
  rootDir: string;
  /**
   * The paths of the fixtures.
   * For example, if you create a fixture `a.txt`, then `iff.paths['a.txt'] === `iff.join('a.txt')`.
   *
   * ```ts
   * const iff = await createIFF({
   *   'a.txt': 'a',
   *   'b': {
   *      'a.txt': 'b-a',
   *   },
   *   'c/a/a.txt': 'c-a-a',
   * }, fixturesDir);
   * expect(iff.paths).toStrictEqual({
   *   'a.txt': iff.join('a.txt'),
   *   'b': iff.join('b'),
   *   'b/a.txt': iff.join('b/a.txt'),
   *   'c': iff.join('c'),
   *   'c/a': iff.join('c/a'),
   *   'c/a/a.txt': iff.join('c/a/a.txt'),
   * });
   * ```
   *
   * The `paths` keys are strictly typed. However, index signatures are excluded for convenience.
   *
   * ```ts
   * const iff = await createIFF({
   *   'a.txt': 'a',
   *   'b': {
   *      'a.txt': 'b-a',
   *   },
   *   ['c.txt' as string]: 'c',
   *   ['d' as string]: {
   *     'a.txt': 'd-a',
   *   },
   * }, fixturesDir);
   * expectType<{
   *   'a.txt': string;
   *   'b': string;
   *   'b/a.txt': string;
   * }>(iff.paths);
   * ```
   */
  paths: FlattenDirectory<T>;
  /**
   * Join `rootDir` and `paths`.
   * That is, it is equivalent to `require('path').join(rootDir, ...paths)`.
   */
  join: (...paths: string[]) => string;
  /** Delete `rootDir`. */
  rmRootDir: () => Promise<void>;
  /** Delete fixtures under `rootDir`. */
  rmFixtures: () => Promise<void>;
  /**
   * Add fixtures to `rootDir`.
   * This function always performs the write operation regardless of the value of `CreateIFFOptions#noWrite`.
   * @param directory The definition of fixtures to be added.
   * @returns The paths of the added fixtures.
   */
  addFixtures<U extends Directory>(directory: U): Promise<AddFixturesResult<U>>;
};

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
  cleanUpBeforeWriting?: 'rmRootDir' | 'rmFixtures' | false | undefined;
  /**
   * If `true`, `createIFF` does not write files.
   * When this option is `true`, the clean-up process by `cleanUpBeforeWriting` is skipped,
   * but writing by `CreateIFFResult#addFixtures` is not disabled.
   * @default false
   */
  noWrite?: boolean | undefined;
};

export const DEFAULT_CLEAN_UP_BEFORE_WRITING = 'rmRootDir' satisfies Exclude<
  CreateIFFOptions['cleanUpBeforeWriting'],
  undefined
>;
export const DEFAULT_NO_WRITE = false satisfies Exclude<CreateIFFOptions['noWrite'], undefined>;

/**
 * Create fixtures in the specified directory.
 * @param directory The definition of fixtures to be created.
 * @param options Options for creating fixtures.
 * @returns An object that provides functions to manipulate the fixtures.
 */
export async function createIFF<const T extends Directory>(
  directory: T,
  options: CreateIFFOptions,
): Promise<CreateIFFResult<T>> {
  const { cleanUpBeforeWriting = DEFAULT_CLEAN_UP_BEFORE_WRITING, noWrite = DEFAULT_NO_WRITE } = options;
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
  async function addFixtures<U extends Directory>(directory: U): Promise<AddFixturesResult<U>> {
    await createIFFImpl(directory, rootDir);
    return { paths: getPaths(directory, rootDir) };
  }

  if (!noWrite) {
    if (cleanUpBeforeWriting) {
      if (cleanUpBeforeWriting === 'rmRootDir') await rmRootDir();
      if (cleanUpBeforeWriting === 'rmFixtures') await rmFixtures();
    }
    await createIFFImpl(directory, rootDir);
  }

  return {
    rootDir,
    join: getRealPath,
    rmRootDir,
    rmFixtures,
    addFixtures,
    paths: getPaths<T>(directory, rootDir),
  };
}
