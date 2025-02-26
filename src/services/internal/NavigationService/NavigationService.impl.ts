import { NavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe } from "@passionware/monads";
import { SimpleEvent } from "@passionware/simple-event";
import {
  matchPath,
  matchRoutes,
  NavigateFunction,
  NavigateOptions,
  To,
  useLocation,
  useMatch,
} from "react-router-dom";
import { create } from "zustand";

export function createNavigationService(
  injectEvent: SimpleEvent<NavigateFunction>,
): NavigationService {
  const useNavigate = create<{ value: NavigateFunction | null }>(() => ({
    value: null,
  }));

  injectEvent.addListener((navigate) => {
    useNavigate.setState({ value: navigate });
  });

  function myNavigate(delta: number): void;
  function myNavigate(to: To, options?: NavigateOptions): void;
  function myNavigate(toOrDelta: number | To, options?: NavigateOptions) {
    const currentNavigate = maybe.getOrThrow(
      useNavigate.getState().value,
      "NavigationService not initialized",
    );

    if (typeof toOrDelta === "number") {
      // mamy wariant z liczbą
      currentNavigate(toOrDelta);
    } else {
      // mamy wariant z "to"
      currentNavigate(toOrDelta, options);
    }
  }

  return {
    navigate: myNavigate,
    match: (pattern) => matchPath(pattern, window.location.pathname),
    useMatch,
    matchRoutes,
    useMatchMany: (patterns) => {
      const location = useLocation();
      const match = matchRoutes(Object.values(patterns), location.pathname);
      if (match) {
        // return { match, key: Object.keys(patterns).find(key => match.find(patterns[key] === match.route) as string };
        const firstMatch = match[0];
        return {
          match: {
            pattern: firstMatch.route as never,
            params: firstMatch.params,
            pathname: location.pathname as never,
            pathnameBase: firstMatch.pathnameBase,
          },
          key: maybe.getOrThrow(
            Object.keys(patterns).find(
              (key) => patterns[key] === firstMatch.route,
            ),
          ),
        };
      }
      return null;
    },
  };
}
