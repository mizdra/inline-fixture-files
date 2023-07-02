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
