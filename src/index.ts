/**
 * @packageDocumentation
 * The utility for writing fixture files inline.
 */

import { constants, cp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Directory, createIFFImpl } from './create-iff-impl.js';
import { FlattenDirectory, getPaths } from './get-paths.js';

export type { Directory, DirectoryItem, FileType } from './create-iff-impl.js';
export { IFFFixtureCreationError } from './error.js';

/**
 * The options for {@link defineIFFCreator}.
 * @public
 */
export interface DefineIFFCreatorOptions {
  /**
   * Function to generate the path to the root directory of the fixture.
   * The fixture will be written to the directory returned by this function.
   *
   * This function is called when a new root directory is needed (when calling {@link CreateIFF}
   * and {@link CreateIFFResult.fork}). However, if {@link CreateIFFOptions.overrideRootDir} is passed,
   * this function is not called and {@link CreateIFFOptions.overrideRootDir} is used for the root directory.
   *
   * @example
   * ```ts
   * import { randomUUID } from 'node:crypto';
   *
   * const fixtureBaseDir = join(tmpdir(), 'your-app-name', 'fixtures');
   * const iff = await createIFF(
   *   { 'a.txt': 'a', },
   *   { generateRootDir: () => join(fixtureBaseDir, randomUUID()) },
   * );
   * const forkedIff = await iff.fork({ 'b.txt': 'b' });
   *
   * expect(iff.rootDir).not.toBe(forkedIff.rootDir);
   * ```
   */
  generateRootDir(): string;
}

/**
 * The options for {@link CreateIFF}.
 * @public
 */
export interface CreateIFFOptions {
  /**
   * The path to the root directory of the fixture.
   * If this option is passed, the value of this option is used as the root directory
   * instead of the path generated by {@link DefineIFFCreatorOptions.generateRootDir} .
   */
  overrideRootDir?: string;
}

/**
 * The options for {@link CreateIFFResult.fork}.
 * @public
 */
export interface ForkOptions {
  /** {@inheritDoc CreateIFFOptions.overrideRootDir} */
  overrideRootDir?: string;
}

/**
 * The return of {@link CreateIFF}.
 * @public
 */
export interface CreateIFFResult<Paths extends Record<string, string>> {
  /**
   * The path of the fixture root directory.
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
  paths: Paths;
  /**
   * Join `rootDir` and `paths`. It is equivalent to `require('path').join(rootDir, ...paths)`.
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
  join(...paths: string[]): string;
  /**
   * Delete the fixture root directory.
   */
  rmRootDir(): Promise<void>;
  /**
   * Delete files under the fixture root directory.
   */
  rmFixtures(): Promise<void>;
  /**
   * Add fixtures to the fixture root directory.
   * @param additionalDirectory - The definition of fixtures to be added.
   * @returns The {@link CreateIFFResult} with the paths of the added fixtures to {@link CreateIFFResult.paths}.
   */
  addFixtures<const U extends Directory>(additionalDirectory: U): Promise<CreateIFFResult<Paths & FlattenDirectory<U>>>;
  /**
   * Change the root directory and take over the fixture you created.
   *
   * @remarks
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
   * @param forkOptions -  The fork options.
   */
  fork<const U extends Directory>(
    additionalDirectory: U,
    forkOptions?: ForkOptions,
  ): Promise<CreateIFFResult<Paths & FlattenDirectory<U>>>;
}

/**
 * Create fixtures in the specified directory.
 *
 * @remarks
 * The path must be in POSIX-style (`'dir/file.txt'`).
 * Use of Windows-style path (`'dir\\file.txt'`) is an undefined behavior.
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
export type CreateIFF = <const T extends Directory>(
  directory: T,
  options?: CreateIFFOptions,
) => Promise<CreateIFFResult<FlattenDirectory<T>>>;

/**
 * Define {@link CreateIFF}.
 * @param defineIFFCreatorOptions - The options for {@link defineIFFCreator}.
 * @public
 */
export function defineIFFCreator(defineIFFCreatorOptions: DefineIFFCreatorOptions): CreateIFF {
  async function createIFF<const T extends Directory>(
    directory: T,
    options?: CreateIFFOptions,
  ): Promise<CreateIFFResult<FlattenDirectory<T>>> {
    const rootDir = options?.overrideRootDir ?? defineIFFCreatorOptions.generateRootDir();
    const paths = getPaths(directory, rootDir);

    const iff: CreateIFFResult<FlattenDirectory<T>> = {
      rootDir,
      paths,
      join(...paths) {
        return join(rootDir, ...paths);
      },
      async rmRootDir() {
        await rm(rootDir, { recursive: true, force: true });
      },
      async rmFixtures() {
        const files = await readdir(rootDir);
        await Promise.all(files.map(async (file) => rm(iff.join(file), { recursive: true, force: true })));
      },
      async addFixtures(additionalDirectory) {
        await createIFFImpl(additionalDirectory, rootDir);
        return { ...iff, paths: { ...paths, ...getPaths(additionalDirectory, rootDir) } };
      },
      async fork(additionalDirectory, forkOptions) {
        const newRootDir = forkOptions?.overrideRootDir ?? defineIFFCreatorOptions.generateRootDir();
        if (newRootDir === rootDir) {
          throw new Error('New `rootDir` must be different from the `rootDir` generated by `generateRootDir`.');
        }

        const forkedIff = await createIFF({}, { ...options, overrideRootDir: newRootDir });

        await cp(rootDir, newRootDir, { recursive: true, mode: constants.COPYFILE_FICLONE });
        const { paths: addedPaths } = await forkedIff.addFixtures(additionalDirectory);

        return { ...forkedIff, paths: { ...getPaths(directory, newRootDir), ...addedPaths } };
      },
    };

    await createIFFImpl(directory, rootDir);

    return iff;
  }

  return createIFF;
}
