import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fixtureDir } from './test/util.js';
import { CreateIFFOptions, createIFF } from './index.js';

const options = {
  rootDir: fixtureDir,
} as const satisfies CreateIFFOptions;

test('integration', async () => {
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

  await expect(readdir(fixtureDir)).rejects.toThrowError(); // The directory is removed, so readdir throws error
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
    await expect(readdir(fixtureDir)).rejects.toThrowError(); // The directory is removed, so readdir throws error
  });
  test('noWrite', async () => {
    const iff1 = await createIFF({ 'a.txt': 'a' }, { ...options, noWrite: false });
    await expect(readFile(iff1.join('a.txt'), 'utf-8')).resolves.not.toThrowError();
    const iff2 = await createIFF({ 'a.txt': 'a' }, { ...options, noWrite: true });
    await expect(readFile(iff2.join('a.txt'), 'utf-8')).rejects.toThrowError();
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
    await expect(readdir(fixtureDir)).rejects.toThrowError(); // The directory is removed, so readdir throws error
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
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b']);
    expect(await readdir(iff.join('b'))).toStrictEqual(['a.txt']);
    await iff.addFixtures({
      'b': {
        'b.txt': 'b-b',
      },
      'c.txt': 'c',
    });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b', 'c.txt']);
    expect(await readdir(iff.join('b'))).toStrictEqual(['a.txt', 'b.txt']);
  });
});
