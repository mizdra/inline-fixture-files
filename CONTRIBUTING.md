# Contributing

This is a guide for contributors.

## How to dev

- `npm run build`: Build for production
- `npm run dev`: Run for development
- `npm run lint`: Run static-checking
- `npm run test`: Run tests

## How to update API documentation

```bash
documentation build src/index.ts --parse-extension ts -f md -c documentation.yml | add-text-to-markdown README.md --section "API documentation" --write
```

## How to release

- Wait for passing CI...
- ```bash
  git switch main && git pull
  ```
- ```bash
  rm -rf dist && npm run build
  ```
- ```bash
  npm version <major|minor|patch>
  ```
  - If you want to release a pre-release version, use the following command instead:
    ```bash
    npm version <premajor|preminor|prepatch> --preid=<alpha|beta>
    ```
  - If you want to update the pre-release version, use the following command instead:
    ```bash
    npm version prerelease
    ```
- ```bash
  npm publish
  ```
  - If you want to publish a pre-release version, use the following command instead:
    ```bash
    npm publish --tag=<alpha|beta>
    ```
- ```bash
  git push --follow-tags
  ```
