<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@mizdra/inline-fixture-files](./inline-fixture-files.md) &gt; [CreateIFFResult](./inline-fixture-files.createiffresult.md) &gt; [join](./inline-fixture-files.createiffresult.join.md)

## CreateIFFResult.join() method

Join `rootDir` and `paths`<!-- -->. It is equivalent to `require('path').join(rootDir, ...paths)`<!-- -->.

**Signature:**

```typescript
join(...paths: string[]): string;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  paths | string\[\] |  |

**Returns:**

string

## Example

This is useful for generating paths to files not created by `createIFF`<!-- -->.

```ts
const createIFF = defineIFFCreator({ generateRootDir: () => fixturesDir });
const iff = await createIFF({ 'a.txt': 'a' });
expect(iff.join('a.txt')).toBe(join(fixturesDir, 'a.txt'));
expect(iff.join('non-existent.txt')).toBe(join(fixturesDir, 'non-existent.txt'));
```

