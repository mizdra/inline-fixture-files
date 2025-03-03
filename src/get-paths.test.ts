import { utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expectType } from 'ts-expect';
import { describe, expect, test } from 'vitest';
import { getPaths, getSelfAndUpperPaths, slash } from './get-paths.js';
import { fixtureDir } from './test/util.js';

test('getSelfAndUpperPaths', () => {
  expect(getSelfAndUpperPaths('a/b/c')).toStrictEqual(['a/b/c', 'a/b', 'a']);
});

describe('getPaths', () => {
  test('basic', () => {
    const paths = getPaths(
      {
        'a.txt': 'a',
        'b.txt': 'b',
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'a.txt': join(fixtureDir, 'a.txt'),
      'b.txt': join(fixtureDir, 'b.txt'),
    });
    expectType<{
      'a.txt': string;
      'b.txt': string;
    }>(paths);
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['c.txt'];
  });

  test('treat object as directory', () => {
    const paths = getPaths(
      {
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
          'b': {
            'a.txt': 'b-b-a',
          },
        },
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'a.txt': join(fixtureDir, 'a.txt'),
      'b': join(fixtureDir, 'b'),
      'b/a.txt': join(fixtureDir, 'b/a.txt'),
      'b/b': join(fixtureDir, 'b/b'),
      'b/b/a.txt': join(fixtureDir, 'b/b/a.txt'),
    });
    expectType<{
      'a.txt': string;
      'b': string;
      'b/a.txt': string;
      'b/b': string;
      'b/b/a.txt': string;
    }>(paths);
  });

  test('treat object key containing slash as directory', () => {
    const paths = getPaths(
      {
        'a/a': {
          'a.txt': 'a-a-a',
        },
        'b/a/a': {
          'a.txt': 'b-a-a-a',
        },
        'b/a/b': {
          'a.txt': 'b-a-b-a',
        },
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'a': join(fixtureDir, 'a'),
      'a/a': join(fixtureDir, 'a/a'),
      'a/a/a.txt': join(fixtureDir, 'a/a/a.txt'),
      'b': join(fixtureDir, 'b'),
      'b/a': join(fixtureDir, 'b/a'),
      'b/a/a': join(fixtureDir, 'b/a/a'),
      'b/a/a/a.txt': join(fixtureDir, 'b/a/a/a.txt'),
      'b/a/b': join(fixtureDir, 'b/a/b'),
      'b/a/b/a.txt': join(fixtureDir, 'b/a/b/a.txt'),
    });
    expectType<{
      'a': string;
      'a/a': string;
      'a/a/a.txt': string;
      'b': string;
      'b/a': string;
      'b/a/a': string;
      'b/a/a/a.txt': string;
      'b/a/b': string;
      'b/a/b/a.txt': string;
    }>(paths);
  });

  test('throw error when item name starts with separator', () => {
    expect(() => getPaths({ '/a.txt': 'a' }, fixtureDir, false)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Item name must not start with separator: /a.txt]`,
    );
    expect(() => getPaths({ '/a': {} }, fixtureDir, false)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Item name must not start with separator: /a]`,
    );
    // NOTE: Use of Windows path separator is an undefined behavior.
    expect(() => getPaths({ '\\a.txt': 'a' }, fixtureDir, false)).not.toThrow();
  });

  test('throw error when item name ends with separator', () => {
    expect(() => getPaths({ 'a.txt/': 'a' }, fixtureDir, false)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Item name must not end with separator: a.txt/]`,
    );
    expect(() => getPaths({ 'a/': {} }, fixtureDir, false)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Item name must not end with separator: a/]`,
    );
    // NOTE: Use of Windows path separator is an undefined behavior.
    expect(() => getPaths({ 'a.txt\\': 'a' }, fixtureDir, false)).not.toThrow();
  });

  test('throw error when item name contains consecutive separators', () => {
    expect(() => getPaths({ 'a//a.txt': 'a--a' }, fixtureDir, false)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Item name must not contain consecutive separators: a//a.txt]`,
    );
  });

  test('ignore index signature in type system', () => {
    const paths = getPaths(
      {
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
          ['b' as string]: {
            'a.txt': 'b-b-a',
          },
        },
        ['c.txt' as string]: 'c',
        ['d' as string]: {
          'a.txt': 'd-a',
        },
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'a.txt': join(fixtureDir, 'a.txt'),
      'b': join(fixtureDir, 'b'),
      'b/a.txt': join(fixtureDir, 'b/a.txt'),
      'b/b': join(fixtureDir, 'b/b'),
      'b/b/a.txt': join(fixtureDir, 'b/b/a.txt'),
      'c.txt': join(fixtureDir, 'c.txt'),
      'd': join(fixtureDir, 'd'),
      'd/a.txt': join(fixtureDir, 'd/a.txt'),
    });
    expectType<{
      'a.txt': string;
      'b': string;
      'b/a.txt': string;
    }>(paths);
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['b/b.txt'];
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['b/b/a.txt'];
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['c.txt'];
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['d'];
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['d/a.txt'];
  });
  test('support flexible fixture creation API', () => {
    const paths = getPaths(
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'utime.txt': async (path) => {
          await writeFile(path, 'utime');
          await utimes(path, new Date(0), new Date(1));
        },
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'utime.txt': join(fixtureDir, 'utime.txt'),
    });
    expectType<{
      'utime.txt': string;
    }>(paths);
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['a.txt'];
  });
  test('allow function and null as items', () => {
    const paths = getPaths(
      {
        'a.txt': null,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'b.txt': () => {},
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'c.txt': async () => {},
      },
      fixtureDir,
      false,
    );
    expect(paths).toStrictEqual({
      'a.txt': join(fixtureDir, 'a.txt'),
      'b.txt': join(fixtureDir, 'b.txt'),
      'c.txt': join(fixtureDir, 'c.txt'),
    });
    expectType<{
      'a.txt': string;
      'b.txt': string;
      'c.txt': string;
    }>(paths);
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    paths['d.txt'];
  });
  test.runIf(process.platform === 'win32')('convert windows path separator to unix path separator', () => {
    const paths = getPaths(
      {
        'a.txt': 'a',
        'b': {
          'a.txt': 'b-a',
        },
      },
      fixtureDir,
      true,
    );
    expect(paths).toStrictEqual({
      'a.txt': slash(join(fixtureDir, 'a.txt')),
      'b': slash(join(fixtureDir, 'b')),
      'b/a.txt': slash(join(fixtureDir, 'b/a.txt')),
    });
  });
});
