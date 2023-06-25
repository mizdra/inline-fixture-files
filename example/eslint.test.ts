import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';
import { createIFF } from '../src/index.js';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
