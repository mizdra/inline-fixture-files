import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectType } from 'ts-expect';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fixtureDir, exists } from './test/util.js';
import { defineIFFCreator } from './index.js';

beforeEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test('integration test', async () => {
  const fixtureDir1 = join(fixtureDir, '1');
  const fixtureDir2 = join(fixtureDir, '2');
  const fixtureDir3 = join(fixtureDir, '3');
  const generateRootDir = vi
    .fn()
    .mockReturnValueOnce(fixtureDir1)
    .mockReturnValueOnce(fixtureDir2)
    .mockReturnValueOnce(fixtureDir3);

  const createIFF = defineIFFCreator({ generateRootDir });
  const iff1 = await createIFF({
    'a.txt': 'a',
    'b': {
      'a.txt': 'b-a',
    },
  });
  expect(iff1.join('a.txt')).toBe(join(fixtureDir1, 'a.txt'));
  expect(iff1.join('b/a.txt')).toBe(join(fixtureDir1, 'b/a.txt'));
  expect(iff1.paths).toStrictEqual({
    'a.txt': join(fixtureDir1, 'a.txt'),
    'b': join(fixtureDir1, 'b'),
    'b/a.txt': join(fixtureDir1, 'b/a.txt'),
  });
  expect(await readFile(iff1.join('a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
  expect(await readFile(iff1.join('b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');

  const iff2 = await iff1.addFixtures({
    'c.txt': 'c',
  });
  expect(iff2.paths).toStrictEqual({
    'a.txt': join(fixtureDir1, 'a.txt'),
    'b': join(fixtureDir1, 'b'),
    'b/a.txt': join(fixtureDir1, 'b/a.txt'),
    'c.txt': join(fixtureDir1, 'c.txt'),
  });
  expect(await readFile(iff2.paths['c.txt'], 'utf-8')).toMatchInlineSnapshot('"c"');

  const iff3 = await iff2.fork({
    b: {
      'b.txt': 'b-b',
    },
  });
  expect(iff3.paths).toStrictEqual({
    'a.txt': join(fixtureDir2, 'a.txt'),
    'b': join(fixtureDir2, 'b'),
    'b/a.txt': join(fixtureDir2, 'b/a.txt'),
    'b/b.txt': join(fixtureDir2, 'b/b.txt'),
    'c.txt': join(fixtureDir2, 'c.txt'),
  });
  expect(await readFile(iff3.paths['b/b.txt'], 'utf-8')).toMatchInlineSnapshot('"b-b"');

  const iff4 = await iff3.fork({
    'd.txt': 'd',
  });
  expect(iff4.paths).toStrictEqual({
    // 'a.txt': join(fixtureDir3, 'a.txt'), // FIXME
    // 'b': join(fixtureDir3, 'b'), // FIXME
    // 'b/a.txt': join(fixtureDir3, 'b/a.txt'), // FIXME
    // 'b/b.txt': join(fixtureDir3, 'b/b.txt'), // FIXME
    // 'c.txt': join(fixtureDir3, 'c.txt'), // FIXME
    'd.txt': join(fixtureDir3, 'd.txt'),
  });
  expect(await readFile(iff4.paths['d.txt'], 'utf-8')).toMatchInlineSnapshot('"d"');
});

describe('defineIFFCreator', () => {
  test('generateRootDir', async () => {
    const generateRootDir = vi
      .fn()
      .mockReturnValueOnce(join(fixtureDir, 'a'))
      .mockReturnValueOnce(join(fixtureDir, 'b'));
    const createIFF = defineIFFCreator({ generateRootDir });
    const iff1 = await createIFF({ 'a.txt': 'a' });
    expect(iff1.join('a.txt')).toBe(join(fixtureDir, 'a/a.txt'));
    expect(generateRootDir).toHaveBeenCalledTimes(1);

    const iff2 = await iff1.fork({ 'b.txt': 'b' });
    expect(iff2.join('b.txt')).toBe(join(fixtureDir, 'b/b.txt'));
    expect(generateRootDir).toHaveBeenCalledTimes(2);
  });
});

describe('createIFF', () => {
  const createIFF = defineIFFCreator({ generateRootDir: () => fixtureDir });
  test('overrideRootDir', async () => {
    const generateRootDir = vi
      .fn()
      .mockReturnValueOnce(join(fixtureDir, 'a-1'))
      .mockReturnValueOnce(join(fixtureDir, 'b-1'));
    const iff1 = await createIFF({ 'a.txt': 'a' }, { overrideRootDir: join(fixtureDir, 'a-2') });
    expect(iff1.join('a.txt')).toBe(join(fixtureDir, 'a-2/a.txt'));
    expect(generateRootDir).toHaveBeenCalledTimes(0);

    const iff2 = await iff1.fork({ 'b.txt': 'b' }, { overrideRootDir: join(fixtureDir, 'b-2') });
    expect(iff2.join('b.txt')).toBe(join(fixtureDir, 'b-2/b.txt'));
    expect(generateRootDir).toHaveBeenCalledTimes(0);
  });
});

describe('CreateIFFResult', () => {
  const createIFF = defineIFFCreator({ generateRootDir: () => fixtureDir });
  test('rootDir', async () => {
    const createIFF = defineIFFCreator({ generateRootDir: () => join(fixtureDir, 'a') });
    const iff = await createIFF({});
    expect(iff.rootDir).toBe(join(fixtureDir, 'a'));
  });
  test('join', async () => {
    const iff = await createIFF({ 'a.txt': 'a' });
    expect(iff.join('a.txt')).toBe(join(fixtureDir, 'a.txt'));
    expect(iff.join('/a.txt')).toBe(join(fixtureDir, 'a.txt'));
    expect(iff.join('nonexistent-file.txt')).toBe(join(fixtureDir, 'nonexistent-file.txt'));
    expect(iff.join('')).toBe(fixtureDir);
  });
  test('rmFixtures', async () => {
    const iff = await createIFF({
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b']);
    await iff.rmFixtures();
    expect(await readdir(fixtureDir)).toStrictEqual([]);
  });
  test('rmRootDir', async () => {
    const iff = await createIFF({
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b']);
    await iff.rmRootDir();
    expect(await exists(fixtureDir)).toBe(false);
  });
  describe('addFixtures', () => {
    test('add fixtures', async () => {
      const iff = await createIFF({
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
        },
      });
      await iff.addFixtures({
        'b': {
          'b.txt': 'b-b',
        },
        'c.txt': 'c',
      });
      expect(await readFile(iff.join('a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
      expect(await readFile(iff.join('b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
      expect(await readFile(iff.join('b/b.txt'), 'utf-8')).toMatchInlineSnapshot('"b-b"');
      expect(await readFile(iff.join('c.txt'), 'utf-8')).toMatchInlineSnapshot('"c"');
    });
    test('return both the paths of the old fixture and the paths of the added fixture', async () => {
      const iff = await createIFF({
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
        },
      });
      const { paths } = await iff.addFixtures({
        'b': {
          'b.txt': 'b-b',
        },
        'c.txt': 'c',
      });
      expect(paths).toStrictEqual({
        'a.txt': join(fixtureDir, 'a.txt'),
        'b': join(fixtureDir, 'b'),
        'b/a.txt': join(fixtureDir, 'b/a.txt'),
        'b/b.txt': join(fixtureDir, 'b/b.txt'),
        'c.txt': join(fixtureDir, 'c.txt'),
      });
      expectType<{
        'a.txt': string;
        'b': string;
        'b/a.txt': string;
        'b/b.txt': string;
        'c.txt': string;
      }>(paths);
      // @ts-expect-error
      // eslint-disable-next-line no-unused-expressions
      paths['d.txt'];
    });
    test('return utility functions that behave the same as the old ones', async () => {
      const iff1 = await createIFF({ 'a.txt': 'a' });

      const iff2 = await iff1.addFixtures({ 'b.txt': 'b' });
      expect(iff2.rootDir).toBe(iff1.rootDir);
      expect(iff2.join('a.txt')).toBe(iff1.join('a.txt'));

      const iff3 = await iff2.addFixtures({ 'c.txt': 'c' });

      expect(await readdir(fixtureDir)).not.toStrictEqual([]);
      await iff3.rmFixtures();
      expect(await readdir(fixtureDir)).toStrictEqual([]);

      expect(await exists(fixtureDir)).toBe(true);
      await iff3.rmRootDir();
      expect(await exists(fixtureDir)).toBe(false);
    });
  });
  describe('fork', () => {
    const baseRootDir = join(fixtureDir, 'base');
    const forkedRootDir = join(fixtureDir, 'forked');
    test('fork IFF', async () => {
      const baseIff = await createIFF({ 'a.txt': 'a', 'b': { 'a.txt': 'b-a' } }, { overrideRootDir: baseRootDir });

      await baseIff.fork({ 'b': { 'b.txt': 'b-b' }, 'c.txt': 'c' }, { overrideRootDir: forkedRootDir });

      // `forkedIff` inherits fixtures from `baseIff`.
      expect(await readFile(join(forkedRootDir, 'a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
      expect(await readFile(join(forkedRootDir, 'b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
      expect(await readFile(join(forkedRootDir, 'b/b.txt'), 'utf-8')).toMatchInlineSnapshot('"b-b"');
      expect(await readFile(join(forkedRootDir, 'c.txt'), 'utf-8')).toMatchInlineSnapshot('"c"');

      // The `baseIff` fixtures are left in place.
      expect(await readFile(join(baseRootDir, 'a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
      expect(await readFile(join(baseRootDir, 'b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
    });
    test('throw error if forkOptions.overrideRootDir is the same as rootDir generated by generateRootDir', async () => {
      const iff = await createIFF({}, { overrideRootDir: baseRootDir });
      await expect(iff.fork({}, { overrideRootDir: baseRootDir })).rejects.toThrowErrorMatchingInlineSnapshot(
        '"New `rootDir` must be different from the `rootDir` generated by `generateRootDir`."',
      );
    });
    // FIXME
    test.fails('return both the path of the old fixture and the path of the fixture added by fork', async () => {
      const iff1 = await createIFF({ 'a.txt': 'a' }, { overrideRootDir: baseRootDir });
      const iff2 = await iff1.addFixtures({ 'b.txt': 'b' });
      const iff3 = await iff2.fork({ 'c.txt': 'c' }, { overrideRootDir: forkedRootDir });
      expect(iff3.paths).toStrictEqual({
        'a.txt': join(forkedRootDir, 'a.txt'),
        'b.txt': join(forkedRootDir, 'b.txt'),
        'c.txt': join(forkedRootDir, 'c.txt'),
      });
      expectType<{
        'a.txt': string;
        'b.txt': string;
        'c.txt': string;
      }>(iff3.paths);
      // @ts-expect-error
      // eslint-disable-next-line no-unused-expressions
      paths['d.txt'];
    });
  });
});
