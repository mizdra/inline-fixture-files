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

```typescript
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
import { createIFF } from '@mizdra/inline-fixture-files';

const fixtureDir = join(tmpdir(), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);

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

## Available APIs

See [`src/index.ts`](./src/index.ts).
