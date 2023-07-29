import { dirname } from 'node:path';

/**
 * The error thrown when fixture creation fails.
 * @public
 */
export class IFFFixtureCreationError extends Error {
  /** The path of the fixture that failed to create. */
  path: string;
  static {
    this.prototype.name = 'IFFFixtureCreationError';
  }
  constructor(
    path: string,
    { cause, throwByFlexibleFileCreationAPI }: { cause: Error; throwByFlexibleFileCreationAPI: boolean },
  ) {
    let message = `Failed to create fixture ('${path}').`;

    if (throwByFlexibleFileCreationAPI) {
      const parentDirectory = dirname(path);
      message +=
        ` Did you forget to create the parent directory ('${parentDirectory}')?` +
        ` The flexible fixture creation API does not automatically create the parent directory, you have to create it manually.`;
    }

    super(message, { cause });
    this.path = path;
  }
}
