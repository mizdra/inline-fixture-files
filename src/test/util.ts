import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const fixtureDir = resolve(realpathSync(tmpdir()), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);
