<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@mizdra/inline-fixture-files](./inline-fixture-files.md) &gt; [DefineIFFCreatorOptions](./inline-fixture-files.defineiffcreatoroptions.md)

## DefineIFFCreatorOptions interface

The options for [defineIFFCreator()](./inline-fixture-files.defineiffcreator.md)<!-- -->.

**Signature:**

```typescript
export interface DefineIFFCreatorOptions 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [generateRootDir()](./inline-fixture-files.defineiffcreatoroptions.generaterootdir.md) | <p>Function to generate the path to the root directory of the fixture. The fixture will be written to the directory returned by this function.</p><p>This function is called when a new root directory is needed (when calling [CreateIFF](./inline-fixture-files.createiff.md) and [CreateIFFResult.fork()](./inline-fixture-files.createiffresult.fork.md)<!-- -->). However, if [CreateIFFOptions.overrideRootDir](./inline-fixture-files.createiffoptions.overriderootdir.md) is passed, this function is not called and [CreateIFFOptions.overrideRootDir](./inline-fixture-files.createiffoptions.overriderootdir.md) is used for the root directory.</p> |
