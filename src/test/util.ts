import { randomInt } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const fixtureDir = resolve(realpathSync(tmpdir()), 'inline-fs-fixtures', process.env['VITEST_POOL_ID']!);

export async function exists(path: string): Promise<boolean> {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}

export function oneOf<const T>(array: T[]): T {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return array[randomInt(0, array.length)]!;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
