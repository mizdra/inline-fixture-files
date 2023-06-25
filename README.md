# @mizdra/inline-fs-fixtures

The utility for writing fixture files inline.

## Features

- Write fixture files inline
- TypeScript support
- Cross-platform support
- Zero dependencies

## Installation

```console
$ npm i -D @mizdra/inline-fs-fixtures
```

## Usage

```typescript
import { createIFF } from '@mizdra/inline-fs-fixtures';
import { test, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { exists } from 'node:fs';
import { join, resolve } from 'node:path';
import { realpathSync } from 'node:fs';

const fixtureDir = resolve(realpathSync(tmpdir()), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);

test('basic usage', async () => {
  // Create the following files in the `fixtureDir` directory.
  // NOTE: `fixtureDir` is automatically deleted before creating the files.
  //       This behavior can be disabled by passing `{ cleanUpBeforeWriting: false }` to `createIFF`.
  const iff = await createIFF(
    {
      'src/index.ts': 'const foo: number = 1;',
      'dist': {
        'index.js': 'const foo = 1;',
      },
    },
    { rootDir: fixtureDir },
  );
  expect(await readFile(join(fixtureDir, 'src/index.ts'), 'utf8')).toEqual('const foo: number = 1;');
  expect(await readFile(join(fixtureDir, 'dist/index.js'), 'utf8')).toEqual('const foo = 1;');

  // `iff.paths` contains the real paths of the files created by `createIFF`.
  // In addition, `paths` is strictly typed.
  expect(iff.paths).toStrictEqual({
    'src': join(fixtureDir, 'src'),
    'src/index.ts': join(fixtureDir, 'src/index.ts'),
    'dist': join(fixtureDir, 'dist'),
    'dist/index.js': join(fixtureDir, 'dist/index.js'),
  });
  expectType<{
    'src': string;
    'src/index.ts': string;
    'dist': string;
    'dist/index.js': string;
  }>(iff.paths);
  // @ts-expect-error -- `iff.paths` does not include files other than those created by `createIFF`
  iff.paths['unknown-file.txt'];

  // `iff.join` is a function that joins the path relative to `iff.rootDir`.
  // This can be used to manipulate files that were not created with `createIFF`.
  expect(iff.join('unknown-file.txt')).toEqual(join(fixtureDir, 'unknown-file.txt'));

  // `iff.addFixtures` is a function that adds fixtures.
  // This can be used to add fixtures after `createIFF`.
  const iff2 = await iff.addFixtures({
    'src/math.ts': 'const add = (a: number, b: number) => a + b;',
  });
  expect(await readFile(iff2.paths['src/math.ts'], 'utf8')).toEqual('const add = (a: number, b: number) => a + b;');

  // `iff.rmFixtures` is a function that removes fixtures.
  await iff.rmFixtures();
  expect(await readdir(fixtureDir)).toStrictEqual([]);

  // `iff.rmRootDir` is a function that removes the root directory.
  await iff.rmRootDir();
  expect(await exists(fixtureDir)).toBe(false);
});
```
