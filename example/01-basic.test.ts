import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
import { defineIFFCreator } from '../src/index.js';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const fixtureBaseDir = join(tmpdir(), 'your-app-name', process.env['VITEST_POOL_ID']!);
const createIFF = defineIFFCreator({ generateRootDir: () => join(fixtureBaseDir, randomUUID()) });

await rm(fixtureBaseDir, { recursive: true, force: true });

test('eslint reports lint errors', async () => {
  const iff = await createIFF({
    '.eslintrc.cjs': `module.exports = { root: true, rules: { semi: 'error' } };`,
    'src': {
      'semi.js': dedent`
          var withSemicolon = 1;
          var withoutSemicolon = 2
        `,
    },
    // The above can be written in abbreviated form:
    // 'src/semi.js': dedent`...`,
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
