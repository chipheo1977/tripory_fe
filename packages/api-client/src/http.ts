// Chỉ apps/<app>/src/composition/** được import subpath này (rule httpOnlyInComposition).
export { createFetchHttpClient, DEFAULT_TIMEOUT_MS } from './fetch-http-client';
export type { FetchHttpClientDeps } from './fetch-http-client';
export { withSessionRefresh, DEFAULT_SESSION_LOCK_NAME } from './with-session-refresh';
