import { maybe, Maybe, rd, RemoteData } from "@passionware/monads";

export function ensureIdleQuery<T>(query: Maybe<unknown>, data: RemoteData<T>) {
  if (maybe.isPresent(query)) {
    return data;
  }
  return rd.ofIdle();
}
