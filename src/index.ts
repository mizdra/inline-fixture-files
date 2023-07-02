import { constants, cp, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Directory, createIFF as createIFFImpl } from './create-iff.js';
import { FlattenDirectory, getPaths } from './get-paths.js';

export type { Directory, DirectoryItem, FileType } from './create-iff.js';

/** @public */
export interface CreateIFFOptions {
  /**
   * Root directory for fixtures.
   */
  rootDir: string;
}

/** @public */
export interface AddFixturesResult<T extends Directory, U extends Directory> {
  /**
   * The paths of the added fixtures.
   * @see CreateIFFResult#paths
   */
  paths: FlattenDirectory<T> & FlattenDirectory<U>;
}

/** @public */
// eslint-disable-next-line no-use-before-define
export interface ForkResult<T extends Directory, U extends Directory> extends CreateIFFResult<T> {
  /**
   * The paths of the added fixtures.
   * @see CreateIFFResult#paths
   */
  paths: FlattenDirectory<T> & FlattenDirectory<U>;
}

/** @public */
export interface CreateIFFResult<T extends Directory> {
  /**
   * The directory where fixtures are written.
   * This directory is obtained by processing the directory specified in `CreateIFFOptions#rootDir`
   * using `path.resolve`.
   */
  rootDir: string;
  /**
   * The paths of the fixtures. It is useful to get the path of fixtures in type safety.
   *
   * @example
   * For example, if you create a fixture `a.txt`, then `iff.paths['a.txt'] === join(fixturesDir, 'a.txt')`.
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
   *   'a.txt': join(fixturesDir, 'a.txt'),
   *   'b': join(fixturesDir, 'b'),
   *   'b/a.txt': join(fixturesDir, 'b/a.txt'),
   *   'c': join(fixturesDir, 'c'),
   *   'c/a': join(fixturesDir, 'c/a'),
   *   'c/a/a.txt': join(fixturesDir, 'c/a/a.txt'),
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
   *
   * @example
   * This is useful for generating paths to files not created by `createIFF`.
   *
   * ```ts
   * const iff = await createIFF({ 'a.txt': 'a' }, fixturesDir);
   * expect(iff.join('a.txt')).toBe(join(fixturesDir, 'a.txt'));
   * expect(iff.join('non-existent.txt')).toBe(join(fixturesDir, 'non-existent.txt'));
   * ```
   */
  join: (...paths: string[]) => string;
  /**
   * Delete `rootDir`.
   */
  rmRootDir: () => Promise<void>;
  /**
   * Delete fixtures under `rootDir`.
   */
  rmFixtures: () => Promise<void>;
  /**
   * Add fixtures to `rootDir`.
   * @param directory - The definition of fixtures to be added.
   * @returns The paths to fixtures created with `createIFF` and added with `CreateIFFResult#addFixtures`.
   */
  addFixtures<const U extends Directory>(directory: U): Promise<AddFixturesResult<T, U>>;
  /**
   * Change the root directory and take over the fixture you created.
   *
   * Internally, first a new root directory is created, and then the fixtures from the old root directory are copied into it.
   * Finally, the fixtures specified in `additionalDirectory` are added to the new root directory.
   *
   * The copy operation will attempt to create a copy-on-write reflink. If the platform does not support copy-on-write,
   * then a fallback copy mechanism is used.
   *
   * @example
   * ```ts
   * const baseIff = await createIFF({
   *   'a.txt': 'a',
   *   'b/a.txt': 'b-a',
   *   },
   * }, { rootDir: baseRootDir });
   * const forkedIff = await baseIff.fork({
   *   'b/b.txt': 'b-b',
   *   'c.txt': 'c',
   * }, { rootDir: forkedRootDir });
   *
   * // `forkedIff` inherits fixtures from `baseIff`.
   * expect(await readFile(join(forkedRootDir, 'a.txt'), 'utf-8')).toBe('a');
   * expect(await readFile(join(forkedRootDir, 'b/a.txt'), 'utf-8')).toBe('b-a');
   * expect(await readFile(join(forkedRootDir, 'b/b.txt'), 'utf-8')).toBe('b-b');
   * expect(await readFile(join(forkedRootDir, 'c.txt'), 'utf-8')).toBe('c');
   *
   * // The `baseIff` fixtures are left in place.
   * expect(await readFile(join(baseRootDir, 'a.txt'), 'utf-8')).toBe('a');
   * expect(await readFile(join(baseRootDir, 'b/a.txt'), 'utf-8')).toBe('b-a');
   * ```
   * @param additionalDirectory - The definition of fixtures to be added.
   * @param options -  Options for creating fixtures.
   */
  fork: <const U extends Directory>(additionalDirectory: U, options: CreateIFFOptions) => Promise<ForkResult<T, U>>;
}

/**
 * Create fixtures in the specified directory.
 * The path separator must be in POSIX format (`/`).
 * Use of Windows path separator is an undefined behavior.
 *
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
 * expect(await readFile(join(fixturesDir, 'a.txt'), 'utf-8')).toBe('a');
 * expect(await readFile(join(fixturesDir, 'b/a.txt'), 'utf-8')).toBe('b-a');
 * expect(await readFile(join(fixturesDir, 'c/a/a.txt'), 'utf-8')).toBe('c-a-a');
 * ```
 * @param directory - The definition of fixtures to be created.
 * @param options - Options for creating fixtures.
 * @returns An object that provides functions to manipulate the fixtures.
 * @public
 */
export async function createIFF<const T extends Directory>(
  directory: T,
  options: CreateIFFOptions,
): Promise<CreateIFFResult<T>> {
  const rootDir = resolve(options.rootDir); // normalize path
  const paths = getPaths(directory, rootDir);

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
  async function addFixtures<const U extends Directory>(directory: U): Promise<AddFixturesResult<T, U>> {
    await createIFFImpl(directory, rootDir);
    return { paths: { ...paths, ...getPaths(directory, rootDir) } };
  }
  async function fork<const U extends Directory>(
    additionalDirectory: U,
    forkedIffOptions: CreateIFFOptions,
  ): Promise<ForkResult<T, U>> {
    const forkedIff = await createIFF({}, forkedIffOptions);
    await cp(rootDir, forkedIffOptions.rootDir, { recursive: true, mode: constants.COPYFILE_FICLONE });
    const { paths: addedPaths } = await forkedIff.addFixtures(additionalDirectory);
    return { ...forkedIff, paths: { ...getPaths(directory, forkedIffOptions.rootDir), ...addedPaths } };
  }

  await createIFFImpl(directory, rootDir);

  return {
    rootDir,
    join: getRealPath,
    rmRootDir,
    rmFixtures,
    addFixtures,
    paths,
    fork,
  };
}
