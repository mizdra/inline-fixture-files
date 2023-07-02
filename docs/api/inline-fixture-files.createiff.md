<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@mizdra/inline-fixture-files](./inline-fixture-files.md) &gt; [createIFF](./inline-fixture-files.createiff.md)

## createIFF() function

Create fixtures in the specified directory. The path separator must be in POSIX format (`/`<!-- -->). Use of Windows path separator is an undefined behavior.

**Signature:**

```typescript
export declare function createIFF<const T extends Directory>(directory: T, options: CreateIFFOptions): Promise<CreateIFFResult<T>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  directory | T | The definition of fixtures to be created. |
|  options | [CreateIFFOptions](./inline-fixture-files.createiffoptions.md) | Options for creating fixtures. |

**Returns:**

Promise&lt;[CreateIFFResult](./inline-fixture-files.createiffresult.md)<!-- -->&lt;T&gt;&gt;

An object that provides functions to manipulate the fixtures.

## Example


```ts
const iff = await createIFF(
  {
  'a.txt': 'a',
  'b': {
    'a.txt': 'b-a',
  },
  'c/a/a.txt': 'c-a-a',
}, fixturesDir);
expect(await readFile(join(fixturesDir, 'a.txt'), 'utf-8')).toBe('a');
expect(await readFile(join(fixturesDir, 'b/a.txt'), 'utf-8')).toBe('b-a');
expect(await readFile(join(fixturesDir, 'c/a/a.txt'), 'utf-8')).toBe('c-a-a');
```
