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
    { throwByFlexibleFileCreationAPI, ...errorOptions }: ErrorOptions & { throwByFlexibleFileCreationAPI: boolean },
  ) {
    let message = `Failed to create fixture ('${path}').`;

    if (throwByFlexibleFileCreationAPI) {
      const parentDirectory = dirname(path);
      message +=
        ` Did you forget to create the parent directory ('${parentDirectory}')?` +
        ` The flexible fixture creation API does not automatically create the parent directory, you have to create it manually.`;
    }

    super(message, errorOptions);
    this.path = path;
  }
}
