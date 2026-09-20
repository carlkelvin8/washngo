export class AppError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const NETWORK_RE = /(?:^|\b)(?:network error|failed to fetch|fetch failed|network request failed)\b/i;

export function friendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    if (NETWORK_RE.test(error.message)) return 'You appear to be offline. Check your connection and try again.';
    // Hide raw Postgrest/DB constraint messages from users
    if (/duplicate key|violates.*constraint|PGRST|permission denied/i.test(error.message)) {
      return 'Something went wrong. Please try again.';
    }
    if (error.message.trim()) return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function assertData<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) {
    if (__DEV__) console.error(fallback, error);
    throw new AppError(fallback, error);
  }
  if (data === null || data === undefined) throw new AppError(fallback);
  return data;
}
