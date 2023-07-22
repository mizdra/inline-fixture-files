import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expectType } from 'ts-expect';
import { beforeEach, describe, expect, test } from 'vitest';
import { fixtureDir, exists } from './test/util.js';
import { createIFF, CreateIFFOptions } from './index.js';

const options = {
  rootDir: fixtureDir,
} as const satisfies CreateIFFOptions;

beforeEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test('integration test', async () => {
  const iff = await createIFF(
    {
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    },
    options,
  );
  expect(iff.join('a.txt')).toBe(join(fixtureDir, 'a.txt'));
  expect(iff.join('b/a.txt')).toBe(join(fixtureDir, 'b/a.txt'));

  expect(iff.paths['a.txt']).toBe(join(fixtureDir, 'a.txt'));
  expect(iff.paths['b']).toBe(join(fixtureDir, 'b'));
  expect(iff.paths['b/a.txt']).toBe(join(fixtureDir, 'b/a.txt'));

  expect(await readFile(iff.join('a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
  expect(await readFile(iff.join('b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');

  await writeFile(iff.join('c.txt'), 'c');
  expect(await readFile(iff.join('c.txt'), 'utf-8')).toMatchInlineSnapshot('"c"');

  await iff.rmFixtures();

  expect(await readdir(fixtureDir)).toStrictEqual([]);

  await iff.rmRootDir();

  expect(await exists(fixtureDir)).toBe(false);
});

describe('createIFF', () => {
  test('rootDir', async () => {
    const iff = await createIFF({ 'a.txt': 'a' }, { rootDir: join(fixtureDir, 'a') });
    expect(iff.join('a.txt')).toBe(join(fixtureDir, 'a/a.txt'));
  });
});

describe('CreateIFFResult', () => {
  test('rootDir', async () => {
    const iff = await createIFF({}, { rootDir: join(fixtureDir, 'a') });
    expect(iff.rootDir).toBe(join(fixtureDir, 'a'));
  });
  test('join', async () => {
    const iff = await createIFF(
      {
        'a.txt': 'a',
      },
      options,
    );
    expect(iff.join('a.txt')).toBe(join(fixtureDir, 'a.txt'));
    expect(iff.join('/a.txt')).toBe(join(fixtureDir, 'a.txt'));
    expect(iff.join('nonexistent-file.txt')).toBe(join(fixtureDir, 'nonexistent-file.txt'));
    expect(iff.join('')).toBe(fixtureDir);
  });
  test('rmFixtures', async () => {
    const iff = await createIFF(
      {
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
        },
      },
      options,
    );
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b']);
    await iff.rmFixtures();
    expect(await readdir(fixtureDir)).toStrictEqual([]);
  });
  test('rmRootDir', async () => {
    const iff = await createIFF(
      {
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
        },
      },
      options,
    );
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b']);
    await iff.rmRootDir();
    expect(await exists(fixtureDir)).toBe(false);
  });
  describe('addFixtures', () => {
    test('add fixtures', async () => {
      const iff = await createIFF(
        {
          'a.txt': 'a',
          'b': {
            'a.txt': 'b-a',
          },
        },
        options,
      );
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
      const iff = await createIFF(
        {
          'a.txt': 'a',
          'b': {
            'a.txt': 'b-a',
          },
        },
        options,
      );
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
    test('return the same properties as the old ones, except for paths', async () => {
      const iff = await createIFF({}, options);
      const { paths, ...rest } = await iff.addFixtures({});
      expect(rest).toStrictEqual({
        rootDir: iff.rootDir,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        join: iff.join,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        rmRootDir: iff.rmRootDir,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        rmFixtures: iff.rmFixtures,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        addFixtures: iff.addFixtures,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        fork: iff.fork,
      });
    });
  });
  describe('fork', () => {
    test('fork IFF', async () => {
      const baseRootDir = join(fixtureDir, 'base');
      const forkedRootDir = join(fixtureDir, 'forked');
      const baseIff = await createIFF({ 'a.txt': 'a', 'b': { 'a.txt': 'b-a' } }, { rootDir: baseRootDir });

      await baseIff.fork({ 'b': { 'b.txt': 'b-b' }, 'c.txt': 'c' }, { rootDir: forkedRootDir });

      // `forkedIff` inherits fixtures from `baseIff`.
      expect(await readFile(join(forkedRootDir, 'a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
      expect(await readFile(join(forkedRootDir, 'b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
      expect(await readFile(join(forkedRootDir, 'b/b.txt'), 'utf-8')).toMatchInlineSnapshot('"b-b"');
      expect(await readFile(join(forkedRootDir, 'c.txt'), 'utf-8')).toMatchInlineSnapshot('"c"');

      // The `baseIff` fixtures are left in place.
      expect(await readFile(join(baseRootDir, 'a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
      expect(await readFile(join(baseRootDir, 'b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
    });
  });
});

test('ForkResult', async () => {
  const baseRootDir = join(fixtureDir, 'base');
  const forkedRootDir = join(fixtureDir, 'forked');
  const baseIff = await createIFF({ 'a.txt': 'a', 'b': { 'a.txt': 'b-a' } }, { rootDir: baseRootDir });

  const forkedIff = await baseIff.fork({ 'b': { 'b.txt': 'b-b' }, 'c.txt': 'c' }, { rootDir: forkedRootDir });

  expect(forkedIff.rootDir).toBe(forkedRootDir);

  expect(forkedIff.paths).toStrictEqual({
    'a.txt': join(forkedRootDir, 'a.txt'),
    'b': join(forkedRootDir, 'b'),
    'b/a.txt': join(forkedRootDir, 'b/a.txt'),
    'b/b.txt': join(forkedRootDir, 'b/b.txt'),
    'c.txt': join(forkedRootDir, 'c.txt'),
  });
  expectType<{
    'a.txt': string;
    'b': string;
    'b/a.txt': string;
    'b/b.txt': string;
    'c.txt': string;
  }>(forkedIff.paths);
  // @ts-expect-error
  // eslint-disable-next-line no-unused-expressions
  forkedIff.paths['d.txt'];
});
