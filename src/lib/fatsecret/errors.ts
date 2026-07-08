export class FatSecretConfigError extends Error {
  readonly name = "FatSecretConfigError";
}

export class FatSecretApiError extends Error {
  readonly name = "FatSecretApiError";

  constructor(
    message: string,
    readonly code?: number,
    readonly details?: string,
  ) {
    super(message);
  }
}
