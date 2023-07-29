<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@mizdra/inline-fixture-files](./inline-fixture-files.md) &gt; [DefineIFFCreatorOptions](./inline-fixture-files.defineiffcreatoroptions.md) &gt; [generateRootDir](./inline-fixture-files.defineiffcreatoroptions.generaterootdir.md)

## DefineIFFCreatorOptions.generateRootDir() method

Function to generate the path to the root directory of the fixture. The fixture will be written to the directory returned by this function.

This function is called when a new root directory is needed (when calling [CreateIFF](./inline-fixture-files.createiff.md) and [CreateIFFResult.fork()](./inline-fixture-files.createiffresult.fork.md)<!-- -->). However, if [CreateIFFOptions.overrideRootDir](./inline-fixture-files.createiffoptions.overriderootdir.md) is passed, this function is not called and [CreateIFFOptions.overrideRootDir](./inline-fixture-files.createiffoptions.overriderootdir.md) is used for the root directory.

**Signature:**

```typescript
generateRootDir(): string;
```
**Returns:**

string

## Example


```ts
import { randomUUID } from 'node:crypto';

const fixtureBaseDir = join(tmpdir(), 'your-app-name', 'fixtures');
const iff = await createIFF(
  { 'a.txt': 'a', },
  { generateRootDir: () => join(fixtureBaseDir, randomUUID()) },
);
const forkedIff = await iff.fork({ 'b.txt': 'b' });

expect(iff.rootDir).not.toBe(forkedIff.rootDir);
```
