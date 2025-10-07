import type { CapturedRequest } from "@/types/interceptor";

let latestGraphqlHeaders: Record<string, string> | null = null;

/**
 * Update the cache of the most recent GraphQL headers. We use this when replaying requests from the
 * content script to mimic the exact browser context the user just exercised.
 */
export const setLatestGraphqlHeaders = (
  headers: Record<string, string> | null
) => {
  latestGraphqlHeaders = headers;
};

/**
 * Strip headers that should not be replayed (e.g. content-length) and normalise casing for lookups.
 */
export const sanitizeHeaders = (
  headers: Record<string, string>
): Record<string, string> => {
  const ignored = new Set(["content-length", "host", "origin", "referer"]);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!key) continue;
    const lower = key.toLowerCase();
    if (ignored.has(lower)) continue;
    result[lower] = value;
  }
  return result;
};

/**
 * Copy the captured request so it can travel across postMessage without leaking prototype methods.
 */
export const sanitizeRequest = (request: CapturedRequest): CapturedRequest => ({
  url: request.url,
  method: request.method,
  headers: sanitizeHeaders(request.headers),
  body: request.body,
});

const getCookieValue = (name: string): string | null => {
  const cookies = document.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const [rawKey, ...rest] = cookie.trim().split("=");
    if (!rawKey) continue;
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const normalizeAuthorization = (value?: string) => {
  if (!value) return undefined;
  return value.startsWith("Bearer ") ? value : `Bearer ${value}`;
};

const sniffAuthorizationFromStorage = (
  storage: Storage | undefined
): string | undefined => {
  if (!storage) return undefined;
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      const rawValue = storage.getItem(key);
      if (!rawValue) continue;
      const normalized = normalizeAuthorization(rawValue.trim());
      if (normalized) return normalized;
      if (rawValue.includes("bearerToken")) {
        try {
          const parsed = JSON.parse(rawValue);
          const candidate = parsed?.bearerToken ?? parsed?.session?.bearerToken;
          const parsedNormalized = normalizeAuthorization(candidate);
          if (parsedNormalized) return parsedNormalized;
        } catch (error) {
          console.warn("[TSB][AUTH] 无法从存储项解析 bearerToken", error);
        }
      }
    }
  } catch (error) {
    console.warn("[TSB][AUTH] 访问存储失败", error);
  }
  return undefined;
};

const sniffAuthorizationFromGlobals = (): string | undefined => {
  const candidates: unknown[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny = window as any;
  const maybeInitialState = globalAny?.__INITIAL_STATE__;
  if (maybeInitialState) {
    candidates.push(maybeInitialState.session?.bearerToken);
    candidates.push(maybeInitialState.config?.bearerToken);
  }
  const maybeInitialData = globalAny?.__INITIAL_DATA__;
  if (maybeInitialData) {
    candidates.push(maybeInitialData.session?.bearerToken);
    candidates.push(maybeInitialData.config?.bearerToken);
  }
  const maybeNextData = globalAny?.__NEXT_DATA__;
  if (maybeNextData) {
    const props = maybeNextData.props ?? {};
    candidates.push(props?.pageProps?.apollo?.session?.bearerToken);
    candidates.push(props?.pageProps?.session?.bearerToken);
  }

  for (const candidate of candidates) {
    const normalized = normalizeAuthorization(candidate as string | undefined);
    if (normalized) return normalized;
  }

  let storageAuthorization = sniffAuthorizationFromStorage(
    globalAny?.localStorage
  );
  if (!storageAuthorization) {
    storageAuthorization = sniffAuthorizationFromStorage(
      globalAny?.sessionStorage
    );
  }
  if (storageAuthorization) return storageAuthorization;

  return undefined;
};

/**
 * Build the headers for a GraphQL request, reusing the freshest tokens we detected from live
 * traffic and falling back to sniffing global variables.
 */
export const buildGraphqlHeaders = (
  templateHeaders?: Record<string, string>
) => {
  const headers: Record<string, string> = {};
  const merge = (source?: Record<string, string>) => {
    if (!source) return;
    for (const [key, value] of Object.entries(source)) {
      if (!key || !value) continue;
      headers[key.toLowerCase()] = value;
    }
  };

  merge(templateHeaders);
  merge(latestGraphqlHeaders ?? undefined);

  const csrfToken = getCookieValue("ct0");
  if (csrfToken) headers["x-csrf-token"] = csrfToken;

  if (!headers["x-twitter-active-user"])
    headers["x-twitter-active-user"] = "yes";
  if (!headers["x-twitter-client-language"]) {
    headers["x-twitter-client-language"] =
      document.documentElement.lang || navigator.language || "en";
  }

  if (!headers["accept-language"]) {
    const languages = Array.isArray(navigator.languages)
      ? navigator.languages.filter(Boolean).join(",")
      : "";
    headers["accept-language"] = languages || navigator.language || "en-US";
  }
  if (!headers["accept"]) headers["accept"] = "*/*";

  let authorization = normalizeAuthorization(headers["authorization"]);
  if (!authorization) {
    authorization = normalizeAuthorization(latestGraphqlHeaders?.authorization);
  }
  if (!authorization) {
    authorization = normalizeAuthorization(templateHeaders?.authorization);
  }
  if (!authorization) {
    authorization = sniffAuthorizationFromGlobals();
  }

  if (authorization) {
    headers["authorization"] = authorization;
  } else {
    console.warn("[TSB][AUTH] 未能自动解析 authorization header");
  }

  if (!headers["x-twitter-auth-type"])
    headers["x-twitter-auth-type"] = "OAuth2Session";
  if (!headers["content-type"]) headers["content-type"] = "application/json";

  return headers;
};
