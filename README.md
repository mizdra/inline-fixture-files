# @mizdra/inline-fixture-files

The utility for writing fixture files inline.

## Installation

```console
$ npm i -D @mizdra/inline-fixture-files
```

## Features

- Write fixture files inline
- Type-safe access to the fixture file path
- Share fixture files with test cases
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

## API documentation

See [/docs/api/index.md](/docs/api/index.md).

## Examples

### Example: Basic

You can use `iff.paths` to get the paths of the generated fixture files.

```ts
// example/01-basic.test.ts
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
import { createIFF } from '@mizdra/inline-fixture-files';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const fixtureBaseDir = join(tmpdir(), 'your-app-name', process.env['VITEST_POOL_ID']!);
const generateRootDir = () => join(fixtureBaseDir, randomUUID());

await rm(fixtureBaseDir, { recursive: true, force: true });

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
    { generateRootDir },
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

### Example: Share fixture files with test cases

`iff.fork` is an API that changes the root directory while taking over previously created fixture files. It allows fixture files to be shared with test cases.

```ts
// example/02-share-fixtures-with-test-cases.test.ts

import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { createIFF } from '@mizdra/inline-fixture-files';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const fixtureBaseDir = join(tmpdir(), 'your-app-name', process.env['VITEST_POOL_ID']!);
const generateRootDir = () => join(fixtureBaseDir, randomUUID());

await rm(fixtureBaseDir, { recursive: true, force: true });

describe('eslint', async () => {
  // Share `.eslintrc.cjs` between test cases.
  const baseIFF = await createIFF(
    {
      '.eslintrc.cjs': `module.exports = { root: true, rules: { semi: 'error' } };`,
    },
    { generateRootDir },
  );
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
