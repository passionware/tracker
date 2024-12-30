import { NavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe } from "@passionware/monads";
import { SimpleEvent } from "@passionware/simple-event";
import {
  matchPath,
  NavigateFunction,
  NavigateOptions,
  To,
  useMatch,
} from "react-router-dom";
import { create } from "zustand";

export function createNavigationService(
  injectEvent: SimpleEvent<NavigateFunction>,
): NavigationService {
  const useNavigate = create<NavigateFunction | null>(() => null);

  injectEvent.addListener(useNavigate.setState);

  function myNavigate(delta: number): void;
  function myNavigate(to: To, options?: NavigateOptions): void;
  function myNavigate(toOrDelta: number | To, options?: NavigateOptions) {
    const currentNavigate = maybe.getOrThrow(
      useNavigate.getState(),
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
    useMatch: useMatch,
  };
}
