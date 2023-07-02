# @mizdra/inline-fixture-files

The utility for writing fixture files inline.

## Installation

```console
$ npm i -D @mizdra/inline-fixture-files
```

## Features

- Write fixture files inline
- TypeScript support
- Cross-platform support
- Zero dependencies

## Motivation

When writing tests, it is often necessary to create fixture files. A common approach is to create a `fixture/` directory and write the fixture files there.

```console
$ ls -R fixture
test-case-1/src:
index.ts

test-case-2/src:
index.ts    math.ts
```

However, this approach leads to the test code and fixture file definitions being far apart. This makes it difficult to understand the test code.

`@mizdra/inline-fixture-files` allows you to define fixture files in your test code. This makes the test code easier to understand.

```ts
import dedent from 'dedent';
import { createIFF } from '@mizdra/inline-fixture-files';

const iff1 = await createIFF(
  {
    'src/index.ts': dedent`
      export function hello() {
        console.log('Hello, world!');
      }
    `,
  },
  { rootDir: join(fixtureDir, 'test-case-1') },
);
const iff2 = await createIFF(
  {
    src: {
      'index.ts': dedent`
        import { add } from './math';

        export function hello() {
          console.log('Hello, world!');
          console.log(add(1, 2));
        }
      `,
      'math.ts': dedent`
        export function add(a: number, b: number): number {
          return a + b;
        }
      `,
    },
  },
  { rootDir: join(fixtureDir, 'test-case-1') },
);
```

## API documentation

See [/docs/api/index.md](/docs/api/index.md).

## Examples

### Example: Basic

You can use `iff.paths` to get the paths of the generated fixture files.

```ts
// example/01-basic.test.ts
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test, beforeEach } from 'vitest';
import { createIFF } from '@mizdra/inline-fixture-files';

const fixtureDir = join(tmpdir(), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);

beforeEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

test('eslint reports lint errors', async () => {
  const iff = await createIFF(
    {
      '.eslintrc.cjs': `module.exports = { root: true, rules: { semi: 'error' } };`,
      'src': {
        'semi.js': dedent`
          var withSemicolon = 1;
          var withoutSemicolon = 2
        `,
      },
      // The above can be written in abbreviated form:
      // 'src/semi.js': dedent`...`,
    },
    { rootDir: fixtureDir },
  );

  const eslint = new ESLint({ cwd: iff.rootDir, useEslintrc: true });
  const results = await eslint.lintFiles([iff.paths['src/semi.js']]);
  const formatter = await eslint.loadFormatter('unix');
  const resultText = formatter.format(results);
  expect(resultText).toStrictEqual(dedent`
    ${iff.paths['src/semi.js']}:2:25: Missing semicolon. [Error/semi]

    1 problem
  `);
});
```

### Example: Random `roodDir`

If you use `@mizdra/inline-fixture-files`, it is recommended to create a utility (`createIFFByRandomRootDir`) that generates a random `rootDir` and calls `createIFF` with it. This is very helpful to keep each test case independent.

````ts
// example/util/create-iff-by-random-root-dir.js
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIFF, Directory } from '@mizdra/inline-fixture-files';
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
````

```ts
// example/02-random-root-dir.test.ts
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
import { createIFFByRandomRootDir } from './util/create-iff-by-random-root-dir.js';

test('eslint reports lint errors', async () => {
  const iff = await createIFFByRandomRootDir({
    '.eslintrc.cjs': `module.exports = { root: true, rules: { semi: 'error' } };`,
    'src': {
      'semi.js': dedent`
        var withSemicolon = 1;
        var withoutSemicolon = 2
      `,
    },
  });

  const eslint = new ESLint({ cwd: iff.rootDir, useEslintrc: true });
  const results = await eslint.lintFiles([iff.paths['src/semi.js']]);
  const formatter = await eslint.loadFormatter('unix');
  const resultText = formatter.format(results);
  expect(resultText).toStrictEqual(dedent`
    ${iff.paths['src/semi.js']}:2:25: Missing semicolon. [Error/semi]

    1 problem
  `);
});
```

### Example: Share fixture files between test cases

`iff.fork` is an API that changes the root directory while taking over previously created fixture files. It allows fixture files to be shared between test cases.

```ts
// example/03-share-fixtures-between-test-cases.test.ts
import { readFile } from 'node:fs/promises';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { createIFFByRandomRootDir } from './util/create-iff-by-random-root-dir.js';

describe('eslint', async () => {
  // Share `.eslintrc.cjs` between test cases.
  const baseIFF = await createIFFByRandomRootDir({
    '.eslintrc.cjs': `module.exports = { root: true, rules: { semi: 'error' } };`,
  });

  it('reports lint errors', async () => {
    // The `fork` allows you to change the `rootDir` of fixtures while inheriting the fixtures from `baseIFF`.
    const iff = await baseIFF.fork({
      src: {
        'semi.js': dedent`
          var withSemicolon = 1;
          var withoutSemicolon = 2
        `,
      },
    });
    const eslint = new ESLint({ cwd: iff.rootDir, useEslintrc: true });
    const results = await eslint.lintFiles([iff.paths['src/semi.js']]);
    const formatter = await eslint.loadFormatter('unix');
    const resultText = formatter.format(results);
    expect(resultText).toStrictEqual(dedent`
      ${iff.paths['src/semi.js']}:2:25: Missing semicolon. [Error/semi]
  
      1 problem
    `);
  });
  it('fix lint errors', async () => {
    const iff = await baseIFF.fork({
      src: {
        'semi.js': dedent`
          var withoutSemicolon = 2
        `,
      },
    });
    const eslint = new ESLint({ cwd: iff.rootDir, useEslintrc: true, fix: true });
    const results = await eslint.lintFiles([iff.paths['src/semi.js']]);

    expect(await readFile(iff.paths['src/semi.js'], 'utf8')).toMatchInlineSnapshot('"var withoutSemicolon = 2"');
    await ESLint.outputFixes(results);
    expect(await readFile(iff.paths['src/semi.js'], 'utf8')).toMatchInlineSnapshot('"var withoutSemicolon = 2;"');
  });
});
```
