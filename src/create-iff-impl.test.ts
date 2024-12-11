import { readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, expectTypeOf, test } from 'vitest';
import type { MergeDirectory } from './create-iff-impl.js';
import { createIFFImpl } from './create-iff-impl.js';
import { fixtureDir, sleep } from './test/util.js';

beforeEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test('MergeDirectory', () => {
  expectTypeOf<MergeDirectory<{ file1: string }, { file2: string }>>().toEqualTypeOf<{
    file1: string;
    file2: string;
  }>();
  expectTypeOf<MergeDirectory<{ dir1: { file1: string } }, { dir1: { file2: string } }>>().toEqualTypeOf<{
    dir1: { file1: string; file2: string };
  }>();
  expectTypeOf<MergeDirectory<{ dir1: string }, { dir1: { file1: string } }>>().toEqualTypeOf<{
    dir1: { file1: string };
  }>();
  expectTypeOf<MergeDirectory<{ dir1: { file1: string } }, { dir1: string }>>().toEqualTypeOf<{
    dir1: { file1: string };
  }>();
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
  await createIFFImpl({}, fixtureDir);
  expect(await readdir(fixtureDir)).toEqual([]);

  await createIFFImpl({ a: {} }, fixtureDir);
  expect(await readdir(join(fixtureDir, 'a'))).toEqual([]);
});

test('throw error when item name starts with separator', async () => {
  await expect(createIFFImpl({ '/a.txt': 'a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Item name must not start with separator: /a.txt]`,
  );
  await expect(createIFFImpl({ '/a': {} }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Item name must not start with separator: /a]`,
  );
  // NOTE: Use of Windows path separator is an undefined behavior.
  await expect(createIFFImpl({ '\\a.txt': 'a' }, fixtureDir)).resolves.not.toThrow();
});

test('throw error when item name ends with separator', async () => {
  await expect(createIFFImpl({ 'a.txt/': 'a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Item name must not end with separator: a.txt/]`,
  );
  await expect(createIFFImpl({ 'a/': {} }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Item name must not end with separator: a/]`,
  );
  // NOTE: Use of Windows path separator is an undefined behavior.
  await expect(createIFFImpl({ 'a.txt\\': 'a' }, fixtureDir)).resolves.not.toThrow();
});

test('throw error when item name contains consecutive separators', async () => {
  await expect(createIFFImpl({ 'a//a.txt': 'a--a' }, fixtureDir)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: Item name must not contain consecutive separators: a//a.txt]`,
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

describe('write fixtures in parallel', { repeats: 10 }, () => {
  test('write fixtures in the same directory in parallel', async () => {
    let i = 1;
    await createIFFImpl(
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'a.txt': async (path) => {
          await sleep(30);
          await writeFile(path, (i++).toString());
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'b.txt': async (path) => {
          await sleep(10);
          await writeFile(path, (i++).toString());
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'c.txt': async (path) => {
          await sleep(20);
          await writeFile(path, (i++).toString());
        },
      },
      fixtureDir,
    );

    expect(await readFile(join(fixtureDir, 'a.txt'), 'utf-8')).toBe('3');
    expect(await readFile(join(fixtureDir, 'b.txt'), 'utf-8')).toBe('1');
    expect(await readFile(join(fixtureDir, 'c.txt'), 'utf-8')).toBe('2');
  });
});

describe('support flexible fixture creation API', () => {
  test('write file with callback', async () => {
    await createIFFImpl(
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'utime.txt': async (path) => {
          await writeFile(path, 'utime');
          await utimes(path, new Date(0), new Date(1));
        },
      },
      fixtureDir,
    );
    const { atime, mtime } = await stat(join(fixtureDir, 'utime.txt'));
    expect(await readFile(join(fixtureDir, 'utime.txt'), 'utf-8')).toMatchInlineSnapshot('"utime"');
    expect(atime.getTime()).toBe(0);
    expect(mtime.getTime()).toBe(1);
  });
  test('do not create parent directory when writing file with callback', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/naming-convention
      createIFFImpl({ 'nested/file.txt': async (path) => writeFile(path, 'text') }, fixtureDir),
    ).rejects.toThrowError(
      `Failed to create fixture ('${join(fixtureDir, 'nested/file.txt')}').` +
        ` Did you forget to create the parent directory ('${join(fixtureDir, 'nested')}')?` +
        ` The flexible fixture creation API does not automatically create the parent directory, you have to create it manually.`,
    );
  });
});

test('allow function and null as items', async () => {
  await createIFFImpl(
    {
      'a.txt': null,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'b.txt': () => {},
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'c.txt': async () => {},
    },
    fixtureDir,
  );
  expect(await readdir(fixtureDir)).toEqual([]);
});
