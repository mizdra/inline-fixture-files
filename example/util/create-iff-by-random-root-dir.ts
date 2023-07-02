import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIFF, Directory } from '../../src/index.js';
/**
 * The root directory for fixtures.
 *
 * NOTE: To avoid bloating `fixtureDir`, it is recommended to delete `fixtureDir` at the beginning of the test.
 * ```ts
 * // vitest.setup.ts
 * import { rm } from 'node:fs/promises';
 * await rm(fixtureDir, { recursive: true, force: true });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const fixtureDir = join(tmpdir(), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);

export async function createIFFByRandomRootDir<const T extends Directory>(directory: T) {
  const getRandomRootDir = () => join(fixtureDir, randomUUID());
  const iff = await createIFF(directory, { rootDir: getRandomRootDir() });
  return {
    ...iff,
    fork: async function forkImpl<const U extends Directory>(additionalDirectory: U) {
      const forkedIff = await iff.fork(additionalDirectory, { rootDir: getRandomRootDir() });
      return { ...forkedIff, fork: forkImpl };
    },
  };
}
