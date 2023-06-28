import { readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Directory, createIFF as createIFFImpl } from './create-iff.js';
import { FlattenDirectory, getPaths } from './get-paths.js';

type AddFixturesResult<T extends Directory> = {
  /**
   * The paths of the added fixtures.
   * @see CreateIFFResult#paths
   * @name AddFixturesResult#paths
   */
  paths: FlattenDirectory<T>;
};

export type CreateIFFResult<T extends Directory> = {
  /**
   * The directory where fixtures are written.
   * This directory is obtained by processing the directory specified in `CreateIFFOptions#rootDir`
   * using `path.resolve`.
   * @name CreateIFFResult#rootDir
   */
  rootDir: string;
  /**
   * The paths of the fixtures.
   * For example, if you create a fixture `a.txt`, then `iff.paths['a.txt'] === iff.join('a.txt')`.
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
   * @name CreateIFFResult#paths
   */
  paths: FlattenDirectory<T>;
  /**
   * Join `rootDir` and `paths`.
   * That is, it is equivalent to `require('path').join(rootDir, ...paths)`.
   * @name CreateIFFResult#join
   */
  join: (...paths: string[]) => string;
  /**
   * Delete `rootDir`.
   * @name CreateIFFResult#rmRootDir
   */
  rmRootDir: () => Promise<void>;
  /**
   * Delete fixtures under `rootDir`.
   * @name CreateIFFResult#rmFixtures
   */
  rmFixtures: () => Promise<void>;
  /**
   * Add fixtures to `rootDir`.
   * This function always performs the write operation regardless of the value of `CreateIFFOptions#noWrite`.
   * @param directory The definition of fixtures to be added.
   * @returns The paths of the added fixtures.
   * @name CreateIFFResult#addFixtures
   * @param directory @ignore
   */
  addFixtures<U extends Directory>(directory: U): Promise<AddFixturesResult<U>>;
};

export type CreateIFFOptions = {
  /**
   * Root directory for fixtures.
   * @name CreateIFFOptions#rootDir
   */
  rootDir: string;
  /**
   * If `true`, `createIFF` does not write files.
   * But this option cannot disable writing by `CreateIFFResult#addFixtures`.
   * @default false
   * @name CreateIFFOptions#noWrite
   */
  noWrite?: boolean | undefined;
};

export const DEFAULT_NO_WRITE = false satisfies Exclude<CreateIFFOptions['noWrite'], undefined>;

/**
 * Create fixtures in the specified directory.
 * The path separator must be in POSIX format (`/`).
 * Use of Windows path separator is an undefined behavior.
 * @example
 * ```ts
 * const iff = await createIFF(
 *   {
 *   'a.txt': 'a',
 *   'b': {
 *     'a.txt': 'b-a',
 *   },
 *   'c/a/a.txt': 'c-a-a',
 * }, fixturesDir);
 * ```
 * @param directory The definition of fixtures to be created.
 * @param options Options for creating fixtures.
 * @returns An object that provides functions to manipulate the fixtures.
 */
export async function createIFF<const T extends Directory>(
  directory: T,
  options: CreateIFFOptions,
): Promise<CreateIFFResult<T>> {
  const { noWrite = DEFAULT_NO_WRITE } = options;
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
