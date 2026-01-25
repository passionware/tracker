import qs from "qs";
import { useSearchParams } from "react-router-dom";
import { createWeakCache } from "@/platform/lang/weakCache";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService";
import {
  ScopedQueryParamsService,
  createQueryParamsServiceConfig,
  QueryParamsService,
} from "./QueryParamsService";

export function createQueryParamsService<T extends Record<string, object>>(
  config: createQueryParamsServiceConfig<T> & WithNavigationService,
): QueryParamsService<T> {
  const forEntity = <E extends keyof T>(entity: E) => {
    function fromQueryString(search: string) {
      const fromString = qs.parse(search, {
        allowDots: true,
        plainObjects: true,
        ignoreQueryPrefix: true,
        allowEmptyArrays: true,
        strictNullHandling: true,
      });
      return config.parseQueryParams[entity](fromString);
    }

    const scopedService: ScopedQueryParamsService<T[E]> = {
      useQueryParams: () => {
        const [searchParams] = useSearchParams();
        const searchString = searchParams.toString();
        return fromQueryString(searchString);
      },
      getQueryParams: () => {
        const searchString = window.location.search;
        return fromQueryString(searchString);
      },
      setQueryParams: (params: T[E]) => {
        const serialized = qs.stringify(params, {
          allowDots: true,
          encode: true,
          allowEmptyArrays: true,
          strictNullHandling: true,
        });

        const newSearch = serialized ? `?${serialized}` : "";
        const currentPath = window.location.pathname;
        const newUrl = `${currentPath}${newSearch}`;

        config.navigationService.navigate(newUrl);
      },
      updateQueryParams: (updater: (current: T[E]) => T[E]) => {
        const currentParams = (() => {
          const searchString = window.location.search;
          return fromQueryString(searchString);
        })();

        const newParams = updater(currentParams);

        const serialized = qs.stringify(newParams, {
          allowDots: true,
          encode: true,
          allowEmptyArrays: true,
          strictNullHandling: true,
        });

        const newSearch = serialized ? `?${serialized}` : "";
        const currentPath = window.location.pathname;
        const newUrl = `${currentPath}${newSearch}`;

        config.navigationService.navigate(newUrl);
      },
    };
    return scopedService;
  };

  // @ts-expect-error -- todo check if we can solve this double-generics problem
  const cache = createWeakCache(forEntity);
  return {
    // @ts-expect-error -- todo check if we can solve this double-generics problem
    forEntity: (entity) => cache.getOrCreate(entity),
  };
}
