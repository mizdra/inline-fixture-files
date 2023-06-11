import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fixtureDir } from './test/util.js';
import { initIFFCreator as initIFF } from './index.js';

const createIFF = initIFF({
  rootDir: fixtureDir,
});

describe('initIFF', () => {
  test('rootDir', async () => {
    const createIFF = initIFF({ rootDir: join(fixtureDir, 'a') });
    const iff = await createIFF({ 'a.txt': 'a' });
    expect(iff.join('a.txt')).toBe(join(fixtureDir, 'a/a.txt'));
  });
  test('rmFixturesBeforeCreating', async () => {
    // rmFixturesBeforeCreating: true
    const createIFF1 = initIFF({ rootDir: fixtureDir, rmFixturesBeforeCreating: true });
    await createIFF1({ 'a.txt': 'a' });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt']);

    // rmFixturesBeforeCreating: false
    const createIFF2 = initIFF({ rootDir: fixtureDir, rmFixturesBeforeCreating: false });
    await createIFF2({ 'b.txt': 'b' });
    expect(await readdir(fixtureDir)).toStrictEqual(['a.txt', 'b.txt']);

    // rmFixturesBeforeCreating: true
    const createIFF3 = initIFF({ rootDir: fixtureDir, rmFixturesBeforeCreating: true });
    await createIFF3({ 'c.txt': 'c' });
    expect(await readdir(fixtureDir)).toStrictEqual(['c.txt']);
  });
});

describe('createIFF', () => {
  test('integration', async () => {
    const iff = await createIFF({
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    });
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
  test('rootDir', async () => {
    const createIFF = initIFF({ rootDir: join(fixtureDir, 'a') });
    const iff = await createIFF({});
    expect(iff.rootDir).toBe(join(fixtureDir, 'a'));
  });
  test('join', async () => {
    const iff = await createIFF({
      'a.txt': 'a',
    });
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
    await expect(readdir(fixtureDir)).rejects.toThrowError(); // The directory is removed, so readdir throws error
  });
  test('addFixtures', async () => {
    const iff = await createIFF({
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    });
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
  test('maskRootDir', async () => {
    const createIFF = initIFF({ rootDir: join(fixtureDir, 'a') });
    const iff = await createIFF({});
    expect(iff.maskRootDir(iff.join(''))).toBe('<iff.rootDir>');
    expect(iff.maskRootDir(iff.join('a'))).toBe(join('<iff.rootDir>', 'a'));
    expect(iff.maskRootDir(resolve('/a/b/c'))).toBe(resolve('/a/b/c'));
  });
});
