import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import dedent from 'dedent';
import { loadESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { defineIFFCreator } from '../src/index.js';

const LegacyESLint = await loadESLint({ useFlatConfig: false });

const fixtureDir = join(tmpdir(), 'your-app-name', process.env['VITEST_POOL_ID']!);
const createIFF = defineIFFCreator({ generateRootDir: () => join(fixtureDir, randomUUID()) });

await rm(fixtureDir, { recursive: true, force: true });

describe('eslint', async () => {
  // Share `.eslintrc.cjs` between test cases.
  const baseIFF = await createIFF({
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
  it('fix lint errors', async () => {
    const iff = await baseIFF.fork({
      src: {
        'semi.js': dedent`
          var withoutSemicolon = 2
        `,
      },
    });
    const eslint = new LegacyESLint({ cwd: iff.rootDir, useEslintrc: true, fix: true });
    const results = await eslint.lintFiles([iff.paths['src/semi.js']]);

    expect(await readFile(iff.paths['src/semi.js'], 'utf8')).toMatchInlineSnapshot('"var withoutSemicolon = 2"');
    await LegacyESLint.outputFixes(results);
    expect(await readFile(iff.paths['src/semi.js'], 'utf8')).toMatchInlineSnapshot('"var withoutSemicolon = 2;"');
  });
});
