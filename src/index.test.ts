import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fixtureDir, oneOf, exists } from './test/util.js';
import { CreateIFFOptions, createIFF } from './index.js';

const options = {
  rootDir: fixtureDir,
} as const satisfies CreateIFFOptions;

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
  test('cleanUpBeforeWriting', async () => {
    // cleanUpBeforeWriting: 'rmRootDir'
    await createIFF({ 'a.txt': 'a' }, { ...options, cleanUpBeforeWriting: 'rmRootDir' });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt']);

    // cleanUpBeforeWriting: false
    await createIFF({ 'b.txt': 'b' }, { ...options, cleanUpBeforeWriting: false });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b.txt']);

    // cleanUpBeforeWriting: 'rmFixtures'
    await createIFF({}, { ...options, cleanUpBeforeWriting: 'rmFixtures' });
    expect(await readdir(fixtureDir)).toStrictEqual([]);

    // cleanUpBeforeWriting: 'rmRootDir'
    await createIFF({}, { ...options, cleanUpBeforeWriting: 'rmRootDir' });
    expect(await exists(fixtureDir)).toBe(false);
  });
  describe('noWrite', () => {
    test('skip writing if true', async () => {
      const iff1 = await createIFF({ 'a.txt': 'a' }, { ...options, noWrite: false });
      expect(await exists(iff1.join('a.txt'))).toBe(true);

      const iff2 = await createIFF({ 'b.txt': 'b' }, { ...options, noWrite: true });
      expect(await exists(iff2.join('b.txt'))).toBe(false);
    });
    test('skip clean-up if true', async () => {
      const iff1 = await createIFF({ 'a.txt': 'a' }, { ...options, noWrite: false });
      expect(await exists(iff1.join('a.txt'))).toBe(true);

      const cleanUpBeforeWriting = oneOf(['rmRootDir', 'rmFixtures']);
      const iff2 = await createIFF({}, { ...options, cleanUpBeforeWriting, noWrite: true });
      expect(await exists(iff2.join('a.txt'))).toBe(true);

      const iff3 = await createIFF({}, { ...options, cleanUpBeforeWriting, noWrite: false });
      expect(await exists(iff3.join('a.txt'))).toBe(false);
    });
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
  test('addFixtures', async () => {
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
});
