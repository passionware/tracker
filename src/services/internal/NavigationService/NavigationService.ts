import {
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
  match: <ParamKey extends ParamParseKey<Path>, Path extends string>(
    pattern: PathPattern<Path> | Path,
  ) => PathMatch<ParamKey> | null;
}

export interface WithNavigationService {
  navigationService: NavigationService;
}
