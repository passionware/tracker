import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface UseDebouncedUrlSyncedSearchOptions {
  debounceMs?: number;
}

/**
 * Local search input state that mirrors `urlSearch` when the URL changes, and
 * commits edits back to the URL after `debounceMs` of inactivity.
 */
export function useDebouncedUrlSyncedSearch(
  urlSearch: string,
  commitSearchToUrl: (search: string) => void,
  options?: UseDebouncedUrlSyncedSearchOptions,
): {
  inputValue: string;
  setInputValue: (value: string) => void;
} {
  const debounceMs = options?.debounceMs ?? 300;

  const [inputValue, setInputValue] = useState(urlSearch);

  const debouncedCommit = useMemo(
    () =>
      debounce((value: string) => {
        commitSearchToUrl(value);
      }, debounceMs),
    [commitSearchToUrl, debounceMs],
  );

  useEffect(() => () => debouncedCommit.cancel(), [debouncedCommit]);

  useEffect(() => {
    debouncedCommit.cancel();
    setInputValue(urlSearch);
  }, [urlSearch, debouncedCommit]);

  const setInputValueAndSchedule = useCallback(
    (value: string) => {
      setInputValue(value);
      debouncedCommit(value);
    },
    [debouncedCommit],
  );

  return { inputValue, setInputValue: setInputValueAndSchedule };
}
