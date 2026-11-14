const CONNECTIVITY_ERROR_PATTERNS = [
  'failed to fetch',
  'network',
  'err_failed',
  'timeout',
  'timed out',
  'socket',
  'could not connect',
  'unable to reach',
  'invaliddeploymentname',
  'could not find public function',
];

export function isConnectivityFailure(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Convex wraps server errors as
 * "[CONVEX M(auth:authenticateUser)] [Request ID: …] Server Error\nUncaught Error: <message>\n    at …".
 * Extract the human-readable part so it can be shown in the UI.
 */
export function extractServerErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw) return fallback;
  const uncaught = raw.match(/Uncaught (?:Error|ConvexError):\s*([^\n]+)/);
  if (uncaught) return uncaught[1].trim();
  if (raw.includes('[CONVEX') || raw.includes('Server Error')) return fallback;
  return raw.split('\n')[0].trim() || fallback;
}
