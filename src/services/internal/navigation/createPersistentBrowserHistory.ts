import { createBrowserHistory, History, Location, Update } from "history";
import { matchPath } from "react-router-dom";
import { Maybe } from "@passionware/monads";

/**
 * Storage adapter interface for persisting query parameters
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Default localStorage adapter
 */
export const localStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error("Error storing persisted navigation params:", error);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing persisted navigation params:", error);
    }
  },
};

/**
 * Creates a readPersisted function using the provided storage adapter
 */
export function createReadPersisted<QueryParams extends object>(
  storage: StorageAdapter,
  getStorageKey: (scopeIds: Record<string, string>) => string,
  parseStored: (data: unknown) => QueryParams,
): (scopeIds: Record<string, string>) => Promise<Maybe<QueryParams>> {
  return async (scopeIds: Record<string, string>) => {
    const storageKey = getStorageKey(scopeIds);
    const stored = storage.getItem(storageKey);
    if (!stored) {
      return null;
    }

    try {
      return parseStored(JSON.parse(stored));
    } catch {
      return null;
    }
  };
}

/**
 * Creates a storePersisted function using the provided storage adapter
 */
export function createStorePersisted<QueryParams extends object>(
  storage: StorageAdapter,
  getStorageKey: (scopeIds: Record<string, string>) => string,
): (scopeIds: Record<string, string>, params: QueryParams) => Promise<void> {
  return async (scopeIds: Record<string, string>, params: QueryParams) => {
    const storageKey = getStorageKey(scopeIds);
    try {
      storage.setItem(storageKey, JSON.stringify(params));
    } catch (error) {
      console.error("Error storing persisted navigation params:", error);
    }
  };
}

export interface PatternConfig<QueryParams extends object> {
  /**
   * Pattern to match routes (e.g., "/cockpit/workspaces/:workspaceId/workspaces/*")
   * Should use React Router path syntax with parameters like :workspaceId
   */
  pattern: string;

  /**
   * Names of route parameters to extract as scope IDs (e.g., ["workspaceId"] or ["environmentId", "workspaceId"])
   * These will be used to create a unique storage key for the persisted query params
   */
  scopeParamNames: string[];

  /**
   * Parse query params from URL search string
   */
  parseQueryParams: (search: string) => QueryParams;

  /**
   * Serialize query params to URL search string (without the "?")
   */
  serializeQueryParams: (params: QueryParams) => string;

  /**
   * Read persisted params from storage for the given scope IDs
   */
  readPersisted: (
    scopeIds: Record<string, string>,
  ) => Promise<Maybe<QueryParams>>;

  /**
   * Store params to storage for the given scope IDs
   */
  storePersisted: (
    scopeIds: Record<string, string>,
    params: QueryParams,
  ) => Promise<void>;

  /**
   * Get the storage key for the given scope IDs
   */
  getStorageKey: (scopeIds: Record<string, string>) => string;
}

export interface PersistentNavigationConfig {
  /**
   * Patterns to match routes that should have persistent navigation
   */
  patterns: Array<PatternConfig<any>>;
  /**
   * Optional history instance to use. If not provided, a new browser history will be created.
   * Useful for testing with mocked history instances.
   */
  history?: History;
  /**
   * Storage adapter to use for persisting query parameters.
   * Defaults to localStorageAdapter if not provided.
   */
  storage?: StorageAdapter;
}

/**
 * Creates a browser history instance with persistent query parameters support
 *
 * This function creates a history instance and patches it to automatically:
 * - Store query parameters when navigating with them
 * - Restore query parameters when navigating without them (if previously stored)
 */
