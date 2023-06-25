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
      '.eslintrc.cjs': dedent`
        module.exports = {
          root: true,
          rules: {
            'no-debugger': 'error',
            'semi': 'error',
          },
        };
      `,
      'src': {
        'no-debugger.js': 'debugger;',
        'semi.js': dedent`
          var withSemicolon = 1;
          var withoutSemicolon = 2
        `,
      },
    },
    { rootDir: fixtureDir },
  );

  const eslint = new ESLint({ cwd: iff.rootDir, useEslintrc: true });
  const results = await eslint.lintFiles([iff.paths['src/no-debugger.js'], iff.paths['src/semi.js']]);
  const formatter = await eslint.loadFormatter('unix');
  const resultText = formatter.format(results);
  expect(resultText).toStrictEqual(dedent`
    ${iff.rootDir}/src/no-debugger.js:1:1: Unexpected 'debugger' statement. [Error/no-debugger]
    ${iff.rootDir}/src/semi.js:2:25: Missing semicolon. [Error/semi]

    2 problems
  `);
});
