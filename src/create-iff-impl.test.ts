import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, expect, test } from 'vitest';
import { createIFFImpl } from './create-iff-impl.js';
import { fixtureDir } from './test/util.js';

beforeEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test('basic', async () => {
  await createIFFImpl(
    {
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
    },
    fixtureDir,
  );
  expect(await readFile(join(fixtureDir, 'a.txt'), 'utf-8')).toMatchInlineSnapshot('"a"');
  expect(await readFile(join(fixtureDir, 'b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a"');
});

test('create directory with property name containing separator', async () => {
  await createIFFImpl(
    {
      'a/a.txt': 'a-a',
      'b/a': {
        'a.txt': 'b-a-a',
      },
    },
    fixtureDir,
  );
  expect(await readFile(join(fixtureDir, 'a/a.txt'), 'utf-8')).toMatchInlineSnapshot('"a-a"');
  expect(await readFile(join(fixtureDir, 'b/a/a.txt'), 'utf-8')).toMatchInlineSnapshot('"b-a-a"');
});

test('create empty directory with empty object', async () => {
  await createIFFImpl({ a: {} }, fixtureDir);
  const files = await readdir(join(fixtureDir, 'a'));
  expect(files).toEqual([]);
});

test('throw error when item name starts with separator', async () => {
  await expect(createIFFImpl({ '/a.txt': 'a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Item name must not start with separator: /a.txt"',
  );
  await expect(createIFFImpl({ '/a': {} }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Item name must not start with separator: /a"',
  );
  // NOTE: Use of Windows path separator is an undefined behavior.
  await expect(createIFFImpl({ '\\a.txt': 'a' }, fixtureDir)).resolves.not.toThrow();
});

test('throw error when item name ends with separator', async () => {
  await expect(createIFFImpl({ 'a.txt/': 'a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Item name must not end with separator: a.txt/"',
  );
  await expect(createIFFImpl({ 'a/': {} }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Item name must not end with separator: a/"',
  );
  // NOTE: Use of Windows path separator is an undefined behavior.
  await expect(createIFFImpl({ 'a.txt\\': 'a' }, fixtureDir)).resolves.not.toThrow();
});

test('throw error when item name contains consecutive separators', async () => {
  await expect(createIFFImpl({ 'a//a.txt': 'a--a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    '"Item name must not contain consecutive separators: a//a.txt"',
  );
});

test('merge creating fixtures for same directory', async () => {
  await createIFFImpl(
    {
      'a': {},
      'a/a.txt': 'a-a',
      'a/b': {
        'a.txt': 'a-b-a',
      },
    },
    fixtureDir,
  );
  expect(await readFile(join(fixtureDir, 'a/a.txt'), 'utf-8')).toMatchInlineSnapshot('"a-a"');
  expect(await readFile(join(fixtureDir, 'a/b/a.txt'), 'utf-8')).toMatchInlineSnapshot('"a-b-a"');
});

test('prefer the later fixture when creating fixtures for same path', async () => {
  await createIFFImpl(
    {
      'a/a.txt': 'a-a#1',
      'a': {
        'a.txt': 'a-a#2',
      },
    },
    fixtureDir,
  );
  expect(await readFile(join(fixtureDir, 'a/a.txt'), 'utf-8')).toMatchInlineSnapshot('"a-a#2"');
});
