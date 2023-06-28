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

## API documentation

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

- [createIFF][1]
  - [Parameters][2]
  - [Examples][3]
- [CreateIFFResult#paths][4]
- [CreateIFFResult#join][5]
- [CreateIFFResult#addFixtures][6]
  - [Parameters][7]
- [CreateIFFResult#rmRootDir][8]
- [CreateIFFResult#rmFixtures][9]
- [CreateIFFResult#rootDir][10]
- [CreateIFFOptions#rootDir][11]
- [CreateIFFOptions#noWrite][12]
- [AddFixturesResult#paths][13]

### createIFF

Create fixtures in the specified directory.
The path separator must be in POSIX format (`/`).
Use of Windows path separator is an undefined behavior.

#### Parameters

- `directory` **T** The definition of fixtures to be created.
- `options` **CreateIFFOptions** Options for creating fixtures.

#### Examples

````javascript
    ```ts
    const iff = await createIFF(
      {
      'a.txt': 'a',
      'b': {
        'a.txt': 'b-a',
      },
      'c/a/a.txt': 'c-a-a',
    }, fixturesDir);
    ```
````

Returns **[Promise][14]\\&lt;CreateIFFResult\\<T>>** An object that provides functions to manipulate the fixtures.

### CreateIFFResult#paths

The paths of the fixtures.
For example, if you create a fixture `a.txt`, then `iff.paths['a.txt'] === iff.join('a.txt')`.

```ts
const iff = await createIFF({
  'a.txt': 'a',
  'b': {
     'a.txt': 'b-a',
  },
  'c/a/a.txt': 'c-a-a',
}, fixturesDir);
expect(iff.paths).toStrictEqual({
  'a.txt': iff.join('a.txt'),
  'b': iff.join('b'),
  'b/a.txt': iff.join('b/a.txt'),
  'c': iff.join('c'),
  'c/a': iff.join('c/a'),
  'c/a/a.txt': iff.join('c/a/a.txt'),
});
```

The `paths` keys are strictly typed. However, index signatures are excluded for convenience.

```ts
const iff = await createIFF({
  'a.txt': 'a',
  'b': {
     'a.txt': 'b-a',
  },
  ['c.txt' as string]: 'c',
  ['d' as string]: {
    'a.txt': 'd-a',
  },
}, fixturesDir);
expectType<{
  'a.txt': string;
  'b': string;
  'b/a.txt': string;
}>(iff.paths);
```

### CreateIFFResult#join

Join `rootDir` and `paths`.
That is, it is equivalent to `require('path').join(rootDir, ...paths)`.

### CreateIFFResult#addFixtures

Add fixtures to `rootDir`.
This function always performs the write operation regardless of the value of `CreateIFFOptions#noWrite`.

#### Parameters

- `directory`  The definition of fixtures to be added.
- `directory`  @ignore

Returns **any** The paths of the added fixtures.

### CreateIFFResult#rmRootDir

Delete `rootDir`.

### CreateIFFResult#rmFixtures

Delete fixtures under `rootDir`.

### CreateIFFResult#rootDir

The directory where fixtures are written.
This directory is obtained by processing the directory specified in `CreateIFFOptions#rootDir`
using `path.resolve`.

### CreateIFFOptions#rootDir

Root directory for fixtures.

### CreateIFFOptions#noWrite

If `true`, `createIFF` does not write files.
But this option cannot disable writing by `CreateIFFResult#addFixtures`.

### AddFixturesResult#paths

- **See**: CreateIFFResult#paths

The paths of the added fixtures.

[1]: #createiff

[2]: #parameters

[3]: #examples

[4]: #createiffresultpaths

[5]: #createiffresultjoin

[6]: #createiffresultaddfixtures

[7]: #parameters-1

[8]: #createiffresultrmrootdir

[9]: #createiffresultrmfixtures

[10]: #createiffresultrootdir

[11]: #createiffoptionsrootdir

[12]: #createiffoptionsnowrite

[13]: #addfixturesresultpaths

[14]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
