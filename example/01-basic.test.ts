import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { loadESLint } from 'eslint';
import { expect, test } from 'vitest';
import { defineIFFCreator } from '../src/index.js';

const LegacyESLint = await loadESLint({ useFlatConfig: false });

const fixtureDir = join(tmpdir(), 'your-app-name', process.env['VITEST_POOL_ID']!);
const createIFF = defineIFFCreator({ generateRootDir: () => join(fixtureDir, randomUUID()) });

await rm(fixtureDir, { recursive: true, force: true });

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

  const eslint = new LegacyESLint({ cwd: iff.rootDir, useEslintrc: true });
  const results = await eslint.lintFiles([iff.paths['src/semi.js']]);
  const formatter = await eslint.loadFormatter('json');
  const resultText = await formatter.format(results);
  expect(JSON.parse(resultText)).toStrictEqual([
    expect.objectContaining({
      filePath: iff.paths['src/semi.js'],
      messages: [
        expect.objectContaining({
          ruleId: 'semi',
          message: 'Missing semicolon.',
          line: 2,
          column: 25,
        }),
      ],
    }),
  ]);
});
