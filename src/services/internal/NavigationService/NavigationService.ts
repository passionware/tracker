import {
  matchRoutes,
  NavigateFunction,
  ParamParseKey,
  PathMatch,
  PathPattern,
  useMatch,
} from "react-router-dom";

/**
 * Abstract access to browser capabilities for navigation (reading and changing the URL).
 */
export interface NavigationService {
  navigate: NavigateFunction;
  useMatch: typeof useMatch;
  useMatchMany<
    ParamKey extends ParamParseKey<Path>,
    Path extends string,
    Patterns extends Record<string, PathPattern<Path> | Path>,
  >(
    patterns: Patterns,
  ): { match: PathMatch<ParamKey>; key: keyof Patterns } | null;
  match: <ParamKey extends ParamParseKey<Path>, Path extends string>(
    pattern: PathPattern<Path> | Path,
  ) => PathMatch<ParamKey> | null;
  matchRoutes: typeof matchRoutes;
}

export interface WithNavigationService {
  navigationService: NavigationService;
}