export function createPersistentBrowserHistory(
  config: PersistentNavigationConfig,
): History {
  const history = config.history ?? createBrowserHistory();
  const storage = config.storage ?? localStorageAdapter;
  const originalPush = history.push.bind(history);
  const originalReplace = history.replace.bind(history);

  // Helper to extract pathname and search from navigation target
  const extractLocation = (
    to: string | { pathname?: string; search?: string },
  ): { pathname: string; search: string } => {
    if (typeof to === "string") {
      const [pathname = "", search = ""] = to.split("?");
      return { pathname, search: search ? `?${search}` : "" };
    }
    return {
      pathname: to.pathname || "",
      search: to.search || "",
    };
  };

  // Helper to find matching pattern for a path
  const getMatchingPattern = (path: string): PatternConfig<any> | null => {
    for (const patternConfig of config.patterns) {
      // Try matching with the pattern as-is
      let match = matchPath(patternConfig.pattern, path);

      if (match) {
        return patternConfig;
      }

      // If pattern ends with /*, also try matching without the wildcard
      if (patternConfig.pattern.endsWith("/*")) {
        const patternWithoutWildcard = patternConfig.pattern.slice(0, -2);
        match = matchPath(patternWithoutWildcard, path);
        if (match) {
          return patternConfig;
        }
      }
    }

    return null;
  };

  // Helper to extract scope IDs from path
  const extractScopeIds = (
    path: string,
    pattern: PatternConfig<any>,
  ): Maybe<Record<string, string>> => {
    let match = matchPath(pattern.pattern, path);

    if (!match && pattern.pattern.endsWith("/*")) {
      const patternWithoutWildcard = pattern.pattern.slice(0, -2);
      match = matchPath(patternWithoutWildcard, path);
    }

    if (!match || !match.params) {
      return null;
    }

    const scopeIds: Record<string, string> = {};
    for (const paramName of pattern.scopeParamNames) {
      const paramValue = match.params[paramName];
      if (!paramValue) {
        return null;
      }
      scopeIds[paramName] = paramValue;
    }

    return scopeIds;
  };

  // Helper to check if URL has query params
  const hasQueryParams = (search: string): boolean => {
    return Boolean(search && search.length > 1);
  };

  // Helper to restore params synchronously (for initial load)
  const shouldRestoreSync = (
    pathname: string,
    search: string,
  ): { pathname: string; search: string } | null => {
    console.log("[PersistentNavigation] shouldRestoreSync: checking", {
      pathname,
      search,
    });
    const pattern = getMatchingPattern(pathname);
    if (!pattern) {
      console.log(
        "[PersistentNavigation] shouldRestoreSync: no matching pattern",
      );
      return null;
    }

    const scopeIds = extractScopeIds(pathname, pattern);
    if (!scopeIds) {
      console.log(
        "[PersistentNavigation] shouldRestoreSync: no scope IDs extracted",
      );
      return null;
    }

    if (hasQueryParams(search)) {
      console.log(
        "[PersistentNavigation] shouldRestoreSync: already has query params, skipping",
      );
      return null;
    }

    try {
      const storageKey = pattern.getStorageKey(scopeIds);
      console.log(
        "[PersistentNavigation] shouldRestoreSync: checking storage",
        {
          pathname,
          pattern: pattern.pattern,
          scopeIds,
          storageKey,
        },
      );
      const stored = storage.getItem(storageKey);
      if (!stored) {
        console.log(
          "[PersistentNavigation] shouldRestoreSync: no stored data found",
        );
        return null;
      }

      // Parse and validate the stored data using the pattern's readPersisted logic
      // We can't use readPersisted directly since it's async, but we can replicate
      // the validation by parsing JSON and then validating via parseQueryParams
      try {
        const persistedData = JSON.parse(stored);
        if (!persistedData || typeof persistedData !== "object") {
          console.log(
            "[PersistentNavigation] shouldRestoreSync: invalid stored data format",
          );
          return null;
        }

        const hasParams = Object.keys(persistedData).length > 0;
        if (!hasParams) {
          console.log(
            "[PersistentNavigation] shouldRestoreSync: stored data has no params",
          );
          return null;
        }

        // Validate by attempting to serialize - if it fails, data is invalid
        // We can't use parseQueryParams here because it expects a search string,
        // but we can try to serialize and catch errors
        try {
          const restoredSearch =
            "?" + pattern.serializeQueryParams(persistedData);
          console.log(
            "[PersistentNavigation] shouldRestoreSync: restoring params",
            {
              pathname,
              persistedData,
              restoredSearch,
            },
          );
          return {
            pathname,
            search: restoredSearch,
          };
        } catch (error) {
          console.error(
            "[PersistentNavigation] shouldRestoreSync: error serializing params (data may be invalid):",
            error,
          );
          return null;
        }
      } catch (error) {
        console.error(
          "[PersistentNavigation] shouldRestoreSync: error parsing stored data:",
          error,
        );
        return null;
      }
    } catch (error) {
      console.error(
        "[PersistentNavigation] shouldRestoreSync: error reading storage:",
        error,
      );
      return null;
    }
  };

  // Helper to handle navigation (async) - only used for restoring params
  const handleNavigation = async (
    pathname: string,
    search: string,
  ): Promise<{ pathname: string; search: string } | null> => {
    const pattern = getMatchingPattern(pathname);
    if (!pattern) {
      console.log(
        "[PersistentNavigation] handleNavigation: no matching pattern for",
        pathname,
      );
      return null;
    }

    const scopeIds = extractScopeIds(pathname, pattern);
    if (!scopeIds) {
      console.log(
        "[PersistentNavigation] handleNavigation: no scope IDs extracted for",
        pathname,
      );
      return null;
    }

    const storageKey = pattern.getStorageKey(scopeIds);

    // This function is only called when there are no query params (for restore)
    // Storage is handled by the history.listen callback
    if (hasQueryParams(search)) {
      console.log(
        "[PersistentNavigation] handleNavigation: has query params, should not be called",
      );
      return null;
    }

    try {
      console.log(
        "[PersistentNavigation] handleNavigation: reading persisted params",
        {
          pathname,
          pattern: pattern.pattern,
          scopeIds,
          storageKey,
        },
      );
      const persistedParams = await pattern.readPersisted(scopeIds);
      if (persistedParams && Object.keys(persistedParams).length > 0) {
        const restoredSearch =
          "?" + pattern.serializeQueryParams(persistedParams);
        console.log(
          "[PersistentNavigation] handleNavigation: restored params",
          {
            pathname,
            persistedParams,
            restoredSearch,
          },
        );
        return {
          pathname,
          search: restoredSearch,
        };
      } else {
        console.log(
          "[PersistentNavigation] handleNavigation: no persisted params found",
        );
      }
    } catch (error) {
      console.error(
        "[PersistentNavigation] handleNavigation: error restoring navigation params:",
        error,
      );
    }

    return null;
  };

  // Intercept push
  history.push = ((to: any, state?: any) => {
    const { pathname, search } = extractLocation(to);
    console.log("[PersistentNavigation] push intercepted:", {
      pathname,
      search,
    });

    if (hasQueryParams(search)) {
      console.log(
        "[PersistentNavigation] push: has query params, navigation will be handled by listener",
      );
      // Don't store here - the history.listen callback will handle storage
      // This avoids double storage and race conditions
      return originalPush(to, state);
    }

    const syncResult = shouldRestoreSync(pathname, search);
    if (syncResult) {
      console.log(
        "[PersistentNavigation] push: sync restore found, pushing with:",
        syncResult,
      );
      return originalPush(
        {
          pathname: syncResult.pathname,
          search: syncResult.search,
        },
        state,
      );
    }

    console.log("[PersistentNavigation] push: no sync restore, pushing as-is");
    originalPush(to, state);

    void (async () => {
      try {
        const result = await handleNavigation(pathname, search);
        if (result) {
          console.log(
            "[PersistentNavigation] push: async restore found, replacing with:",
            result,
          );
          originalReplace(
            {
              pathname: result.pathname,
              search: result.search,
            },
            state,
          );
        } else {
          console.log("[PersistentNavigation] push: no async restore found");
        }
      } catch (error) {
        console.error(
          "[PersistentNavigation] push: error intercepting push:",
          error,
        );
      }
    })();
  }) as typeof history.push;

  // Intercept replace
  history.replace = ((to: any, state?: any) => {
    const { pathname, search } = extractLocation(to);
    console.log("[PersistentNavigation] replace intercepted:", {
      pathname,
      search,
    });

    if (hasQueryParams(search)) {
      console.log(
        "[PersistentNavigation] replace: has query params, navigation will be handled by listener",
      );
      // Don't store here - the history.listen callback will handle storage
      // This avoids double storage and race conditions
      return originalReplace(to, state);
    }

    const syncResult = shouldRestoreSync(pathname, search);
    if (syncResult) {
      console.log(
        "[PersistentNavigation] replace: sync restore found, replacing with:",
        syncResult,
      );
      return originalReplace(
        {
          pathname: syncResult.pathname,
          search: syncResult.search,
        },
        state,
      );
    }

    console.log(
      "[PersistentNavigation] replace: no sync restore, replacing as-is",
    );
    originalReplace(to, state);

    void (async () => {
      try {
        const result = await handleNavigation(pathname, search);
        if (result) {
          console.log(
            "[PersistentNavigation] replace: async restore found, replacing with:",
            result,
          );
          originalReplace(
            {
              pathname: result.pathname,
              search: result.search,
            },
            state,
          );
        } else {
          console.log("[PersistentNavigation] replace: no async restore found");
        }
      } catch (error) {
        console.error(
          "[PersistentNavigation] replace: error intercepting replace:",
          error,
        );
      }
    })();
  }) as typeof history.replace;

  // Helper to store current location params (used for all navigation types)
  const storeCurrentLocationParams = async (update: Update) => {
    const { pathname, search } = update.location;

    if (hasQueryParams(search)) {
      try {
        const pattern = getMatchingPattern(pathname);
        if (pattern) {
          const scopeIds = extractScopeIds(pathname, pattern);
          if (scopeIds) {
            const storageKey = pattern.getStorageKey(scopeIds);
            const params = pattern.parseQueryParams(search);
            console.log(
              "[PersistentNavigation] storeCurrentLocationParams: storing params",
              {
                pathname,
                pattern: pattern.pattern,
                scopeIds,
                storageKey,
                params,
              },
            );
            await pattern.storePersisted(scopeIds, params);
            console.log(
              "[PersistentNavigation] storeCurrentLocationParams: params stored successfully",
            );
          } else {
            console.log(
              "[PersistentNavigation] storeCurrentLocationParams: no scope IDs extracted for",
              pathname,
            );
          }
        } else {
          console.log(
            "[PersistentNavigation] storeCurrentLocationParams: no matching pattern for",
            pathname,
          );
        }
      } catch (error) {
        console.error(
          "[PersistentNavigation] storeCurrentLocationParams: error storing navigation params:",
          error,
        );
      }
    } else {
      console.log(
        "[PersistentNavigation] storeCurrentLocationParams: no query params to store for",
        pathname,
      );
    }
  };

  // Handle initial location
  const currentLocation = history.location;
  const { pathname, search } = currentLocation;
  console.log("[PersistentNavigation] initializing with location:", {
    pathname,
    search,
  });

  // If initial URL has query params, store them
  if (hasQueryParams(search)) {
    console.log(
      "[PersistentNavigation] initial location has query params, storing...",
    );
    void storeCurrentLocationParams(currentLocation);
  } else {
    // No query params - try to restore synchronously to prevent flickering
    console.log(
      "[PersistentNavigation] initial location has no query params, attempting sync restore...",
    );
    const syncResult = shouldRestoreSync(pathname, search);
    if (syncResult) {
      const newLocation = `${syncResult.pathname}${syncResult.search}`;
      const currentLocationStr = `${pathname}${search}`;
      if (newLocation !== currentLocationStr) {
        console.log(
          "[PersistentNavigation] initial location: replacing with restored params",
          {
            from: currentLocationStr,
            to: newLocation,
          },
        );
        originalReplace({
          pathname: syncResult.pathname,
          search: syncResult.search,
        });
      } else {
        console.log(
          "[PersistentNavigation] initial location: restored location matches current, skipping",
        );
      }
    } else {
      console.log(
        "[PersistentNavigation] initial location: no sync restore found",
      );
    }
  }

  // Listen to all history changes (including back/forward)
  const unlisten = history.listen((location: Update) => {
    console.log("[PersistentNavigation] history.listen: location changed", {
      pathname: location.location.pathname,
      search: location.location.search,
    });
    // Store params whenever location changes (including back/forward)
    void storeCurrentLocationParams(location);
  });

  // Store the unlisten function on history for cleanup if needed
  (history as any)._unlistenPersistentNavigation = unlisten;

  return history;
}
